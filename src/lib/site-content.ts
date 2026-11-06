import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Site-wide editable text & images, keyed like "home.hero.title". */
export const siteContentQuery = queryOptions({
  queryKey: ["site_content"],
  queryFn: async (): Promise<Record<string, string>> => {
    const { data, error } = await supabase.from("site_content").select("key, value");
    // Never take the whole site down over custom text: fall back to the defaults.
    if (error) {
      console.error("Could not load site content:", error.message);
      return {};
    }
    return Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  },
});

export async function saveSiteContent(key: string, value: string) {
  const { error } = await supabase.from("site_content").upsert({ key, value });
  if (error) throw new Error(error.message);
}

export async function resetSiteContent(key: string) {
  const { error } = await supabase.from("site_content").delete().eq("key", key);
  if (error) throw new Error(error.message);
}

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"];

/** Validates an image file before upload; returns an error message or null. */
export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return "Please choose a PNG, JPG, WEBP, GIF or AVIF image.";
  if (file.size > MAX_IMAGE_BYTES) return "Image is too large — the limit is 10 MB.";
  return null;
}

/** Uploads an image and returns the site path that serves it. */
export async function uploadSiteImage(file: File): Promise<string> {
  const problem = validateImageFile(file);
  if (problem) throw new Error(problem);
  const ext = (file.name.split(".").pop() || file.type.split("/")[1] || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `uploads/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext || "png"}`;
  const { error } = await supabase.storage.from("site-media").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return `/api/public/media/${path}`;
}
