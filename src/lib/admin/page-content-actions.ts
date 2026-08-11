"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeAbout,
  normalizeHome,
  type HomeVisibility,
} from "@/lib/content/page-content";
import type { AdminActionState } from "./services-actions";

const VIS_KEYS = [
  "show_formats",
  "show_audiences",
  "show_steps",
  "show_price",
  "show_testimonials",
] as const;

const KNOWN_SLOT =
  /^(home_hero|home_how|about_portrait|about_strip_[123]|testimonial_[a-z0-9-]+)$/i;

// Saves both pages plus the photo-slot map in one go — the editor holds the
// whole tab's state so switching pills never loses edits.
export async function updatePageContent(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const fail: AdminActionState = { error: "save_failed", success: false };

  let home, about;
  let media: Record<string, unknown>;
  try {
    home = normalizeHome(JSON.parse(String(formData.get("home") ?? "{}")));
    about = normalizeAbout(JSON.parse(String(formData.get("about") ?? "{}")));
    const parsed: unknown = JSON.parse(String(formData.get("media") ?? "{}"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return fail;
    }
    media = parsed as Record<string, unknown>;
  } catch {
    return fail;
  }

  const visibility = Object.fromEntries(
    VIS_KEYS.map((k) => [k, formData.get(k) !== "false"])
  ) as HomeVisibility;

  const supabase = await createClient();
  const [homeRes, aboutRes] = await Promise.all([
    supabase
      .from("page_content")
      .update({ content: home, ...visibility })
      .eq("page", "home"),
    supabase.from("page_content").update({ content: about }).eq("page", "about"),
  ]);
  if (homeRes.error || aboutRes.error) return fail;

  const rows = Object.entries(media)
    .filter(
      ([slot, url]) =>
        KNOWN_SLOT.test(slot) &&
        typeof url === "string" &&
        /^https?:\/\//.test(url) &&
        url.length <= 1000
    )
    .map(([slot, url]) => ({ slot, url: url as string }));
  if (rows.length > 0) {
    const { error } = await supabase.from("media").upsert(rows);
    if (error) return fail;
  }

  // Prune photo rows of testimonials that no longer exist.
  const keep = new Set(home.testimonials.items.map((t) => `testimonial_${t.id}`));
  const { data: existing } = await supabase
    .from("media")
    .select("slot")
    .like("slot", "testimonial\\_%");
  const orphans = (existing ?? [])
    .map((r) => r.slot)
    .filter((slot) => !keep.has(slot));
  if (orphans.length > 0) {
    await supabase.from("media").delete().in("slot", orphans);
  }

  revalidatePath("/", "layout");
  return { error: null, success: true };
}
