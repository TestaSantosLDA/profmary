"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createBookingRequest,
  fetchSlots,
  type BookingActionState,
} from "@/lib/booking/actions";
import type { BookableService } from "@/lib/booking/queries";
import { estimatePriceCents, type DaySlots } from "@/lib/booking/slots";

const initialState: BookingActionState = { error: null };

type PublicSettings = {
  travel_fee_cents: number;
  travel_fee_threshold_km: number;
};

export type BookingPrefill = {
  serviceId: string;
  durationMinutes: number;
  attendees: string[];
  address: string;
} | null;

export function BookingForm({
  services,
  defaultAddress,
  settings,
  prefill = null,
}: {
  services: BookableService[];
  defaultAddress: string;
  settings: PublicSettings | null;
  prefill?: BookingPrefill;
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

  const filledAttendees = attendees.filter((a) => a.trim());
  const estimate = service
    ? estimatePriceCents(
        service.hourly_rate_cents,
        duration,
        Math.max(filledAttendees.length, 1)
      )
    : 0;

  const selectedDay = days?.find((d) => d.date === date);
  const capReached =
    service && service.attendee_cap !== -1
      ? attendees.length >= service.attendee_cap
      : false;

  const dateLabel = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      <input type="hidden" name="service_id" value={serviceId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="start" value={start} />
      <input type="hidden" name="duration" value={duration} />

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
          <>
            <select
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setStart("");
              }}
              className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
            >
              <option value="">{t("chooseDate")}</option>
              {days.map((d) => (
                <option key={d.date} value={d.date}>
                  {dateLabel(d.date)}
                </option>
              ))}
            </select>
            {selectedDay && (
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedDay.starts.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStart(s)}
                    className={
                      s === start
                        ? "rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
                        : "rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

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

      <div className="space-y-2 rounded-md border p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="recurring"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
            className="h-4 w-4"
          />
          {t("recurring")}
        </label>
        <p className="text-xs text-muted-foreground">{t("recurringHint")}</p>
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

      <div className="rounded-md border bg-muted/30 p-4 text-sm">
        <p className="font-medium">
          {t("estimate", { amount: (estimate / 100).toFixed(2) })}
        </p>
        <p className="mt-1 text-muted-foreground">{t("estimateNote")}</p>
        {settings && settings.travel_fee_cents > 0 && (
          <p className="mt-1 text-muted-foreground">
            {t("travelFeeNote", {
              amount: (settings.travel_fee_cents / 100).toFixed(2),
              km: settings.travel_fee_threshold_km,
            })}
          </p>
        )}
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
