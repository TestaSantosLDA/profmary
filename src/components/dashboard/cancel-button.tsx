"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { StatusBadge as UiStatusBadge } from "@/components/ui/status-badge";

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
  return <UiStatusBadge status={status}>{t(status)}</UiStatusBadge>;
}
