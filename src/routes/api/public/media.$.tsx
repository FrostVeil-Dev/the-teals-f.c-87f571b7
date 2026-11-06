import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/**
 * Serves images uploaded through the in-site editor.
 * The storage bucket is private (workspace policy), so public pages read
 * uploaded images through this route. Only the site-media bucket is reachable,
 * and only image files are returned.
 */
const SAFE_PATH = /^[a-zA-Z0-9][a-zA-Z0-9/_.-]{0,200}$/;

export const Route = createFileRoute("/api/public/media/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = params._splat ?? "";
        if (!SAFE_PATH.test(path) || path.includes("..")) {
          return new Response("Not found", { status: 404 });
        }
        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!url || !key) return new Response("Media unavailable", { status: 503 });

        const supabase = createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
          global: {
            fetch: (input, init) => {
              const headers = new Headers(init?.headers);
              if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
              headers.set("apikey", key);
              return fetch(input, { ...init, headers });
            },
          },
        });

        const { data, error } = await supabase.storage.from("site-media").download(path);
        if (error || !data) return new Response("Not found", { status: 404 });
        const type = data.type || "application/octet-stream";
        if (!type.startsWith("image/")) return new Response("Not found", { status: 404 });

        return new Response(data, {
          headers: {
            "Content-Type": type,
            // Uploaded file names are unique, so a file never changes once stored.
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
