// Realistic Mock Data for Multi-tenant AI Chatbot SaaS

export const mockCurrentUser = {
  id: "usr_01",
  name: "Emperor Smart Solution",
  email: "admin@emperorsmartsolutions.com",
  role: "SUPER_ADMIN", // Can be OWNER, ADMIN, MEMBER, or SUPER_ADMIN
  organizationId: "org_ess_01",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=face",
};

export const mockOrganizations = [
  {
    id: "org_ess_01",
    name: "Emperor Smart Solutions",
    slug: "emperor-solutions",
    owner: "Emperor Smart Solution",
    plan: "Enterprise",
    status: "ACTIVE",
    botsCount: 1,
    usersCount: 1,
    conversationsCount: 0,
    leadsCount: 0,
    createdAt: "2026-01-15T09:00:00Z",
    lastActive: "Just now",
  },
];

export const mockBots = [];

export const mockDocuments = [];

export const mockQAPairs = [];

export const mockWebsites = [];

export const mockKnowledgeGaps = [];

export const mockLeads = [];

export const mockConversations = [];

export const mockPopularQuestions = [
  {
    rank: 1,
    question: "What is your pricing for ERP Starter vs Professional?",
    askedCount: 428,
    answerRate: 98.4,
    category: "ERP Development",
  },
  {
    rank: 2,
    question: "How much does an e-commerce website development cost?",
    askedCount: 317,
    answerRate: 96.1,
    category: "Web Development",
  },
  {
    rank: 3,
    question: "Can we get discounts on software development projects?",
    askedCount: 208,
    answerRate: 100.0,
    category: "Commercial Policy",
  },
  {
    rank: 4,
    question: "What are your standard project payment milestones?",
    askedCount: 174,
    answerRate: 95.0,
    category: "Contracts",
  },
  {
    rank: 5,
    question: "How long does it take to deliver a cross-platform mobile app?",
    askedCount: 142,
    answerRate: 92.3,
    category: "Mobile Apps",
  },
];

export const mockTimeseriesData = [
  { date: "Oct 1", conversations: 120, questions: 340, leads: 8 },
  { date: "Oct 5", conversations: 240, questions: 680, leads: 18 },
  { date: "Oct 10", conversations: 310, questions: 890, leads: 22 },
  { date: "Oct 15", conversations: 280, questions: 810, leads: 19 },
  { date: "Oct 20", conversations: 390, questions: 1120, leads: 28 },
  { date: "Oct 25", conversations: 460, questions: 1350, leads: 34 },
  { date: "Oct 30", conversations: 540, questions: 1580, leads: 39 },
];

export const mockTeamMembers = [
  {
    id: "tm_01",
    name: "Emperor Smart Solution",
    email: "admin@emperorsmartsolutions.com",
    role: "Admin",
    status: "Active",
    addedDate: "2026-01-15",
  },
];

export const mockSystemHealth = [
  {
    service: "ESS AI Neural Engine",
    status: "ONLINE",
    latency: "42ms",
    model: "ESS-Neural-v2 (Enterprise)",
    lastChecked: "10 seconds ago",
    uptime: "99.98%",
    details: "High-throughput inference node healthy",
  },
  {
    service: "Qdrant Vector Database",
    status: "ONLINE",
    latency: "14ms",
    model: "768-dim embeddings",
    lastChecked: "12 seconds ago",
    uptime: "100.0%",
    details: "Collections indexed and cluster synchronizing",
  },
  {
    service: "PostgreSQL & pgvector",
    status: "ONLINE",
    latency: "8ms",
    model: "pgvector:pg16",
    lastChecked: "8 seconds ago",
    uptime: "99.99%",
    details: "Connection pool 18/50 active",
  },
  {
    service: "n8n Workflow Automation",
    status: "ONLINE",
    latency: "28ms",
    model: "Webhook Engine v1.34",
    lastChecked: "15 seconds ago",
    uptime: "99.95%",
    details: "RAG Pipeline webhooks operational",
  },
  {
    service: "FastAPI Orchestration Gateway",
    status: "ONLINE",
    latency: "18ms",
    model: "Uvicorn worker pool",
    lastChecked: "5 seconds ago",
    uptime: "100.0%",
    details: "REST Endpoints responsive at port 8000",
  },
];

export const mockPlatformUsage = {
  totalOrganizations: "2,481",
  totalUsers: "8,932",
  totalBots: "4,182",
  totalConversations: "1.2M",
  totalQuestions: "4.8M",
  totalLeads: "182K",
  platformUptime: "98.4%",
  monthlyRevenue: "₹12.4L",
  activeBots: 3890,
  monthlyUsage: "94.2%",
  llmTokens: "4.8M / 10M",
  documentsProcessed: 18400,
  vectorEmbeddings: 124800,
  storageUsed: "18.4 GB / 100 GB",
};
