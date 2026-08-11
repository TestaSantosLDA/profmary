# 3 · Calendar-first booking picker

Replaces the date `<select>` + inline time buttons in `src/components/booking/booking-form.tsx` (the section under `{days && days.length > 0 && (...)}`). No schema/API change — the existing `fetchSlots(serviceId, duration)` result (`DaySlots[] = { date, starts[] }[]`) maps 1:1.

Reference implementation with all states: `components/booking/BookingCalendar.jsx` (design project). Port to `src/components/booking/booking-calendar.tsx`:

## Component contract

```tsx
export function BookingCalendar({
  days,            // DaySlots[] from fetchSlots
  date, start,     // controlled selection (existing form state)
  onPick,          // ({date, start}) => void — start null when only a date picked
  locale,
}: { days: DaySlots[]; date: string; start: string; onPick: (s: { date: string; start: string | null }) => void; locale: string })
```

## Visual spec (from the design system)

- **Month grid**, Monday-first, weekday initials `seg ter qua qui sex sáb dom` (11px, muted). Month header in Lora 600 with ‹ › nav buttons (36px, 1px border, 10px radius).
- **Day cell**: 44px tall, 10px radius, Source Sans 14px.
  - available → ink text + 4px azulejo dot centered under the number; hover `bg-secondary` (light-blue wash)
  - selected → `bg-primary text-white font-semibold` (dot hidden)
  - today → 1px `border-border` outline + semibold
  - past/unavailable → muted at 45% opacity, not clickable
- **Date label capitalization**: pt-PT formats lowercase ("quarta-feira, 12 de agosto") — do NOT `capitalize`; uppercase only the month header's first letter in JS.
- **Time slots** appear below a 1px divider once a day is selected, with the day spelled out (muted, 14px). Chips: pill (`rounded-full`), 44px tall, `px-4.5`, 1px border, white bg.
  - hover → `bg-accent-tint`
  - selected → `bg-accent border-accent text-white` (terracotta — the ONLY terracotta-filled element on the page)
- Wrap the whole picker in a Card (12px radius, 1px border, `p-4`). Max width ~380px; on ≥880px the Book page goes two-column (calendar left, attendees/address/estimate right, `max-w-[880px] grid-cols-2 gap-x-8`).

## Wiring diff (booking-form.tsx)

```diff
- <select value={date} onChange={...}>…days as options…</select>
- {selectedDay && (<div className="flex flex-wrap gap-2 pt-1">…start buttons…</div>)}
+ <BookingCalendar
+   days={days}
+   date={date}
+   start={start}
+   locale={locale}
+   onPick={({ date: d, start: s }) => { setDate(d); setStart(s ?? ""); }}
+ />
```

Keep `loadingSlots` / `noSlots` messages as-is above the calendar. The submit button stays disabled until both `date` and `start` are set (unchanged logic).
