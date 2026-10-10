// Global SSE (Server-Sent Events) in-memory pub-sub broker
// Allows any API action (new message, lead captured, bot edited) to instantly push updates to browser tabs without refresh

class SSEBroker {
  constructor() {
    this.clients = new Set();
  }

  subscribe(client) {
    this.clients.add(client);
    return () => {
      this.clients.delete(client);
    };
  }

  broadcast(eventType, payload = {}) {
    const data = JSON.stringify({
      type: eventType,
      data: payload,
      timestamp: new Date().toISOString(),
    });
    const message = `event: message\ndata: ${data}\n\n`;

    const deadClients = [];
    for (const client of this.clients) {
      try {
        client.enqueue(new TextEncoder().encode(message));
      } catch (err) {
        deadClients.push(client);
      }
    }

    for (const dead of deadClients) {
      this.clients.delete(dead);
    }
  }

  getActiveClientsCount() {
    return this.clients.size;
  }
}

// Preserve broker across Next.js dev server hot-reloads
if (!global.__nexusSSEBroker) {
  global.__nexusSSEBroker = new SSEBroker();
}

export const sseBroker = global.__nexusSSEBroker;
