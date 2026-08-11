"use client";

import { useActionState, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addBlockout } from "@/lib/admin/availability-actions";
import type { AdminActionState } from "@/lib/admin/services-actions";

const initialState: AdminActionState = { error: null, success: false };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function upperFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function BlockoutCalendar() {
  const t = useTranslations("AdminAvailability");
  const locale = useLocale();
  const intl = locale === "pt" ? "pt-PT" : "en-GB";
  const [state, formAction, pending] = useActionState(addBlockout, initialState);

  const today = todayStr();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  const [year, monthNum] = month.split("-").map(Number);
  const firstWeekday = (new Date(year, monthNum - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  const monthIndex = (m: string) => {
    const [y, mo] = m.split("-").map(Number);
    return y * 12 + mo;
  };
  const canGoBack = monthIndex(month) > monthIndex(today.slice(0, 7));
  const canGoForward = monthIndex(month) < monthIndex(today.slice(0, 7)) + 12;

  const shiftMonth = (delta: number) => {
    const idx = monthIndex(month) + delta - 1;
    setMonth(`${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`);
  };

  const weekdayInitials = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(intl, { weekday: "short" });
    return Array.from({ length: 7 }, (_, i) =>
      fmt.format(new Date(2024, 0, 1 + i)).replace(".", "").slice(0, 3).toLowerCase()
    );
  }, [intl]);

  const monthLabel = upperFirst(
    new Intl.DateTimeFormat(intl, { month: "long", year: "numeric" }).format(
      new Date(year, monthNum - 1, 1)
    )
  );

  const pick = (d: string) => {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(d);
      setRangeEnd("");
    } else if (d < rangeStart) {
      setRangeStart(d);
    } else {
      setRangeEnd(d);
    }
  };

  const fullDate = (d: string) =>
    new Intl.DateTimeFormat(intl, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${d}T12:00:00`));

  const selectionLabel = !rangeStart
    ? t("selectRange")
    : !rangeEnd || rangeEnd === rangeStart
      ? fullDate(rangeStart)
      : rangeStart.slice(0, 7) === rangeEnd.slice(0, 7)
        ? `${Number(rangeStart.slice(8))}–${fullDate(rangeEnd)}`
        : `${fullDate(rangeStart)} – ${fullDate(rangeEnd)}`;

  const navBtn =
    "flex size-9 items-center justify-center rounded-[10px] border border-border transition-colors hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none";

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="w-full max-w-[380px] rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-heading text-base font-semibold">{monthLabel}</p>
          <div className="flex gap-1.5">
            <button type="button" aria-label="‹" className={navBtn} disabled={!canGoBack} onClick={() => shiftMonth(-1)}>
              ‹
            </button>
            <button type="button" aria-label="›" className={navBtn} disabled={!canGoForward} onClick={() => shiftMonth(1)}>
              ›
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weekdayInitials.map((w) => (
            <span key={w} className="pb-1 text-center text-[11px] font-medium text-muted-foreground">
              {w}
            </span>
          ))}
          {Array.from({ length: firstWeekday }, (_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = `${month}-${pad(i + 1)}`;
            const isPast = d < today;
            const isEndpoint = d === rangeStart || d === rangeEnd;
            const inRange =
              rangeStart && rangeEnd && d > rangeStart && d < rangeEnd;

            return (
              <button
                key={d}
                type="button"
                disabled={isPast}
                onClick={() => pick(d)}
                className={[
                  "h-11 rounded-[10px] text-sm transition-colors",
                  isEndpoint
                    ? "bg-primary font-semibold text-primary-foreground"
                    : inRange
                      ? "bg-secondary text-primary"
                      : isPast
                        ? "pointer-events-none text-muted-foreground opacity-45"
                        : "hover:bg-secondary",
                ].join(" ")}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      <form action={formAction} className="min-w-[240px] flex-1 space-y-4">
        <input type="hidden" name="start_date" value={rangeStart} />
        <input type="hidden" name="end_date" value={rangeEnd || rangeStart} />
        <p className="text-sm font-medium">{selectionLabel}</p>
        <div className="space-y-2">
          <Label htmlFor="reason">{t("reason")}</Label>
          <Input id="reason" name="reason" placeholder={t("reasonHint")} />
        </div>
        {state.error && (
          <p className="text-sm text-destructive">{t(`errors.${state.error}`)}</p>
        )}
        <Button
          type="submit"
          variant="outline"
          disabled={pending || !rangeStart}
        >
          {t("addBlockout")}
        </Button>
      </form>
    </div>
  );
}
