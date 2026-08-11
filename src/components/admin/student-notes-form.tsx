"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AdminActionState } from "@/lib/admin/services-actions";
import { saveStudentNotes } from "@/lib/admin/students-actions";

const initialState: AdminActionState = { error: null, success: false };

export function StudentNotesForm({
  studentId,
  notes,
}: {
  studentId: string;
  notes: string;
}) {
  const t = useTranslations("AdminStudents");
  const [state, formAction, pending] = useActionState(
    saveStudentNotes,
    initialState
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={studentId} />
      <Textarea name="notes" rows={6} defaultValue={notes} />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {t("saveNotes")}
        </Button>
        {state.success && !pending && (
          <span className="text-sm text-positive">{t("notesSaved")}</span>
        )}
        {state.error && !pending && (
          <span className="text-sm text-destructive">{t("saveFailed")}</span>
        )}
      </div>
    </form>
  );
}
