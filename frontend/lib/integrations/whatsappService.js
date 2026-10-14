/**
 * Meta WhatsApp Cloud API Service
 * Handles challenge verification, HMAC SHA-256 signature verification,
 * inbound message normalization, and outbound message dispatching.
 */

import crypto from "crypto";
import { ALL_ESS_SERVICES, handleSalesFlowTurn } from "../ai/salesFlowManager.js";
import { extractLeadDetails } from "../ai/leadExtractor.js";
import { buildMasterSystemPrompt, checkInputScopeAndSafety } from "../ai/masterPrompt.js";
import { InferenceProvider } from "../ai/inferenceProvider.js";
import { conversationsStore } from "../db/conversationsStore.js";
import { leadsStore } from "../db/leadsStore.js";
import { botsStore } from "../db/botsStore.js";

const DEFAULT_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || (process.env.NODE_ENV === "production" ? "" : "ess_whatsapp_verify_token_default");
const processedWhatsAppMessages = new Set();

export const whatsappService = {
  _resetMemoryStore() {
    processedWhatsAppMessages.clear();
  },

  /**
   * Verify Meta Webhook Subscription Challenge (GET).
   */
  verifyChallenge({ mode, token, challenge, expectedToken = DEFAULT_VERIFY_TOKEN }) {
    if (!expectedToken) {
      return { ok: false, error: "WhatsApp integration is not enabled in this environment." };
    }
    if (mode === "subscribe" && token === expectedToken) {
      return { ok: true, challenge };
    }
    return { ok: false, error: "Verification failed. Invalid token." };
  },

  /**
   * Verify Meta Webhook HMAC SHA-256 signature (POST).
   */
  verifySignature(rawBody, signature, secret = process.env.WHATSAPP_APP_SECRET) {
    if (!secret) {
      if (process.env.NODE_ENV === "production") {
        return false; // In production, unauthenticated webhooks without a secret are strictly rejected
      }
      return true; // Signature check skipped if no secret provided in dev/sandbox
    }
    if (!rawBody || !signature) return false;

    const [algo, sig] = signature.split("=");
    if (algo !== "sha256" || !sig) return false;

    try {
      const expectedSig = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");

      const sigBuf = Buffer.from(sig, "hex");
      const expBuf = Buffer.from(expectedSig, "hex");

      if (sigBuf.length !== expBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, expBuf);
    } catch {
      return false;
    }
  },

  /**
   * Normalize an incoming Meta WhatsApp Cloud API webhook body.
   */
  normalizeIncomingPayload(body) {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0]?.value;

    if (!change || !change.messages || change.messages.length === 0) {
      return { isMessage: false, statusUpdate: true };
    }

    const messageObj = change.messages[0];
    return {
      isMessage: true,
      senderPhone: messageObj.from,
      messageId: messageObj.id,
      text: messageObj.text?.body || "",
      phoneNumberId: change.metadata?.phone_number_id,
      timestamp: messageObj.timestamp,
    };
  },

  /**
   * Process incoming message, run sales state machine, capture lead, and return reply.
   */
  async handleInboundMessage({ senderPhone, messageId, text, phoneNumberId, organizationId = "org_ess_default", botId = "bot_aa" }) {
    // Idempotency check
    if (processedWhatsAppMessages.has(messageId)) {
      return { status: "duplicate_skipped", duplicate: true };
    }
    processedWhatsAppMessages.add(messageId);

    const bot = botsStore.getBot(botId, organizationId) || botsStore.getBot("bot_aa");
    const sessionId = `wa_${senderPhone}`;

    // 1. Resolve or create conversation
    let conv = conversationsStore.getConversation(sessionId, organizationId);
    if (!conv) {
      conv = conversationsStore.createConversation({
        id: sessionId,
        organizationId,
        botId: bot?.id || "bot_aa",
        botName: bot?.name || "WhatsApp Assistant",
        visitorPhone: senderPhone,
        visitorName: "WhatsApp Lead",
        visitorLocation: "WhatsApp",
      });
    }

    // 2. Safety and scope check
    const safety = checkInputScopeAndSafety(text, bot?.company || "Emperor Smart Solutions");
    let replyText = "";

    if (safety.blocked) {
      replyText = safety.reply;
    } else {
      // 3. Sales flow turn execution
      const flowResult = handleSalesFlowTurn({
        userMessage: text,
        history: conv.messages || [],
        qualification: conv.qualification || null,
        botName: bot?.name || "Emperor AI",
        companyName: bot?.company || "Emperor Smart Solutions",
        services: ALL_ESS_SERVICES,
      });

      if (flowResult && flowResult.reply) {
        replyText = flowResult.reply;
      } else {
        try {
          const messages = [
            { role: "system", content: buildMasterSystemPrompt(bot?.company || "Emperor Smart Solutions", bot?.name || "Emperor AI") },
            ...(conv.messages || []).slice(-6),
            { role: "user", content: text },
          ];
          replyText = await InferenceProvider.generate({ messages, maxTokens: 256 });
        } catch (infErr) {
          replyText = `Thank you for reaching out to ${bot?.company || "Emperor Smart Solutions"}. We specialize in web, mobile, and custom AI software. Our technology team will connect with you shortly!`;
        }
      }

      // 4. Lead extraction & capture
      const extracted = extractLeadDetails(text, [
        ...(conv.messages || []),
        { role: "user", content: text },
      ]);

      if (extracted?.hasLeadInfo) {
        leadsStore.createLead({
          organizationId,
          botId: bot?.id || "bot_aa",
          name: extracted.name || conv.visitorName || "WhatsApp Lead",
          email: extracted.email || null,
          phone: extracted.phone || senderPhone,
          company: "WhatsApp Inbound",
          source: "WhatsApp Cloud API",
          score: extracted.score || "High",
          inquiry: text,
        });
      }
    }

    // Record turn in conversation
    conversationsStore.addMessage(sessionId, "user", text);
    conversationsStore.addMessage(sessionId, "assistant", replyText);

    return {
      status: "success",
      reply: replyText,
      phoneNumberId,
      senderPhone,
    };
  },
};
