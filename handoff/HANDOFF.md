# ProfMary — Design Handoff

Implementation guide for applying the ProfMary design system to `TestaSantosLDA/profmary` (branch `main`). Written against the repo as of 2026-08-11.

Apply in order — each file is an independent PR-sized chunk. Files 1–9 are already applied in the repo; **10–13 are the new work.**

| # | File | Scope | Repo files touched |
|---|---|---|---|
| 1 | `01-tokens-fonts.md` | Fonts + design tokens | `src/app/[locale]/layout.tsx`, `src/app/globals.css` |
| 2 | `02-components.md` | shadcn deltas + new primitives | `src/components/ui/*`, new `status-badge.tsx`, `tile-band.tsx` |
| 3 | `03-booking-calendar.md` | Calendar-first picker | new `src/components/booking/booking-calendar.tsx`, `booking-form.tsx` |
| 4 | `04-website.md` | Public pages | header/footer, Home, Pricing, About, Contact + `site_content` table |
| 5 | `05-admin.md` | Admin restyle + availability editor | `src/app/[locale]/admin/*`, `src/components/admin/*`, 1 migration |
| 6 | `06-email.md` | Email layout | `src/lib/email/send.ts` |
| 7 | `07-emails-declined-reminder.md` | Declined + reminder emails | `src/lib/email/*` |
| 8 | `08-bottom-nav.md` | Mobile bottom nav | new `src/components/layout/bottom-nav.tsx` |
| 9 | `09-profile-nav.md` | Profile page + nav structure | `src/app/[locale]/profile/*` |
| **10** | `10-lesson-modes.md` | **Online / at-home formats + configurable travel fee** | service form, settings, booking form, request card, **3 migrations** |
| **11** | `11-home-about.md` | **Home & About rebuilt, photo-led** | `page.tsx`, `about/page.tsx`, new `Photo` component |
| **12** | `12-rule-band.md` | **`RuleBand` replaces `TileBand` on the site** | new `rule-band.tsx`, Home, About, email header |
| **13** | `13-admin-content.md` | **Conteúdo tab — editable Home & Sobre** | new admin content editor, `page_content` + `media` tables |
| **14** | `14-questionnaire-students.md` | **Questionário + Alunos tab** | new student form, admin Alunos tab, `question`/`answer`/`student` tables |
| **15** | `15-packs.md` | **Packs de aulas** | Preços, new `/packs`, Book, Profile, admin Serviços/Pedidos/Aulas/ficha, `pack`/`pack_purchase`/`pack_ledger` |
| **16** | `16-messages.md` | **Mensagens — chat aluno ↔ Maria** | new `/messages`, admin Mensagens tab, header entry, ficha panel, `conversation`/`message`/`message_attachment` |

## Suggested order for 10–13

1. **10** first — it changes pricing and the booking payload, so it should land before anything that displays a price.
2. **12** next; it's small and self-contained, and 11 references the band.
3. **11**, then **13** — build the pages, then the editor that fills them. 13's schema replaces the hardcoded copy 11 ships with, so shipping 11 alone is a valid intermediate state.
4. **14** last, and treat it as two PRs: the `student` record plus the attendee migration first, then the questionnaire on top. The Alunos tab is only useful once booking attendees resolve to student records.
5. **15** after 14 — pack balances hang off the account that owns the student records, and the Ficha is where Maria manages them.

## Design rules (the short version)

- Warm ivory page `#FAF7F2`, white cards; azulejo blue `#2456A6` is the only CTA color — **one primary per view**; hover always deepens to `#173A75`.
- Terracotta `#C96F4A` marks *selected* states (time chips), highlights, fee tags, and the ruled band's margin line — never CTAs.
- Lora 500/600 for headings; Source Sans 3 400/500/600 for body/UI; body 1rem/1.6.
- Cards: 12px radius, 1px `#E8E2D9` border, shadow **only on hover**. Controls: 10px radius, 44px min height. Badges/chips: full pill.
- Mobile-first at 390px; content column max 1040px; tinted sections go full-bleed with the column inside. Desktop breakpoint is **880px** across Book, Home, and About.
- Labels above inputs; inline validation below.
- Copy: PT is the reference voice, first person from Maria; buttons are verbs ("Marcar aula"). Empty EN falls back to PT.

## New product features proposed (need backend)

1. **Calendar-first booking picker** — no schema change, reuses `fetchSlots`.
2. **Admin availability editor** — no schema change.
3. **Lesson formats + travel fee** (10) — `Service.allowsOnline/allowsOnsite/onsiteFeeOverride`, `Setting.onsiteFee/onsiteFeeMode`, `Booking.mode/onsiteFeeApplied`. Fee is snapshotted per booking so later setting changes don't rewrite history.
4. **Editable page content** (13) — `page_content` (per page/locale, with a real boolean per section for visibility) + `media` (one row per photo slot).
5. **Student questionnaire** (14) — `question` / `answer` / `student` tables, guardian-owned fichas, and a migration turning free-text booking attendees into student references.
6. **Packs de aulas** (15) — `pack` / `pack_purchase` / `pack_ledger`. A credit is one lesson of any length; balances live on the account; payment is confirmed manually by Maria, which is what starts the validity clock.

## Open items before launch

- **Photos.** Every image on Home and About is a labelled placeholder frame. The brief and slot table are in `11-home-about.md`. A real phone photo of Maria beats any stock portrait.
- **The testimonial is mock copy** and labelled as such in-page. Replace with a real quote from one of Maria's two students, or hide the section in the Conteúdo tab. Do not ship an unlabelled invented quote.
- **Three unverified claims** in the About facts row: ten years teaching, one-to-one/small groups, PT/EN/ES. Confirm with Maria.
- **Contact details** are still `TODO` in the repo.
- **Tile-band PNG in emails** is a placeholder blue bar; with 12 the email header is a ruled band instead, buildable as the table in `12-rule-band.md` with no image at all.
- **Footer `max-w`** should align to 1040px.
- **Not built:** Preços and Contacto are not yet in the Conteúdo tab, and list items in the editor have no drag-reorder.

Design sources in this project: `styles.css` + `tokens/`, `components/`, `ui_kits/website/`, `ui_kits/admin/`, `ui_kits/email/`. Band comparison that led to 12: `ui_kits/website/band-options.html`.
