import { sseBroker } from "@/lib/db/sseBroker";

export async function GET(request) {
  let unsubscribe;
  let heartbeatInterval;

  const stream = new ReadableStream({
    start(controller) {
      // 1. Send initial connected event
      const initialPayload = JSON.stringify({
        type: "connected",
        message: "Real-time SSE event stream connected",
        activeClients: sseBroker.getActiveClientsCount() + 1,
        timestamp: new Date().toISOString(),
      });
      controller.enqueue(new TextEncoder().encode(`event: message\ndata: ${initialPayload}\n\n`));

      // 2. Subscribe controller to global broker
      unsubscribe = sseBroker.subscribe(controller);

      // 3. Keep-alive heartbeat every 15s
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(`: heartbeat ${Date.now()}\n\n`));
        } catch (e) {
          clearInterval(heartbeatInterval);
        }
      }, 15000);
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform, no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
