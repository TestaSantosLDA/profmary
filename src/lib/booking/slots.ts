import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { addDays, addHours, addMonths, format } from "date-fns";

export const LESSON_TIMEZONE = "Europe/Lisbon";
const GRID_MINUTES = 30;

export type AvailabilityRule = {
  weekday: number; // 0 = Sunday, matching Postgres and JS Date
  start_time: string; // "HH:MM" or "HH:MM:SS", Lisbon wall clock
  end_time: string;
};

export type Blockout = {
  start_date: string; // "YYYY-MM-DD", inclusive
  end_date: string;
};

export type BusyRange = {
  starts_at: string; // ISO timestamp
  buffered_until: string;
};

export type SlotEngineInput = {
  rules: AvailabilityRule[];
  blockouts: Blockout[];
  busy: BusyRange[];
  bufferMinutes: number;
  noticeHours: number;
  windowMonths: number;
  durationMinutes: number;
  now: Date;
};

export type DaySlots = {
  date: string; // "YYYY-MM-DD" Lisbon calendar date
  starts: string[]; // "HH:MM" Lisbon wall-clock start times
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Derives bookable start times on a 30-minute grid: availability rules minus
 * blockouts minus busy ranges (which already include the stored buffer of
 * existing holds), within [now + notice, now + window]. The candidate slot's
 * own buffer is applied symmetrically so a new lesson can't start inside the
 * travel gap of an existing one, nor force the existing one into its gap.
 */
export function generateSlots(input: SlotEngineInput): DaySlots[] {
  const {
    rules,
    blockouts,
    busy,
    bufferMinutes,
    noticeHours,
    windowMonths,
    durationMinutes,
    now,
  } = input;

  const earliest = addHours(now, noticeHours);
  const windowEnd = addMonths(now, windowMonths);

  const busyRanges = busy.map((b) => ({
    start: new Date(b.starts_at).getTime(),
    end: new Date(b.buffered_until).getTime(),
  }));

  const rulesByWeekday = new Map<number, AvailabilityRule[]>();
  for (const rule of rules) {
    const list = rulesByWeekday.get(rule.weekday) ?? [];
    list.push(rule);
    rulesByWeekday.set(rule.weekday, list);
  }

  const result: DaySlots[] = [];
  // Iterate Lisbon calendar days covering the whole window.
  let day = toZonedTime(now, LESSON_TIMEZONE);

  while (true) {
    const dateStr = format(day, "yyyy-MM-dd");
    const dayStart = fromZonedTime(`${dateStr}T00:00:00`, LESSON_TIMEZONE);
    if (dayStart > windowEnd) break;

    const blocked = blockouts.some(
      (b) => dateStr >= b.start_date && dateStr <= b.end_date
    );
    const dayRules = rulesByWeekday.get(day.getDay()) ?? [];

    if (!blocked && dayRules.length > 0) {
      const starts: string[] = [];

      for (const rule of dayRules) {
        const ruleStart = timeToMinutes(rule.start_time);
        const ruleEnd = timeToMinutes(rule.end_time);

        for (
          let t = ruleStart;
          t + durationMinutes <= ruleEnd;
          t += GRID_MINUTES
        ) {
          const slotStart = fromZonedTime(
            `${dateStr}T${minutesToTime(t)}:00`,
            LESSON_TIMEZONE
          );
          if (slotStart < earliest || slotStart > windowEnd) continue;

          const start = slotStart.getTime();
          const bufferedEnd =
            start + (durationMinutes + bufferMinutes) * 60_000;

          const conflict = busyRanges.some(
            (b) => start < b.end && b.start < bufferedEnd
          );
          if (!conflict) {
            starts.push(minutesToTime(t));
          }
        }
      }

      if (starts.length > 0) {
        starts.sort();
        result.push({ date: dateStr, starts });
      }
    }

    day = addDays(day, 1);
  }

  return result;
}

/** Price estimate in cents: hourly rate x hours x attendees. */
export function estimatePriceCents(
  hourlyRateCents: number,
  durationMinutes: number,
  attendees: number
): number {
  return Math.round((hourlyRateCents * durationMinutes * attendees) / 60);
}

export type LessonMode = "online" | "onsite";

export type OnsiteFeeSettings = {
  onsite_fee_cents: number;
  onsite_fee_mode: "per_lesson" | "per_hour";
};

/** Effective at-home travel fee: service override ?? global, ×hours when per_hour. */
export function onsiteFeeCents(
  overrideCents: number | null,
  settings: OnsiteFeeSettings | null,
  durationMinutes: number
): number {
  const base = overrideCents ?? settings?.onsite_fee_cents ?? 0;
  return settings?.onsite_fee_mode === "per_hour"
    ? Math.round((base * durationMinutes) / 60)
    : base;
}
