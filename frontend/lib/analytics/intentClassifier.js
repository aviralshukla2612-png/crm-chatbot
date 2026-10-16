/**
 * Natural Language Analytics Intent Classifier & Parameter Extractor
 * Maps authorized business queries into validated tools and period parameters.
 * Detects ambiguities requiring clarification before query execution.
 */

export function classifyAnalyticsIntent(rawText, history = [], clarificationSelection = null) {
  // If a clarification choice was selected
  if (clarificationSelection) {
    const sel = String(clarificationSelection).toLowerCase();
    if (sel.includes("profit") || sel.includes("margin")) {
      return {
        intent: "SALESPERSON_RANKING",
        tool: "get_salesperson_ranking",
        args: { metric: "gross_profit", period: "current_fy" },
        needsClarification: false,
      };
    }
    if (sel.includes("collection") || sel.includes("payment")) {
      return {
        intent: "SALESPERSON_RANKING",
        tool: "get_salesperson_ranking",
        args: { metric: "collections", period: "current_fy" },
        needsClarification: false,
      };
    }
    // Default to revenue
    return {
      intent: "SALESPERSON_RANKING",
      tool: "get_salesperson_ranking",
      args: { metric: "revenue", period: "current_fy" },
      needsClarification: false,
    };
  }

  if (!rawText || typeof rawText !== "string") {
    return {
      intent: "UNKNOWN",
      tool: null,
      args: {},
      needsClarification: false,
    };
  }

  const query = rawText.toLowerCase().trim();

  // 0. Conversational Greetings (e.g. "hi", "hii", "hello")
  if (/^(hi|hii|hello|hey|greetings|good morning|good afternoon)\b/i.test(query) && query.length < 25) {
    return {
      intent: "GREETING",
      tool: null,
      args: {},
      needsClarification: false,
      message: "Hello! I am Emperor Analytics AI, your conversational ERP & CRM business intelligence assistant. You can ask me about our total sales, top products, low stock alerts, salesperson performance, or ask me to generate an annual sales PDF report."
    };
  }

  // 1. PDF Report Generation Requests
  if (
    query.includes("generate a pdf") ||
    query.includes("download pdf") ||
    query.includes("generate pdf") ||
    query.includes("export pdf") ||
    query.includes("annual sales report pdf")
  ) {
    let reportType = "sales_summary";
    let period = "current_month";

    if (query.includes("annual") || query.includes("year") || query.includes("fy")) {
      reportType = "annual_sales";
      period = "current_fy";
    } else if (query.includes("inventory") || query.includes("stock")) {
      reportType = "inventory_summary";
    } else if (query.includes("salesperson") || query.includes("rep")) {
      reportType = "salesperson_performance";
      period = "current_fy";
    } else if (query.includes("receivable") || query.includes("overdue")) {
      reportType = "outstanding_receivables";
    }

    return {
      intent: "GENERATE_REPORT",
      tool: "generate_report",
      args: { reportType, period },
      needsClarification: false,
    };
  }

  // 2. Period Comparison ("Compare this month with last month", etc.)
  if (
    query.includes("compare") ||
    query.includes("versus") ||
    query.includes("vs ") ||
    query.includes("month over month")
  ) {
    if (query.includes("salesperson") || query.includes("branch")) {
      return {
        intent: "COMPARE_BRANCHES",
        tool: "get_salesperson_ranking",
        args: { period: "current_fy" },
        needsClarification: false,
      };
    }

    let periodA = "current_month";
    let periodB = "previous_month";

    if (query.includes("b2b") && query.includes("b2c")) {
      return {
        intent: "SALES_SUMMARY",
        tool: "get_sales_summary",
        args: { period: "current_month", customerType: "ALL" },
        needsClarification: false,
        note: "B2B and B2C comparison extracted from sales summary"
      };
    }

    return {
      intent: "COMPARE_PERIODS",
      tool: "compare_sales_periods",
      args: { periodA, periodB },
      needsClarification: false,
    };
  }

  // 3. Salesperson Performance & Best Salesperson (Handles Clarification)
  if (
    query.includes("salesperson") ||
    query.includes("sales rep") ||
    query.includes("best performing") ||
    query.includes("top sales") ||
    query.includes("who sold the most") ||
    query.includes("branch performance")
  ) {
    // If ambiguous (e.g., "who is our best salesperson?"), ask for metric clarification
    if (
      query.includes("best") &&
      !query.includes("revenue") &&
      !query.includes("profit") &&
      !query.includes("collection")
    ) {
      return {
        intent: "AMBIGUOUS_SALESPERSON",
        tool: "get_salesperson_ranking",
        args: { metric: "revenue", period: "current_fy" },
        needsClarification: true,
        clarificationQuestion: "Which benchmark should I use to rank your best salesperson?",
        clarificationOptions: [
          "Highest Revenue Generated",
          "Highest Gross Profit",
          "Total Cash Collections",
          "Quota Achievement Percentage"
        ]
      };
    }

    let metric = "revenue";
    if (query.includes("profit") || query.includes("margin")) metric = "gross_profit";
    if (query.includes("collection") || query.includes("cash")) metric = "collections";

    return {
      intent: "SALESPERSON_RANKING",
      tool: "get_salesperson_ranking",
      args: { metric, period: "current_fy" },
      needsClarification: false,
    };
  }

  // 4. Low Stock & Inventory Queries
  if (
    query.includes("low stock") ||
    query.includes("low in stock") ||
    query.includes("reorder") ||
    query.includes("running low")
  ) {
    return {
      intent: "LOW_STOCK_ALERT",
      tool: "get_low_stock_products",
      args: { lowStockOnly: true },
      needsClarification: false,
    };
  }

  if (
    query.includes("inventory") ||
    query.includes("stock") ||
    query.includes("valuation") ||
    query.includes("warehouse")
  ) {
    return {
      intent: "INVENTORY_VALUATION",
      tool: "get_inventory_summary",
      args: { lowStockOnly: false },
      needsClarification: false,
    };
  }

  // 5. Outstanding Payments & Invoices Overdue
  if (
    query.includes("outstanding") ||
    query.includes("receivable") ||
    query.includes("unpaid") ||
    query.includes("overdue") ||
    query.includes("pending payment") ||
    query.includes("difference between sales revenue, collections, and outstanding")
  ) {
    if (query.includes("difference between") || query.includes("revenue, collections")) {
      return {
        intent: "SALES_REVENUE_VS_COLLECTIONS",
        tool: "get_sales_summary",
        args: { period: "current_month" },
        needsClarification: false,
      };
    }

    return {
      intent: "OUTSTANDING_RECEIVABLES",
      tool: "get_outstanding_receivables",
      args: {},
      needsClarification: false,
    };
  }

  // 6. Top Products & Product Profitability
  if (
    query.includes("top product") ||
    query.includes("best selling") ||
    query.includes("highest gross profit") ||
    query.includes("highest profit") ||
    query.includes("product margin") ||
    query.includes("product revenue")
  ) {
    let sortBy = "revenue";
    if (query.includes("profit") || query.includes("margin")) sortBy = "gross_profit";
    if (query.includes("units") || query.includes("volume")) sortBy = "units";

    return {
      intent: "TOP_PRODUCTS",
      tool: "get_top_products_by_revenue",
      args: { limit: 10, sortBy, period: "current_fy" },
      needsClarification: false,
    };
  }

  // 7. General Financial Summaries & P&L
  if (
    query.includes("gross profit") ||
    query.includes("net profit") ||
    query.includes("operating expenses") ||
    query.includes("financial summary") ||
    query.includes("cogs")
  ) {
    return {
      intent: "FINANCIAL_SUMMARY",
      tool: "get_financial_summary",
      args: { period: "current_month" },
      needsClarification: false,
    };
  }

  // 8. Default: Sales Summary (detecting periods like this month, last month, financial year)
  let period = "current_month";
  if (query.includes("last month") || query.includes("previous month")) {
    period = "previous_month";
  } else if (
    query.includes("year") ||
    query.includes("fy") ||
    query.includes("financial year") ||
    query.includes("annual")
  ) {
    period = "current_fy";
  } else if (query.includes("today")) {
    period = "today";
  } else if (query.includes("week")) {
    period = "this_week";
  } else if (query.includes("quarter")) {
    period = "current_quarter";
  }

  return {
    intent: "SALES_SUMMARY",
    tool: "get_sales_summary",
    args: { period },
    needsClarification: false,
  };
}
