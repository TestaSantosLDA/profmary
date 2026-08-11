"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import {
  activatePackPurchase,
  declinePackPurchase,
} from "@/lib/admin/packs-actions";
import type { AdminActionState } from "@/lib/admin/services-actions";

const initialState: AdminActionState = { error: null, success: false };

export type PackRequestItem = {
  id: string;
  studentName: string;
  serviceTitle: string;
  lessons: number;
  pricePerLesson: string; // preformatted
  total: string; // preformatted
  requestedAt: string; // preformatted
  validityMonths: number | null;
};

export function PackRequestCard({ item }: { item: PackRequestItem }) {
  const t = useTranslations("AdminRequests");
  const [activateState, activateAction, activating] = useActionState(
    activatePackPurchase,
    initialState
  );
  const [declineState, declineAction, declining] = useActionState(
    declinePackPurchase,
    initialState
  );
  // The checkbox is the point: activation starts the validity clock, so it
  // must assert that money actually changed hands.
  const [paymentReceived, setPaymentReceived] = useState(false);

  const error = activateState.error ?? declineState.error;

  return (
    <li className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div>
        <p className="text-[15px] font-semibold">
          {item.studentName} · {item.serviceTitle}
          <span className="ml-2 rounded-full bg-accent-tint px-2.5 py-0.5 text-xs font-medium text-accent">
            {t("packPill")}
          </span>
        </p>
        <p className="text-sm text-muted-foreground">
          {t("packLine", {
            lessons: item.lessons,
            price: item.pricePerLesson,
          })}{" "}
          · {item.requestedAt}
        </p>
        <p className="text-[15px] font-semibold">{item.total}</p>
        <p className="text-sm text-muted-foreground">
          {item.validityMonths !== null
            ? t("packActivationNote", { months: item.validityMonths })
            : t("packActivationNoteNoExpiry")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form action={activateAction} className="flex items-center gap-3">
          <input type="hidden" name="id" value={item.id} />
          {paymentReceived && (
            <input type="hidden" name="payment_received" value="on" />
          )}
          <CheckboxField
            name="payment_received_ui"
            checked={paymentReceived}
            onChange={(e) => setPaymentReceived(e.target.checked)}
            label={t("packPaymentReceived")}
          />
          <Button
            type="submit"
            size="sm"
            disabled={!paymentReceived || activating || declining}
          >
            {t("packActivate")}
          </Button>
        </form>
        <form action={declineAction}>
          <input type="hidden" name="id" value={item.id} />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={activating || declining}
          >
            {t("decline")}
          </Button>
        </form>
      </div>

      {error && (
        <p className="text-sm text-destructive">{t(`errors.${error}`)}</p>
      )}
    </li>
  );
}
