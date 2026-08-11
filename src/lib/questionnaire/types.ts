export type QuestionType =
  | "short_text"
  | "long_text"
  | "multi_choice"
  | "yes_no";

export const QUESTION_TYPES: QuestionType[] = [
  "short_text",
  "long_text",
  "multi_choice",
  "yes_no",
];

/** String for text and sim/não answers, string array for escolha múltipla. */
export type AnswerValue = string | string[];

export type QuestionRow = {
  id: string;
  service_id: string | null;
  type: QuestionType;
  label_pt: string;
  label_en: string;
  hint_pt: string;
  hint_en: string;
  options: string[];
  follow_up_question_id: string | null;
  position: number;
  active: boolean;
};

/** A question already localized for the student form. */
export type FormQuestion = {
  id: string;
  type: QuestionType;
  label: string;
  hint: string;
  options: string[];
  followUp: { id: string; label: string; hint: string } | null;
};

export type FormSection = {
  eyebrow: string;
  questions: FormQuestion[];
};

/** EN falls back to PT when empty, as everywhere else. */
export function localized(locale: string, pt: string, en: string): string {
  return locale === "en" && en.trim() ? en : pt;
}
