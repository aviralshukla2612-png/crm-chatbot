/**
 * SaaS Subscription Plans & Quota Configuration
 * Currency: INR (India-First default)
 */

export const PLANS = {
  STARTER: {
    id: "STARTER",
    name: "Starter",
    description: "Ideal for early-stage startups and small local businesses.",
    priceINR: 2499,
    priceMonthly: "₹2,499",
    currency: "INR",
    maxBots: 1,
    maxMessagesPerMonth: 500,
    maxKnowledgePages: 10,
    features: [
      "1 AI Sales Bot",
      "500 qualified messages / month",
      "10 Website knowledge pages",
      "Lead capture with email/phone",
      "Standard email support",
    ],
    razorpayPlanId: process.env.RAZORPAY_PLAN_STARTER || "plan_starter_sandbox",
  },

  GROWTH: {
    id: "GROWTH",
    name: "Growth",
    description: "For growing businesses requiring multi-channel sales automation.",
    priceINR: 7999,
    priceMonthly: "₹7,999",
    currency: "INR",
    maxBots: 5,
    maxMessagesPerMonth: 5000,
    maxKnowledgePages: 50,
    features: [
      "5 AI Sales Bots",
      "5,000 qualified messages / month",
      "50 Website knowledge pages",
      "WhatsApp Cloud API integration",
      "Custom domain locking & branding",
      "Priority webhook dispatching",
    ],
    razorpayPlanId: process.env.RAZORPAY_PLAN_GROWTH || "plan_growth_sandbox",
  },

  ENTERPRISE: {
    id: "ENTERPRISE",
    name: "Enterprise",
    description: "High-volume IT firms, institutions, and corporate sales desks.",
    priceINR: 24999,
    priceMonthly: "₹24,999",
    currency: "INR",
    maxBots: 999,
    maxMessagesPerMonth: 50000,
    maxKnowledgePages: 500,
    features: [
      "Unlimited AI Sales Bots",
      "50,000 qualified messages / month",
      "500 Website knowledge pages",
      "Fine-tuned custom LoRA weights",
      "Dedicated account manager",
      "Custom SLA & 99.9% uptime",
    ],
    razorpayPlanId: process.env.RAZORPAY_PLAN_ENTERPRISE || "plan_enterprise_sandbox",
  },
};

export function getPlan(planId = "STARTER") {
  const normalized = (planId || "STARTER").toUpperCase();
  return PLANS[normalized] || PLANS.STARTER;
}
