"use client";

import { useMemo, useState } from "react";
import type { DaySlots } from "@/lib/booking/slots";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function monthOf(dateStr: string): string {
  return dateStr.slice(0, 7); // YYYY-MM
}

function intlLocale(locale: string): string {
  return locale === "pt" ? "pt-PT" : "en-GB";
}

/** Uppercase only the first letter — pt-PT Intl output is lowercase by design. */
function upperFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function BookingCalendar({
  days,
  date,
  start,
  onPick,
  locale,
}: {
  days: DaySlots[];
  date: string;
  start: string;
  onPick: (s: { date: string; start: string | null }) => void;
  locale: string;
}) {
  const available = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const months = useMemo(
    () => [...new Set(days.map((d) => monthOf(d.date)))].sort(),
    [days]
  );
  const [month, setMonth] = useState(months[0] ?? monthOf(new Date().toISOString()));
  const monthIdx = months.indexOf(month);

  const [year, monthNum] = month.split("-").map(Number);
  const todayStr = `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-${pad(new Date().getDate())}`;

  // Monday-first grid.
  const firstWeekday = (new Date(year, monthNum - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  const weekdayInitials = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short" });
    // 2024-01-01 is a Monday.
    return Array.from({ length: 7 }, (_, i) =>
      fmt
        .format(new Date(2024, 0, 1 + i))
        .replace(".", "")
        .slice(0, 3)
        .toLowerCase()
    );
  }, [locale]);

  const monthLabel = upperFirst(
    new Intl.DateTimeFormat(intlLocale(locale), {
      month: "long",
      year: "numeric",
    }).format(new Date(year, monthNum - 1, 1))
  );

  const selectedDay = available.get(date);
  const selectedDayLabel = date
    ? new Intl.DateTimeFormat(intlLocale(locale), {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date(`${date}T12:00:00`))
    : "";

  const navBtn =
    "flex size-9 items-center justify-center rounded-[10px] border border-border text-foreground transition-colors hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none";

  return (
    <div className="max-w-[380px] rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-heading text-base font-semibold">{monthLabel}</p>
        <div className="flex gap-1.5">
          <button
            type="button"
            aria-label="‹"
            className={navBtn}
            disabled={monthIdx <= 0}
            onClick={() => setMonth(months[monthIdx - 1])}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="›"
            className={navBtn}
            disabled={monthIdx < 0 || monthIdx >= months.length - 1}
            onClick={() => setMonth(months[monthIdx + 1])}
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekdayInitials.map((w) => (
          <span
            key={w}
            className="pb-1 text-center text-[11px] font-medium text-muted-foreground"
          >
            {w}
          </span>
        ))}
        {Array.from({ length: firstWeekday }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = `${month}-${pad(i + 1)}`;
          const isAvailable = available.has(d);
          const isSelected = d === date;
          const isToday = d === todayStr;

          return (
            <button
              key={d}
              type="button"
              disabled={!isAvailable}
              onClick={() => onPick({ date: d, start: null })}
              className={[
                "relative h-11 rounded-[10px] text-sm transition-colors",
                isSelected
                  ? "bg-primary font-semibold text-primary-foreground"
                  : isAvailable
                    ? "text-foreground hover:bg-secondary"
                    : "pointer-events-none text-muted-foreground opacity-45",
                isToday && !isSelected ? "border border-border font-semibold" : "",
              ].join(" ")}
            >
              {i + 1}
              {isAvailable && !isSelected && (
                <span
                  aria-hidden
                  className="absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary"
                />
              )}
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-2 text-sm text-muted-foreground">{selectedDayLabel}</p>
          <div className="flex flex-wrap gap-2">
            {selectedDay.starts.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onPick({ date, start: s })}
                className={[
                  "h-11 rounded-full border px-4.5 text-sm font-medium transition-colors",
                  s === start
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-card hover:bg-accent-tint",
                ].join(" ")}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
