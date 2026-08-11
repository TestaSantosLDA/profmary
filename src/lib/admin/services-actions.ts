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
  allows_online: boolean;
  allows_onsite: boolean;
  onsite_fee_override_cents: number | null;
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

  const allowsOnline = formData.get("allows_online") === "on";
  const allowsOnsite = formData.get("allows_onsite") === "on";
  if (!allowsOnline && !allowsOnsite) return "no_mode";

  // Empty override falls back to the global fee in settings.
  const feeRaw = String(formData.get("onsite_fee_override_eur") ?? "").trim();
  let feeOverride: number | null = null;
  if (allowsOnsite && feeRaw !== "") {
    feeOverride = Math.round(Number(feeRaw) * 100);
    if (!Number.isFinite(feeOverride) || feeOverride < 0) return "invalid_fee";
  }

  return {
    allows_online: allowsOnline,
    allows_onsite: allowsOnsite,
    onsite_fee_override_cents: feeOverride,
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

type PackInput = {
  id: string; // "" for new rows
  lessons: number;
  price_per_lesson_cents: number;
  validity_months: number | null;
};

function parsePacks(formData: FormData): PackInput[] | string {
  const ids = formData.getAll("pack_id").map(String);
  const lessons = formData.getAll("pack_lessons").map(String);
  const prices = formData.getAll("pack_price_eur").map(String);
  const validities = formData.getAll("pack_validity_months").map(String);

  const packs: PackInput[] = [];
  for (let i = 0; i < lessons.length; i++) {
    const count = Number(lessons[i]);
    const price = Math.round(Number(prices[i]) * 100);
    const validityRaw = (validities[i] ?? "").trim();
    const validity = validityRaw === "" ? null : Number(validityRaw);

    if (!Number.isInteger(count) || count <= 0) return "invalid_pack";
    if (!Number.isFinite(price) || price < 0) return "invalid_pack";
    if (validity !== null && (!Number.isInteger(validity) || validity <= 0)) {
      return "invalid_pack";
    }

    packs.push({
      id: ids[i] ?? "",
      lessons: count,
      price_per_lesson_cents: price,
      validity_months: validity,
    });
  }
  return packs;
}

export async function saveService(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const parsed = parseServiceForm(formData);
  if (typeof parsed === "string") {
    return { error: parsed, success: false };
  }
  const packs = parsePacks(formData);
  if (typeof packs === "string") {
    return { error: packs, success: false };
  }

  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");

  let serviceId = id;
  if (id) {
    const { error } = await supabase.from("services").update(parsed).eq("id", id);
    if (error) {
      return { error: "save_failed", success: false };
    }
  } else {
    const { data: created, error } = await supabase
      .from("services")
      .insert(parsed)
      .select("id")
      .single();
    if (error || !created) {
      return { error: "save_failed", success: false };
    }
    serviceId = created.id;
  }

  // Purchases snapshot their pack, so templates are never deleted — a
  // removed pack goes inactive and existing balances live on untouched.
  const { data: existing } = await supabase
    .from("packs")
    .select("id")
    .eq("service_id", serviceId)
    .eq("active", true);
  const keptIds = new Set(packs.map((p) => p.id).filter(Boolean));

  for (const pack of packs) {
    const row = {
      service_id: serviceId,
      lessons: pack.lessons,
      price_per_lesson_cents: pack.price_per_lesson_cents,
      validity_months: pack.validity_months,
      active: true,
    };
    const { error } = pack.id
      ? await supabase.from("packs").update(row).eq("id", pack.id)
      : await supabase.from("packs").insert(row);
    if (error) {
      return { error: "save_failed", success: false };
    }
  }
  const removed = (existing ?? []).filter((p) => !keptIds.has(p.id));
  if (removed.length > 0) {
    await supabase
      .from("packs")
      .update({ active: false })
      .in("id", removed.map((p) => p.id));
  }

  revalidatePath("/", "layout");
  const locale = await getLocale();
  redirect({ href: "/admin/services", locale });
  return { error: null, success: true }; // unreachable — redirect throws
}
