import { analyticsStore } from "../db/analyticsStore.js";

/**
 * Deterministic Financial & Operational Reporting Engine
 * Authoritative business arithmetic with zero hallucinations.
 */

// Helper to calculate exact date boundaries for financial periods
export function resolveDateRange(period, customStart, customEnd) {
  const now = new Date("2026-10-15T12:00:00Z"); // Anchored operational calendar
  let startDate = new Date(now);
  let endDate = new Date(now);

  switch (period) {
    case "today":
      startDate.setUTCHours(0, 0, 0, 0);
      endDate.setUTCHours(23, 59, 59, 999);
      break;

    case "this_week": {
      const day = startDate.getUTCDay();
      const diff = startDate.getUTCDate() - day + (day === 0 ? -6 : 1);
      startDate.setUTCDate(diff);
      startDate.setUTCHours(0, 0, 0, 0);
      endDate.setUTCHours(23, 59, 59, 999);
      break;
    }

    case "current_month":
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
      endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
      break;

    case "previous_month":
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
      break;

    case "current_quarter": {
      const currentQuarter = Math.floor(now.getUTCMonth() / 3);
      startDate = new Date(Date.UTC(now.getUTCFullYear(), currentQuarter * 3, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(now.getUTCFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59, 999));
      break;
    }

    case "current_fy":
      // Indian Financial Year: April 1 to March 31
      if (now.getUTCMonth() >= 3) {
        startDate = new Date(Date.UTC(now.getUTCFullYear(), 3, 1, 0, 0, 0));
        endDate = new Date(Date.UTC(now.getUTCFullYear() + 1, 2, 31, 23, 59, 59, 999));
      } else {
        startDate = new Date(Date.UTC(now.getUTCFullYear() - 1, 3, 1, 0, 0, 0));
        endDate = new Date(Date.UTC(now.getUTCFullYear(), 2, 31, 23, 59, 59, 999));
      }
      break;

    case "previous_fy":
      if (now.getUTCMonth() >= 3) {
        startDate = new Date(Date.UTC(now.getUTCFullYear() - 1, 3, 1, 0, 0, 0));
        endDate = new Date(Date.UTC(now.getUTCFullYear(), 2, 31, 23, 59, 59, 999));
      } else {
        startDate = new Date(Date.UTC(now.getUTCFullYear() - 2, 3, 1, 0, 0, 0));
        endDate = new Date(Date.UTC(now.getUTCFullYear() - 1, 2, 31, 23, 59, 59, 999));
      }
      break;

    case "custom":
      startDate = customStart ? new Date(customStart) : new Date(0);
      endDate = customEnd ? new Date(customEnd) : new Date();
      break;

    default:
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
      endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    formattedLabel: `${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`
  };
}

export const reportService = {
  /**
   * 1. Sales Summary Report
   */
  async getSalesSummary(organizationId, filters = {}) {
    const { startDate, endDate, formattedLabel } = resolveDateRange(
      filters.period || "current_month",
      filters.startDate,
      filters.endDate
    );

    const [invoices, customers] = await Promise.all([
      analyticsStore.getInvoices(organizationId, { startDate, endDate, excludeCancelled: true }),
      analyticsStore.getCustomers(organizationId),
    ]);

    const customerMap = new Map(customers.map(c => [c.id, c]));

    let totalSubtotal = 0;
    let totalTax = 0;
    let totalGrossInvoiced = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let b2bRevenue = 0;
    let b2cRevenue = 0;

    const monthMap = {};

    invoices.forEach(inv => {
      const cust = customerMap.get(inv.customerId);
      const isB2B = cust?.type === "B2B";

      totalSubtotal += inv.subtotal || 0;
      totalTax += inv.taxAmount || 0;
      totalGrossInvoiced += inv.totalAmount || 0;
      totalCollected += inv.paidAmount || 0;
      totalOutstanding += inv.outstandingAmount || 0;

      if (isB2B) {
        b2bRevenue += inv.subtotal || 0;
      } else {
        b2cRevenue += inv.subtotal || 0;
      }

      // Group by date/month for timeseries
      const monthKey = new Date(inv.invoiceDate).toLocaleString("en-US", { month: "short", timeZone: "UTC" });
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { name: monthKey, sales: 0, collected: 0, count: 0 };
      }
      monthMap[monthKey].sales += inv.subtotal || 0;
      monthMap[monthKey].collected += inv.paidAmount || 0;
      monthMap[monthKey].count += 1;
    });

    return {
      period: filters.period || "current_month",
      dateRange: formattedLabel,
      metrics: {
        totalRevenue: totalSubtotal,
        totalTax,
        grossInvoiced: totalGrossInvoiced,
        totalCollected,
        totalOutstanding,
        invoiceCount: invoices.length,
        b2bRevenue,
        b2cRevenue,
        collectionRatePct: totalGrossInvoiced > 0 ? Math.round((totalCollected / totalGrossInvoiced) * 1000) / 10 : 0
      },
      chartData: Object.values(monthMap),
      table: invoices.map(i => ({
        invoiceNumber: i.invoiceNumber,
        date: i.invoiceDate.slice(0, 10),
        customer: customerMap.get(i.customerId)?.name || i.customerId,
        subtotal: `₹${(i.subtotal || 0).toLocaleString("en-IN")}`,
        total: `₹${(i.totalAmount || 0).toLocaleString("en-IN")}`,
        paid: `₹${(i.paidAmount || 0).toLocaleString("en-IN")}`,
        outstanding: `₹${(i.outstandingAmount || 0).toLocaleString("en-IN")}`,
        status: i.status
      }))
    };
  },

  /**
   * 2. Period-over-Period Sales Comparison
   */
  async compareSalesPeriods(organizationId, params = {}) {
    const periodA = params.periodA || "current_month";
    const periodB = params.periodB || "previous_month";

    const [summaryA, summaryB] = await Promise.all([
      this.getSalesSummary(organizationId, { period: periodA }),
      this.getSalesSummary(organizationId, { period: periodB }),
    ]);

    const revA = summaryA.metrics.totalRevenue;
    const revB = summaryB.metrics.totalRevenue;
    const diff = revA - revB;
    const pctChange = revB > 0 ? Math.round((diff / revB) * 1000) / 10 : (revA > 0 ? 100 : 0);

    return {
      periodA: { name: periodA, dateRange: summaryA.dateRange, revenue: revA, invoices: summaryA.metrics.invoiceCount },
      periodB: { name: periodB, dateRange: summaryB.dateRange, revenue: revB, invoices: summaryB.metrics.invoiceCount },
      difference: diff,
      percentageChange: pctChange,
      trend: diff >= 0 ? "GROWTH" : "DECLINE",
      chartData: [
        { period: periodB.replace("_", " ").toUpperCase(), revenue: revB, collections: summaryB.metrics.totalCollected },
        { period: periodA.replace("_", " ").toUpperCase(), revenue: revA, collections: summaryA.metrics.totalCollected },
      ]
    };
  },

  /**
   * 3. Top Products by Revenue and Gross Profit
   */
  async getTopProducts(organizationId, filters = {}) {
    const { startDate, endDate, formattedLabel } = resolveDateRange(
      filters.period || "current_fy",
      filters.startDate,
      filters.endDate
    );

    const [invoices, products] = await Promise.all([
      analyticsStore.getInvoices(organizationId, { startDate, endDate, excludeCancelled: true }),
      analyticsStore.getProducts(organizationId),
    ]);

    const productMap = new Map(products.map(p => [p.id, p]));
    const productStats = {};

    invoices.forEach(inv => {
      (inv.items || []).forEach(item => {
        const prod = productMap.get(item.productId);
        const prodId = item.productId;
        const name = prod?.name || `Product ${prodId}`;

        if (!productStats[prodId]) {
          productStats[prodId] = {
            id: prodId,
            sku: prod?.sku || "-",
            name,
            category: prod?.category || "General",
            unitsSold: 0,
            revenue: 0,
            cost: 0,
            grossProfit: 0
          };
        }

        const rev = item.totalAmount || (item.quantity * item.unitPrice);
        const cost = (item.quantity * (item.unitCost || prod?.costPrice || 0));

        productStats[prodId].unitsSold += item.quantity;
        productStats[prodId].revenue += rev;
        productStats[prodId].cost += cost;
        productStats[prodId].grossProfit += (rev - cost);
      });
    });

    let sortKey = "revenue";
    if (filters.sortBy === "gross_profit" || filters.sortBy === "profit" || filters.sortBy === "grossProfit") {
      sortKey = "grossProfit";
    } else if (filters.sortBy === "units" || filters.sortBy === "unitsSold") {
      sortKey = "unitsSold";
    } else if (filters.sortBy === "revenue") {
      sortKey = "revenue";
    }
    const sorted = Object.values(productStats).sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0));
    const limit = filters.limit || 10;
    const topResults = sorted.slice(0, limit);

    return {
      period: filters.period || "current_fy",
      dateRange: formattedLabel,
      sortBy: sortKey,
      products: topResults,
      chartData: topResults.map(p => ({
        name: p.name.length > 20 ? p.name.slice(0, 18) + "..." : p.name,
        revenue: p.revenue,
        profit: p.grossProfit
      })),
      table: topResults.map(p => ({
        sku: p.sku,
        name: p.name,
        category: p.category,
        unitsSold: p.unitsSold,
        revenue: `₹${p.revenue.toLocaleString("en-IN")}`,
        grossProfit: `₹${p.grossProfit.toLocaleString("en-IN")}`,
        marginPct: p.revenue > 0 ? `${Math.round((p.grossProfit / p.revenue) * 1000) / 10}%` : "0%"
      }))
    };
  },

  /**
   * 4. Salesperson Performance & Rankings
   */
  async getSalespersonRanking(organizationId, filters = {}) {
    const { startDate, endDate, formattedLabel } = resolveDateRange(
      filters.period || "current_fy",
      filters.startDate,
      filters.endDate
    );

    const [invoices, salespeople] = await Promise.all([
      analyticsStore.getInvoices(organizationId, { startDate, endDate, excludeCancelled: true }),
      analyticsStore.getSalespeople(organizationId),
    ]);

    const spMap = new Map(salespeople.map(s => [s.id, s]));
    const spStats = {};

    salespeople.forEach(s => {
      spStats[s.id] = {
        id: s.id,
        name: s.name,
        branch: s.branch,
        quota: s.quota,
        revenue: 0,
        collections: 0,
        invoicesCount: 0,
        grossProfit: 0
      };
    });

    invoices.forEach(inv => {
      const sp = spStats[inv.salespersonId];
      if (sp) {
        sp.revenue += inv.subtotal || 0;
        sp.collections += inv.paidAmount || 0;
        sp.invoicesCount += 1;
        const invoiceCost = (inv.items || []).reduce((sum, item) => sum + (item.quantity * (item.unitCost || 0)), 0);
        sp.grossProfit += ((inv.subtotal || 0) - invoiceCost);
      }
    });

    const metric = filters.metric || "revenue";
    const ranked = Object.values(spStats).sort((a, b) => b[metric] - a[metric]);

    return {
      period: filters.period || "current_fy",
      dateRange: formattedLabel,
      metric,
      salespeople: ranked,
      chartData: ranked.map(s => ({
        name: s.name,
        revenue: s.revenue,
        quota: s.quota,
        collections: s.collections
      })),
      table: ranked.map((s, idx) => ({
        rank: `#${idx + 1}`,
        name: s.name,
        branch: s.branch,
        revenue: `₹${s.revenue.toLocaleString("en-IN")}`,
        collections: `₹${s.collections.toLocaleString("en-IN")}`,
        invoices: s.invoicesCount,
        quotaAchievement: s.quota > 0 ? `${Math.round((s.revenue / s.quota) * 1000) / 10}%` : "N/A"
      }))
    };
  },

  /**
   * 5. Inventory & Stock Valuation
   */
  async getInventorySummary(organizationId, filters = {}) {
    const products = await analyticsStore.getProducts(organizationId);
    const lowStockOnly = Boolean(filters.lowStockOnly);

    let filtered = products.filter(p => !p.isService);
    if (lowStockOnly) {
      filtered = filtered.filter(p => p.stockQuantity <= p.reorderLevel);
    }

    const totalValuation = filtered.reduce((sum, p) => sum + (p.stockQuantity * p.costPrice), 0);
    const totalPotentialRetail = filtered.reduce((sum, p) => sum + (p.stockQuantity * p.unitPrice), 0);

    return {
      lowStockOnly,
      metrics: {
        totalSKUs: filtered.length,
        totalValuationCost: totalValuation,
        potentialRetailValue: totalPotentialRetail,
        lowStockAlertCount: products.filter(p => !p.isService && p.stockQuantity <= p.reorderLevel).length
      },
      chartData: filtered.map(p => ({
        name: p.name.length > 15 ? p.name.slice(0, 14) + "..." : p.name,
        stock: p.stockQuantity,
        reorderLevel: p.reorderLevel
      })),
      table: filtered.map(p => ({
        sku: p.sku,
        name: p.name,
        stock: p.stockQuantity,
        reorderLevel: p.reorderLevel,
        status: p.stockQuantity <= p.reorderLevel ? "LOW STOCK ALERT" : "HEALTHY",
        unitCost: `₹${p.costPrice.toLocaleString("en-IN")}`,
        valuation: `₹${(p.stockQuantity * p.costPrice).toLocaleString("en-IN")}`
      }))
    };
  },

  /**
   * 6. Outstanding Receivables & Aging
   */
  async getOutstandingReceivables(organizationId) {
    const [invoices, customers] = await Promise.all([
      analyticsStore.getInvoices(organizationId, { excludeCancelled: true }),
      analyticsStore.getCustomers(organizationId)
    ]);

    const customerMap = new Map(customers.map(c => [c.id, c]));
    const unpaid = invoices.filter(i => (i.outstandingAmount || 0) > 0);

    const now = new Date("2026-10-15T12:00:00Z");
    let bucket0to30 = 0;
    let bucket31to60 = 0;
    let bucket60plus = 0;

    const list = unpaid.map(i => {
      const dueDate = new Date(i.dueDate);
      const diffMs = now.getTime() - dueDate.getTime();
      const daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      const amt = i.outstandingAmount || 0;

      if (daysOverdue <= 30) bucket0to30 += amt;
      else if (daysOverdue <= 60) bucket31to60 += amt;
      else bucket60plus += amt;

      return {
        invoiceNumber: i.invoiceNumber,
        customer: customerMap.get(i.customerId)?.name || i.customerId,
        dueDate: i.dueDate.slice(0, 10),
        daysOverdue,
        total: `₹${(i.totalAmount || 0).toLocaleString("en-IN")}`,
        paid: `₹${(i.paidAmount || 0).toLocaleString("en-IN")}`,
        outstanding: `₹${amt.toLocaleString("en-IN")}`,
        rawOutstanding: amt
      };
    }).sort((a, b) => b.rawOutstanding - a.rawOutstanding);

    const totalOutstanding = bucket0to30 + bucket31to60 + bucket60plus;

    return {
      totalOutstanding,
      unpaidCount: unpaid.length,
      agingBuckets: {
        current0to30: bucket0to30,
        overdue31to60: bucket31to60,
        critical60plus: bucket60plus
      },
      chartData: [
        { bucket: "0-30 Days", amount: bucket0to30 },
        { bucket: "31-60 Days", amount: bucket31to60 },
        { bucket: "60+ Days", amount: bucket60plus },
      ],
      table: list
    };
  },

  /**
   * 7. Comprehensive Financial Summary (Profitability & Cash Flow)
   */
  async getFinancialSummary(organizationId, filters = {}) {
    const { startDate, endDate, formattedLabel } = resolveDateRange(
      filters.period || "current_month",
      filters.startDate,
      filters.endDate
    );

    const [invoices, expenses] = await Promise.all([
      analyticsStore.getInvoices(organizationId, { startDate, endDate, excludeCancelled: true }),
      analyticsStore.getExpenses(organizationId, { startDate, endDate })
    ]);

    let revenue = 0;
    let cogs = 0;
    let collections = 0;

    invoices.forEach(inv => {
      revenue += (inv.subtotal || 0);
      collections += (inv.paidAmount || 0);
      (inv.items || []).forEach(item => {
        cogs += (item.quantity * (item.unitCost || 0));
      });
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const grossProfit = revenue - cogs;
    const grossMarginPct = revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0;
    const netOperatingProfit = grossProfit - totalExpenses;

    return {
      period: filters.period || "current_month",
      dateRange: formattedLabel,
      metrics: {
        revenue,
        cogs,
        grossProfit,
        grossMarginPct,
        operatingExpenses: totalExpenses,
        netOperatingProfit,
        cashCollections: collections
      },
      chartData: [
        { metric: "Revenue", amount: revenue },
        { metric: "COGS", amount: cogs },
        { metric: "Gross Profit", amount: grossProfit },
        { metric: "Expenses", amount: totalExpenses },
        { metric: "Net Profit", amount: netOperatingProfit },
      ],
      table: expenses.map(e => ({
        number: e.expenseNumber,
        category: e.category,
        description: e.description,
        amount: `₹${(e.amount || 0).toLocaleString("en-IN")}`,
        date: e.expenseDate.slice(0, 10)
      }))
    };
  }
};
