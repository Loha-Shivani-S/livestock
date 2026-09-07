import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const text = url.searchParams.get("text") || "";
          const lang = url.searchParams.get("lang") || "en";
          if (!text) {
            return new Response("Missing text parameter", { status: 400 });
          }

          const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${encodeURIComponent(lang)}&client=tw-ob`;
          const fetchRes = await fetch(googleUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            },
          });

          if (!fetchRes.ok) {
            return new Response("TTS upstream error", { status: fetchRes.status });
          }

          return new Response(fetchRes.body, {
            status: 200,
            headers: {
              "Content-Type": "audio/mpeg",
              "Cache-Control": "public, max-age=86400",
            },
          });
        } catch (err: any) {
          return new Response(err?.message || "TTS error", { status: 500 });
        }
      },
    },
  },
});
