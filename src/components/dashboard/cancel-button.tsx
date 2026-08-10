"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function CancelButton({
  action,
  id,
  label,
  confirmMessage,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  label: string;
  confirmMessage: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button variant="ghost" size="sm" type="submit">
        {label}
      </Button>
    </form>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("Status");
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-900",
    confirmed: "bg-emerald-100 text-emerald-900",
    declined: "bg-muted text-muted-foreground",
    cancelled_student: "bg-muted text-muted-foreground",
    cancelled_admin: "bg-muted text-muted-foreground",
    skipped_blockout: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${styles[status] ?? "bg-muted"}`}
    >
      {t(status)}
    </span>
  );
}
