# Design: add-v1-booking-platform

## Context

Greenfield build. ProfMary is a booking platform for a single tutor (Maria) giving in-person Portuguese lessons at students' homes, serving PT and EN speakers in Portugal. Constraints that shape the design:

- **Zero fixed cost**: every service must run on a free tier (Vercel Hobby, Supabase Free, Resend Free, Google APIs). The only accepted cost is a domain (~€10/yr), deferred until launch.
- **Single tutor, low volume**: tens of bookings per week at most. Simplicity beats scalability everywhere.
- **Request-and-confirm**: Maria manually approves every booking; the system never auto-confirms.
- **Offline payment**: prices are estimates displayed to set expectations; no money moves through the platform.
- **Fixed timezone**: everything happens in Europe/Lisbon; no timezone conversion UI.
- **Minors' data**: attendee names may belong to minors; home addresses are stored. Data minimization and a privacy policy are requirements, not afterthoughts.

## Goals / Non-Goals

**Goals:**

- One repository, one deploy target (Vercel), one database (Supabase) — a solo maintainer can hold the whole system in their head.
- Booking integrity: no double-booked or buffer-violating confirmed lessons, enforced at the database level, not just the UI.
- All lifecycle emails delivered reliably in the student's locale.
- Admin experience efficient enough that Maria manages everything from her phone.

**Non-Goals:**

- Online payments (Stripe) — explicitly deferred.
- Two-way Google Calendar sync (her GCal blocking site availability) — blockouts cover this manually.
- Automatic distance/travel-fee calculation via geocoding — Maria judges distance at approval time.
- Multi-tutor/marketplace support, FAQ page, blog, native apps.

## Decisions

### D1 — Next.js App Router on Vercel, TypeScript, Server Actions

Single Next.js app serves the public site, student dashboard, and admin panel. Mutations use Server Actions; Route Handlers exist only for cron endpoints and the Google OAuth callback. Alternative considered: separate static site (GitHub Pages) + Supabase Edge Functions — rejected because two deploy targets and two codebases add friction for no benefit at this scale.

### D2 — Supabase as database + auth, with Row Level Security

Postgres via Supabase with RLS as the authorization boundary: students read/write only their own rows; the `admin` role (flag on `profiles`) reads everything; server-side cron uses the service-role key. Auth via `@supabase/ssr` (cookie sessions), providers: email+password and Google. Alternative: NextAuth + separate Postgres — rejected; Supabase bundles both for free and RLS gives defense-in-depth beyond app code.

### D3 — Data model

Core tables (all timestamps `timestamptz` in UTC, rendered in Europe/Lisbon):

- `profiles` — 1:1 with `auth.users`: name, phone (nullable), locale (`pt`/`en`), default_address, is_admin.
- `services` — title_pt/en, description_pt/en, hourly_rate_cents, min/max_duration_minutes (30-min increments), attendee_cap (-1 = uncapped), active flag.
- `availability_rules` — weekday, start_time, end_time (recurring weekly schedule).
- `blockouts` — start_date, end_date, reason (private).
- `settings` — singleton row: buffer_minutes (10), cancellation_cutoff_hours (24), booking_notice_hours (24), travel_fee_cents, travel_fee_threshold_km, gcal_refresh_token (encrypted).
- `booking_series` — service_id, user_id, weekday, start_time, duration, attendees, address, status (`pending`/`active`/`ended`/`cancelled`), end_date (nullable = open-ended).
- `bookings` — service_id, user_id, series_id (nullable), starts_at, ends_at, attendee_names (jsonb), address, status (`pending`/`confirmed`/`declined`/`cancelled_student`/`cancelled_admin`/`skipped_blockout`), price_estimate_cents, travel_fee_applied, admin_note, gcal_event_id.

The booking window is an env var (`BOOKING_WINDOW_MONTHS=3`), not a settings row, per explicit requirement.

### D4 — Slots computed on the fly; series occurrences materialized as rows

