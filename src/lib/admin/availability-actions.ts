"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AdminActionState } from "./services-actions";

export async function addAvailabilityRule(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const weekday = Number(formData.get("weekday"));
  const startTime = String(formData.get("start_time") ?? "");
  const endTime = String(formData.get("end_time") ?? "");

  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return { error: "invalid_weekday", success: false };
  }
  if (!startTime || !endTime || endTime <= startTime) {
    return { error: "invalid_times", success: false };
  }

  const supabase = await createClient();

  const { data: overlapping } = await supabase
    .from("availability_rules")
    .select("id")
    .eq("weekday", weekday)
    .lt("start_time", endTime)
    .gt("end_time", startTime)
    .limit(1);

  if (overlapping && overlapping.length > 0) {
    return { error: "overlapping_rule", success: false };
  }

  const { error } = await supabase
    .from("availability_rules")
    .insert({ weekday, start_time: startTime, end_time: endTime });

  if (error) {
    return { error: "save_failed", success: false };
  }

  revalidatePath("/", "layout");
  return { error: null, success: true };
}

export async function deleteAvailabilityRule(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("availability_rules").delete().eq("id", id);
  revalidatePath("/", "layout");
}

export async function addBlockout(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!startDate || !endDate || endDate < startDate) {
    return { error: "invalid_dates", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("blockouts")
    .insert({ start_date: startDate, end_date: endDate, reason });

  if (error) {
    return { error: "save_failed", success: false };
  }

  // Flipping overlapping series occurrences to skipped_blockout is task 6.4.
  revalidatePath("/", "layout");
  return { error: null, success: true };
}

export async function deleteBlockout(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("blockouts").delete().eq("id", id);
  revalidatePath("/", "layout");
}
