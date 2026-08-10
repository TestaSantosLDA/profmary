import { describe, expect, it } from "vitest";
import { estimatePriceCents, generateSlots, type SlotEngineInput } from "./slots";

// August in Lisbon is UTC+1 (WEST): 17:00 wall clock = 16:00Z.
const NOW = new Date("2026-08-10T08:00:00Z"); // Monday morning

const base: SlotEngineInput = {
  rules: [{ weekday: 2, start_time: "17:00", end_time: "20:00" }], // Tuesdays
  blockouts: [],
  busy: [],
  bufferMinutes: 10,
  noticeHours: 24,
  windowMonths: 3,
  durationMinutes: 60,
  now: NOW,
};

function slotsFor(input: Partial<SlotEngineInput>) {
  return generateSlots({ ...base, ...input });
}

describe("generateSlots", () => {
  it("offers a 30-minute grid within the weekly rule", () => {
    const days = slotsFor({});
    const tuesday = days.find((d) => d.date === "2026-08-11");
    // 17:00-20:00 with 60-min lessons: last start 19:00
    expect(tuesday?.starts).toEqual(["17:00", "17:30", "18:00", "18:30", "19:00"]);
  });

  it("enforces the booking notice", () => {
    // Rule on Mondays; today is Monday 08:00Z (09:00 Lisbon). 24h notice
    // pushes the earliest start to Tuesday 09:00 Lisbon, so today's Monday
    // slots are excluded but next Monday's are offered.
    const days = slotsFor({
      rules: [{ weekday: 1, start_time: "17:00", end_time: "20:00" }],
    });
    expect(days.find((d) => d.date === "2026-08-10")).toBeUndefined();
    expect(days.find((d) => d.date === "2026-08-17")).toBeDefined();
  });

  it("stops at the window boundary", () => {
    const days = slotsFor({});
    const last = days[days.length - 1];
    expect(last.date <= "2026-11-10").toBe(true);
    expect(days.some((d) => d.date > "2026-11-10")).toBe(false);
  });

  it("excludes blockout days entirely", () => {
    const days = slotsFor({
      blockouts: [{ start_date: "2026-08-11", end_date: "2026-08-18" }],
    });
    expect(days.find((d) => d.date === "2026-08-11")).toBeUndefined();
    expect(days.find((d) => d.date === "2026-08-18")).toBeUndefined();
    expect(days.find((d) => d.date === "2026-08-25")).toBeDefined();
  });

  it("respects existing holds and their buffer on both sides", () => {
    // Confirmed lesson Tue 2026-08-11 17:00-18:00 Lisbon (16:00-17:00Z),
    // stored buffered_until 18:10 Lisbon (17:10Z).
    const days = slotsFor({
      busy: [
        {
          starts_at: "2026-08-11T16:00:00Z",
          buffered_until: "2026-08-11T17:10:00Z",
        },
      ],
    });
    const tuesday = days.find((d) => d.date === "2026-08-11");
    // 17:00/17:30 overlap the hold; 18:00 starts inside its buffer (until
    // 18:10); a 16:30 start would end at 17:30+10min buffer overlapping the
    // hold — but 16:30 is outside the rule anyway. Next valid start: 18:30.
    expect(tuesday?.starts).toEqual(["18:30", "19:00"]);
  });

  it("keeps a candidate's own buffer clear of later holds", () => {
    // Hold starting Tue 18:35 Lisbon (17:35Z). A 17:30 lesson ends 18:30 +
    // 10min buffer = 18:40 > 18:35, so 17:30 must be excluded; 17:00 ends
    // 18:00+10 = 18:10 <= 18:35, allowed.
    const days = slotsFor({
      busy: [
        {
          starts_at: "2026-08-11T17:35:00Z",
          buffered_until: "2026-08-11T18:45:00Z",
        },
      ],
    });
    const tuesday = days.find((d) => d.date === "2026-08-11");
    expect(tuesday?.starts).toContain("17:00");
    expect(tuesday?.starts).not.toContain("17:30");
  });

  it("fits longer durations only where the rule window allows", () => {
    const days = slotsFor({ durationMinutes: 120 });
    const tuesday = days.find((d) => d.date === "2026-08-11");
    // 120-min lessons in 17:00-20:00: starts 17:00, 17:30, 18:00
    expect(tuesday?.starts).toEqual(["17:00", "17:30", "18:00"]);
  });
});

describe("estimatePriceCents", () => {
  it("scales by hours and attendees", () => {
    // €15/h x 1.5h x 2 attendees = €45
    expect(estimatePriceCents(1500, 90, 2)).toBe(4500);
  });
});
