# ProfMary — Design Handoff

Implementation guide for applying the ProfMary design system to `TestaSantosLDA/profmary` (branch `main`). Written against the repo as of 2026-08-11.

Apply in order — each file is an independent PR-sized chunk:

| # | File | Scope | Repo files touched |
|---|---|---|---|
| 1 | `01-tokens-fonts.md` | Fonts + design tokens | `src/app/[locale]/layout.tsx`, `src/app/globals.css` |
| 2 | `02-components.md` | shadcn deltas + new primitives | `src/components/ui/*`, new `src/components/ui/status-badge.tsx`, `tile-band.tsx` |
| 3 | `03-booking-calendar.md` | Calendar-first picker | new `src/components/booking/booking-calendar.tsx`, edits to `booking-form.tsx` |
| 4 | `04-website.md` | Public pages | header/footer, Home, Pricing, About, Contact + new `site_content` table |
| 5 | `05-admin.md` | Admin restyle + availability editor + "Página Sobre" tab | `src/app/[locale]/admin/*`, `src/components/admin/*`, 1 migration |
| 6 | `06-email.md` | Email layout | `src/lib/email/send.ts` |

## Design rules (the short version)

- Warm ivory page `#FAF7F2`, white cards; azulejo blue `#2456A6` is the only CTA color — **one primary per view**; hover always deepens to `#173A75`.
- Terracotta `#C96F4A` marks *selected* states (time chips) and highlights — never CTAs.
- Lora 500/600 for headings; Source Sans 3 400/500/600 for body/UI; body 1rem/1.6.
- Cards: 12px radius, 1px `#E8E2D9` border, shadow **only on hover**. Controls: 10px radius, 44px min height. Badges/chips: full pill.
- Mobile-first at 390px; container max 1040px; labels above inputs; inline validation below.
- Copy: PT is the reference voice; buttons are verbs ("Marcar aula").

## New product features proposed (need backend)

1. **Calendar-first booking picker** (replaces date `<select>`) — no schema change, reuses `fetchSlots`.
2. **Admin availability editor** (weekday toggles + range chips + blockout range calendar) — no schema change.
3. **"Página Sobre" editor** — NEW: needs the `site_content` table + server action (see `04-website.md` / `05-admin.md`).

Design sources in this project: `styles.css` + `tokens/`, `components/`, `ui_kits/website/`, `ui_kits/admin/`, `ui_kits/email/`.
