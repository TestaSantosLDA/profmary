# 2 · Component deltas + new primitives

Most restyling arrives free via the tokens (PR 1). These are the class-level edits on top.

## 2.1 `src/components/ui/button.tsx`

```diff
 variant: {
-  default: "bg-primary text-primary-foreground hover:bg-primary/80",
+  default: "bg-primary text-primary-foreground hover:bg-primary-deep",
   outline: ...unchanged (border-border + bg-background now render warm)...
 },
 size: {
-  default: "h-8 gap-1.5 px-2.5 ...",
-  sm: "h-7 ...",
-  lg: "h-9 px-2.5 ...",
+  default: "h-11 gap-2 px-5 text-[15px]",   /* 44px touch target */
+  sm: "h-9 px-3.5",                          /* dense admin rows only */
+  lg: "h-13 px-7 text-base",                 /* hero CTA */
 }
```

Rules: one `default` (azulejo) button per view; the rest `outline`/`ghost`. Keep the existing `active:translate-y-px` press state — it matches the design system.

## 2.2 `src/components/ui/input.tsx` / `textarea.tsx` / `select.tsx`

```diff
- "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 ..."
+ "h-11 w-full min-w-0 rounded-[10px] border border-input bg-card px-3.5 ..."
```

Same `h-11` + `rounded-[10px]` + `bg-card` on `SelectTrigger` (`data-[size=default]:h-11`) and textarea (`min-h-18 px-3.5 py-2.5`). Focus/invalid rings already read from `--ring`/`--destructive`.

## 2.3 `src/components/ui/card.tsx`

```diff
- "... rounded-xl bg-card ... ring-1 ring-foreground/10 ..."
+ "... rounded-xl bg-card ... border border-border shadow-none transition-shadow hover:shadow-[0_6px_20px_rgba(34,37,43,0.08)] ..."
```

Apply the hover shadow only on interactive cards (make it an opt-in `hoverable` prop or a `.card-hover` class) — static cards stay flat.

## 2.4 NEW `src/components/ui/status-badge.tsx`

Replaces the ad-hoc badge in `src/components/dashboard/cancel-button.tsx` and the violet "Semanal" span in `request-card.tsx`. Reference implementation: `components/feedback/StatusBadge.jsx` in the design project.

```tsx
const STYLES: Record<string, string> = {
  pending: "bg-warning-tint text-warning",
  confirmed: "bg-positive-tint text-positive",
  declined: "bg-danger-tint text-destructive",
  cancelled_student: "bg-danger-tint text-destructive",
  cancelled_admin: "bg-danger-tint text-destructive",
  skipped_blockout: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status, children }: { status: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium whitespace-nowrap ${STYLES[status] ?? STYLES.pending}`}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
```

Labels come from the existing `Status.*` / `AdminBookings.statuses.*` messages. The "Semanal" pill uses `bg-secondary text-primary`.

## 2.5 NEW `src/components/ui/tile-band.tsx`

Azulejo band — hero + email header only, one per view. Reference: `components/brand/TileBand.jsx`.

```tsx
export function TileBand({ height = 12, tone = "blue" }: { height?: number; tone?: "blue" | "ivory" }) {
  const c1 = tone === "ivory" ? "rgba(255,255,255,0.9)" : "#2456A6";
  const c2 = tone === "ivory" ? "rgba(255,255,255,0.45)" : "#173A75";
  const u = height;
  return (
    <svg width="100%" height={height} className="block" aria-hidden>
      <defs>
        <pattern id={`tile-${tone}-${height}`} width={u * 2} height={u} patternUnits="userSpaceOnUse">
          <rect x={u * 0.5} y={u * 0.5} width={u * 0.62} height={u * 0.62} fill={c1}
            transform={`rotate(45 ${u * 0.81} ${u * 0.81})`} />
          <rect x={u * 1.36} y={u * 0.36} width={u * 0.28} height={u * 0.28} fill={c2} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#tile-${tone}-${height})`} />
    </svg>
  );
}
```

## 2.6 Checkbox

Forms currently use raw `<input type="checkbox" className="h-4 w-4">` (booking + admin). Either add shadcn's Checkbox and theme it (azulejo fill when checked, 20px box, 44px tappable row) or port `components/forms/Checkbox.jsx`. Whole label row is the hit target.
