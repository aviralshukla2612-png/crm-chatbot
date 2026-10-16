import { classifyAnalyticsIntent } from "./intentClassifier.js";
import { getRegisteredTool } from "./toolRegistry.js";
import { assertToolAuthorization } from "./permissions.js";
import { pdfService } from "./pdfService.js";
import { analyticsStore } from "../db/analyticsStore.js";
import { InferenceProvider } from "../ai/inferenceProvider.js";

/**
 * Enterprise Analytics Orchestrator
 * Pipeline: User Question -> Intent -> Tool Selection -> Validation -> Deterministic Math -> Optional LLM Explanation -> Response
 */

export class AnalyticsOrchestrator {
  static async processQuery({
    principal,
    message,
    conversationId = null,
    clarificationSelection = null,
    clientIp = "127.0.0.1",
  }) {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // 1. Authentication Guard
    if (!principal || !principal.authenticated) {
      throw new Error("UNAUTHENTICATED: Analytics AI requires a verified user session.");
    }

    const organizationId = principal.organizationId || "org_ess_01";
    const userId = principal.userId;

    // 2. Load Conversation Context
    let conv = null;
    if (conversationId) {
      conv = await analyticsStore.getConversation(conversationId, organizationId, userId);
    }
    if (!conv) {
      const newConvId = conversationId || `conv_ai_${Date.now()}`;
      conv = {
        id: newConvId,
        organizationId,
        userId,
        title: message.slice(0, 40) + (message.length > 40 ? "..." : ""),
        messages: [],
        createdAt: new Date().toISOString(),
      };
    }

    // 3. Intent & Parameter Classification
    const classification = classifyAnalyticsIntent(
      message,
      conv.messages || [],
      clarificationSelection
    );

    // 4. Clarification Flow
    if (classification.needsClarification) {
      const responsePayload = {
        message: classification.clarificationQuestion,
        intent: classification.intent,
        status: "NEEDS_CLARIFICATION",
        clarification: {
          question: classification.clarificationQuestion,
          options: classification.clarificationOptions,
        },
        dataAsOf: new Date().toISOString(),
      };

      // Record to conversation
      conv.messages.push(
        { role: "user", content: message, timestamp: new Date().toISOString() },
        { role: "assistant", content: classification.clarificationQuestion, payload: responsePayload, timestamp: new Date().toISOString() }
      );
      await analyticsStore.saveConversation(conv);

      return responsePayload;
    }

    // 4b. Conversational Greeting
    if (classification.intent === "GREETING") {
      const greetingMsg = classification.message || "Hello! How can I assist you with your business analytics today?";
      const responsePayload = {
        message: greetingMsg,
        intent: "GREETING",
        status: "SUCCESS",
        dataAsOf: new Date().toISOString(),
      };

      conv.messages.push(
        { role: "user", content: message, timestamp: new Date().toISOString() },
        { role: "assistant", content: greetingMsg, payload: responsePayload, timestamp: new Date().toISOString() }
      );
      await analyticsStore.saveConversation(conv);

      return responsePayload;
    }

    // 5. Tool Selection & Validation
    const toolName = classification.tool;

    // Special Handling: Report Generation Tool
    if (toolName === "generate_report") {
      const reportType = classification.args.reportType || "sales_summary";
      const period = classification.args.period || "current_month";

      let toolResult;
      let title = "Sales Performance Report";

      if (reportType === "inventory_summary") {
        toolResult = await (getRegisteredTool("get_inventory_summary")).execute(principal, {});
        title = "Inventory Valuation & Stock Status Report";
      } else if (reportType === "salesperson_performance") {
        toolResult = await (getRegisteredTool("get_salesperson_ranking")).execute(principal, { period });
        title = "Salesperson Performance & Quota Report";
      } else if (reportType === "outstanding_receivables") {
        toolResult = await (getRegisteredTool("get_outstanding_receivables")).execute(principal, {});
        title = "Accounts Receivable Aging Report";
      } else {
        toolResult = await (getRegisteredTool("get_sales_summary")).execute(principal, { period });
        title = period === "current_fy" ? "Annual Sales Performance Report (FY 2026-27)" : "Monthly Sales Summary Report";
      }

      const reportId = `rep_${Date.now()}`;
      const columns = toolResult.table?.[0] ? Object.keys(toolResult.table[0]) : [];

      const pdfMeta = await pdfService.generateReportPdf({
        reportId,
        title,
        organizationName: "Emperor Smart Solutions",
        periodLabel: toolResult.dateRange || period,
        generatedBy: principal.email || "Executive User",
        metrics: toolResult.metrics || {},
        tableData: toolResult.table || [],
        tableColumns: columns,
      });

      const reportRecord = {
        id: reportId,
        organizationId,
        userId,
        reportType,
        title,
        period,
        fileName: pdfMeta.fileName,
        filePath: pdfMeta.filePath,
        fileSizeBytes: pdfMeta.fileSizeBytes,
        createdAt: new Date().toISOString(),
      };
      await analyticsStore.saveReport(reportRecord);

      const replyText = `Your official PDF report **"${title}"** has been compiled and is ready for secure download.`;
      const responsePayload = {
        message: replyText,
        intent: classification.intent,
        status: "SUCCESS",
        reportId,
        reportTitle: title,
        downloadUrl: `/api/analytics-ai/reports/${reportId}/download`,
        metrics: toolResult.metrics,
        table: toolResult.table,
        chart: toolResult.chartData,
        dataAsOf: new Date().toISOString(),
      };

      conv.messages.push(
        { role: "user", content: message, timestamp: new Date().toISOString() },
        { role: "assistant", content: replyText, payload: responsePayload, timestamp: new Date().toISOString() }
      );
      await analyticsStore.saveConversation(conv);

      return responsePayload;
    }

    const tool = getRegisteredTool(toolName);
    if (!tool) {
      throw new Error(`UNSUPPORTED_ACTION: Analytics tool '${toolName}' is not registered or supported.`);
    }

    // 6. Permission & Role Authorization Check
    assertToolAuthorization(principal, tool);

    // 7. Schema Validation
    const validatedArgs = tool.schema ? tool.schema.parse(classification.args) : classification.args;

    // 8. Execute Deterministic Query Service
    const queryResult = await tool.execute(principal, validatedArgs);

    // 9. Natural Language Summary (Deterministic Base + Optional Ollama Polish)
    let summaryText = "";
    if (toolName === "get_sales_summary") {
      const m = queryResult.metrics;
      summaryText = `In **${queryResult.dateRange}**, Emperor Smart Solutions recorded **₹${m.totalRevenue.toLocaleString("en-IN")}** in net sales across **${m.invoiceCount} invoices** (Gross: ₹${m.grossInvoiced.toLocaleString("en-IN")}, Tax: ₹${m.totalTax.toLocaleString("en-IN")}). Cash collections totaled **₹${m.totalCollected.toLocaleString("en-IN")}** (${m.collectionRatePct}% collection rate), leaving **₹${m.totalOutstanding.toLocaleString("en-IN")}** in pending receivables. B2B sales contributed ₹${m.b2bRevenue.toLocaleString("en-IN")}.`;
    } else if (toolName === "compare_sales_periods") {
      const pA = queryResult.periodA;
      const pB = queryResult.periodB;
      const changeWord = queryResult.difference >= 0 ? "growth" : "decline";
      summaryText = `Sales comparison: **${pA.name.replace("_", " ")}** (₹${pA.revenue.toLocaleString("en-IN")}) versus **${pB.name.replace("_", " ")}** (₹${pB.revenue.toLocaleString("en-IN")}) shows a **${Math.abs(queryResult.percentageChange)}% ${changeWord}** (variance of ₹${Math.abs(queryResult.difference).toLocaleString("en-IN")}).`;
    } else if (toolName === "get_salesperson_ranking") {
      const top = queryResult.salespeople[0];
      summaryText = `Top performing salesperson for **${queryResult.period.replace("_", " ")}** is **${top?.name || "N/A"}** with **₹${(top?.revenue || 0).toLocaleString("en-IN")}** in closed revenue (${top?.branch || "HQ"}).`;
    } else if (toolName === "get_low_stock_products") {
      const count = queryResult.table.length;
      summaryText = count > 0
        ? `Identified **${count} product(s)** at or below critical safety reorder thresholds in inventory.`
        : `All hardware products currently have healthy inventory levels above reorder thresholds.`;
    } else if (toolName === "get_inventory_summary") {
      const m = queryResult.metrics;
      summaryText = `Total inventory comprises **${m.totalSKUs} hardware SKUs** with a total valuation cost of **₹${m.totalValuationCost.toLocaleString("en-IN")}** (potential retail value: ₹${m.potentialRetailValue.toLocaleString("en-IN")}).`;
    } else if (toolName === "get_outstanding_receivables") {
      summaryText = `Total outstanding receivables stand at **₹${queryResult.totalOutstanding.toLocaleString("en-IN")}** across **${queryResult.unpaidCount} unpaid/partial invoices**. 0-30 days: ₹${queryResult.agingBuckets.current0to30.toLocaleString("en-IN")}, 31-60 days: ₹${queryResult.agingBuckets.overdue31to60.toLocaleString("en-IN")}, 60+ days: ₹${queryResult.agingBuckets.critical60plus.toLocaleString("en-IN")}.`;
    } else if (toolName === "get_financial_summary") {
      const m = queryResult.metrics;
      summaryText = `Financial summary: Revenue of **₹${m.revenue.toLocaleString("en-IN")}**, COGS of **₹${m.cogs.toLocaleString("en-IN")}**, yielding a Gross Profit of **₹${m.grossProfit.toLocaleString("en-IN")}** (${m.grossMarginPct}% gross margin). After operating expenses of **₹${m.operatingExpenses.toLocaleString("en-IN")}**, Net Operating Profit is **₹${m.netOperatingProfit.toLocaleString("en-IN")}**.`;
    } else if (toolName === "get_top_products_by_revenue") {
      const top = queryResult.products[0];
      summaryText = `Top product by ${queryResult.sortBy} is **${top?.name || "N/A"}** with **₹${(top?.revenue || 0).toLocaleString("en-IN")}** generated across ${top?.unitsSold || 0} unit(s).`;
    }

    // Optional LLM Polish using InferenceProvider (only if model available, with strict prompt to prevent hallucination)
    try {
      if (process.env.OLLAMA_URL || process.env.GROQ_API_KEY) {
        const prompt = `You are Emperor Analytics AI, an enterprise business intelligence assistant.
User Query: "${message}"
Verified Deterministic Data: ${JSON.stringify(queryResult.metrics || queryResult.difference || queryResult.products?.[0] || {})}
Base Summary: "${summaryText}"

Instructions:
- Provide a 2-3 sentence executive business commentary on these exact verified numbers.
- Never alter any figures or invent new metrics.
- Keep the tone professional, objective, and executive.`;

        const llmPolish = await InferenceProvider.generate({
          messages: [{ role: "system", content: prompt }],
          temperature: 0.1,
          maxTokens: 150,
          timeoutMs: 4000,
        });

        if (llmPolish && llmPolish.trim().length > 20 && !llmPolish.toLowerCase().includes("error")) {
          summaryText = `${summaryText}\n\n💡 **Executive Insight:** ${llmPolish.trim()}`;
        }
      }
    } catch {
      // Graceful degradation: purely deterministic summary stands
    }

    // 10. Assemble Structured UI Payload
    const responsePayload = {
      message: summaryText,
      intent: classification.intent,
      status: "SUCCESS",
      metrics: queryResult.metrics,
      chart: queryResult.chartData,
      table: queryResult.table,
      dataAsOf: new Date().toISOString(),
      assumptions: "All figures represent verified transactional records from core PostgreSQL database. Cancelled invoices are excluded. 18% GST accounted separately.",
    };

    // 11. Conversation Persistence
    conv.messages.push(
      { role: "user", content: message, timestamp: new Date().toISOString() },
      { role: "assistant", content: summaryText, payload: responsePayload, timestamp: new Date().toISOString() }
    );
    await analyticsStore.saveConversation(conv);

    return responsePayload;
  }
}
