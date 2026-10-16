import { z } from "zod";

export const DatePeriodSchema = z.enum([
  "today",
  "this_week",
  "current_month",
  "previous_month",
  "current_quarter",
  "current_fy",
  "previous_fy",
  "custom"
]).default("current_month");

export const BaseAnalyticsFilterSchema = z.object({
  period: DatePeriodSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  organizationId: z.string().optional(),
});

export const SalesSummaryInputSchema = BaseAnalyticsFilterSchema.extend({
  customerType: z.enum(["ALL", "B2B", "B2C"]).default("ALL"),
  salespersonId: z.string().optional(),
});

export const CompareSalesInputSchema = z.object({
  periodA: DatePeriodSchema.default("current_month"),
  periodB: DatePeriodSchema.default("previous_month"),
  metric: z.enum(["revenue", "volume", "gross_profit"]).default("revenue"),
});

export const TopProductsInputSchema = BaseAnalyticsFilterSchema.extend({
  limit: z.number().int().min(1).max(50).default(10),
  sortBy: z.enum(["revenue", "units", "gross_profit"]).default("revenue"),
});

export const SalespersonRankingInputSchema = BaseAnalyticsFilterSchema.extend({
  metric: z.enum(["revenue", "invoices", "gross_profit", "collections"]).default("revenue"),
  branch: z.string().optional(),
});

export const InventorySummaryInputSchema = z.object({
  category: z.string().optional(),
  lowStockOnly: z.boolean().default(false),
});

export const ReceivablesInputSchema = z.object({
  status: z.enum(["ALL", "OVERDUE", "PARTIAL", "UNPAID"]).default("ALL"),
  minDaysOverdue: z.number().int().min(0).default(0),
});

export const GenerateReportInputSchema = z.object({
  reportType: z.enum([
    "sales_summary",
    "annual_sales",
    "salesperson_performance",
    "inventory_summary",
    "low_stock",
    "outstanding_receivables",
    "financial_summary"
  ]),
  period: DatePeriodSchema.default("current_month"),
  title: z.string().optional(),
});

export const AnalyticsChatRequestSchema = z.object({
  message: z.string().trim().max(1000, "Question exceeds maximum limit of 1000 characters").optional().default(""),
  conversationId: z.string().nullable().optional(),
  clarificationSelection: z.string().nullable().optional(),
}).refine((data) => (data.message && data.message.length > 0) || (data.clarificationSelection && data.clarificationSelection.length > 0), {
  message: "Either message or clarificationSelection must be provided",
});
