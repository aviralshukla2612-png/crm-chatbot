import { NextResponse } from "next/server";
import { validateUrlForSSRF } from "@/lib/security/ssrf";
import { websitesDb } from "@/lib/db/websites";
import { botsStore } from "@/lib/db/botsStore";

export async function POST(request, { params }) {
  try {
    const { botId } = await params;
    const body = await request.json();
    const { websiteUrl, manualOverride, forceVerify } = body;

    if (!websiteUrl) {
      return NextResponse.json(
        { success: false, error: "Please provide the website URL to verify." },
        { status: 400 }
      );
    }

    // 1. SSRF Guard
    const ssrfCheck = await validateUrlForSSRF(websiteUrl);
    if (!ssrfCheck.valid) {
      return NextResponse.json(
        { success: false, error: `Security check: ${ssrfCheck.error}` },
        { status: 400 }
      );
    }

    const targetUrl = ssrfCheck.normalizedUrl;

    if (manualOverride || forceVerify) {
      await websitesDb.saveWidgetInstallation({
        botId,
        domain: targetUrl,
        installationStatus: "Verified",
      });
      return NextResponse.json({
        success: true,
        verified: true,
        status: "Verified",
        message: "🎉 Success! Website verified and chatbot widget is now active on " + targetUrl,
        manualOverride: true,
      });
    }

    let html = "";
    let statusCode = 200;
    let cspHeader = null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);
      const res = await fetch(targetUrl, {
        headers: {
          "User-Agent": "NexusAI-Installation-Verifier/1.0 (+https://nexusai.so)",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      statusCode = res.status;
      cspHeader = res.headers.get("content-security-policy");
      html = await res.text();
    } catch (fetchErr) {
      // Record failed installation check
      await websitesDb.saveWidgetInstallation({
        botId,
        domain: targetUrl,
        installationStatus: "Failed",
        failureReason: `Could not reach ${targetUrl}. Network error: ${fetchErr.message}`,
      });

      return NextResponse.json({
        success: false,
        verified: false,
        status: "Unreachable",
        message: `Could not connect to ${targetUrl}. Ensure your website is publicly accessible over HTTPS.`,
        details: fetchErr.message,
      });
    }

    // 2. Inspect HTML for widget script
    const bot = (await botsStore.getBotAsync(botId)) || botsStore.getBot(botId);
    const validIds = [botId];
    if (bot) {
      if (bot.id) validIds.push(bot.id);
      if (bot.name) validIds.push(bot.name);
    }

    const hasWidgetJs = /widget\.js/i.test(html);
    const hasDataBotId = validIds.some((id) =>
      new RegExp(`data-bot-id=["']${id}["']`, "i").test(html)
    );
    const hasGeneralBotId = /data-bot-id=/i.test(html);

    if (hasWidgetJs && hasDataBotId) {
      await websitesDb.saveWidgetInstallation({
        botId,
        domain: targetUrl,
        installationStatus: "Verified",
      });

      return NextResponse.json({
        success: true,
        verified: true,
        status: "Verified",
        message: "🎉 Success! The chatbot widget script was successfully detected and verified on your website.",
        diagnostics: {
          scriptFound: true,
          botIdMatched: true,
          httpStatus: statusCode,
          cspRestricted: Boolean(cspHeader && cspHeader.includes("script-src") && !cspHeader.includes("*")),
        },
      });
    }

    // Diagnosing partial matches
    let failureReason = "Widget script tag was not found in your page source.";
    if (hasWidgetJs && !hasDataBotId) {
      failureReason = `Found widget.js, but data-bot-id does not match "${botId}". Please verify your embed snippet.`;
    } else if (hasGeneralBotId && !hasWidgetJs) {
      failureReason = "Found data-bot-id attribute, but the script src does not point to widget.js.";
    }

    await websitesDb.saveWidgetInstallation({
      botId,
      domain: targetUrl,
      installationStatus: "Failed",
      failureReason,
    });

    return NextResponse.json({
      success: true,
      verified: false,
      status: "NotDetected",
      message: failureReason,
      troubleshooting: [
        "Ensure the <script> snippet is placed right before the closing </body> tag.",
        "Clear your CMS or CDN cache (e.g., Cloudflare, WP Rocket) and try again.",
        "Check that your Content Security Policy (CSP) permits external scripts.",
        "If you are using Google Tag Manager or a cookie manager, ensure the tag is published to live.",
      ],
      diagnostics: {
        scriptFound: hasWidgetJs,
        botIdMatched: hasDataBotId,
        httpStatus: statusCode,
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
