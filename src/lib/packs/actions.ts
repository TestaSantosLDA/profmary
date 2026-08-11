"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { notifyPackRequest } from "@/lib/email/notifications";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { PackRow } from "./queries";

export type PackRequestState = { error: string | null; requested: boolean };

// Nothing on the site takes money: a request only creates a 'requested'
// purchase, and the balance exists once Maria confirms she was paid.
export async function requestPack(
  _prev: PackRequestState,
  formData: FormData
): Promise<PackRequestState> {
  const packId = String(formData.get("pack_id") ?? "");
  if (!packId) {
    return { error: "missing_pack", requested: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "not_authenticated", requested: false };
  }

  // Snapshots come from the template server-side; the browser only names
  // the pack.
  const service = createServiceClient();
  const { data: pack } = await service
    .from("packs")
    .select("id, service_id, lessons, price_per_lesson_cents, validity_months, active, services(active)")
    .eq("id", packId)
    .maybeSingle<PackRow & { services: { active: boolean } }>();

  if (!pack || !pack.active || !pack.services.active) {
    return { error: "unknown_pack", requested: false };
  }

  const { data: created, error } = await service
    .from("pack_purchases")
    .insert({
      account_id: user.id,
      pack_id: pack.id,
      service_id: pack.service_id,
      lessons_total: pack.lessons,
      price_per_lesson_cents: pack.price_per_lesson_cents,
      price_paid_cents: pack.lessons * pack.price_per_lesson_cents,
      validity_months: pack.validity_months,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { error: "save_failed", requested: false };
  }

  after(() => notifyPackRequest(created.id));

  revalidatePath("/", "layout");
  return { error: null, requested: true };
}
