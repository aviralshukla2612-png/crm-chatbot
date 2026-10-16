import fs from "fs";

const orchestratorCode = `import { CurrentUserSession } from "@/lib/auth";
import { ATTENDANCE_TOOLS } from "./tools";
import { OllamaClient } from "./ollamaClient";
import { hasAdminAttendanceAccess } from "../attendanceService";
import { getISTDateString } from "../dateUtils";

export interface AnalyticsQueryResponse {
  success: boolean;
  question: string;
  toolUsed: string;
  parameters: Record<string, any>;
  data: any;
  explanation: string;
  source: "ollama" | "fallback";
  metrics?: Array<{ label: string; value: number | string; color?: string }>;
  table?: any[] | null;
  chart?: any[] | null;
  downloadUrl?: string | null;
  reportingPeriod?: {
    date: string;
    timezone: string;
  };
  error?: string;
}

export class AttendanceAnalyticsOrchestrator {
  private static formatStructuredData(toolName: string, rawResult: any) {
    const today = getISTDateString();
    const reportingPeriod = {
      date: today,
      timezone: "Asia/Kolkata",
    };

    let metrics: Array<{ label: string; value: number | string; color?: string }> | undefined;
    let table: any[] | null = null;
    let chart: any[] | null = null;
    let downloadUrl: string | null = null;

    if (!rawResult) return { reportingPeriod, metrics, table, chart, downloadUrl };

    if (rawResult.type === "summary" && rawResult.data) {
      const d = rawResult.data;
      metrics = [
        { label: "Present", value: d.presentCount ?? 0, color: "emerald" },
        { label: "Absent", value: d.absentCount ?? 0, color: "rose" },
        { label: "Late Arrivals", value: d.lateCount ?? 0, color: "amber" },
        { label: "On Leave", value: d.onLeaveCount ?? 0, color: "blue" },
        { label: "Incomplete", value: d.incompleteCount ?? 0, color: "purple" },
        { label: "Expected", value: d.totalExpected ?? 0, color: "slate" },
      ];
      chart = [
        { name: "Present", count: d.presentCount ?? 0 },
        { name: "Absent", count: d.absentCount ?? 0 },
        { name: "Late", count: d.lateCount ?? 0 },
        { name: "On Leave", count: d.onLeaveCount ?? 0 },
      ];
    } else if (rawResult.type === "record_list" || rawResult.type === "employee_history") {
      table = rawResult.records || [];
      if (table && table.length > 0) {
        chart = table.slice(0, 10).map((r: any) => ({
          name: r.employeeName || r.date,
          hours: typeof r.totalMinutes === "number" ? Math.round((r.totalMinutes / 60) * 10) / 10 : 0,
        }));
      }
    } else if (rawResult.type === "late_summary") {
      table = rawResult.lateArrivals || [];
      metrics = [
        { label: "Late Arrivals", value: rawResult.count ?? 0, color: "amber" },
      ];
    } else if (rawResult.type === "incomplete_checkout") {
      table = rawResult.employees || [];
      metrics = [
        { label: "Incomplete Checkouts", value: rawResult.count ?? 0, color: "rose" },
      ];
    } else if (rawResult.type === "department_summary") {
      metrics = [
        { label: "Present", value: rawResult.summary?.presentCount ?? 0, color: "emerald" },
        { label: "Total In Dept", value: rawResult.summary?.totalExpected ?? 0, color: "slate" },
      ];
      table = rawResult.records || [];
    } else if (rawResult.type === "monthly") {
      metrics = [
        { label: "Total Logged Shifts", value: rawResult.totalRecords ?? 0, color: "indigo" },
        { label: "Month", value: \`\${rawResult.month}/\${rawResult.year}\`, color: "slate" },
      ];
      chart = (rawResult.departmentBreakdown || []).map((d: any) => ({
        name: d.department,
        shifts: d.totalRecords,
      }));
    } else if (rawResult.type === "pdf_report") {
      downloadUrl = rawResult.downloadUrl;
    }

    return { reportingPeriod, metrics, table, chart, downloadUrl };
  }

  /**
   * Process a conversational natural-language question
   */
  static async processQuestion(
    question: string,
    caller: CurrentUserSession
  ): Promise<AnalyticsQueryResponse> {
    if (!question || question.trim().length === 0) {
      return {
        success: false,
        question,
        toolUsed: "none",
        parameters: {},
        data: null,
        explanation: "Please enter a valid attendance question.",
        source: "fallback",
        error: "Empty query",
      };
    }

    // Step 1: Classify user intent
    const classification = await OllamaClient.classifyIntent(question);
    const toolName = classification.toolName;

    if (!toolName || !ATTENDANCE_TOOLS[toolName]) {
      // Fall back to general summary
      const summaryTool = ATTENDANCE_TOOLS.get_attendance_summary;
      const data = await summaryTool.execute({}, caller);
      const explanation = await OllamaClient.explainResult(question, "get_attendance_summary", data);
      const structured = this.formatStructuredData("get_attendance_summary", data);

      return {
        success: true,
        question,
        toolUsed: "get_attendance_summary",
        parameters: {},
        data,
        explanation,
        source: classification.source,
        ...structured,
      };
    }

    const tool = ATTENDANCE_TOOLS[toolName];

    // Step 2: Enforce RBAC permissions
    if (tool.requiresAdmin && !hasAdminAttendanceAccess(caller)) {
      // If a non-admin employee asks for company-wide stats or other employee stats,
      // redirect safely to their own personal attendance if profile exists
      if (caller.employeeId) {
        try {
          const empTool = ATTENDANCE_TOOLS.get_employee_attendance;
          const data = await empTool.execute({ employeeId: caller.employeeId }, caller);
          const structured = this.formatStructuredData("get_employee_attendance", data);
          return {
            success: true,
            question,
            toolUsed: "get_employee_attendance",
            parameters: { employeeId: caller.employeeId },
            data,
            explanation: "🔒 Company-wide attendance reports require Administrator or Owner privileges. Here is your personal attendance record instead.",
            source: classification.source,
            ...structured,
          };
        } catch {
          // If employee profile query fails, fall through to Forbidden response
        }
      }

      return {
        success: false,
        question,
        toolUsed: toolName,
        parameters: classification.arguments,
        data: null,
        explanation: "You do not have administrative permission to view team-wide attendance records.",
        source: classification.source,
        error: "Forbidden",
      };
    }

    // Step 3: Validate tool arguments using Zod
    const validationResult = tool.parameters.safeParse(classification.arguments);
    const validArgs = validationResult.success ? validationResult.data : {};

    // Step 4: Execute tool via AttendanceService
    let rawResult: any;
    try {
      rawResult = await tool.execute(validArgs, caller);
    } catch (err: any) {
      return {
        success: false,
        question,
        toolUsed: toolName,
        parameters: validArgs,
        data: null,
        explanation: \`Unable to complete query: \${err.message}\`,
        source: classification.source,
        error: err.message,
      };
    }

    // Step 5: Synthesize explanation from verified data
    const explanation = await OllamaClient.explainResult(question, toolName, rawResult);
    const structured = this.formatStructuredData(toolName, rawResult);

    return {
      success: true,
      question,
      toolUsed: toolName,
      parameters: validArgs,
      data: rawResult,
      explanation,
      source: classification.source,
      ...structured,
    };
  }
}
`;

fs.writeFileSync("d:/ess-os/src/lib/attendance/ai/orchestrator.ts", orchestratorCode, "utf8");
console.log("Updated orchestrator.ts successfully with strict null safety.");
