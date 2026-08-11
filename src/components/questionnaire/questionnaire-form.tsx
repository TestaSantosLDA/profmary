"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  saveQuestionnaireAnswers,
  type QuestionnaireActionState,
} from "@/lib/questionnaire/actions";
import type { AnswerValue, FormQuestion, FormSection } from "@/lib/questionnaire/types";

const initialState: QuestionnaireActionState = { saved: false, error: null };

// Full-width option button, matching the booking mode picker.
function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-11 w-full rounded-[10px] px-3.5 py-2.5 text-left text-[15px] transition-colors ${
        selected
          ? "border-2 border-accent bg-accent-tint font-medium shadow-sm"
          : "border border-border bg-card"
      }`}
    >
      {children}
    </button>
  );
}

function QuestionControl({
  question,
  value,
  onChange,
}: {
  question: FormQuestion;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue | undefined) => void;
}) {
  const t = useTranslations("Questionnaire");

  switch (question.type) {
    case "short_text":
      return (
        <Input
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
      );
    case "long_text":
      return (
        <Textarea
          rows={4}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
      );
    case "yes_no":
      // Deselectable on purpose: every question is optional, including
      // walking an answer back.
      return (
        <div className="grid grid-cols-2 gap-2.5">
          {(["yes", "no"] as const).map((option) => (
            <OptionButton
              key={option}
              selected={value === option}
              onClick={() => onChange(value === option ? undefined : option)}
            >
              {t(option)}
            </OptionButton>
          ))}
        </div>
      );
    case "multi_choice": {
      const picked = Array.isArray(value) ? value : [];
      const toggle = (option: string) => {
        const next = picked.includes(option)
          ? picked.filter((o) => o !== option)
          : [...picked, option];
        onChange(next.length > 0 ? next : undefined);
      };
      return (
        <div className="grid gap-2.5">
          {question.options.map((option) => (
            <OptionButton
              key={option}
              selected={picked.includes(option)}
              onClick={() => toggle(option)}
            >
              {option}
            </OptionButton>
          ))}
        </div>
      );
    }
  }
}

export function QuestionnaireForm({
  token,
  sections,
  initialAnswers,
}: {
  token: string;
  sections: FormSection[];
  initialAnswers: Record<string, AnswerValue>;
}) {
  const t = useTranslations("Questionnaire");
  const [answers, setAnswers] =
    useState<Record<string, AnswerValue>>(initialAnswers);
  const [state, formAction, pending] = useActionState(
    saveQuestionnaireAnswers,
    initialState
  );

  const setAnswer = (id: string, value: AnswerValue | undefined) => {
    setAnswers((prev) => {
      const next = { ...prev };
      if (value === undefined) delete next[id];
      else next[id] = value;
      return next;
    });
  };

  // Cleared answers must reach the server as explicit clears, so the payload
  // carries every rendered question — absent keys mean "delete".
  const payload: Record<string, AnswerValue | null> = {};
  for (const section of sections) {
    for (const q of section.questions) {
      payload[q.id] = answers[q.id] ?? null;
      if (q.followUp) payload[q.followUp.id] = answers[q.followUp.id] ?? null;
    }
  }

  return (
    <form action={formAction} className="mt-8 space-y-8">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      {sections.map((section) => (
        <section key={section.eyebrow}>
          <h2 className="mb-3 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            {section.eyebrow}
          </h2>
          <div className="space-y-3.5">
            {section.questions.map((question) => (
              <div
                key={question.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <p className="text-[16px] font-semibold">{question.label}</p>
                {question.hint && (
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    {question.hint}
                  </p>
                )}
                <div className="mt-3.5">
                  <QuestionControl
                    question={question}
                    value={answers[question.id]}
                    onChange={(v) => setAnswer(question.id, v)}
                  />
                </div>
                {question.followUp && answers[question.id] === "yes" && (
                  <div className="mt-3.5">
                    <p className="text-sm font-medium">{question.followUp.label}</p>
                    <Input
                      className="mt-1.5"
                      value={
                        typeof answers[question.followUp.id] === "string"
                          ? (answers[question.followUp.id] as string)
                          : ""
                      }
                      onChange={(e) =>
                        setAnswer(question.followUp!.id, e.target.value || undefined)
                      }
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      <footer className="space-y-3">
        {state.saved && !pending && (
          <p className="rounded-xl bg-positive-tint px-4 py-3 text-sm text-positive">
            {t("saved")}
          </p>
        )}
        {state.error && !pending && (
          <p className="rounded-xl bg-danger-tint px-4 py-3 text-sm text-destructive">
            {t("error")}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? t("saving") : t("save")}
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">{t("later")}</Link>
          </Button>
        </div>
        <p className="text-[13px] text-muted-foreground">{t("footnote")}</p>
      </footer>
    </form>
  );
}
