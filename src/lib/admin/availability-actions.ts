"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AdminActionState } from "./services-actions";

type RuleResult = { error: string | null };

async function hasOverlap(
  weekday: number,
  startTime: string,
  endTime: string,
  excludeId?: string
): Promise<boolean> {
  const supabase = await createClient();
  let query = supabase
    .from("availability_rules")
    .select("id")
    .eq("weekday", weekday)
    .lt("start_time", endTime)
    .gt("end_time", startTime)
    .limit(1);
  if (excludeId) {
    query = query.neq("id", excludeId);
  }
  const { data } = await query;
  return (data ?? []).length > 0;
}

/** Chip edit: update one rule's time range, keeping the day overlap-free. */
export async function updateRule(
  id: string,
  weekday: number,
  startTime: string,
  endTime: string
): Promise<RuleResult> {
  if (!startTime || !endTime || endTime <= startTime) {
    return { error: "invalid_times" };
  }
  if (await hasOverlap(weekday, startTime, endTime, id)) {
    return { error: "overlapping_rule" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("availability_rules")
    .update({ start_time: startTime, end_time: endTime })
    .eq("id", id);

  if (error) return { error: "save_failed" };
  revalidatePath("/", "layout");
  return { error: null };
}

const DEFAULT_WINDOWS: Array<[string, string]> = [
  ["17:00", "20:00"],
  ["09:00", "12:00"],
  ["14:00", "17:00"],
];

/** "+ Adicionar" / toggle-on: insert the first default window that fits. */
export async function addRuleForDay(weekday: number): Promise<RuleResult> {
  for (const [start, end] of DEFAULT_WINDOWS) {
    if (!(await hasOverlap(weekday, start, end))) {
      const supabase = await createClient();
      const { error } = await supabase
        .from("availability_rules")
        .insert({ weekday, start_time: start, end_time: end });
      if (error) return { error: "save_failed" };
      revalidatePath("/", "layout");
      return { error: null };
    }
  }
  return { error: "no_space" };
}

/** Toggle-off: remove every rule for the weekday. */
export async function clearDay(weekday: number): Promise<RuleResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("availability_rules")
    .delete()
    .eq("weekday", weekday);
  if (error) return { error: "save_failed" };
  revalidatePath("/", "layout");
  return { error: null };
}

export async function deleteRuleById(id: string): Promise<RuleResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("availability_rules")
    .delete()
    .eq("id", id);
  if (error) return { error: "save_failed" };
  revalidatePath("/", "layout");
  return { error: null };
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

  // Overlapping series occurrences are skipped by the blockouts DB trigger.
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
