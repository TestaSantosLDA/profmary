import "server-only";

import { getTranslations } from "next-intl/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  localized,
  type AnswerValue,
  type FormQuestion,
  type FormSection,
  type QuestionRow,
} from "./types";

// The token is the credential: everything here runs on the service client
// because students/answers have admin-only RLS by design (private_notes must
// never be readable through user policies).

type StudentByToken = {
  id: string;
  name: string;
  account_id: string;
};

export type QuestionnaireData = {
  student: { id: string; name: string };
  sections: FormSection[];
  answers: Record<string, AnswerValue>;
};

function toFormQuestion(
  locale: string,
  q: QuestionRow,
  followUps: Map<string, QuestionRow>
): FormQuestion {
  const followUp = q.follow_up_question_id
    ? followUps.get(q.follow_up_question_id)
    : undefined;
  return {
    id: q.id,
    type: q.type,
    label: localized(locale, q.label_pt, q.label_en),
    hint: localized(locale, q.hint_pt, q.hint_en),
    options: q.options,
    followUp: followUp
      ? {
          id: followUp.id,
          label: localized(locale, followUp.label_pt, followUp.label_en),
          hint: localized(locale, followUp.hint_pt, followUp.hint_en),
        }
      : null,
  };
}

/**
 * The full form for one ficha: common questions first, then the sets of the
 * services this student has actually booked. Returns null on unknown tokens.
 */
export async function loadQuestionnaireByToken(
  token: string,
  locale: string
): Promise<QuestionnaireData | null> {
  const supabase = createServiceClient();

  const { data: student } = await supabase
    .from("students")
    .select("id, name, account_id")
    .eq("questionnaire_token", token)
    .maybeSingle<StudentByToken>();

  if (!student) return null;

  const [{ data: questionRows }, { data: attendeeRows }, { data: answerRows }] =
    await Promise.all([
      supabase
        .from("questions")
        .select(
          "id, service_id, type, label_pt, label_en, hint_pt, hint_en, options, follow_up_question_id, position, active"
        )
        .returns<QuestionRow[]>(),
      supabase
        .from("booking_attendees")
        .select("bookings(service_id, status, services(title_pt, title_en))")
        .eq("student_id", student.id),
      supabase
        .from("answers")
        .select("question_id, value")
        .eq("student_id", student.id),
    ]);

  const all = questionRows ?? [];
  const followUpIds = new Set(
    all.map((q) => q.follow_up_question_id).filter(Boolean)
  );
  const followUps = new Map(
    all.filter((q) => followUpIds.has(q.id)).map((q) => [q.id, q])
  );
  const topLevel = all
    .filter((q) => q.active && !followUpIds.has(q.id))
    .sort((a, b) => a.position - b.position);

  // The services this ficha booked, in booking order, still-live requests only.
  const bookedServices = new Map<string, { title_pt: string; title_en: string }>();
  for (const row of attendeeRows ?? []) {
    const booking = row.bookings as unknown as {
      service_id: string;
      status: string;
      services: { title_pt: string; title_en: string };
    } | null;
    if (!booking || !["pending", "confirmed"].includes(booking.status)) continue;
    if (!bookedServices.has(booking.service_id)) {
      bookedServices.set(booking.service_id, booking.services);
    }
  }

  const t = await getTranslations({ locale, namespace: "Questionnaire" });

  const sections: FormSection[] = [];
  const common = topLevel.filter((q) => q.service_id === null);
  if (common.length > 0) {
    sections.push({
      eyebrow: t("sectionCommon"),
      questions: common.map((q) => toFormQuestion(locale, q, followUps)),
    });
  }
  for (const [serviceId, titles] of bookedServices) {
    const own = topLevel.filter((q) => q.service_id === serviceId);
    if (own.length === 0) continue;
    sections.push({
      eyebrow: t("sectionService", {
        service: localized(locale, titles.title_pt, titles.title_en),
      }),
      questions: own.map((q) => toFormQuestion(locale, q, followUps)),
    });
  }

  const answers: Record<string, AnswerValue> = {};
  for (const a of answerRows ?? []) {
    answers[a.question_id] = a.value as AnswerValue;
  }

  return { student: { id: student.id, name: student.name }, sections, answers };
}
