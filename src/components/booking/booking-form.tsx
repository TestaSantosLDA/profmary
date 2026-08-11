"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookingCalendar } from "@/components/booking/booking-calendar";
import {
  createBookingRequest,
  fetchSlots,
  type BookingActionState,
} from "@/lib/booking/actions";
import type { BookableService } from "@/lib/booking/queries";
import {
  estimatePriceCents,
  onsiteFeeCents,
  type DaySlots,
  type LessonMode,
} from "@/lib/booking/slots";

const initialState: BookingActionState = { error: null };

type PublicSettings = {
  travel_fee_cents: number;
  travel_fee_threshold_km: number;
  onsite_fee_cents: number;
  onsite_fee_mode: "per_lesson" | "per_hour";
};

export type BookingPrefill = {
  serviceId: string;
  durationMinutes: number;
  attendees: string[];
  address: string;
  mode: LessonMode;
} | null;

/** Mirrors ServicePackBalance from the server-only packs queries. */
export type PackBalance = { remaining: number; everPurchased: boolean };

function serviceModes(service: BookableService | undefined): LessonMode[] {
  if (!service) return [];
  return [
    ...(service.allows_online ? (["online"] as const) : []),
    ...(service.allows_onsite ? (["onsite"] as const) : []),
  ];
}