Available slots are never stored: a server-side function derives them from availability_rules − blockouts − (pending + confirmed bookings + buffer), on a 30-min grid, within [now + notice, now + window]. Recurring series are the opposite: on approval, every occurrence inside the window becomes a real `bookings` row (status `confirmed`), and a scheduled job extends materialization as the window rolls forward. Rationale: computed slots can't drift out of sync; materialized occurrences give cancellations, reminders, and GCal events a concrete row to hang off. Creating a blockout flips overlapping occurrences to `skipped_blockout` (no email, visible in dashboards).

### D5 — Double-booking prevention at the database level

A Postgres exclusion constraint on `bookings` over `tstzrange(starts_at, ends_at + buffer)` for rows in status `pending`/`confirmed` makes overlapping holds impossible even under concurrent requests. The UI prevents it too, but the constraint is the guarantee. Alternative: application-level check in a transaction — rejected as racy and no cheaper to build.

### D6 — Scheduled work via GitHub Actions cron hitting secured routes

Two scheduled needs: 24h reminders and series-materialization. Vercel Hobby cron only fires once daily, too coarse for reminders. Instead, a GitHub Actions workflow (free on this repo) runs hourly and POSTs to `/api/cron/*` with a `CRON_SECRET` header; the handlers are idempotent (a `reminder_sent_at` column prevents duplicates). Side benefit: regular traffic keeps the free Supabase project from being paused for inactivity. Alternatives: Vercel cron (too coarse), Supabase pg_cron + Edge Functions (viable, but splits email logic out of the Next.js codebase where the templates live).

### D7 — i18n via next-intl; emails via React Email + Resend

`next-intl` with `/pt` and `/en` route prefixes for all UI; locale persisted on the profile at signup. Transactional emails are React Email components rendered per-locale and sent through Resend. Until the domain is purchased and verified, Resend's sandbox sender limits delivery to the account owner's address — acceptable during development, a hard launch dependency after.

### D8 — Google Calendar one-way sync via stored refresh token

Admin panel has a one-time "Connect Google Calendar" flow (OAuth authorization code + offline access); the refresh token is stored encrypted in `settings`. Booking transitions push to GCal: confirm → insert event, cancel/skip → delete, using `gcal_event_id` for idempotency. Sync failures never block the booking action — they log and retry on the next cron pass. The OAuth consent screen stays in "testing" mode (Maria is the only Google user), avoiding Google's app-verification process entirely.

### D9 — Tailwind CSS + shadcn/ui

Fast to build, free, easily themed to whatever brand direction Maria picks. No component library lock-in worth debating at this scale.

## Risks / Trade-offs

- [Supabase free tier pauses after ~1 week of inactivity] → hourly GitHub Actions cron generates steady traffic; if paused anyway, restore is a one-click manual step.
- [Resend sandbox can't email real students pre-domain] → all email flows built and tested against the owner address; domain purchase gates public launch, nothing else.
- [Open-ended series + long window can flood the calendar with materialized rows] → bounded: window (3 months) × weekly ≈ 13 rows per series; trivial at this scale.
- [Google OAuth consent in testing mode expires refresh tokens after 7 days **only if** the app is left in "testing" with an unverified external user type] → use "internal"-style single-user setup: add Maria as a test user and re-consent if ever revoked; admin panel surfaces sync-failure state clearly.
- [Approval-time travel fee makes the emailed price differ from the form estimate] → confirmation email always restates the final estimate including fee; the booking form warns that a travel fee may be added.
- [Minors' names + home addresses in the DB] → data minimization (names only, no birthdates), RLS, privacy policy page, and Supabase EU-region project at creation time.

## Migration Plan

Greenfield — no data migration. Deploy sequence: Supabase project (EU region) with SQL migrations via Supabase CLI (checked into repo) → Vercel project linked to the GitHub repo (preview deploys on PRs, production on `main`) → GitHub Actions cron enabled → Resend domain verification when the domain is bought. Rollback = Vercel instant rollback; schema changes are additive during v1.

## Open Questions

- Brand visuals (colors, tone, logo) — placeholder styling until Maria decides.
- Real service list and prices — seeded with placeholders, editable in admin.
- Which Google account is the sync target (her personal vs. a dedicated one).
- Domain name and registrar — decision deferred to launch.
