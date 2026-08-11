"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AdminActionState } from "@/lib/admin/services-actions";
import { removeQuestion, saveQuestion } from "@/lib/admin/students-actions";
import {
  QUESTION_TYPES,
  type QuestionRow,
  type QuestionType,
} from "@/lib/questionnaire/types";

const initialState: AdminActionState = { error: null, success: false };

type ServiceOption = { id: string; title_pt: string };

function QuestionForm({
  set,
  question,
  followUp,
  onDone,
}: {
  set: string;
  question: QuestionRow | null;
  followUp: QuestionRow | null;
  onDone: () => void;
}) {
  const t = useTranslations("AdminStudents.builder");
  const [state, formAction, pending] = useActionState(saveQuestion, initialState);
  const [removeState, removeAction, removePending] = useActionState(
    removeQuestion,
    initialState
  );
  const [type, setType] = useState<QuestionType>(question?.type ?? "short_text");

  const done = state.success || removeState.success;
  useEffect(() => {
    if (done) onDone();
  }, [done, onDone]);

  const error = state.error ?? removeState.error;

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border bg-muted/40 p-4">
      <input type="hidden" name="id" value={question?.id ?? ""} />
      <input type="hidden" name="set" value={set} />

      <div className="space-y-1.5">
        <Label htmlFor="q-type">{t("type")}</Label>
        <select
          id="q-type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as QuestionType)}
          className="border-input h-11 w-full max-w-[280px] rounded-[10px] border bg-card px-3 text-sm"
        >
          {QUESTION_TYPES.map((value) => (
            <option key={value} value={value}>
              {t(`types.${value}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        <div className="space-y-1.5">
          <Label htmlFor="q-label-pt">{t("labelPt")}</Label>
          <Input id="q-label-pt" name="label_pt" defaultValue={question?.label_pt ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="q-label-en">{t("labelEn")}</Label>
          <Input id="q-label-en" name="label_en" defaultValue={question?.label_en ?? ""} />
        </div>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        <div className="space-y-1.5">
          <Label htmlFor="q-hint-pt">{t("hintPt")}</Label>
          <Input id="q-hint-pt" name="hint_pt" defaultValue={question?.hint_pt ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="q-hint-en">{t("hintEn")}</Label>
          <Input id="q-hint-en" name="hint_en" defaultValue={question?.hint_en ?? ""} />
        </div>
      </div>

      {type === "multi_choice" && (
        <div className="space-y-1.5">
          <Label htmlFor="q-options">{t("options")}</Label>
          <Textarea
            id="q-options"
            name="options"
            rows={4}
            defaultValue={(question?.options ?? []).join("\n")}
          />
        </div>
      )}

      {type === "yes_no" && (
        <div className="space-y-3">
          <p className="text-sm font-medium">{t("followUp")}</p>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            <div className="space-y-1.5">
              <Label htmlFor="q-fu-pt">{t("labelPt")}</Label>
              <Input id="q-fu-pt" name="follow_up_pt" defaultValue={followUp?.label_pt ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-fu-en">{t("labelEn")}</Label>
              <Input id="q-fu-en" name="follow_up_en" defaultValue={followUp?.label_en ?? ""} />
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">{t("enFallback")}</p>

      {error && !pending && !removePending && (
        <p className="text-sm text-destructive">{t(`errors.${error}`)}</p>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        <Button type="submit" size="sm" disabled={pending || removePending}>
          {t("save")}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          {t("cancel")}
        </Button>
        {question && (
          <Button
            type="submit"
            size="sm"
            variant="destructive"
            formAction={removeAction}
            disabled={pending || removePending}
          >
            {t("remove")}
          </Button>
        )}
      </div>
    </form>
  );
}

export function QuestionBuilder({
  questions,
  services,
}: {
  questions: QuestionRow[];
  services: ServiceOption[];
}) {
  const t = useTranslations("AdminStudents.builder");
  const [set, setSet] = useState("common");
  // null = closed, "new" = blank form, otherwise the question id being edited.
  const [editing, setEditing] = useState<string | null>(null);

  const followUpIds = new Set(
    questions.map((q) => q.follow_up_question_id).filter(Boolean)
  );
  const byId = new Map(questions.map((q) => [q.id, q]));
  const list = questions
    .filter(
      (q) =>
        q.active &&
        !followUpIds.has(q.id) &&
        (set === "common" ? q.service_id === null : q.service_id === set)
    )
    .sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="question-set">{t("set")}</Label>
          <select
            id="question-set"
            value={set}
            onChange={(e) => {
              setSet(e.target.value);
              setEditing(null);
            }}
            className="border-input h-11 w-full min-w-[240px] rounded-[10px] border bg-card px-3 text-sm"
          >
            <option value="common">{t("common")}</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title_pt}
              </option>
            ))}
          </select>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setEditing("new")}>
          {t("newQuestion")}
        </Button>
      </div>

      {list.length > 0 ? (
        <ul className="divide-y rounded-xl border border-border bg-card">
          {list.map((q) => (
            <li key={q.id} className="px-4 py-3">
              {editing === q.id ? (
                <QuestionForm
                  set={set}
                  question={q}
                  followUp={
                    q.follow_up_question_id
                      ? (byId.get(q.follow_up_question_id) ?? null)
                      : null
                  }
                  onDone={() => setEditing(null)}
                />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{q.label_pt}</p>
                    <p className="text-sm text-muted-foreground">
                      {t(`types.${q.type}`)}
                      {q.type === "multi_choice" &&
                        ` · ${t("optionsCount", { count: q.options.length })}`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(q.id)}
                  >
                    {t("edit")}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          {t("emptySet")}
        </p>
      )}

      {editing === "new" && (
        <QuestionForm
          set={set}
          question={null}
          followUp={null}
          onDone={() => setEditing(null)}
        />
      )}

      <p className="rounded-xl bg-secondary px-4 py-3 text-sm text-primary">
        {t("lengthNote")}
      </p>
    </div>
  );
}
