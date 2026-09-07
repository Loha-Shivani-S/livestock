import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { processTelemetry, TelemetryRow } from "@/lib/data";

function keyMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/ingest")({
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
          const rows: unknown[] = Array.isArray(body) ? body : [body];
          if (rows.length === 0 || rows.length > 200) {
            return Response.json({ error: "Provide 1–200 packets" }, { status: 400 });
          }

          const results = [];
          for (const row of rows) {
            const parsed = TelemetryRow.parse(row);
            results.push(await processTelemetry(parsed));
          }
          return Response.json(Array.isArray(body) ? results : results[0]);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Invalid payload";
          return Response.json({ error: message }, { status: 400 });
        }
      },
    },
  },
});
