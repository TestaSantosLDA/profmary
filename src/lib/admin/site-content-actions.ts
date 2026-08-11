"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AdminActionState } from "./services-actions";

export async function updateSiteContent(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const photoUrl = String(formData.get("photo_url") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_content")
    .update({
      photo_url: photoUrl || null,
      tagline_pt: String(formData.get("tagline_pt") ?? "").trim(),
      tagline_en: String(formData.get("tagline_en") ?? "").trim(),
      intro_pt: String(formData.get("intro_pt") ?? "").trim(),
      intro_en: String(formData.get("intro_en") ?? "").trim(),
    })
    .eq("key", "about");

  if (error) {
    return { error: "save_failed", success: false };
  }

  revalidatePath("/", "layout");
  return { error: null, success: true };
}
