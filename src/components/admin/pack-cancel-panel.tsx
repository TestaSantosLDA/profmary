"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { resolvePackCancellation } from "@/lib/admin/packs-actions";
import type { AdminActionState } from "@/lib/admin/services-actions";

const initialState: AdminActionState = { error: null, success: false };

export type PackCancelItem = {
  bookingId: string;
  studentName: string;
  serviceTitle: string;
  when: string; // preformatted
};

const RESOLUTIONS = ["refund", "consume", "refund_warning"] as const;
type Resolution = (typeof RESOLUTIONS)[number];

function PackCancelRow({ item }: { item: PackCancelItem }) {
  const t = useTranslations("AdminBookings.packCancel");
  const [state, formAction, pending] = useActionState(
    resolvePackCancellation,
    initialState
  );
  const [resolution, setResolution] = useState<Resolution | null>(null);

  return (
    <li className="space-y-3 px-4 py-3">
      <p className="text-sm">
        <span className="font-medium">{item.studentName}</span> ·{" "}
        {item.serviceTitle} ·{" "}
        <span className="text-muted-foreground">{item.when}</span>
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {RESOLUTIONS.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={resolution === r}
            onClick={() => setResolution(resolution === r ? null : r)}
            className={`min-h-11 rounded-[10px] px-3 py-2 text-left text-[13px] transition-colors ${
              resolution === r
                ? "border-2 border-accent bg-accent-tint font-medium shadow-sm"
                : "border border-border bg-card"
            }`}
          >
            {t(`options.${r}`)}
          </button>
        ))}
      </div>
      <form action={formAction} className="flex items-center gap-3">
        <input type="hidden" name="booking_id" value={item.bookingId} />
        <input type="hidden" name="resolution" value={resolution ?? ""} />
        <Button type="submit" size="sm" variant="secondary" disabled={!resolution || pending}>
          {t("confirm")}
        </Button>
        {state.error && !pending && (
          <span className="text-sm text-destructive">{t(`errors.${state.error}`)}</span>
        )}
      </form>
    </li>
  );
}

export function PackCancelPanel({ items }: { items: PackCancelItem[] }) {
  const t = useTranslations("AdminBookings.packCancel");
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-1 text-xl font-semibold">{t("title")}</h2>
      <p className="mb-4 text-sm text-muted-foreground">{t("intro")}</p>
      <ul className="divide-y rounded-xl border border-border bg-card">
        {items.map((item) => (
          <PackCancelRow key={item.bookingId} item={item} />
        ))}
      </ul>
    </section>
  );
}
