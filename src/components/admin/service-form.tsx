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

export type PackFormRow = {
  id: string;
  lessons: number;
  price_per_lesson_cents: number;
  validity_months: number | null;
};

type PackDraft = {
  id: string; // "" for new rows
  lessons: string;
  priceEur: string;
  validityMonths: string;
};

export function ServiceForm({
  service,
  packs = [],
  globalFeeLabel,
}: {
  service?: ServiceRow;
  packs?: PackFormRow[];
  /** Preformatted global travel fee ("5,00€ por aula") for the override hint. */
  globalFeeLabel: string;
}) {
  const t = useTranslations("AdminServices");
  const [state, formAction, pending] = useActionState(saveService, initialState);
  const [allowsOnline, setAllowsOnline] = useState(service?.allows_online ?? true);
  const [allowsOnsite, setAllowsOnsite] = useState(service?.allows_onsite ?? true);
  // Mirrors the rate field so the pack boxes can compute the saving live.
  const [rateEur, setRateEur] = useState(
    service ? (service.hourly_rate_cents / 100).toFixed(2) : "15.00"
  );
  const [packDrafts, setPackDrafts] = useState<PackDraft[]>(
    packs.map((p) => ({
      id: p.id,
      lessons: String(p.lessons),
      priceEur: (p.price_per_lesson_cents / 100).toFixed(2),
      validityMonths: p.validity_months === null ? "" : String(p.validity_months),
    }))
  );

  const patchPack = (i: number, patch: Partial<PackDraft>) =>
    setPackDrafts((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const money = (cents: number) => `${(cents / 100).toFixed(2).replace(".", ",")}€`;

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
            value={rateEur}
            onChange={(e) => setRateEur(e.target.value)}
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
        <Label>{t("packs")}</Label>
        {packDrafts.map((pack, i) => {
          const lessons = Number(pack.lessons);
          const priceCents = Math.round(Number(pack.priceEur) * 100);
          const rateCents = Math.round(Number(rateEur) * 100);
          const valid =
            Number.isInteger(lessons) && lessons > 0 && Number.isFinite(priceCents);
          const saving = valid ? (rateCents - priceCents) * lessons : 0;
          return (
            <div key={i} className="space-y-2 rounded-xl border border-border p-3">
              <input type="hidden" name="pack_id" value={pack.id} />
              <div className="flex items-start gap-2">
                <div className="grid flex-1 gap-2 [grid-template-columns:repeat(auto-fit,minmax(110px,1fr))]">
                  <div className="space-y-1">
                    <Label className="text-xs">{t("packLessons")}</Label>
                    <Input
                      name="pack_lessons"
                      type="number"
                      min="1"
                      value={pack.lessons}
                      onChange={(e) => patchPack(i, { lessons: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("packPricePerLesson")}</Label>
                    <Input
                      name="pack_price_eur"
                      type="number"
                      step="0.01"
                      min="0"
                      value={pack.priceEur}
                      onChange={(e) => patchPack(i, { priceEur: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("packValidity")}</Label>
                    <Input
                      name="pack_validity_months"
                      type="number"
                      min="1"
                      value={pack.validityMonths}
                      onChange={(e) =>
                        patchPack(i, { validityMonths: e.target.value })
                      }
                      placeholder={t("packNoExpiry")}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={t("packRemove")}
                  onClick={() =>
                    setPackDrafts((prev) => prev.filter((_, j) => j !== i))
                  }
                  className="mt-5 flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-border text-muted-foreground transition-colors hover:text-foreground"
                >
                  ×
                </button>
              </div>
              {valid && (
                <p className="text-xs text-muted-foreground">
                  {t("packComputed", {
                    total: money(lessons * priceCents),
                    saving: money(Math.max(saving, 0)),
                  })}
                </p>
              )}
            </div>
          );
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setPackDrafts((prev) => [
              ...prev,
              { id: "", lessons: "10", priceEur: rateEur, validityMonths: "6" },
            ])
          }
        >
          {t("packAdd")}
        </Button>
        <p className="text-xs text-muted-foreground">{t("packsHint")}</p>
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
