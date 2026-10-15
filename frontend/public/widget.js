/**
 * NexusAI Standalone Embeddable Chatbot Widget
 * Version: 1.2.0
 * Zero-dependency, pure vanilla JavaScript widget.
 * Works seamlessly across any website: HTML, WordPress, Shopify, Webflow, Wix, Squarespace, React, Vue, Angular.
 */
(function () {
  "use strict";

  // Prevent multiple executions on the same page
  if (window.__NEXUS_WIDGET_INITIALIZED__) return;
  window.__NEXUS_WIDGET_INITIALIZED__ = true;

  // 1. Identify Host Script Tag
  function findScript() {
    if (document.currentScript) return document.currentScript;
    const byBotId = document.querySelector("script[data-bot-id]");
    if (byBotId) return byBotId;
    const bySrc = document.querySelector('script[src*="widget.js"]');
    if (bySrc) return bySrc;
    return null;
  }

  const scriptTag = findScript();
  const botId =
    (scriptTag && scriptTag.getAttribute("data-bot-id")) ||
    window.NEXUS_BOT_ID ||
    "aa";

  // 2. Derive Server API Base URL
  let apiBase = "";
  if (scriptTag && scriptTag.getAttribute("data-api-url")) {
    apiBase = scriptTag.getAttribute("data-api-url").replace(/\/+$/, "");
  } else if (scriptTag && scriptTag.src) {
    try {
      const parsed = new URL(scriptTag.src);
      apiBase = `${parsed.protocol}//${parsed.host}`;
    } catch (e) {
      apiBase = window.location.origin;
    }
  } else {
    apiBase = window.location.origin;
  }

  // Session state & persistent identity defaults
  const sessionKey = `nexus_chat_v2_${botId}`;
  let activeSessionId = "";
  let visitorToken = null;
  try {
    visitorToken = localStorage.getItem(`ess_vtoken_${botId}`);
  } catch (e) {}

  try {
    activeSessionId = sessionStorage.getItem(`${sessionKey}_id`);
  } catch (e) {}
  if (!activeSessionId) {
    activeSessionId = `visitor_${botId}_${Date.now()}`;
    try { sessionStorage.setItem(`${sessionKey}_id`, activeSessionId); } catch (e) {}
  }

  let isOpen = false;
  let isLoading = false;

  let botConfig = {
    id: botId,
    name: "AI Assistant",
    avatar: "🤖",
    primaryColor: (scriptTag && scriptTag.getAttribute("data-color")) || "#4f46e5",
    welcomeMessage:
      (scriptTag && scriptTag.getAttribute("data-welcome")) ||
      "Hello! How can I help you today?",
    placeholderText: "Type your message...",
    launcherPosition:
      (scriptTag && scriptTag.getAttribute("data-position")) || "bottom-right",
    brandingEnabled:
      scriptTag && scriptTag.getAttribute("data-branding") === "false" ? false : true,
  };

  let messages = [];
  try {
    const saved = sessionStorage.getItem(sessionKey);
    if (saved) messages = JSON.parse(saved);
  } catch (e) {}

  // 3. Fetch Live Bot Configuration
  fetch(`${apiBase}/api/bots/${encodeURIComponent(botId)}/widget-config`)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (data && data.bot) {
        botConfig = {
          ...botConfig,
          ...data.bot,
          primaryColor: (scriptTag && scriptTag.getAttribute("data-color")) || data.bot.primaryColor || "#4f46e5",
          welcomeMessage: (scriptTag && scriptTag.getAttribute("data-welcome")) || data.bot.welcomeMessage || "Hello! How can I help you today?",
          launcherPosition: (scriptTag && scriptTag.getAttribute("data-position")) || data.bot.launcherPosition || "bottom-right",
        };
        applyTheme();
        renderMessages();
      }
    })
    .catch((err) => {
      console.warn("[NexusAI Widget] Using local configuration defaults.", err);
    });

  // 3.1. Fetch or Restore 24-Hour Active Conversation Session & Customer Identity
  function initVisitorSession() {
    const headers = {};
    if (visitorToken) headers["x-visitor-token"] = visitorToken;

    fetch(`${apiBase}/api/public/chat/${encodeURIComponent(botId)}/session`, {
      method: "GET",
      headers,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || !data.success) return;

        if (data.visitorToken) {
          visitorToken = data.visitorToken;
          try { localStorage.setItem(`ess_vtoken_${botId}`, data.visitorToken); } catch (e) {}
        }

        if (data.conversationId) {
          activeSessionId = data.conversationId;
          try { sessionStorage.setItem(`${sessionKey}_id`, activeSessionId); } catch (e) {}
        }

        if (data.hasActiveChat && Array.isArray(data.messages) && data.messages.length > 0) {
          // Restoring conversation within 24 hours
          messages = data.messages;
          try { sessionStorage.setItem(sessionKey, JSON.stringify(messages)); } catch (e) {}
          renderMessages();
        } else if (data.isReturning && data.returningGreeting) {
          // Returning visitor after 24h: show personalized returning greeting, fresh chat
          botConfig.welcomeMessage = data.returningGreeting;
          messages = [];
          try { sessionStorage.removeItem(sessionKey); } catch (e) {}
          renderMessages();
        }
      })
      .catch((e) => {
        console.warn("[NexusAI Widget] Session sync failed, operating with fallback session.", e);
      });
  }
  initVisitorSession();

  // 4. Create Container & Inject Scoped Styles
  const container = document.createElement("div");
  container.id = "nexus-chatbot-widget-container";
  container.setAttribute("data-nexus-version", "1.2.0");

  const style = document.createElement("style");
  style.id = "nexus-widget-styles";
  style.textContent = `
    #nexus-chatbot-widget-container {
      position: fixed;
      bottom: 24px;
      ${botConfig.launcherPosition === "bottom-left" ? "left: 24px;" : "right: 24px;"}
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      box-sizing: border-box;
    }
    #nexus-chatbot-widget-container * {
      box-sizing: border-box;
    }
    #nexus-widget-launcher {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${botConfig.primaryColor};
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
      border: none;
      outline: none;
      user-select: none;
    }
    #nexus-widget-launcher:hover {
      transform: scale(1.08);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.26);
    }
    #nexus-widget-launcher:active {
      transform: scale(0.96);
    }
    #nexus-widget-window {
      display: none;
      position: absolute;
      bottom: 76px;
      ${botConfig.launcherPosition === "bottom-left" ? "left: 0;" : "right: 0;"}
      width: 380px;
      max-width: calc(100vw - 32px);
      height: 580px;
      max-height: calc(100vh - 110px);
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.18), 0 4px 14px rgba(0, 0, 0, 0.08);
      overflow: hidden;
      flex-direction: column;
      border: 1px solid rgba(0, 0, 0, 0.08);
      animation: nexusPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes nexusPopIn {
      from { opacity: 0; transform: translateY(16px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .nexus-header {
      background: ${botConfig.primaryColor};
      color: #ffffff;
      padding: 16px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    .nexus-header-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .nexus-avatar-badge {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
    }
    .nexus-header-title {
      font-weight: 700;
      font-size: 14.5px;
      line-height: 1.25;
      letter-spacing: -0.01em;
    }
    .nexus-header-status {
      font-size: 11px;
      opacity: 0.9;
      display: flex;
      align-items: center;
      gap: 5px;
      margin-top: 2px;
    }
    .nexus-status-dot {
      width: 7px;
      height: 7px;
      background: #34d399;
      border-radius: 50%;
      box-shadow: 0 0 0 2px rgba(52, 211, 153, 0.3);
    }
    .nexus-btn-icon {
      background: none;
      border: none;
      color: #ffffff;
      cursor: pointer;
      opacity: 0.85;
      padding: 6px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.15s, background-color 0.15s;
    }
    .nexus-btn-icon:hover {
      opacity: 1;
      background-color: rgba(255, 255, 255, 0.15);
    }
    .nexus-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #f8fafc;
    }
    .nexus-msg {
      max-width: 84%;
      padding: 11px 15px;
      border-radius: 16px;
      font-size: 13px;
      line-height: 1.48;
      word-break: break-word;
    }
    .nexus-msg-user {
      align-self: flex-end;
      background: ${botConfig.primaryColor};
      color: #ffffff !important;
      border-bottom-right-radius: 4px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    }
    .nexus-msg-user,
    .nexus-msg-user * {
      color: #ffffff !important;
    }
    .nexus-msg-user a {
      color: #ffffff !important;
      text-decoration: underline !important;
      font-weight: 600 !important;
      word-break: break-all !important;
    }
    .nexus-msg-user strong {
      color: #ffffff !important;
      font-weight: 700 !important;
    }
    .nexus-msg-bot {
      align-self: flex-start;
      background: #ffffff;
      color: #1e293b;
      border: 1px solid #e2e8f0;
      border-bottom-left-radius: 4px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
    }
    .nexus-quick-replies {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
    }
    .nexus-quick-reply-btn {
      background: #ffffff;
      color: ${botConfig.primaryColor};
      border: 1.5px solid ${botConfig.primaryColor};
      padding: 6px 12px;
      border-radius: 14px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .nexus-quick-reply-btn:hover {
      background: ${botConfig.primaryColor};
      color: #ffffff;
      transform: translateY(-1px);
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    }
    .nexus-quick-reply-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      border-color: #cbd5e1;
      color: #64748b;
      background: #f1f5f9;
      transform: none;
      box-shadow: none;
    }
    #nexus-chatbot-widget-container strong,
    #nexus-chatbot-widget-container b,
    .nexus-msg strong,
    .nexus-msg b,
    .nexus-msg-bot strong,
    .nexus-msg-bot b {
      font-weight: 700 !important;
      color: #0f172a !important;
      opacity: 1 !important;
      filter: none !important;
      -webkit-text-fill-color: #0f172a !important;
      display: inline !important;
    }
    .nexus-msg-bot a {
      color: #4f46e5 !important;
      font-weight: 600 !important;
      text-decoration: underline !important;
    }
    .nexus-source-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-top: 8px;
      font-size: 10.5px;
      color: #475569;
      background: #f1f5f9;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .nexus-input-bar {
      padding: 12px 14px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .nexus-input {
      flex: 1;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 13px;
      outline: none;
      background: #f8fafc;
      color: #1e293b;
      transition: border-color 0.15s, background-color 0.15s;
    }
    .nexus-input:focus {
      border-color: ${botConfig.primaryColor};
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }
    .nexus-send-btn {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: ${botConfig.primaryColor};
      color: #ffffff;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.15s, opacity 0.15s;
      flex-shrink: 0;
    }
    .nexus-send-btn:hover {
      transform: scale(1.05);
    }
    .nexus-send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    .nexus-confirm-overlay {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(3px);
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: nexusFadeIn 0.2s ease-out;
    }
    .nexus-confirm-card {
      background: #ffffff;
      border-radius: 20px;
      padding: 22px;
      width: 100%;
      max-width: 290px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(226, 232, 240, 0.8);
      text-align: center;
      animation: nexusScaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .nexus-confirm-title {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 10px;
      margin-bottom: 6px;
    }
    .nexus-confirm-desc {
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
      margin-bottom: 18px;
    }
    .nexus-confirm-actions {
      display: flex;
      gap: 10px;
    }
    .nexus-confirm-btn {
      flex: 1;
      padding: 9px 12px;
      border-radius: 12px;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
    }
    .nexus-confirm-cancel {
      background: #f1f5f9;
      color: #475569;
    }
    .nexus-confirm-cancel:hover {
      background: #e2e8f0;
      color: #1e293b;
    }
    .nexus-confirm-ok {
      background: ${botConfig.primaryColor};
      color: #ffffff;
      box-shadow: 0 4px 10px rgba(79, 70, 229, 0.25);
    }
    .nexus-confirm-ok:hover {
      opacity: 0.92;
      transform: translateY(-1px);
    }
    @keyframes nexusFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes nexusScaleUp {
      from { opacity: 0; transform: scale(0.92); }
      to { opacity: 1; transform: scale(1); }
    }
    .nexus-typing {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 10px 14px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      width: fit-content;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }
    .nexus-dot {
      width: 6px;
      height: 6px;
      background: #94a3b8;
      border-radius: 50%;
      animation: nexusBounce 1.4s infinite ease-in-out both;
    }
    .nexus-dot:nth-child(1) { animation-delay: -0.32s; }
    .nexus-dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes nexusBounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    @media (max-width: 480px) {
      #nexus-chatbot-widget-container {
        bottom: 16px;
        right: 16px;
        left: auto;
      }
      #nexus-widget-window {
        width: calc(100vw - 32px);
        height: min(560px, 82vh);
        bottom: 72px;
        right: 0;
      }
    }
  `;
  document.head.appendChild(style);

  // 5. Render Launcher Button
  const launcher = document.createElement("button");
  launcher.id = "nexus-widget-launcher";
  launcher.setAttribute("type", "button");
  launcher.setAttribute("aria-label", "Open chat assistant");
  launcher.innerHTML = `
    <svg id="nexus-icon-open" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
    <svg id="nexus-icon-close" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none;">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;

  // 6. Render Chat Window
  const chatWindow = document.createElement("div");
  chatWindow.id = "nexus-widget-window";
  chatWindow.innerHTML = `
    <div class="nexus-header" id="nexus-header">
      <div class="nexus-header-info">
        <div class="nexus-avatar-badge" id="nexus-avatar-badge">
          ${botConfig.avatar}
        </div>
        <div>
          <div class="nexus-header-title" id="nexus-header-title">${botConfig.name}</div>
          <div class="nexus-header-status">
            <span class="nexus-status-dot"></span>
            <span>Online • Typically replies instantly</span>
          </div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:6px;">
        <button id="nexus-refresh-btn" class="nexus-btn-icon" aria-label="Restart chat" title="Start new conversation">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>
        </button>
        <button id="nexus-close-btn" class="nexus-btn-icon" aria-label="Close chat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>

    <div class="nexus-messages" id="nexus-messages-list"></div>

    <form class="nexus-input-bar" id="nexus-input-form" onsubmit="return false;">
      <input type="text" id="nexus-user-input" class="nexus-input" placeholder="${botConfig.placeholderText}" autocomplete="off" />
      <button type="submit" id="nexus-send-button" class="nexus-send-btn" aria-label="Send message">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </form>

    ${
      botConfig.brandingEnabled
        ? `<div id="nexus-branding-footer" style="text-align:center; padding:6px; font-size:10.5px; color:#94a3b8; background:#ffffff; border-top:1px solid #f1f5f9;">
            Powered by <a href="${apiBase}" target="_blank" rel="noopener noreferrer" style="color:${botConfig.primaryColor}; text-decoration:none; font-weight:600;">NexusAI</a>
           </div>`
        : ""
    }
  `;

  container.appendChild(chatWindow);
  container.appendChild(launcher);
  document.body.appendChild(container);

  // 7. Dynamic Style Applier
  function applyTheme() {
    launcher.style.background = botConfig.primaryColor;
    const header = document.getElementById("nexus-header");
    if (header) header.style.background = botConfig.primaryColor;

    const title = document.getElementById("nexus-header-title");
    if (title) title.textContent = botConfig.name;

    const avatar = document.getElementById("nexus-avatar-badge");
    if (avatar) avatar.textContent = botConfig.avatar || "🤖";

    const sendBtn = document.getElementById("nexus-send-button");
    if (sendBtn) sendBtn.style.background = botConfig.primaryColor;

    const userMsgs = chatWindow.querySelectorAll(".nexus-msg-user");
    userMsgs.forEach((el) => {
      el.style.background = botConfig.primaryColor;
    });
  }

  function formatMessage(text, isUser = false) {
    if (!text || typeof text !== "string") return "";
    let html = text;

    if (isUser) {
      // Safe HTML escaping for user messages
      html = html
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      // Auto-link standalone URLs in user bubble with WHITE text
      html = html.replace(
        /(https?:\/\/[^\s<)]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#ffffff!important;text-decoration:underline;font-weight:600;word-break:break-all;">$1</a>'
      );

      // Newlines to <br/>
      return html.replace(/\n/g, "<br/>");
    }

    // Filter out leaked system prompt directives or meta headers
    html = html.replace(/^(?:(?:You are|The visitor is|The user is)\s+writing in[^\n]*\n*)+/gim, "");
    html = html.replace(/^(?:VISITOR\s*(?:IDENTITY|DETAILS)?:?[^\n]*\n*)+/gim, "");
    html = html.replace(/^(?:MANDATORY\s+)?[A-Z0-9_\s-]+(?:RULE|DIRECTIVE|INSTRUCTION):[^\n]*\n*/gim, "");
    html = html.replace(/^[•*-]\s*(?:If the visitor|Greet them|Whenever a visitor|The visitor|You MUST)[^\n]*\n*/gim, "");
    html = html.replace(/^Greet them warmly[^\n]*\n*/gim, "");
    html = html.replace(/^Example:\s*"[^"]*"\s*\n*/gim, "");
    html = html.replace(/^(?:Language & Tone|Core Rules|Verified Knowledge|WHO WE ARE|PUBLIC COMPANY CONTACT|GUIDELINES|ABOUT EMPEROR SMART SOLUTIONS)[^\n]*\n*/gim, "");
    html = html.replace(/^Hello!\s*Welcome to Emperor Smart Solutions\.\s*May I know your name and contact number[^\n]*\n+/gi, "");

    // Convert bold: ***text*** or **text** -> <strong style="font-weight:700!important;color:#0f172a!important;opacity:1!important;">text</strong>
    html = html.replace(/\*{2,3}([^*]+)\*{2,3}/g, '<strong style="font-weight:700!important;color:#0f172a!important;opacity:1!important;">$1</strong>');

    // Convert markdown links: [Title](https://...) -> <a href="https://..." target="_blank" rel="noopener noreferrer">Title</a>
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, `<a href="$2" target="_blank" rel="noopener noreferrer" style="color:${botConfig.primaryColor};text-decoration:underline;font-weight:600;">$1</a>`);

    // Auto-link standalone https:// URLs
    html = html.replace(/(^|[\s(])(https:\/\/[^\s<)]+)/g, `$1<a href="$2" target="_blank" rel="noopener noreferrer" style="color:${botConfig.primaryColor};text-decoration:underline;font-weight:600;">$2</a>`);

    // Bullet points: * Item or - Item
    html = html.replace(/^[*-]\s+(.+)$/gm, "• $1");

    // Newlines to <br/>
    html = html.replace(/\n/g, "<br/>");

    return html;
  }

  // 8. Render Message Feed
  function renderMessages() {
    const list = document.getElementById("nexus-messages-list");
    if (!list) return;

    list.innerHTML = "";

    // Welcome message if conversation is empty
    if (messages.length === 0) {
      const welcomeEl = document.createElement("div");
      welcomeEl.className = "nexus-msg nexus-msg-bot";
      welcomeEl.textContent = botConfig.welcomeMessage;

      const defaultServices = [
        "Website Development",
        "Mobile Application",
        "AI Chatbot",
        "Custom Software",
        "UI/UX Design",
        "Cloud & DevOps",
        "SEO & Marketing",
      ];
      const qrContainer = document.createElement("div");
      qrContainer.className = "nexus-quick-replies";
      defaultServices.forEach((serviceText) => {
        const qrBtn = document.createElement("button");
        qrBtn.type = "button";
        qrBtn.className = "nexus-quick-reply-btn";
        qrBtn.textContent = serviceText;
        qrBtn.addEventListener("click", () => {
          qrContainer.querySelectorAll("button").forEach((b) => (b.disabled = true));
          sendMessage(serviceText);
        });
        qrContainer.appendChild(qrBtn);
      });
      welcomeEl.appendChild(qrContainer);
      list.appendChild(welcomeEl);
    }

    messages.forEach((m, idx) => {
      const isUser = m.role === "user";
      const el = document.createElement("div");
      el.className = `nexus-msg ${isUser ? "nexus-msg-user" : "nexus-msg-bot"}`;
      if (isUser) {
        el.style.background = botConfig.primaryColor;
      }
      el.innerHTML = formatMessage(m.content, isUser);

      if (m.role === "assistant" && idx === messages.length - 1 && m.quickReplies && Array.isArray(m.quickReplies) && m.quickReplies.length > 0) {
        const qrContainer = document.createElement("div");
        qrContainer.className = "nexus-quick-replies";
        m.quickReplies.forEach((qrText) => {
          const qrBtn = document.createElement("button");
          qrBtn.type = "button";
          qrBtn.className = "nexus-quick-reply-btn";
          qrBtn.textContent = qrText;
          qrBtn.addEventListener("click", () => {
            qrContainer.querySelectorAll("button").forEach((b) => (b.disabled = true));
            sendMessage(qrText);
          });
          qrContainer.appendChild(qrBtn);
        });
        el.appendChild(qrContainer);
      }

      list.appendChild(el);
    });

    if (isLoading) {
      const typingEl = document.createElement("div");
      typingEl.className = "nexus-typing";
      typingEl.innerHTML = `<div class="nexus-dot"></div><div class="nexus-dot"></div><div class="nexus-dot"></div>`;
      list.appendChild(typingEl);
    }

    list.scrollTop = list.scrollHeight;
  }

  // 9. Toggle Visibility
  function toggleChat() {
    isOpen = !isOpen;
    chatWindow.style.display = isOpen ? "flex" : "none";
    const iconOpen = document.getElementById("nexus-icon-open");
    const iconClose = document.getElementById("nexus-icon-close");
    if (iconOpen) iconOpen.style.display = isOpen ? "none" : "block";
    if (iconClose) iconClose.style.display = isOpen ? "block" : "none";

    if (isOpen) {
      renderMessages();
      setTimeout(() => {
        const inp = document.getElementById("nexus-user-input");
        if (inp) inp.focus();
      }, 100);
    }
  }

  function showInChatConfirm(message, onConfirm) {
    // Remove any existing overlay
    const existing = chatWindow.querySelector(".nexus-confirm-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.className = "nexus-confirm-overlay";
    overlay.innerHTML = `
      <div class="nexus-confirm-card">
        <div style="width:42px; height:42px; border-radius:14px; background:rgba(79, 70, 229, 0.1); color:${botConfig.primaryColor}; display:inline-flex; align-items:center; justify-content:center;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>
        </div>
        <div class="nexus-confirm-title">New Conversation</div>
        <div class="nexus-confirm-desc">${message || "Would you like to clear the current chat and start fresh?"}</div>
        <div class="nexus-confirm-actions">
          <button type="button" class="nexus-confirm-btn nexus-confirm-cancel" id="nexus-confirm-cancel">Cancel</button>
          <button type="button" class="nexus-confirm-btn nexus-confirm-ok" id="nexus-confirm-ok">Start New</button>
        </div>
      </div>
    `;

    chatWindow.appendChild(overlay);

    overlay.querySelector("#nexus-confirm-cancel").addEventListener("click", () => {
      overlay.remove();
    });

    overlay.querySelector("#nexus-confirm-ok").addEventListener("click", () => {
      overlay.remove();
      onConfirm();
    });
  }

  launcher.addEventListener("click", toggleChat);
  document.getElementById("nexus-close-btn")?.addEventListener("click", toggleChat);

  document.getElementById("nexus-refresh-btn")?.addEventListener("click", () => {
    showInChatConfirm("Start a new chat conversation? Your previous messages will be cleared.", () => {
      const headers = {};
      if (visitorToken) headers["x-visitor-token"] = visitorToken;

      fetch(`${apiBase}/api/public/chat/${encodeURIComponent(botId)}/session`, {
        method: "DELETE",
        credentials: "include",
        headers,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && data.conversationId) {
            activeSessionId = data.conversationId;
            try { sessionStorage.setItem(`${sessionKey}_id`, activeSessionId); } catch (e) {}
          } else {
            activeSessionId = `visitor_${botId}_${Date.now()}`;
            try { sessionStorage.setItem(`${sessionKey}_id`, activeSessionId); } catch (e) {}
          }
          messages = [];
          try { sessionStorage.removeItem(sessionKey); } catch (e) {}
          renderMessages();
        })
        .catch(() => {
          activeSessionId = `visitor_${botId}_${Date.now()}`;
          messages = [];
          try { sessionStorage.removeItem(sessionKey); } catch (e) {}
          renderMessages();
        });
    });
  });

  // 10. Chat Inference with Real-Time SSE Streaming
  async function sendMessage(explicitText) {
    const input = document.getElementById("nexus-user-input");
    const sendBtn = document.getElementById("nexus-send-button");
    const text = (typeof explicitText === "string" ? explicitText : input.value).trim();
    if (!text || isLoading) return;

    if (!explicitText) {
      input.value = "";
    }
    messages.push({ role: "user", content: text });
    isLoading = true;
    if (sendBtn) sendBtn.disabled = true;
    renderMessages();

    try {
      const headers = {
        "Content-Type": "application/json",
        "Accept": "text/event-stream, application/json",
      };
      if (visitorToken) headers["x-visitor-token"] = visitorToken;

      const res = await fetch(`${apiBase}/api/public/chat/${encodeURIComponent(botId)}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: text,
          history: messages.slice(-8),
          sessionId: activeSessionId,
          visitorToken: visitorToken || undefined,
          stream: true,
        }),
      });

      const contentType = res.headers.get("content-type") || "";

      // Stream handling (SSE)
      if (contentType.includes("text/event-stream") && res.body) {
        isLoading = false;
        const botMsg = { role: "assistant", content: "", quickReplies: [] };
        messages.push(botMsg);
        renderMessages();

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              const payload = trimmed.slice(6);
              if (payload === "[DONE]") break;
              try {
                const parsed = JSON.parse(payload);
                if (parsed.token) {
                  botMsg.content += parsed.token;
                  const msgs = chatWindow.querySelectorAll(".nexus-msg-bot");
                  const lastMsg = msgs[msgs.length - 1];
                  if (lastMsg) lastMsg.innerHTML = formatMessage(botMsg.content);
                  const list = document.getElementById("nexus-messages-list");
                  if (list) list.scrollTop = list.scrollHeight;
                }
                if (parsed.quickReplies && Array.isArray(parsed.quickReplies)) {
                  botMsg.quickReplies = parsed.quickReplies;
                  renderMessages();
                }
              } catch (e) {}
            }
          }
        }
      } else {
        if (!res.ok) {
          let errText = "I'm currently assisting multiple visitors. Please ask your question again or leave your email for human follow-up.";
          try {
            const errData = await res.json();
            if (errData && errData.error) errText = errData.error;
          } catch (e) {
            try {
              const rawTxt = await res.text();
              if (rawTxt && rawTxt.trim()) errText = rawTxt.slice(0, 160);
            } catch (e2) {}
          }
          console.error("[NexusWidget] Server returned error status", res.status, errText);
          messages.push({
            role: "assistant",
            content: errText,
            sources: [],
          });
        } else {
          const data = await res.json();
          messages.push({
            role: "assistant",
            content: data.reply || "I am ready to assist you. What kind of digital project are you looking to create?",
            quickReplies: data.quickReplies || [],
            sources: data.sources || [],
          });
        }
        renderMessages();
      }
    } catch (e) {
      console.warn("[NexusWidget] Streaming fetch failed, attempting non-streaming fallback:", e);
      try {
        const fallbackRes = await fetch(`${apiBase}/api/public/chat/${encodeURIComponent(botId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            history: messages.slice(-8),
            sessionId: activeSessionId,
            visitorToken: visitorToken || undefined,
            stream: false,
          }),
        });
        if (fallbackRes.ok) {
          const fbData = await fallbackRes.json();
          messages.push({
            role: "assistant",
            content: fbData.reply || "I am ready to assist you. What kind of digital project are you looking to create?",
            quickReplies: fbData.quickReplies || [],
            sources: fbData.sources || [],
          });
          renderMessages();
          return;
        }
      } catch (retryErr) {
        console.error("[NexusWidget] Fallback non-stream request also failed:", retryErr);
      }
      messages.push({
        role: "assistant",
        content: "I'm currently assisting multiple visitors. Please ask your question again or leave your email for human follow-up.",
      });
    } finally {
      isLoading = false;
      if (sendBtn) sendBtn.disabled = false;
      try {
        sessionStorage.setItem(sessionKey, JSON.stringify(messages));
      } catch (e) {}
      renderMessages();
      const inp = document.getElementById("nexus-user-input");
      if (inp) inp.focus();
    }
  }

  const form = document.getElementById("nexus-input-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      sendMessage();
    });
  }

  // ESC to close
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) {
      toggleChat();
    }
  });

  // Global window API for programmatic control
  window.NexusWidget = {
    open: () => { if (!isOpen) toggleChat(); },
    close: () => { if (isOpen) toggleChat(); },
    toggle: toggleChat,
    sendMessage: (msg) => {
      const input = document.getElementById("nexus-user-input");
      if (input) {
        input.value = msg;
        sendMessage();
      }
    },
  };
})();
