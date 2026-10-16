import { ANALYTICS_PERMISSIONS } from "./permissions.js";
import {
  SalesSummaryInputSchema,
  CompareSalesInputSchema,
  TopProductsInputSchema,
  SalespersonRankingInputSchema,
  InventorySummaryInputSchema,
  ReceivablesInputSchema,
  GenerateReportInputSchema,
} from "./schemas.js";
import { reportService } from "./reportService.js";

/**
 * Enterprise Analytics Tool Registry
 * Exposes validated, read-only tools strictly mapped to deterministic queries.
 */

export const TOOL_REGISTRY = {
  get_sales_summary: {
    name: "get_sales_summary",
    description: "Get comprehensive sales totals, invoiced revenue, taxes, cash collections, and B2B vs B2C breakdown for a given period.",
    requiredPermission: ANALYTICS_PERMISSIONS.SALES_READ,
    schema: SalesSummaryInputSchema,
    execute: async (principal, args) => {
      return await reportService.getSalesSummary(principal.organizationId, args);
    },
  },

  compare_sales_periods: {
    name: "compare_sales_periods",
    description: "Compare sales revenue, volume, and collections across two periods (e.g. current month vs previous month).",
    requiredPermission: ANALYTICS_PERMISSIONS.SALES_READ,
    schema: CompareSalesInputSchema,
    execute: async (principal, args) => {
      return await reportService.compareSalesPeriods(principal.organizationId, args);
    },
  },

  get_top_products_by_revenue: {
    name: "get_top_products_by_revenue",
    description: "Rank products by revenue, units sold, or gross profit margin.",
    requiredPermission: ANALYTICS_PERMISSIONS.SALES_READ,
    schema: TopProductsInputSchema,
    execute: async (principal, args) => {
      return await reportService.getTopProducts(principal.organizationId, args);
    },
  },

  get_salesperson_ranking: {
    name: "get_salesperson_ranking",
    description: "Rank sales representatives by revenue, invoice volume, gross profit, or collections against quotas.",
    requiredPermission: ANALYTICS_PERMISSIONS.SALESPERSON_READ,
    schema: SalespersonRankingInputSchema,
    execute: async (principal, args) => {
      return await reportService.getSalespersonRanking(principal.organizationId, args);
    },
  },

  get_inventory_summary: {
    name: "get_inventory_summary",
    description: "Inspect warehouse stock levels, total inventory valuation, and identify products at or below reorder levels.",
    requiredPermission: ANALYTICS_PERMISSIONS.INVENTORY_READ,
    schema: InventorySummaryInputSchema,
    execute: async (principal, args) => {
      return await reportService.getInventorySummary(principal.organizationId, args);
    },
  },

  get_low_stock_products: {
    name: "get_low_stock_products",
    description: "Retrieve products that are currently below their minimum safety stock / reorder thresholds.",
    requiredPermission: ANALYTICS_PERMISSIONS.INVENTORY_READ,
    schema: InventorySummaryInputSchema,
    execute: async (principal, args) => {
      return await reportService.getInventorySummary(principal.organizationId, { ...args, lowStockOnly: true });
    },
  },

  get_outstanding_receivables: {
    name: "get_outstanding_receivables",
    description: "Summarize pending customer invoices, collections aging (0-30, 31-60, 60+ days), and overdue balances.",
    requiredPermission: ANALYTICS_PERMISSIONS.SALES_READ,
    schema: ReceivablesInputSchema,
    execute: async (principal, args) => {
      return await reportService.getOutstandingReceivables(principal.organizationId);
    },
  },

  get_financial_summary: {
    name: "get_financial_summary",
    description: "Compute gross margins, COGS, operating expenses, and net profit for a given period.",
    requiredPermission: ANALYTICS_PERMISSIONS.FINANCIAL_READ,
    schema: SalesSummaryInputSchema,
    execute: async (principal, args) => {
      return await reportService.getFinancialSummary(principal.organizationId, args);
    },
  },
};

export function getRegisteredTool(toolName) {
  return TOOL_REGISTRY[toolName] || null;
}

export function getAllToolDefinitions() {
  return Object.values(TOOL_REGISTRY).map(t => ({
    name: t.name,
    description: t.description,
    requiredPermission: t.requiredPermission,
  }));
}
