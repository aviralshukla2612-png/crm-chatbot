import test from "node:test";
import assert from "node:assert/strict";

import { resolveDateRange, reportService } from "../../frontend/lib/analytics/reportService.js";
import { classifyAnalyticsIntent } from "../../frontend/lib/analytics/intentClassifier.js";
import { TOOL_REGISTRY, getRegisteredTool } from "../../frontend/lib/analytics/toolRegistry.js";
import { pdfService } from "../../frontend/lib/analytics/pdfService.js";

const TEST_PRINCIPAL = {
  authenticated: true,
  userId: "usr_test_admin",
  email: "admin@emperorsmartsolutions.com",
  platformRole: "SUPER_ADMIN",
  organizationId: "org_ess_01",
  orgRole: "ORG_ADMIN",
};

test("Analytics Engine — Date Range & FY Calculations", async (t) => {
  await t.test("Indian FY starts on April 1 and ends on March 31", () => {
    const fyRange = resolveDateRange("current_fy");
    assert.match(fyRange.startDate, /-04-01/);
    assert.match(fyRange.endDate, /-03-31/);
  });

  await t.test("Current Month resolves to 1st of month to end of month", () => {
    const monthRange = resolveDateRange("current_month");
    assert.match(monthRange.startDate, /-10-01/);
    assert.match(monthRange.endDate, /-10-31/);
  });

  await t.test("Previous Month resolves to September", () => {
    const prevRange = resolveDateRange("previous_month");
    assert.match(prevRange.startDate, /-09-01/);
    assert.match(prevRange.endDate, /-09-30/);
  });
});

test("Analytics Engine — Intent Classification & Ambiguity Detection", async (t) => {
  await t.test("Classifies 'What were our total sales this month?' correctly", () => {
    const res = classifyAnalyticsIntent("What were our total sales this month?");
    assert.equal(res.tool, "get_sales_summary");
    assert.equal(res.args.period, "current_month");
    assert.equal(res.needsClarification, false);
  });

  await t.test("Classifies 'Compare this month with last month' correctly", () => {
    const res = classifyAnalyticsIntent("Compare sales for current month with previous month");
    assert.equal(res.tool, "compare_sales_periods");
    assert.equal(res.args.periodA, "current_month");
    assert.equal(res.args.periodB, "previous_month");
  });

  await t.test("Flags ambiguous 'Who is our best salesperson?' for clarification", () => {
    const res = classifyAnalyticsIntent("Who is our best salesperson?");
    assert.equal(res.needsClarification, true);
    assert.ok(Array.isArray(res.clarificationOptions));
    assert.ok(res.clarificationOptions.length >= 2);
  });

  await t.test("Resolves salesperson query with clarification option selected", () => {
    const res = classifyAnalyticsIntent("Who is our best salesperson?", [], "Highest Gross Profit");
    assert.equal(res.needsClarification, false);
    assert.equal(res.tool, "get_salesperson_ranking");
    assert.equal(res.args.metric, "gross_profit");
  });

  await t.test("Detects low stock intent", () => {
    const res = classifyAnalyticsIntent("Which products are running low in stock?");
    assert.equal(res.tool, "get_low_stock_products");
    assert.equal(res.args.lowStockOnly, true);
  });

  await t.test("Detects PDF report generation intent", () => {
    const res = classifyAnalyticsIntent("Generate a PDF report of our annual sales.");
    assert.equal(res.intent, "GENERATE_REPORT");
    assert.equal(res.args.reportType, "annual_sales");
  });
});

test("Analytics Engine — Deterministic Financial Accuracy", async (t) => {
  await t.test("Sales summary accurately sums net sales and excludes cancelled invoices", async () => {
    const summary = await reportService.getSalesSummary(TEST_PRINCIPAL.organizationId, { period: "current_month" });
    assert.ok(summary.metrics.totalRevenue > 0);
    assert.ok(summary.metrics.grossInvoiced > summary.metrics.totalRevenue);
    assert.ok(summary.metrics.totalTax > 0);
    assert.equal(typeof summary.metrics.collectionRatePct, "number");
    assert.ok(summary.table.length > 0);
    // Ensure no cancelled invoices in the table
    const cancelled = summary.table.filter((i) => i.status === "CANCELLED");
    assert.equal(cancelled.length, 0);
  });

  await t.test("Top products rankings sort by revenue and gross profit", async () => {
    const topByRev = await reportService.getTopProducts(TEST_PRINCIPAL.organizationId, { sortBy: "revenue" });
    assert.ok(topByRev.products.length > 0);
    for (let i = 0; i < topByRev.products.length - 1; i++) {
      assert.ok(topByRev.products[i].revenue >= topByRev.products[i + 1].revenue);
    }

    const topByProfit = await reportService.getTopProducts(TEST_PRINCIPAL.organizationId, { sortBy: "gross_profit" });
    assert.ok(topByProfit.products.length > 0);
    for (let i = 0; i < topByProfit.products.length - 1; i++) {
      assert.ok(topByProfit.products[i].grossProfit >= topByProfit.products[i + 1].grossProfit);
    }
  });

  await t.test("Low stock alerts return only items at or below reorder level", async () => {
    const lowStock = await reportService.getInventorySummary(TEST_PRINCIPAL.organizationId, { lowStockOnly: true });
    assert.ok(lowStock.table.length > 0);
    lowStock.table.forEach((item) => {
      assert.ok(item.stock <= item.reorderLevel);
      assert.equal(item.status, "LOW STOCK ALERT");
    });
  });

  await t.test("Outstanding receivables correctly bucket aging and calculate unpaid balances", async () => {
    const receivables = await reportService.getOutstandingReceivables(TEST_PRINCIPAL.organizationId);
    assert.ok(receivables.totalOutstanding > 0);
    assert.equal(
      receivables.totalOutstanding,
      receivables.agingBuckets.current0to30 +
        receivables.agingBuckets.overdue31to60 +
        receivables.agingBuckets.critical60plus
    );
  });

  await t.test("Period comparison handles percentage changes safely without division by zero", async () => {
    const comparison = await reportService.compareSalesPeriods(TEST_PRINCIPAL.organizationId, {
      periodA: "current_month",
      periodB: "previous_month",
    });
    assert.ok(comparison.periodA.revenue > 0);
    assert.ok(comparison.periodB.revenue > 0);
    assert.equal(typeof comparison.percentageChange, "number");
    assert.equal(comparison.difference, comparison.periodA.revenue - comparison.periodB.revenue);
  });
});

test("Analytics Engine — Vector PDF Report Generation", async (t) => {
  await t.test("Generates a valid, multi-page vector PDF report file", async () => {
    const summary = await reportService.getSalesSummary(TEST_PRINCIPAL.organizationId, { period: "current_month" });
    const pdf = await pdfService.generateReportPdf({
      reportId: `test_rep_${Date.now()}`,
      title: "Test Executive Sales Report",
      organizationName: "Emperor Smart Solutions",
      periodLabel: "October 2026",
      generatedBy: "System Auditor",
      metrics: summary.metrics,
      tableData: summary.table,
      tableColumns: ["invoiceNumber", "date", "customer", "subtotal", "total", "status"],
    });

    assert.ok(pdf.filePath);
    assert.ok(pdf.fileSizeBytes > 1000);
    assert.ok(pdf.fileName.endsWith(".pdf"));
  });
});
