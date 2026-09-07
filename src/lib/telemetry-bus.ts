/**
 * Central Server-Sent Events (SSE) Bus for PashuRakshak.
 * Broadcasts real-time telemetry packets, BDI updates, and alerts to connected browsers.
 */

type Listener = (data: string) => void;

class TelemetryEventBus {
  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  broadcast(event: { type: string; payload: any }): void {
    const message = `event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`;
    for (const listener of this.listeners) {
      try {
        listener(message);
      } catch (err) {
        console.warn("Failed to dispatch SSE event to listener:", err);
      }
    }
  }

  get clientCount(): number {
    return this.listeners.size;
  }
}

// Global singleton across server reloads
declare global {
  var __pashuTelemetryBus: TelemetryEventBus | undefined;
}

if (!globalThis.__pashuTelemetryBus) {
  globalThis.__pashuTelemetryBus = new TelemetryEventBus();
}

export const telemetryBus = globalThis.__pashuTelemetryBus;
