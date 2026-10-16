import fs from "fs";
import path from "path";
import { queryDb, getDbPool } from "./dbPool.js";

const DEFAULT_ORG_ID = "org_ess_01";

function resolveDataFile(filename) {
  const primary = path.join(process.cwd(), "frontend", "data", filename);
  if (fs.existsSync(primary)) return primary;
  const direct = path.join(process.cwd(), "data", filename);
  if (fs.existsSync(direct)) return direct;
  if (process.cwd().endsWith("frontend")) return direct;
  return primary;
}

const CRM_DATA_FILE = resolveDataFile("crm_erp_data.json");

// Initial high-fidelity seed dataset representing Emperor Smart Solutions operations
const INITIAL_CRM_DATA = {
  customers: [
    { id: "cust_01", organizationId: DEFAULT_ORG_ID, name: "Nexus Healthcare Pvt Ltd", email: "procurement@nexushealth.in", phone: "+91 98201 11223", company: "Nexus Healthcare", type: "B2B", creditLimit: 500000, balance: 145000, status: "ACTIVE" },
    { id: "cust_02", organizationId: DEFAULT_ORG_ID, name: "Apex Logistics India", email: "billing@apexlogistics.com", phone: "+91 98112 33445", company: "Apex Logistics", type: "B2B", creditLimit: 800000, balance: 220000, status: "ACTIVE" },
    { id: "cust_03", organizationId: DEFAULT_ORG_ID, name: "Retail Spark Brands", email: "finance@retailspark.co", phone: "+91 99004 55667", company: "Retail Spark", type: "B2B", creditLimit: 400000, balance: 0, status: "ACTIVE" },
    { id: "cust_04", organizationId: DEFAULT_ORG_ID, name: "Horizon FinTech Labs", email: "accounts@horizonfin.io", phone: "+91 97123 66778", company: "Horizon FinTech", type: "B2B", creditLimit: 600000, balance: 85000, status: "ACTIVE" },
    { id: "cust_05", organizationId: DEFAULT_ORG_ID, name: "Dr. Ananya Roy", email: "ananya.roy@clinicmail.com", phone: "+91 98301 77889", company: "Roy Multispeciality Clinic", type: "B2C", creditLimit: 100000, balance: 15000, status: "ACTIVE" },
    { id: "cust_06", organizationId: DEFAULT_ORG_ID, name: "Suresh & Brothers Traders", email: "suresh.traders@gmail.com", phone: "+91 98450 88990", company: "Suresh Traders", type: "B2C", creditLimit: 150000, balance: 0, status: "ACTIVE" },
    { id: "cust_07", organizationId: DEFAULT_ORG_ID, name: "Vanguard Tech Systems", email: "operations@vanguardtech.in", phone: "+91 99887 11223", company: "Vanguard Tech", type: "B2B", creditLimit: 1000000, balance: 340000, status: "ACTIVE" },
    { id: "cust_08", organizationId: DEFAULT_ORG_ID, name: "Kavita Singhania", email: "kavita.singhania@boutique.in", phone: "+91 98765 43210", company: "Singhania Couture", type: "B2C", creditLimit: 80000, balance: 25000, status: "ACTIVE" }
  ],
  salespeople: [
    { id: "sp_01", organizationId: DEFAULT_ORG_ID, name: "Yash Sharma", email: "yash@emperorsmartsolutions.com", phone: "+91 98000 00001", branch: "Headquarters (Mumbai)", quota: 2500000, status: "ACTIVE" },
    { id: "sp_02", organizationId: DEFAULT_ORG_ID, name: "Karan Makwana", email: "karan@emperorsmartsolutions.com", phone: "+91 98000 00002", branch: "Headquarters (Mumbai)", quota: 2500000, status: "ACTIVE" },
    { id: "sp_03", organizationId: DEFAULT_ORG_ID, name: "Rahul Mehta", email: "rahul.mehta@emperorsmartsolutions.com", phone: "+91 98205 12345", branch: "Mumbai North Branch", quota: 1500000, status: "ACTIVE" },
    { id: "sp_04", organizationId: DEFAULT_ORG_ID, name: "Sneha Patel", email: "sneha.patel@emperorsmartsolutions.com", phone: "+91 98980 54321", branch: "Bangalore Tech Hub", quota: 1800000, status: "ACTIVE" },
    { id: "sp_05", organizationId: DEFAULT_ORG_ID, name: "Vikram Singh", email: "vikram.singh@emperorsmartsolutions.com", phone: "+91 99100 87654", branch: "Delhi NCR Branch", quota: 1400000, status: "ACTIVE" }
  ],
  products: [
    { id: "prod_01", organizationId: DEFAULT_ORG_ID, sku: "ESS-WEB-01", name: "Custom E-Commerce Platform", category: "Web Development", unitPrice: 85000, costPrice: 38000, stockQuantity: 999, reorderLevel: 0, unit: "project", isService: true },
    { id: "prod_02", organizationId: DEFAULT_ORG_ID, sku: "ESS-APP-01", name: "Cross-Platform Mobile Application", category: "Mobile Development", unitPrice: 145000, costPrice: 65000, stockQuantity: 999, reorderLevel: 0, unit: "project", isService: true },
    { id: "prod_03", organizationId: DEFAULT_ORG_ID, sku: "ESS-ERP-01", name: "Enterprise ERP Core Engine", category: "Enterprise Software", unitPrice: 380000, costPrice: 180000, stockQuantity: 999, reorderLevel: 0, unit: "license", isService: true },
    { id: "prod_04", organizationId: DEFAULT_ORG_ID, sku: "ESS-AI-BOT", name: "WhatsApp AI Sales Agent", category: "AI Solutions", unitPrice: 50000, costPrice: 16000, stockQuantity: 999, reorderLevel: 0, unit: "bot", isService: true },
    { id: "prod_05", organizationId: DEFAULT_ORG_ID, sku: "ESS-HW-01", name: "IoT Gateway Controller Unit", category: "Hardware & Devices", unitPrice: 18500, costPrice: 11000, stockQuantity: 8, reorderLevel: 25, unit: "unit", isService: false },
    { id: "prod_06", organizationId: DEFAULT_ORG_ID, sku: "ESS-HW-02", name: "Smart POS Cloud Terminal", category: "Hardware & Devices", unitPrice: 24000, costPrice: 15500, stockQuantity: 5, reorderLevel: 20, unit: "unit", isService: false },
    { id: "prod_07", organizationId: DEFAULT_ORG_ID, sku: "ESS-HW-03", name: "Industrial RFID Scanner Barcode Unit", category: "Hardware & Devices", unitPrice: 9500, costPrice: 5200, stockQuantity: 52, reorderLevel: 20, unit: "unit", isService: false },
    { id: "prod_08", organizationId: DEFAULT_ORG_ID, sku: "ESS-HW-04", name: "Enterprise Server Backup Appliance", category: "Hardware & Devices", unitPrice: 72000, costPrice: 46000, stockQuantity: 3, reorderLevel: 10, unit: "unit", isService: false },
    { id: "prod_09", organizationId: DEFAULT_ORG_ID, sku: "ESS-CLOUD-01", name: "DevOps & Cloud Architecture Retainer", category: "Cloud Services", unitPrice: 40000, costPrice: 14000, stockQuantity: 999, reorderLevel: 0, unit: "month", isService: true }
  ],
  invoices: [
    // Current Month: October 2026
    {
      id: "inv_101",
      organizationId: DEFAULT_ORG_ID,
      invoiceNumber: "INV-2026-1001",
      customerId: "cust_01",
      salespersonId: "sp_01",
      invoiceDate: "2026-10-03T10:00:00Z",
      dueDate: "2026-10-24T10:00:00Z",
      status: "PAID",
      subtotal: 145000,
      taxAmount: 26100, // 18% GST
      discountAmount: 0,
      totalAmount: 171100,
      paidAmount: 171100,
      outstandingAmount: 0,
      items: [
        { productId: "prod_02", quantity: 1, unitPrice: 145000, unitCost: 65000, totalAmount: 145000 }
      ]
    },
    {
      id: "inv_102",
      organizationId: DEFAULT_ORG_ID,
      invoiceNumber: "INV-2026-1002",
      customerId: "cust_02",
      salespersonId: "sp_04",
      invoiceDate: "2026-10-06T11:30:00Z",
      dueDate: "2026-10-27T11:30:00Z",
      status: "PARTIALLY_PAID",
      subtotal: 380000,
      taxAmount: 68400,
      discountAmount: 0,
      totalAmount: 448400,
      paidAmount: 228400,
      outstandingAmount: 220000,
      items: [
        { productId: "prod_03", quantity: 1, unitPrice: 380000, unitCost: 180000, totalAmount: 380000 }
      ]
    },
    {
      id: "inv_103",
      organizationId: DEFAULT_ORG_ID,
      invoiceNumber: "INV-2026-1003",
      customerId: "cust_04",
      salespersonId: "sp_02",
      invoiceDate: "2026-10-09T14:15:00Z",
      dueDate: "2026-10-30T14:15:00Z",
      status: "UNPAID",
      subtotal: 85000,
      taxAmount: 15300,
      discountAmount: 0,
      totalAmount: 100300,
      paidAmount: 15300,
      outstandingAmount: 85000,
      items: [
        { productId: "prod_01", quantity: 1, unitPrice: 85000, unitCost: 38000, totalAmount: 85000 }
      ]
    },
    {
      id: "inv_104",
      organizationId: DEFAULT_ORG_ID,
      invoiceNumber: "INV-2026-1004",
      customerId: "cust_05",
      salespersonId: "sp_03",
      invoiceDate: "2026-10-11T16:00:00Z",
      dueDate: "2026-10-25T16:00:00Z",
      status: "UNPAID",
      subtotal: 50000,
      taxAmount: 9000,
      discountAmount: 0,
      totalAmount: 59000,
      paidAmount: 44000,
      outstandingAmount: 15000,
      items: [
        { productId: "prod_04", quantity: 1, unitPrice: 50000, unitCost: 16000, totalAmount: 50000 }
      ]
    },
    {
      id: "inv_105",
      organizationId: DEFAULT_ORG_ID,
      invoiceNumber: "INV-2026-1005",
      customerId: "cust_07",
      salespersonId: "sp_05",
      invoiceDate: "2026-10-12T17:00:00Z",
      dueDate: "2026-11-02T17:00:00Z",
      status: "UNPAID",
      subtotal: 340000,
      taxAmount: 61200,
      discountAmount: 0,
      totalAmount: 401200,
      paidAmount: 61200,
      outstandingAmount: 340000,
      items: [
        { productId: "prod_02", quantity: 2, unitPrice: 145000, unitCost: 65000, totalAmount: 290000 },
        { productId: "prod_04", quantity: 1, unitPrice: 50000, unitCost: 16000, totalAmount: 50000 }
      ]
    },
    {
      id: "inv_106",
      organizationId: DEFAULT_ORG_ID,
      invoiceNumber: "INV-2026-1006",
      customerId: "cust_08",
      salespersonId: "sp_03",
      invoiceDate: "2026-10-14T12:00:00Z",
      dueDate: "2026-10-28T12:00:00Z",
      status: "UNPAID",
      subtotal: 85000,
      taxAmount: 15300,
      discountAmount: 0,
      totalAmount: 100300,
      paidAmount: 75300,
      outstandingAmount: 25000,
      items: [
        { productId: "prod_01", quantity: 1, unitPrice: 85000, unitCost: 38000, totalAmount: 85000 }
      ]
    },

    // Previous Month: September 2026
    {
      id: "inv_091",
      organizationId: DEFAULT_ORG_ID,
      invoiceNumber: "INV-2026-0901",
      customerId: "cust_03",
      salespersonId: "sp_01",
      invoiceDate: "2026-09-05T10:00:00Z",
      dueDate: "2026-09-26T10:00:00Z",
      status: "PAID",
      subtotal: 290000,
      taxAmount: 52200,
      discountAmount: 0,
      totalAmount: 342200,
      paidAmount: 342200,
      outstandingAmount: 0,
      items: [
        { productId: "prod_02", quantity: 2, unitPrice: 145000, unitCost: 65000, totalAmount: 290000 }
      ]
    },
    {
      id: "inv_092",
      organizationId: DEFAULT_ORG_ID,
      invoiceNumber: "INV-2026-0902",
      customerId: "cust_01",
      salespersonId: "sp_04",
      invoiceDate: "2026-09-12T14:00:00Z",
      dueDate: "2026-10-03T14:00:00Z",
      status: "PARTIALLY_PAID",
      subtotal: 215000,
      taxAmount: 38700,
      discountAmount: 0,
      totalAmount: 253700,
      paidAmount: 108700,
      outstandingAmount: 145000,
      items: [
        { productId: "prod_01", quantity: 1, unitPrice: 85000, unitCost: 38000, totalAmount: 85000 },
        { productId: "prod_02", quantity: 1, unitPrice: 145000, unitCost: 65000, totalAmount: 145000 },
        { productId: "prod_05", quantity: 1, unitPrice: 18500, unitCost: 11000, totalAmount: 18500 }
      ]
    },
    {
      id: "inv_093",
      organizationId: DEFAULT_ORG_ID,
      invoiceNumber: "INV-2026-0903",
      customerId: "cust_06",
      salespersonId: "sp_03",
      invoiceDate: "2026-09-18T16:00:00Z",
      dueDate: "2026-10-02T16:00:00Z",
      status: "PAID",
      subtotal: 95000,
      taxAmount: 17100,
      discountAmount: 0,
      totalAmount: 112100,
      paidAmount: 112100,
      outstandingAmount: 0,
      items: [
        { productId: "prod_04", quantity: 1, unitPrice: 50000, unitCost: 16000, totalAmount: 50000 },
        { productId: "prod_07", quantity: 5, unitPrice: 9000, unitCost: 5200, totalAmount: 45000 }
      ]
    },
    {
      id: "inv_094",
      organizationId: DEFAULT_ORG_ID,
      invoiceNumber: "INV-2026-0904",
      customerId: "cust_07",
      salespersonId: "sp_02",
      invoiceDate: "2026-09-24T11:00:00Z",
      dueDate: "2026-10-15T11:00:00Z",
      status: "CANCELLED",
      subtotal: 185000,
      taxAmount: 33300,
      discountAmount: 0,
      totalAmount: 218300,
      paidAmount: 0,
      outstandingAmount: 0,
      items: [
        { productId: "prod_02", quantity: 1, unitPrice: 145000, unitCost: 65000, totalAmount: 145000 },
        { productId: "prod_09", quantity: 1, unitPrice: 40000, unitCost: 14000, totalAmount: 40000 }
      ]
    },

    // Prior Months in FY 2026-2027 (April 2026 to August 2026)
    {
      id: "inv_081",
      organizationId: DEFAULT_ORG_ID,
      invoiceNumber: "INV-2026-0801",
      customerId: "cust_02",
      salespersonId: "sp_01",
      invoiceDate: "2026-08-14T10:00:00Z",
      dueDate: "2026-09-04T10:00:00Z",
      status: "PAID",
      subtotal: 425000,
      taxAmount: 76500,
      discountAmount: 0,
      totalAmount: 501500,
      paidAmount: 501500,
      outstandingAmount: 0,
      items: [
        { productId: "prod_03", quantity: 1, unitPrice: 380000, unitCost: 180000, totalAmount: 380000 },
        { productId: "prod_04", quantity: 1, unitPrice: 45000, unitCost: 16000, totalAmount: 45000 }
      ]
    },
    {
      id: "inv_071",
      organizationId: DEFAULT_ORG_ID,
      invoiceNumber: "INV-2026-0701",
      customerId: "cust_04",
      salespersonId: "sp_04",
      invoiceDate: "2026-07-20T10:00:00Z",
      dueDate: "2026-08-10T10:00:00Z",
      status: "PAID",
      subtotal: 310000,
      taxAmount: 55800,
      discountAmount: 0,
      totalAmount: 365800,
      paidAmount: 365800,
      outstandingAmount: 0,
      items: [
        { productId: "prod_02", quantity: 2, unitPrice: 145000, unitCost: 65000, totalAmount: 290000 },
        { productId: "prod_09", quantity: 1, unitPrice: 40000, unitCost: 14000, totalAmount: 40000 }
      ]
    },
    {
      id: "inv_061",
      organizationId: DEFAULT_ORG_ID,
      invoiceNumber: "INV-2026-0601",
      customerId: "cust_03",
      salespersonId: "sp_02",
      invoiceDate: "2026-06-15T10:00:00Z",
      dueDate: "2026-07-06T10:00:00Z",
      status: "PAID",
      subtotal: 270000,
      taxAmount: 48600,
      discountAmount: 0,
      totalAmount: 318600,
      paidAmount: 318600,
      outstandingAmount: 0,
      items: [
        { productId: "prod_01", quantity: 2, unitPrice: 85000, unitCost: 38000, totalAmount: 170000 },
        { productId: "prod_04", quantity: 2, unitPrice: 50000, unitCost: 16000, totalAmount: 100000 }
      ]
    },
    {
      id: "inv_051",
      organizationId: DEFAULT_ORG_ID,
      invoiceNumber: "INV-2026-0501",
      customerId: "cust_01",
      salespersonId: "sp_05",
      invoiceDate: "2026-05-18T10:00:00Z",
      dueDate: "2026-06-08T10:00:00Z",
      status: "PAID",
      subtotal: 380000,
      taxAmount: 68400,
      discountAmount: 0,
      totalAmount: 448400,
      paidAmount: 448400,
      outstandingAmount: 0,
      items: [
        { productId: "prod_03", quantity: 1, unitPrice: 380000, unitCost: 180000, totalAmount: 380000 }
      ]
    },
    {
      id: "inv_041",
      organizationId: DEFAULT_ORG_ID,
      invoiceNumber: "INV-2026-0401",
      customerId: "cust_07",
      salespersonId: "sp_01",
      invoiceDate: "2026-04-22T10:00:00Z",
      dueDate: "2026-05-13T10:00:00Z",
      status: "PAID",
      subtotal: 230000,
      taxAmount: 41400,
      discountAmount: 0,
      totalAmount: 271400,
      paidAmount: 271400,
      outstandingAmount: 0,
      items: [
        { productId: "prod_01", quantity: 1, unitPrice: 85000, unitCost: 38000, totalAmount: 85000 },
        { productId: "prod_02", quantity: 1, unitPrice: 145000, unitCost: 65000, totalAmount: 145000 }
      ]
    }
  ],
  payments: [
    { id: "pay_01", organizationId: DEFAULT_ORG_ID, paymentNumber: "PAY-2026-1001", invoiceId: "inv_101", customerId: "cust_01", paymentDate: "2026-10-04T12:00:00Z", amount: 171100, method: "NEFT/RTGS", reference: "NEFT-IN88219" },
    { id: "pay_02", organizationId: DEFAULT_ORG_ID, paymentNumber: "PAY-2026-1002", invoiceId: "inv_102", customerId: "cust_02", paymentDate: "2026-10-07T15:00:00Z", amount: 228400, method: "NEFT/RTGS", reference: "RTGS-993812" },
    { id: "pay_03", organizationId: DEFAULT_ORG_ID, paymentNumber: "PAY-2026-1003", invoiceId: "inv_103", customerId: "cust_04", paymentDate: "2026-10-10T11:00:00Z", amount: 15300, method: "UPI", reference: "UPI-481928" },
    { id: "pay_04", organizationId: DEFAULT_ORG_ID, paymentNumber: "PAY-2026-1004", invoiceId: "inv_104", customerId: "cust_05", paymentDate: "2026-10-12T13:30:00Z", amount: 44000, method: "UPI", reference: "UPI-771822" },
    { id: "pay_05", organizationId: DEFAULT_ORG_ID, paymentNumber: "PAY-2026-1005", invoiceId: "inv_105", customerId: "cust_07", paymentDate: "2026-10-13T10:00:00Z", amount: 61200, method: "NetBanking", reference: "HDFC-55102" },
    { id: "pay_06", organizationId: DEFAULT_ORG_ID, paymentNumber: "PAY-2026-1006", invoiceId: "inv_106", customerId: "cust_08", paymentDate: "2026-10-14T17:00:00Z", amount: 75300, method: "UPI", reference: "UPI-918237" },
    { id: "pay_07", organizationId: DEFAULT_ORG_ID, paymentNumber: "PAY-2026-0901", invoiceId: "inv_091", customerId: "cust_03", paymentDate: "2026-09-06T11:00:00Z", amount: 342200, method: "NEFT/RTGS", reference: "NEFT-77112" },
    { id: "pay_08", organizationId: DEFAULT_ORG_ID, paymentNumber: "PAY-2026-0902", invoiceId: "inv_092", customerId: "cust_01", paymentDate: "2026-09-15T16:00:00Z", amount: 108700, method: "NetBanking", reference: "ICICI-8812" },
    { id: "pay_09", organizationId: DEFAULT_ORG_ID, paymentNumber: "PAY-2026-0903", invoiceId: "inv_093", customerId: "cust_06", paymentDate: "2026-09-20T10:00:00Z", amount: 112100, method: "UPI", reference: "UPI-66152" }
  ],
  expenses: [
    { id: "exp_01", organizationId: DEFAULT_ORG_ID, expenseNumber: "EXP-2026-1001", category: "Cloud Infrastructure", description: "AWS & Hetzner GPU Nodes", amount: 48500, expenseDate: "2026-10-02T10:00:00Z" },
    { id: "exp_02", organizationId: DEFAULT_ORG_ID, expenseNumber: "EXP-2026-1002", category: "Office & Operations", description: "Headquarters Mumbai Co-working Lease", amount: 65000, expenseDate: "2026-10-05T10:00:00Z" },
    { id: "exp_03", organizationId: DEFAULT_ORG_ID, expenseNumber: "EXP-2026-1003", category: "Software & SaaS", description: "GitHub Enterprise, Notion, Figma & Datadog", amount: 24000, expenseDate: "2026-10-08T10:00:00Z" },
    { id: "exp_04", organizationId: DEFAULT_ORG_ID, expenseNumber: "EXP-2026-0901", category: "Cloud Infrastructure", description: "AWS & Hetzner GPU Nodes", amount: 46000, expenseDate: "2026-09-02T10:00:00Z" },
    { id: "exp_05", organizationId: DEFAULT_ORG_ID, expenseNumber: "EXP-2026-0902", category: "Marketing & Growth", description: "LinkedIn Lead Gen & Tech Events", amount: 35000, expenseDate: "2026-09-10T10:00:00Z" }
  ],
  conversations: [],
  reports: []
};

