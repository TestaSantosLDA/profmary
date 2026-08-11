"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { grantPack } from "@/lib/admin/packs-actions";
import type { AdminActionState } from "@/lib/admin/services-actions";

const initialState: AdminActionState = { error: null, success: false };

export type GrantablePack = {
  id: string;
  label: string; // preformatted "Serviço — 10 aulas · 22,50€/aula"
};

export function GrantPackForm({
  accountId,
  packs,
}: {
  accountId: string;
  packs: GrantablePack[];
}) {
  const t = useTranslations("AdminStudents.pack");
  const [state, formAction, pending] = useActionState(grantPack, initialState);
  const [packId, setPackId] = useState(packs[0]?.id ?? "");

  if (packs.length === 0) return null;

  return (
    <form action={formAction} className="space-y-2.5">
      <input type="hidden" name="account_id" value={accountId} />
      <input type="hidden" name="pack_id" value={packId} />
      <select
        value={packId}
        onChange={(e) => setPackId(e.target.value)}
        className="border-input h-11 w-full rounded-[10px] border bg-card px-3 text-sm"
      >
        {packs.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {t("grant")}
        </Button>
        {state.error && !pending && (
          <span className="text-sm text-destructive">{t("grantFailed")}</span>
        )}
      </div>
    </form>
  );
}
