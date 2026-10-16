import { ATTENDANCE_TOOLS } from "../src/lib/attendance/ai/tools";
import { OllamaClient } from "../src/lib/attendance/ai/ollamaClient";

async function testReportTool() {
  console.log("Checking tool registration...");
  if (!ATTENDANCE_TOOLS.generate_attendance_report) {
    throw new Error("generate_attendance_report missing from ATTENDANCE_TOOLS");
  }
  console.log("✅ Tool generate_attendance_report is registered.");

  const caller: any = {
    id: "user_owner",
    email: "owner@esscompany.com",
    name: "System Owner",
    activeRole: "OWNER",
    employeeId: null,
  };

  const res = await ATTENDANCE_TOOLS.generate_attendance_report.execute({ departmentId: "Engineering" }, caller);
  console.log("Result:", res);

  const classified = await OllamaClient.classifyIntent("Generate a monthly attendance report PDF");
  console.log("Classified PDF query:", classified);

  if (classified.toolName === "generate_attendance_report") {
    console.log("✅ Classification correctly selected generate_attendance_report.");
  } else {
    console.error("❌ Classification failed, selected:", classified.toolName);
  }
}

testReportTool().catch(console.error);
