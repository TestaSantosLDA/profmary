"use server";

import { revalidatePath } from "next/cache";
import { sendQuestionnaireLink } from "@/lib/email/notifications";
import { QUESTION_TYPES, type QuestionRow, type QuestionType } from "@/lib/questionnaire/types";
import { createClient } from "@/lib/supabase/server";
import type { AdminActionState } from "./services-actions";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function hasAnswers(supabase: Supabase, questionId: string): Promise<boolean> {
  const { count } = await supabase
    .from("answers")
    .select("question_id", { count: "exact", head: true })
    .eq("question_id", questionId);
  return (count ?? 0) > 0;
}

type QuestionPatch = {
  type: QuestionType;
  label_pt: string;
  label_en: string;
  hint_pt: string;
  hint_en: string;
  options: string[];
  follow_up_question_id?: string | null;
};

/**
 * Update a question, or — when it already has answers and the visible part
 * changed — version it: the old row goes inactive, a fresh row replaces it,
 * and answered fichas keep the text the student actually saw.
 */
async function upsertVersioned(
  supabase: Supabase,
  existing: QuestionRow,
  patch: QuestionPatch
): Promise<string | null> {
  const coreChanged =
    existing.type !== patch.type ||
    existing.label_pt !== patch.label_pt ||
    existing.label_en !== patch.label_en ||
    JSON.stringify(existing.options) !== JSON.stringify(patch.options);

  if (coreChanged && (await hasAnswers(supabase, existing.id))) {
    const { data: created, error } = await supabase
      .from("questions")
      .insert({
        service_id: existing.service_id,
        position: existing.position,
        follow_up_question_id: existing.follow_up_question_id,
        ...patch,
      })
      .select("id")
      .single();
    if (error || !created) return null;
    const { error: retireError } = await supabase
      .from("questions")
      .update({ active: false })
      .eq("id", existing.id);
    return retireError ? null : created.id;
  }

  const { error } = await supabase
    .from("questions")
    .update(patch)
    .eq("id", existing.id);
  return error ? null : existing.id;
}

async function loadQuestion(
  supabase: Supabase,
  id: string
): Promise<QuestionRow | null> {
  const { data } = await supabase
    .from("questions")
    .select(
      "id, service_id, type, label_pt, label_en, hint_pt, hint_en, options, follow_up_question_id, position, active"
    )
    .eq("id", id)
    .maybeSingle<QuestionRow>();
  return data;
}

export async function saveQuestion(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const id = String(formData.get("id") ?? "");
  const set = String(formData.get("set") ?? "common");
  const type = String(formData.get("type") ?? "") as QuestionType;
  const labelPt = String(formData.get("label_pt") ?? "").trim();
  const labelEn = String(formData.get("label_en") ?? "").trim();
  const hintPt = String(formData.get("hint_pt") ?? "").trim();
  const hintEn = String(formData.get("hint_en") ?? "").trim();
  const followUpPt = String(formData.get("follow_up_pt") ?? "").trim();
  const followUpEn = String(formData.get("follow_up_en") ?? "").trim();
  const options = String(formData.get("options") ?? "")
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean)
    .filter((o, i, arr) => arr.indexOf(o) === i);

  if (!QUESTION_TYPES.includes(type)) {
    return { error: "invalid_type", success: false };
  }
  if (!labelPt) {
    return { error: "missing_label", success: false };
  }
  if (type === "multi_choice" && options.length < 2) {
    return { error: "missing_options", success: false };
  }

  const supabase = await createClient();
  const existing = id ? await loadQuestion(supabase, id) : null;
  if (id && !existing) {
    return { error: "save_failed", success: false };
  }

  // Resolve the follow-up first so the parent can point at its final row.
  let followUpId: string | null = null;
  const previousFollowUpId = existing?.follow_up_question_id ?? null;
  if (type === "yes_no" && followUpPt) {
    const followUpPatch: QuestionPatch = {
      type: "short_text",
      label_pt: followUpPt,
      label_en: followUpEn,
      hint_pt: "",
      hint_en: "",
      options: [],
    };
    if (previousFollowUpId) {
      const followUp = await loadQuestion(supabase, previousFollowUpId);
      followUpId = followUp
        ? await upsertVersioned(supabase, followUp, followUpPatch)
        : null;
    } else {
      const { data: created } = await supabase
        .from("questions")
        .insert({ ...followUpPatch, service_id: set === "common" ? null : set })
        .select("id")
        .single();
      followUpId = created?.id ?? null;
    }
    if (!followUpId) {
      return { error: "save_failed", success: false };
    }
  }

  const patch: QuestionPatch = {
    type,
    label_pt: labelPt,
    label_en: labelEn,
    hint_pt: hintPt,
    hint_en: hintEn,
    options: type === "multi_choice" ? options : [],
    follow_up_question_id: followUpId,
  };

  if (existing) {
    const finalId = await upsertVersioned(supabase, existing, patch);
    if (!finalId) {
      return { error: "save_failed", success: false };
    }
  } else {
    // New questions land at the end of their conjunto.
    const positionQuery = supabase.from("questions").select("position");
    const { data: last } = await (set === "common"
      ? positionQuery.is("service_id", null)
      : positionQuery.eq("service_id", set)
    )
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from("questions").insert({
      ...patch,
      service_id: set === "common" ? null : set,
      position: (last?.position ?? 0) + 1,
    });
    if (error) {
      return { error: "save_failed", success: false };
    }
  }

  // A cleared or no-longer-applicable follow-up retires quietly.
  if (previousFollowUpId && followUpId !== previousFollowUpId) {
    await supabase
      .from("questions")
      .update({ active: false })
      .eq("id", previousFollowUpId);
  }

  revalidatePath("/", "layout");
  return { error: null, success: true };
}

export async function removeQuestion(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  const existing = await loadQuestion(supabase, id);
  if (!existing) {
    return { error: "save_failed", success: false };
  }

  const ids = [existing.id, existing.follow_up_question_id].filter(
    (v): v is string => v !== null
  );
  const { error } = await supabase
    .from("questions")
    .update({ active: false })
    .in("id", ids);

  if (error) {
    return { error: "save_failed", success: false };
  }

  revalidatePath("/", "layout");
  return { error: null, success: true };
}

export async function saveStudentNotes(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const id = String(formData.get("id") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .update({ private_notes: notes })
    .eq("id", id)
    .select("id");

  // RLS filters non-admins down to zero rows; report it as a failure.
  if (error || !data || data.length === 0) {
    return { error: "save_failed", success: false };
  }

  revalidatePath("/", "layout");
  return { error: null, success: true };
}

export async function resendQuestionnaire(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const id = String(formData.get("id") ?? "");

  // The RLS-guarded read doubles as the admin check before the service-role
  // email helper takes over.
  const supabase = await createClient();
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (!student) {
    return { error: "save_failed", success: false };
  }

  await sendQuestionnaireLink(student.id);

  revalidatePath("/", "layout");
  return { error: null, success: true };
}