export function BookingForm({
  services,
  defaultAddress,
  settings,
  prefill = null,
  packBalances = {},
}: {
  services: BookableService[];
  defaultAddress: string;
  settings: PublicSettings | null;
  prefill?: BookingPrefill;
  packBalances?: Record<string, PackBalance>;
}) {
  const t = useTranslations("BookingForm");
  const locale = useLocale();
  const [state, formAction, submitting] = useActionState(
    createBookingRequest,
    initialState
  );

  const [serviceId, setServiceId] = useState(
    (prefill && services.some((s) => s.id === prefill.serviceId)
      ? prefill.serviceId
      : services[0]?.id) ?? ""
  );
  const service = services.find((s) => s.id === serviceId);

  const durations = useMemo(() => {
    if (!service) return [];
    const list: number[] = [];
    for (
      let d = service.min_duration_minutes;
      d <= service.max_duration_minutes;
      d += 30
    ) {
      list.push(d);
    }
    return list;
  }, [service]);

  const [duration, setDuration] = useState<number>(
    prefill && durations.includes(prefill.durationMinutes)
      ? prefill.durationMinutes
      : (durations[0] ?? 60)
  );
  useEffect(() => {
    if (durations.length > 0 && !durations.includes(duration)) {
      setDuration(durations[0]);
    }
  }, [durations, duration]);

  const modes = serviceModes(service);
  const [mode, setMode] = useState<LessonMode>(
    prefill && modes.includes(prefill.mode) ? prefill.mode : (modes[0] ?? "onsite")
  );
  // Changing the service re-resolves the mode when the current one drops out.
  useEffect(() => {
    if (modes.length > 0 && !modes.includes(mode)) {
      setMode(modes[0]);
    }
  }, [modes, mode]);

  const [days, setDays] = useState<DaySlots[] | null>(null);
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [loadingSlots, startLoadingSlots] = useTransition();

  useEffect(() => {
    if (!serviceId || !duration) return;
    setDays(null);
    setDate("");
    setStart("");
    startLoadingSlots(async () => {
      const result = await fetchSlots(serviceId, duration);
      setDays("error" in result ? [] : result);
    });
  }, [serviceId, duration]);

  const [attendees, setAttendees] = useState<string[]>(
    prefill && prefill.attendees.length > 0 ? prefill.attendees : [""]
  );
  const [recurring, setRecurring] = useState(false);

  // One credit is one lesson, whatever its length — duration still drives
  // the money estimate for when the pack is NOT used.
  const packBalance = packBalances[serviceId];
  const packRemaining = packBalance?.remaining ?? 0;
  const [wantsPack, setWantsPack] = useState(false);
  const usePack = wantsPack && packRemaining > 0;

  const filledAttendees = attendees.filter((a) => a.trim());
  const base = service
    ? estimatePriceCents(
        service.hourly_rate_cents,
        duration,
        Math.max(filledAttendees.length, 1)
      )
    : 0;
  const serviceOnsiteFee = service
    ? onsiteFeeCents(service.onsite_fee_override_cents, settings, duration)
    : 0;
  const fee = mode === "onsite" ? serviceOnsiteFee : 0;
  const estimate = base + fee;

  const money = (cents: number) => {
    const value = (cents / 100).toFixed(2);
    return locale === "pt" ? `${value.replace(".", ",")}€` : `€${value}`;
  };

  const capReached =
    service && service.attendee_cap !== -1
      ? attendees.length >= service.attendee_cap
      : false;

  return (
    <form action={formAction} className="max-w-[880px] space-y-6">
      <input type="hidden" name="service_id" value={serviceId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="start" value={start} />
      <input type="hidden" name="duration" value={duration} />
      <input type="hidden" name="mode" value={mode} />

      <div className="grid gap-x-8 gap-y-6 min-[880px]:grid-cols-2">
      <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="service">{t("service")}</Label>
        <select
          id="service"
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {locale === "pt" ? s.title_pt : s.title_en} —{" "}
              {(s.hourly_rate_cents / 100).toFixed(2)}€/h
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label>{t("mode")}</Label>
        {modes.length > 1 ? (
          <div className="grid gap-2.5">
            {modes.map((m) => {
              const selected = mode === m;
              const tag =
                m === "online" ? t("included") : `+${money(serviceOnsiteFee)}`;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`min-h-11 w-full rounded-xl px-3.5 py-3 text-left transition-colors ${
                    selected
                      ? "border-2 border-accent bg-accent-tint shadow-sm"
                      : "border border-border bg-card"
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-[15px] font-bold">{t(m)}</span>
                    <span
                      className={`text-xs ${selected ? "text-accent" : "text-muted-foreground"}`}
                    >
                      {tag}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[13px] text-muted-foreground">
                    {t(`${m}Desc`)}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl bg-muted px-3.5 py-3 text-[13px] text-muted-foreground">
            {mode === "onsite" ? (
              <>
                {t("onlyOnsite")}{" "}
                <strong className="text-foreground">
                  +{money(serviceOnsiteFee)}
                </strong>
              </>
            ) : (
              t("onlyOnline")
            )}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="durationSel">{t("duration")}</Label>
        <select
          id="durationSel"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
        >
          {durations.map((d) => (
            <option key={d} value={d}>
              {t("minutes", { minutes: d })}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label>{t("dateTime")}</Label>
        {loadingSlots && (
          <p className="text-sm text-muted-foreground">{t("loadingSlots")}</p>
        )}
        {days && days.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("noSlots")}</p>
        )}
        {days && days.length > 0 && (
          <BookingCalendar
            days={days}
            date={date}
            start={start}
            locale={locale}
            onPick={({ date: d, start: s }) => {
              setDate(d);
              setStart(s ?? "");
            }}
          />
        )}
      </div>
      </div>

      <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t("attendees")}</Label>
        {attendees.map((name, i) => (
          <div key={i} className="flex gap-2">
            <Input
              name="attendee_names"
              value={name}
              onChange={(e) => {
                const next = [...attendees];
                next[i] = e.target.value;
                setAttendees(next);
              }}
              placeholder={t("attendeePlaceholder", { number: i + 1 })}
              required={i === 0}
            />
            {attendees.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setAttendees(attendees.filter((_, j) => j !== i))
                }
              >
                ✕
              </Button>
            )}
          </div>
        ))}
        {!capReached && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAttendees([...attendees, ""])}
          >
            {t("addAttendee")}
          </Button>
        )}
      </div>

      <div className="space-y-2 rounded-xl border p-4">
        <CheckboxField
          name="recurring"
          checked={recurring}
          onChange={(e) => setRecurring(e.target.checked)}
          label={t("recurring")}
          hint={t("recurringHint")}
        />
        {recurring && (
          <div className="space-y-1 pt-2">
            <Label htmlFor="end_date">{t("recurringEnd")}</Label>
            <Input
              id="end_date"
              name="end_date"
              type="date"
              min={date || undefined}
            />
            <p className="text-xs text-muted-foreground">
              {t("recurringEndHint")}
            </p>
          </div>
        )}
      </div>

      {mode === "onsite" ? (
        <div className="space-y-2">
          <Label htmlFor="address">{t("address")}</Label>
          <Textarea
            id="address"
            name="address"
            defaultValue={defaultAddress}
            required
            placeholder={t("addressHint")}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label>{t("link")}</Label>
          <p className="rounded-[10px] border border-dashed border-border px-3.5 py-3 text-[13px] text-muted-foreground">
            {t("linkHint")}
          </p>
        </div>
      )}

      <div className="rounded-md border bg-muted/30 p-4 text-sm">
        {usePack && <input type="hidden" name="use_pack" value="on" />}
        {packRemaining > 0 && (
          <div className="mb-3 border-b border-border pb-3">
            <CheckboxField
              name="use_pack_ui"
              checked={wantsPack}
              onChange={(e) => setWantsPack(e.target.checked)}
              label={t("usePack")}
            />
            <p className="mt-1 text-[13px] text-muted-foreground">
              {t("packBalanceLine", {
                remaining: packRemaining,
                after: packRemaining - 1,
              })}
            </p>
          </div>
        )}
        {usePack ? (
          <>
            <div className="flex justify-between text-muted-foreground">
              <span>{t("packBreakdownLabel")}</span>
              <span>{t("packBreakdownValue")}</span>
            </div>
            {mode === "onsite" && (
              <p className="mt-1 text-muted-foreground">{t("packTravelCovered")}</p>
            )}
            <div className="mt-2 flex justify-between border-t border-border pt-1.5 text-[15px] font-bold">
              <span>{t("packNothingToPay")}</span>
              <span>{money(0)}</span>
            </div>
            {recurring && (
              <p className="mt-2 text-muted-foreground">
                {t("packSeriesNote", { remaining: packRemaining })}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="flex justify-between text-muted-foreground">
              <span>{t("base", { minutes: duration })}</span>
              <span>{money(base)}</span>
            </div>
            {fee > 0 && (
              <div className="mt-1 flex justify-between text-muted-foreground">
                <span>{t("travel")}</span>
                <span>{money(fee)}</span>
              </div>
            )}
            <div className="mt-2 flex justify-between border-t border-border pt-1.5 text-[15px] font-bold">
              <span>{t("total")}</span>
              <span>{money(estimate)}</span>
            </div>
            {packRemaining === 0 && packBalance?.everPurchased && (
              <p className="mt-2 text-muted-foreground">{t("packEmptyNote")}</p>
            )}
            <p className="mt-2 text-muted-foreground">{t("estimateNote")}</p>
            {mode === "onsite" && settings && settings.travel_fee_cents > 0 && (
              <p className="mt-1 text-muted-foreground">
                {t("travelFeeNote", {
                  amount: (settings.travel_fee_cents / 100).toFixed(2),
                  km: settings.travel_fee_threshold_km,
                })}
              </p>
            )}
          </>
        )}
      </div>
      </div>
      </div>

      {state.error && (
        <p className="text-sm text-destructive">{t(`errors.${state.error}`)}</p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={submitting || !start || !date}
      >
        {t("submit")}
      </Button>
    </form>
  );
}
