"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AdminActionState } from "./services-actions";

export async function updateSettings(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const buffer = Number(formData.get("buffer_minutes"));
  const cutoff = Number(formData.get("cancellation_cutoff_hours"));
  const notice = Number(formData.get("booking_notice_hours"));
  const travelFee = Math.round(Number(formData.get("travel_fee_eur") ?? 0) * 100);
  const thresholdKm = Number(formData.get("travel_fee_threshold_km") ?? 0);

  const values = [buffer, cutoff, notice, travelFee, thresholdKm];
  if (values.some((v) => !Number.isFinite(v) || v < 0)) {
    return { error: "invalid_values", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update({
      buffer_minutes: buffer,
      cancellation_cutoff_hours: cutoff,
      booking_notice_hours: notice,
      travel_fee_cents: travelFee,
      travel_fee_threshold_km: thresholdKm,
    })
    .eq("id", true);

  if (error) {
    return { error: "save_failed", success: false };
  }

  revalidatePath("/", "layout");
  return { error: null, success: true };
}
