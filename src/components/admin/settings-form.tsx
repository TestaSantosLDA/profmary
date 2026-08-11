"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettings } from "@/lib/admin/settings-actions";
import type { AdminActionState } from "@/lib/admin/services-actions";

const initialState: AdminActionState = { error: null, success: false };

type Settings = {
  buffer_minutes: number;
  cancellation_cutoff_hours: number;
  booking_notice_hours: number;
  travel_fee_cents: number;
  travel_fee_threshold_km: number;
  onsite_fee_cents: number;
  onsite_fee_mode: "per_lesson" | "per_hour";
};

export function SettingsForm({ settings }: { settings: Settings }) {
  const t = useTranslations("AdminSettings");
  const [state, formAction, pending] = useActionState(
    updateSettings,
    initialState
  );

  const fields = [
    { name: "buffer_minutes", value: settings.buffer_minutes, step: 5 },
    {
      name: "cancellation_cutoff_hours",
      value: settings.cancellation_cutoff_hours,
      step: 1,
    },
    {
      name: "booking_notice_hours",
      value: settings.booking_notice_hours,
      step: 1,
    },
  ] as const;

  return (
    <form
      action={formAction}
      className="max-w-[480px] space-y-4 rounded-xl border border-border bg-card p-5"
    >
      {fields.map((f) => (
        <div key={f.name} className="space-y-2">
          <Label htmlFor={f.name}>{t(`fields.${f.name}`)}</Label>
          <Input
            id={f.name}
            name={f.name}
            type="number"
            min="0"
            step={f.step}
            defaultValue={f.value}
            required
          />
          <p className="text-xs text-muted-foreground">{t(`hints.${f.name}`)}</p>
        </div>
      ))}

      <div className="space-y-4 border-t border-border pt-4">
        <div>
          <h2 className="font-heading text-[1.05rem] font-semibold">
            {t("onsite.title")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("onsite.intro")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="onsite_fee_eur">{t("fields.onsite_fee_eur")}</Label>
            <Input
              id="onsite_fee_eur"
              name="onsite_fee_eur"
              type="number"
              min="0"
              step="0.01"
              defaultValue={(settings.onsite_fee_cents / 100).toFixed(2)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="onsite_fee_mode">{t("fields.onsite_fee_mode")}</Label>
            <select
              id="onsite_fee_mode"
              name="onsite_fee_mode"
              defaultValue={settings.onsite_fee_mode}
              className="border-input h-11 w-full rounded-[10px] border bg-card px-3 text-sm"
            >
              <option value="per_lesson">{t("feeModes.per_lesson")}</option>
              <option value="per_hour">{t("feeModes.per_hour")}</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="travel_fee_eur">{t("fields.travel_fee_eur")}</Label>
            <Input
              id="travel_fee_eur"
              name="travel_fee_eur"
              type="number"
              min="0"
              step="0.01"
              defaultValue={(settings.travel_fee_cents / 100).toFixed(2)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="travel_fee_threshold_km">
              {t("fields.travel_fee_threshold_km")}
            </Label>
            <Input
              id="travel_fee_threshold_km"
              name="travel_fee_threshold_km"
              type="number"
              min="0"
              step="1"
              defaultValue={settings.travel_fee_threshold_km}
              required
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t("hints.travel_fee")}</p>
      </div>

      {state.error && (
        <p className="text-sm text-destructive">{t(`errors.${state.error}`)}</p>
      )}
      {state.success && <p className="text-sm text-positive">{t("saved")}</p>}

      <Button type="submit" disabled={pending}>
        {t("save")}
      </Button>
    </form>
  );
}
