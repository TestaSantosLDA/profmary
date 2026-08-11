"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { AdminActionState } from "@/lib/admin/services-actions";
import { resendQuestionnaire } from "@/lib/admin/students-actions";

const initialState: AdminActionState = { error: null, success: false };

export function ResendQuestionnaireButton({ studentId }: { studentId: string }) {
  const t = useTranslations("AdminStudents");
  const [state, formAction, pending] = useActionState(
    resendQuestionnaire,
    initialState
  );

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="id" value={studentId} />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {t("resend")}
      </Button>
      {state.success && !pending && (
        <span className="text-sm text-positive">{t("resent")}</span>
      )}
      {state.error && !pending && (
        <span className="text-sm text-destructive">{t("saveFailed")}</span>
      )}
    </form>
  );
}
