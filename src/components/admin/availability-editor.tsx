"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  addRuleForDay,
  clearDay,
  deleteRuleById,
  updateRule,
} from "@/lib/admin/availability-actions";

export type Rule = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function AvailabilityEditor({ rules }: { rules: Rule[] }) {
  const t = useTranslations("AdminAvailability");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ error: string | null }>) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) setError(result.error);
    });
  };

  const byDay = new Map<number, Rule[]>();
  for (const r of rules) {
    byDay.set(r.weekday, [...(byDay.get(r.weekday) ?? []), r]);
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <ul className="divide-y divide-border">
        {WEEKDAY_ORDER.map((day) => {
          const dayRules = byDay.get(day) ?? [];
          const enabled = dayRules.length > 0;

          return (
            <li
              key={day}
              className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 ${enabled ? "" : "bg-muted/60"}`}
            >
              <label className="flex w-32 shrink-0 cursor-pointer items-center gap-3 select-none">
                <span className="relative inline-flex h-6 w-10 shrink-0">
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={pending}
                    onChange={() =>
                      run(() => (enabled ? clearDay(day) : addRuleForDay(day)))
                    }
                    className="peer size-full cursor-pointer appearance-none rounded-full bg-border transition-colors checked:bg-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute top-1 left-1 size-4 rounded-full bg-white transition-transform peer-checked:translate-x-4"
                  />
                </span>
                <span className="text-sm font-medium">
                  {t(`weekdays.${day}`)}
                </span>
              </label>

              {enabled ? (
                <div className="flex flex-wrap items-center gap-2">
                  {dayRules.map((r) => (
                    <span
                      key={r.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm"
                    >
                      <input
                        type="time"
                        defaultValue={r.start_time.slice(0, 5)}
                        disabled={pending}
                        onBlur={(e) => {
                          const v = e.target.value;
                          if (v && v !== r.start_time.slice(0, 5)) {
                            run(() =>
                              updateRule(r.id, day, v, r.end_time.slice(0, 5))
                            );
                          }
                        }}
                        className="bg-transparent outline-none"
                      />
                      –
                      <input
                        type="time"
                        defaultValue={r.end_time.slice(0, 5)}
                        disabled={pending}
                        onBlur={(e) => {
                          const v = e.target.value;
                          if (v && v !== r.end_time.slice(0, 5)) {
                            run(() =>
                              updateRule(r.id, day, r.start_time.slice(0, 5), v)
                            );
                          }
                        }}
                        className="bg-transparent outline-none"
                      />
                      <button
                        type="button"
                        aria-label={t("remove")}
                        disabled={pending}
                        onClick={() => run(() => deleteRuleById(r.id))}
                        className="ml-0.5 text-muted-foreground transition-colors hover:text-destructive"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => addRuleForDay(day))}
                    className="rounded-full px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {t("add")}
                  </button>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {t("unavailable")}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {error && (
        <p className="border-t border-border px-4 py-2.5 text-sm text-destructive">
          {t(`errors.${error}`)}
        </p>
      )}
    </div>
  );
}
