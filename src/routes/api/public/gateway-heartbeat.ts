import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { recordGatewayHeartbeat } from "@/lib/data";

function keyMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/gateway-heartbeat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const expectedKey = process.env["INGEST_DEVICE_KEY"];
          if (expectedKey) {
            const provided = request.headers.get("x-device-key");
            if (!keyMatches(provided, expectedKey)) {
              return Response.json({ error: "Invalid device key" }, { status: 401 });
            }
          }

          const body = await request.json();
          if (!body || typeof body !== "object" || !body.node_id) {
            return Response.json({ error: "Payload must include node_id" }, { status: 400 });
          }

          const result = await recordGatewayHeartbeat({
            data: {
              node_id: String(body.node_id),
              online: body.online !== false,
              queued: typeof body.queued === "number" ? body.queued : 0,
              rssi: typeof body.rssi === "number" ? body.rssi : undefined,
              snr: typeof body.snr === "number" ? body.snr : undefined,
              battery_pct: typeof body.battery_pct === "number" ? body.battery_pct : undefined,
              firmware_v: body.firmware_v ? String(body.firmware_v) : undefined,
            },
          });

          return Response.json({
            ok: true,
            status: "alive",
            gateway: result,
            server_time: new Date().toISOString(),
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Invalid heartbeat payload";
          return Response.json({ error: message }, { status: 400 });
        }
      },
      GET: async () => {
        return Response.json({
          endpoint: "/api/public/gateway-heartbeat",
          protocol: "HerdSentinel LoRa Gateway Heartbeat v1",
          status: "healthy",
        });
      },
    },
  },
});
