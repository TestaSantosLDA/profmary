"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export type AdminActionState = { error: string | null; success: boolean };

type ServiceInput = {
  title_pt: string;
  title_en: string;
  description_pt: string;
  description_en: string;
  hourly_rate_cents: number;
  min_duration_minutes: number;
  max_duration_minutes: number;
  attendee_cap: number;
  active: boolean;
};

function parseServiceForm(formData: FormData): ServiceInput | string {
  const titlePt = String(formData.get("title_pt") ?? "").trim();
  const titleEn = String(formData.get("title_en") ?? "").trim();
  if (!titlePt || !titleEn) return "missing_title";

  const rate = Math.round(Number(formData.get("hourly_rate_eur") ?? 0) * 100);
  if (!Number.isFinite(rate) || rate < 0) return "invalid_rate";

  const min = Number(formData.get("min_duration_minutes") ?? 60);
  const max = Number(formData.get("max_duration_minutes") ?? 120);
  if (min % 30 !== 0 || max % 30 !== 0 || min <= 0) return "invalid_duration";
  if (max < min) return "duration_order";

  const cap = Number(formData.get("attendee_cap") ?? -1);
  if (!Number.isInteger(cap) || (cap !== -1 && cap <= 0)) return "invalid_cap";

  return {
    title_pt: titlePt,
    title_en: titleEn,
    description_pt: String(formData.get("description_pt") ?? "").trim(),
    description_en: String(formData.get("description_en") ?? "").trim(),
    hourly_rate_cents: rate,
    min_duration_minutes: min,
    max_duration_minutes: max,
    attendee_cap: cap,
    active: formData.get("active") === "on",
  };
}

export async function saveService(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const parsed = parseServiceForm(formData);
  if (typeof parsed === "string") {
    return { error: parsed, success: false };
  }

  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");

  const { error } = id
    ? await supabase.from("services").update(parsed).eq("id", id)
    : await supabase.from("services").insert(parsed);

  if (error) {
    return { error: "save_failed", success: false };
  }

  revalidatePath("/", "layout");
  const locale = await getLocale();
  redirect({ href: "/admin/services", locale });
  return { error: null, success: true }; // unreachable — redirect throws
}
