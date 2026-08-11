"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ContentItem } from "@/components/admin/about-editor";
import type { AdminActionState } from "./services-actions";

const MAX_ITEMS = 20;
const MAX_FIELD = 500;

// Hidden inputs carry the item lists as JSON; empty rows are dropped.
function parseItems(raw: FormDataEntryValue | null): ContentItem[] | null {
  try {
    const parsed: unknown = JSON.parse(String(raw ?? "[]"));
    if (!Array.isArray(parsed) || parsed.length > MAX_ITEMS) return null;
    return parsed
      .map((entry) => {
        const item = entry as Record<string, unknown>;
        const field = (key: string) =>
          String(item[key] ?? "").trim().slice(0, MAX_FIELD);
        return {
          title_pt: field("title_pt"),
          title_en: field("title_en"),
          body_pt: field("body_pt"),
          body_en: field("body_en"),
        };
      })
      .filter((it) => it.title_pt || it.title_en || it.body_pt || it.body_en);
  } catch {
    return null;
  }
}

export async function updateSiteContent(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const photoUrl = String(formData.get("photo_url") ?? "").trim();
  const highlights = parseItems(formData.get("highlights"));
  const steps = parseItems(formData.get("steps"));

  if (!highlights || !steps) {
    return { error: "save_failed", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_content")
    .update({
      photo_url: photoUrl || null,
      display_name: String(formData.get("display_name") ?? "").trim(),
      tagline_pt: String(formData.get("tagline_pt") ?? "").trim(),
      tagline_en: String(formData.get("tagline_en") ?? "").trim(),
      intro_pt: String(formData.get("intro_pt") ?? "").trim(),
      intro_en: String(formData.get("intro_en") ?? "").trim(),
      highlights,
      steps,
    })
    .eq("key", "about");

  if (error) {
    return { error: "save_failed", success: false };
  }

  revalidatePath("/", "layout");
  return { error: null, success: true };
}
