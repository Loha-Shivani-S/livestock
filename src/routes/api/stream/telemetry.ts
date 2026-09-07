import { createFileRoute } from "@tanstack/react-router";
import { telemetryBus } from "@/lib/telemetry-bus";

export const Route = createFileRoute("/api/stream/telemetry")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                `event: connected\ndata: ${JSON.stringify({ status: "connected", time: new Date().toISOString() })}\n\n`
              )
            );

            const unsubscribe = telemetryBus.subscribe((msg: string) => {
              try {
                controller.enqueue(new TextEncoder().encode(msg));
              } catch {
                unsubscribe();
              }
            });

            request.signal.addEventListener("abort", () => {
              unsubscribe();
            });
          },
        });

        return new Response(stream, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
