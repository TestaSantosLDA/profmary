"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addAvailabilityRule,
  addBlockout,
} from "@/lib/admin/availability-actions";
import type { AdminActionState } from "@/lib/admin/services-actions";

const initialState: AdminActionState = { error: null, success: false };

export function AddRuleForm() {
  const t = useTranslations("AdminAvailability");
  const [state, formAction, pending] = useActionState(
    addAvailabilityRule,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="weekday">{t("weekday")}</Label>
        <select
          id="weekday"
          name="weekday"
          className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
        >
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <option key={d} value={d}>
              {t(`weekdays.${d}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="start_time">{t("from")}</Label>
        <Input id="start_time" name="start_time" type="time" required className="w-28" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="end_time">{t("to")}</Label>
        <Input id="end_time" name="end_time" type="time" required className="w-28" />
      </div>
      <Button type="submit" disabled={pending}>
        {t("addRule")}
      </Button>
      {state.error && (
        <p className="w-full text-sm text-destructive">
          {t(`errors.${state.error}`)}
        </p>
      )}
    </form>
  );
}

export function AddBlockoutForm() {
  const t = useTranslations("AdminAvailability");
  const [state, formAction, pending] = useActionState(addBlockout, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="start_date">{t("from")}</Label>
        <Input id="start_date" name="start_date" type="date" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="end_date">{t("to")}</Label>
        <Input id="end_date" name="end_date" type="date" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="reason">{t("reason")}</Label>
        <Input id="reason" name="reason" placeholder={t("reasonHint")} />
      </div>
      <Button type="submit" disabled={pending}>
        {t("addBlockout")}
      </Button>
      {state.error && (
        <p className="w-full text-sm text-destructive">
          {t(`errors.${state.error}`)}
        </p>
      )}
    </form>
  );
}
