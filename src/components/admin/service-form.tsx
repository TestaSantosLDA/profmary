"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  saveService,
  type AdminActionState,
} from "@/lib/admin/services-actions";

const initialState: AdminActionState = { error: null, success: false };

export type ServiceRow = {
  id: string;
  title_pt: string;
  title_en: string;
  description_pt: string;
  description_en: string;
  hourly_rate_cents: number;
  min_duration_minutes: number;
  max_duration_minutes: number;
  attendee_cap: number;
  active: boolean;
  allows_online: boolean;
  allows_onsite: boolean;
  onsite_fee_override_cents: number | null;
};

export function ServiceForm({
  service,
  globalFeeLabel,
}: {
  service?: ServiceRow;
  /** Preformatted global travel fee ("5,00€ por aula") for the override hint. */
  globalFeeLabel: string;
}) {
  const t = useTranslations("AdminServices");
  const [state, formAction, pending] = useActionState(saveService, initialState);
  const [allowsOnline, setAllowsOnline] = useState(service?.allows_online ?? true);
  const [allowsOnsite, setAllowsOnsite] = useState(service?.allows_onsite ?? true);

  return (
    <form
      action={formAction}
      className="max-w-xl space-y-4 rounded-xl border border-border bg-card p-5"
    >
      {service && <input type="hidden" name="id" value={service.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title_pt">{t("titlePt")}</Label>
          <Input id="title_pt" name="title_pt" defaultValue={service?.title_pt} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="title_en">{t("titleEn")}</Label>
          <Input id="title_en" name="title_en" defaultValue={service?.title_en} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description_pt">{t("descriptionPt")}</Label>
        <Textarea id="description_pt" name="description_pt" defaultValue={service?.description_pt} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description_en">{t("descriptionEn")}</Label>
        <Textarea id="description_en" name="description_en" defaultValue={service?.description_en} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="hourly_rate_eur">{t("hourlyRate")}</Label>
          <Input
            id="hourly_rate_eur"
            name="hourly_rate_eur"
            type="number"
            step="0.01"
            min="0"
            defaultValue={service ? (service.hourly_rate_cents / 100).toFixed(2) : "15.00"}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="min_duration_minutes">{t("minDuration")}</Label>
          <Input
            id="min_duration_minutes"
            name="min_duration_minutes"
            type="number"
            step="30"
            min="30"
            defaultValue={service?.min_duration_minutes ?? 60}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max_duration_minutes">{t("maxDuration")}</Label>
          <Input
            id="max_duration_minutes"
            name="max_duration_minutes"
            type="number"
            step="30"
            min="30"
            defaultValue={service?.max_duration_minutes ?? 120}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="attendee_cap">{t("attendeeCap")}</Label>
        <Input
          id="attendee_cap"
          name="attendee_cap"
          type="number"
          min="-1"
          defaultValue={service?.attendee_cap ?? -1}
          required
        />
        <p className="text-xs text-muted-foreground">{t("attendeeCapHint")}</p>
      </div>

      <div className="space-y-2">
        <Label>{t("modes")}</Label>
        <div
          className={`rounded-xl border border-border p-3 ${allowsOnline ? "bg-card" : "bg-muted"}`}
        >
          <CheckboxField
            name="allows_online"
            checked={allowsOnline}
            onChange={(e) => setAllowsOnline(e.target.checked)}
            label={t("modeOnline")}
            hint={t("modeOnlineHint")}
          />
        </div>
        <div
          className={`rounded-xl border border-border p-3 ${allowsOnsite ? "bg-card" : "bg-muted"}`}
        >
          <CheckboxField
            name="allows_onsite"
            checked={allowsOnsite}
            onChange={(e) => setAllowsOnsite(e.target.checked)}
            label={t("modeOnsite")}
            hint={t("modeOnsiteHint")}
          />
          {allowsOnsite && (
            <div className="mt-3 space-y-2 pl-6">
              <Label htmlFor="onsite_fee_override_eur">{t("onsiteFee")}</Label>
              <Input
                id="onsite_fee_override_eur"
                name="onsite_fee_override_eur"
                type="number"
                step="0.01"
                min="0"
                placeholder="5.00"
                defaultValue={
                  service?.onsite_fee_override_cents != null
                    ? (service.onsite_fee_override_cents / 100).toFixed(2)
                    : ""
                }
              />
              <p className="text-xs text-muted-foreground">
                {t("onsiteFeeHint", { fee: globalFeeLabel })}
              </p>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{t("modesHint")}</p>
      </div>

      <CheckboxField
        name="active"
        defaultChecked={service?.active ?? true}
        label={t("active")}
      />

      {state.error && (
        <p className="text-sm text-destructive">{t(`errors.${state.error}`)}</p>
      )}

      <Button type="submit" disabled={pending}>
        {t("save")}
      </Button>
    </form>
  );
}
