"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { requestPack, type PackRequestState } from "@/lib/packs/actions";
import type { PackRow } from "@/lib/packs/queries";

const initialState: PackRequestState = { error: null, requested: false };

type ServiceOption = {
  id: string;
  title_pt: string;
  title_en: string;
  hourly_rate_cents: number;
};

export function PackRequestForm({
  services,
  packs,
  preselectPackId,
}: {
  services: ServiceOption[];
  packs: PackRow[];
  preselectPackId: string | null;
}) {
  const t = useTranslations("PacksPage");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(requestPack, initialState);

  const preselected = preselectPackId
    ? packs.find((p) => p.id === preselectPackId)
    : undefined;
  const [serviceId, setServiceId] = useState(
    preselected?.service_id ?? services[0]?.id ?? ""
  );
  const [packId, setPackId] = useState(preselected?.id ?? "");

  const service = services.find((s) => s.id === serviceId);
  const servicePacks = packs.filter((p) => p.service_id === serviceId);
  const selected = servicePacks.find((p) => p.id === packId);

  const money = (cents: number) => {
    const value = (cents / 100).toFixed(2);
    return locale === "pt" ? `${value.replace(".", ",")}€` : `€${value}`;
  };

  const saving = (p: PackRow) =>
    service ? (service.hourly_rate_cents - p.price_per_lesson_cents) * p.lessons : 0;

  if (state.requested) {
    return (
      <div className="mt-8 space-y-3 rounded-xl border border-border bg-card p-5">
        <p className="text-[15px] font-semibold">{t("sentTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("sentBody")}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-6">
      <input type="hidden" name="pack_id" value={packId} />

      <div className="space-y-2">
        <Label htmlFor="pack-service">{t("service")}</Label>
        <select
          id="pack-service"
          value={serviceId}
          onChange={(e) => {
            setServiceId(e.target.value);
            setPackId("");
          }}
          className="border-input h-11 w-full rounded-[10px] border bg-card px-3 text-sm"
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {locale === "pt" ? s.title_pt : s.title_en}
            </option>
          ))}
        </select>
      </div>

      {servicePacks.length > 0 ? (
        <div className="grid gap-2.5">
          {servicePacks.map((p) => {
            const isSelected = packId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setPackId(isSelected ? "" : p.id)}
                className={`min-h-11 w-full rounded-xl px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? "border-2 border-accent bg-accent-tint shadow-sm"
                    : "border border-border bg-card"
                }`}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-heading text-[17px] font-semibold">
                    {t("lessons", { lessons: p.lessons })}
                  </span>
                  <span className="text-[15px] font-bold">
                    {money(p.lessons * p.price_per_lesson_cents)}
                  </span>
                </span>
                <span className="mt-0.5 block text-[13px] text-muted-foreground">
                  {t("perLesson", { price: money(p.price_per_lesson_cents) })}
                  {saving(p) > 0 && (
                    <>
                      {" · "}
                      <span className="font-bold text-accent">
                        {t("saving", { amount: money(saving(p)) })}
                      </span>
                    </>
                  )}
                </span>
                <span className="block text-[13px] text-muted-foreground">
                  {t("travelIncluded")}
                  {p.validity_months !== null &&
                    ` · ${t("validity", { months: p.validity_months })}`}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl bg-muted px-4 py-3 text-[13px] text-muted-foreground">
          {t("noPacks")}
        </p>
      )}

      {selected && service && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{t("summaryLessons")}</span>
            <span>{selected.lessons}</span>
          </div>
          <div className="mt-1 flex justify-between text-muted-foreground">
            <span>{t("summaryPerLesson")}</span>
            <span>{money(selected.price_per_lesson_cents)}</span>
          </div>
          {saving(selected) > 0 && (
            <div className="mt-1 flex justify-between text-muted-foreground">
              <span>{t("summarySaving")}</span>
              <span className="font-bold text-accent">
                {money(saving(selected))}
              </span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-border pt-1.5 text-[15px] font-bold">
            <span>{t("summaryTotal")}</span>
            <span>{money(selected.lessons * selected.price_per_lesson_cents)}</span>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">{t("howTitle")}</p>
        <p className="mt-1 text-[13px] text-muted-foreground">{t("howBody")}</p>
        <p className="mt-1 text-[13px] text-muted-foreground">{t("howSharing")}</p>
      </div>

      {state.error && (
        <p className="text-sm text-destructive">{t(`errors.${state.error}`)}</p>
      )}

      <Button type="submit" className="w-full" disabled={!selected || pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
