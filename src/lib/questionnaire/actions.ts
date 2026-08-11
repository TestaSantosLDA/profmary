"use server";

import { createServiceClient } from "@/lib/supabase/server";
import type { AnswerValue, QuestionRow } from "./types";

export type QuestionnaireActionState = {
  saved: boolean;
  error: string | null;
};

const MAX_TEXT = 2000;

// Everything is optional by design: an invalid or empty value clears the
// answer instead of failing the save. The only hard failure is a bad token.
export async function saveQuestionnaireAnswers(
  _prev: QuestionnaireActionState,
  formData: FormData
): Promise<QuestionnaireActionState> {
  const token = String(formData.get("token") ?? "");
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return { saved: false, error: "save_failed" };
  }

  const supabase = createServiceClient();

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("questionnaire_token", token)
    .maybeSingle();

  if (!student) {
    return { saved: false, error: "invalid_token" };
  }

  const { data: questionRows } = await supabase
    .from("questions")
    .select("id, service_id, type, options, follow_up_question_id, active")
    .returns<
      Pick<
        QuestionRow,
        "id" | "service_id" | "type" | "options" | "follow_up_question_id" | "active"
      >[]
    >();

  const all = questionRows ?? [];
  const byId = new Map(all.map((q) => [q.id, q]));
  const followUpParent = new Map<string, (typeof all)[number]>();
  for (const q of all) {
    if (q.follow_up_question_id) followUpParent.set(q.follow_up_question_id, q);
  }

  const normalize = (
    q: (typeof all)[number],
    raw: unknown
  ): AnswerValue | null => {
    switch (q.type) {
      case "short_text":
      case "long_text": {
        const text = typeof raw === "string" ? raw.trim().slice(0, MAX_TEXT) : "";
        return text || null;
      }
      case "yes_no":
        return raw === "yes" || raw === "no" ? raw : null;
      case "multi_choice": {
        const picked = Array.isArray(raw)
          ? raw.filter((v): v is string => typeof v === "string" && q.options.includes(v))
          : [];
        return picked.length > 0 ? picked : null;
      }
    }
  };

  const upserts: { student_id: string; question_id: string; value: AnswerValue }[] = [];
  const clears: string[] = [];

  for (const [questionId, raw] of Object.entries(payload)) {
    const question = byId.get(questionId);
    if (!question) continue;

    const parent = followUpParent.get(questionId);
    if (!parent && !question.active) continue;
    // A follow-up only holds an answer while its parent stands on "sim".
    if (parent && normalize(parent, payload[parent.id]) !== "yes") {
      clears.push(questionId);
      continue;
    }

    const value = normalize(question, raw);
    if (value === null) {
      clears.push(questionId);
    } else {
      upserts.push({ student_id: student.id, question_id: questionId, value });
    }
  }

  if (upserts.length > 0) {
    const { error } = await supabase.from("answers").upsert(
      upserts.map((u) => ({ ...u, answered_at: new Date().toISOString() })),
      { onConflict: "student_id,question_id" }
    );
    if (error) {
      return { saved: false, error: "save_failed" };
    }
  }
  if (clears.length > 0) {
    await supabase
      .from("answers")
      .delete()
      .eq("student_id", student.id)
      .in("question_id", clears);
  }

  return { saved: true, error: null };
}
