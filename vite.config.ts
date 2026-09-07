// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      {
        name: "tts-proxy",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && req.url.startsWith("/api/tts")) {
              try {
                const url = new URL(req.url, "http://localhost:8080");
                const text = url.searchParams.get("text") || "";
                const lang = url.searchParams.get("lang") || "en";
                if (!text) {
                  res.statusCode = 400;
                  res.end("Missing text parameter");
                  return;
                }
                const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${encodeURIComponent(lang)}&client=tw-ob`;
                const fetchRes = await fetch(googleUrl, {
                  headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                  },
                });
                if (!fetchRes.ok) {
                  res.statusCode = fetchRes.status;
                  res.end("Google TTS error");
                  return;
                }
                res.setHeader("Content-Type", "audio/mpeg");
                res.setHeader("Cache-Control", "public, max-age=86400");
                const arrayBuffer = await fetchRes.arrayBuffer();
                res.end(Buffer.from(arrayBuffer));
              } catch (e: any) {
                res.statusCode = 500;
                res.end(e?.message || "Internal server error");
              }
              return;
            }
            next();
          });
        },
      },
      {
        name: "sse-stream",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && req.url.startsWith("/api/stream/telemetry")) {
              res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache, no-transform",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
              });
              res.write(`event: connected\ndata: ${JSON.stringify({ status: "connected", time: new Date().toISOString() })}\n\n`);

              const pingInterval = setInterval(() => {
                res.write(`event: ping\ndata: {}\n\n`);
              }, 15000);

              const bus = (globalThis as any).__pashuTelemetryBus;
              const unsubscribe = bus?.subscribe((msg: string) => {
                res.write(msg);
              });

              req.on("close", () => {
                clearInterval(pingInterval);
                unsubscribe?.();
                res.end();
              });
              return;
            }
            next();
          });
        },
      },
    ],
  },
});