let memoryCrmCache = null;
let lastFileMtime = 0;

function loadCrmData() {
  try {
    if (!fs.existsSync(CRM_DATA_FILE)) {
      const dir = path.dirname(CRM_DATA_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(CRM_DATA_FILE, JSON.stringify(INITIAL_CRM_DATA, null, 2), "utf8");
      memoryCrmCache = JSON.parse(JSON.stringify(INITIAL_CRM_DATA));
      lastFileMtime = fs.statSync(CRM_DATA_FILE).mtimeMs;
      return memoryCrmCache;
    }

    const stat = fs.statSync(CRM_DATA_FILE);
    if (memoryCrmCache && stat.mtimeMs === lastFileMtime) {
      return memoryCrmCache;
    }

    const raw = fs.readFileSync(CRM_DATA_FILE, "utf8");
    memoryCrmCache = JSON.parse(raw);
    lastFileMtime = stat.mtimeMs;
    return memoryCrmCache;
  } catch (err) {
    console.error("[ANALYTICS_STORE] Failed reading crm data file:", err);
    if (!memoryCrmCache) {
      memoryCrmCache = JSON.parse(JSON.stringify(INITIAL_CRM_DATA));
    }
    return memoryCrmCache;
  }
}

function saveCrmData(data) {
  try {
    memoryCrmCache = data;
    const dir = path.dirname(CRM_DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CRM_DATA_FILE, JSON.stringify(data, null, 2), "utf8");
    lastFileMtime = fs.statSync(CRM_DATA_FILE).mtimeMs;
  } catch (err) {
    console.error("[ANALYTICS_STORE] Failed saving crm data file:", err);
  }
}

function matchesOrg(recordOrgId, requestedOrgId) {
  if (!requestedOrgId) return true;
  if (recordOrgId === requestedOrgId) return true;
  // Map default tenant aliases
  if (
    (recordOrgId === "org_ess_01" || recordOrgId === "org_ess_default") &&
    (requestedOrgId === "org_ess_01" || requestedOrgId === "org_ess_default")
  ) {
    return true;
  }
  return false;
}

export const analyticsStore = {
  // Customers
  async getCustomers(organizationId) {
    const data = loadCrmData();
    return (data.customers || []).filter(c => matchesOrg(c.organizationId, organizationId));
  },

  // Salespeople
  async getSalespeople(organizationId) {
    const data = loadCrmData();
    return (data.salespeople || []).filter(s => matchesOrg(s.organizationId, organizationId));
  },

  // Products
  async getProducts(organizationId) {
    const data = loadCrmData();
    return (data.products || []).filter(p => matchesOrg(p.organizationId, organizationId));
  },

  // Invoices (filter by date, status, customer, salesperson)
  async getInvoices(organizationId, filters = {}) {
    const data = loadCrmData();
    let invoices = (data.invoices || []).filter(i => matchesOrg(i.organizationId, organizationId));

    if (filters.status && filters.status !== "ALL") {
      invoices = invoices.filter(i => i.status === filters.status);
    }
    if (filters.excludeCancelled !== false) {
      invoices = invoices.filter(i => i.status !== "CANCELLED");
    }
    if (filters.startDate) {
      const start = new Date(filters.startDate).getTime();
      invoices = invoices.filter(i => new Date(i.invoiceDate).getTime() >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate).getTime();
      invoices = invoices.filter(i => new Date(i.invoiceDate).getTime() <= end);
    }
    if (filters.salespersonId) {
      invoices = invoices.filter(i => i.salespersonId === filters.salespersonId);
    }
    if (filters.customerId) {
      invoices = invoices.filter(i => i.customerId === filters.customerId);
    }

    return invoices;
  },

  // Payments
  async getPayments(organizationId, filters = {}) {
    const data = loadCrmData();
    let payments = (data.payments || []).filter(p => matchesOrg(p.organizationId, organizationId));

    if (filters.startDate) {
      const start = new Date(filters.startDate).getTime();
      payments = payments.filter(p => new Date(p.paymentDate).getTime() >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate).getTime();
      payments = payments.filter(p => new Date(p.paymentDate).getTime() <= end);
    }
    return payments;
  },

  // Expenses
  async getExpenses(organizationId, filters = {}) {
    const data = loadCrmData();
    let expenses = (data.expenses || []).filter(e => matchesOrg(e.organizationId, organizationId));

    if (filters.startDate) {
      const start = new Date(filters.startDate).getTime();
      expenses = expenses.filter(e => new Date(e.expenseDate).getTime() >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate).getTime();
      expenses = expenses.filter(e => new Date(e.expenseDate).getTime() <= end);
    }
    return expenses;
  },

  // Analytics Conversations
  async getConversations(organizationId, userId) {
    const data = loadCrmData();
    return (data.conversations || []).filter(c => 
      c.organizationId === organizationId && (!userId || c.userId === userId)
    ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  async getConversation(id, organizationId, userId) {
    const data = loadCrmData();
    const conv = (data.conversations || []).find(c => 
      c.id === id && c.organizationId === organizationId && (!userId || c.userId === userId)
    );
    return conv || null;
  },

  async saveConversation(conversation) {
    const data = loadCrmData();
    data.conversations = data.conversations || [];
    const index = data.conversations.findIndex(c => c.id === conversation.id);
    if (index >= 0) {
      data.conversations[index] = { ...data.conversations[index], ...conversation, updatedAt: new Date().toISOString() };
    } else {
      data.conversations.push({
        ...conversation,
        createdAt: conversation.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: conversation.messages || []
      });
    }
    saveCrmData(data);
    return conversation;
  },

  // Analytics Reports
  async saveReport(report) {
    const data = loadCrmData();
    data.reports = data.reports || [];
    const index = data.reports.findIndex(r => r.id === report.id);
    if (index >= 0) {
      data.reports[index] = { ...data.reports[index], ...report };
    } else {
      data.reports.push(report);
    }
    saveCrmData(data);
    return report;
  },

  async getReports(organizationId, userId) {
    const data = loadCrmData();
    return (data.reports || []).filter(r => 
      r.organizationId === organizationId && (!userId || r.userId === userId)
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getReport(id, organizationId) {
    const data = loadCrmData();
    return (data.reports || []).find(r => r.id === id && r.organizationId === organizationId) || null;
  }
};
