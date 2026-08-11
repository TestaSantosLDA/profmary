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
  const onsiteFee = Math.round(Number(formData.get("onsite_fee_eur") ?? 0) * 100);
  const onsiteFeeMode = String(formData.get("onsite_fee_mode") ?? "per_lesson");

  const values = [buffer, cutoff, notice, travelFee, thresholdKm, onsiteFee];
  if (
    values.some((v) => !Number.isFinite(v) || v < 0) ||
    !["per_lesson", "per_hour"].includes(onsiteFeeMode)
  ) {
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
      onsite_fee_cents: onsiteFee,
      onsite_fee_mode: onsiteFeeMode,
    })
    .eq("id", true);

  if (error) {
    return { error: "save_failed", success: false };
  }

  revalidatePath("/", "layout");
  return { error: null, success: true };
}
