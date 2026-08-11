"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { Input } from "@/components/ui/input";
import {
  approveBooking,
  approveSeries,
  declineBooking,
  declineSeries,
} from "@/lib/admin/booking-actions";
import type { AdminActionState } from "@/lib/admin/services-actions";

const initialState: AdminActionState = { error: null, success: false };

export type RequestItem = {
  kind: "booking" | "series";
  id: string;
  studentName: string;
  serviceTitle: string;
  when: string; // preformatted
  attendees: number;
  address: string;
  estimate: string; // preformatted
};

export function RequestCard({ item }: { item: RequestItem }) {
  const t = useTranslations("AdminRequests");
  const approve = item.kind === "booking" ? approveBooking : approveSeries;
  const decline = item.kind === "booking" ? declineBooking : declineSeries;
  const [approveState, approveAction, approving] = useActionState(
    approve,
    initialState
  );
  const [declineState, declineAction, declining] = useActionState(
    decline,
    initialState
  );
  const [note, setNote] = useState("");

  const error = approveState.error ?? declineState.error;

  return (
    <li className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div>
        <p className="text-[15px] font-semibold">
          {item.studentName} · {item.serviceTitle}
          {item.kind === "series" && (
            <span className="ml-2 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-primary">
              {t("weekly")}
            </span>
          )}
        </p>
        <p className="text-sm text-muted-foreground">{item.when}</p>
        <p className="text-sm text-muted-foreground">
          {t("details", { attendees: item.attendees, estimate: item.estimate })}
        </p>
        <p className="text-sm text-muted-foreground">{item.address}</p>
      </div>

      <Input
        placeholder={t("notePlaceholder")}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <div className="flex flex-wrap items-center gap-3">
        <form action={approveAction} className="flex items-center gap-3">
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="note" value={note} />
          {item.kind === "booking" && (
            <CheckboxField name="travel_fee" label={t("travelFee")} />
          )}
          <Button type="submit" size="sm" disabled={approving || declining}>
            {t("approve")}
          </Button>
        </form>
        <form action={declineAction}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="note" value={note} />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={approving || declining}
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
