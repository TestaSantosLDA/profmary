# Tasks: add-v1-booking-platform

## 1. Foundation

- [x] 1.1 Scaffold Next.js app (App Router, TypeScript, Tailwind, ESLint) in this repo; add shadcn/ui
- [x] 1.2 Create Supabase project (EU region); set up Supabase CLI with migrations checked into `supabase/migrations`
- [x] 1.3 Wire `@supabase/ssr` clients (browser, server, middleware) and environment variables (`.env.example` documented)
- [x] 1.4 Set up next-intl with `/pt` and `/en` routing, locale detection/redirect, and message catalog structure with a completeness check
- [x] 1.5 Create Vercel project linked to the GitHub repo (preview on PRs, production on `main`); set `BOOKING_WINDOW_MONTHS` env var
- [x] 1.6 App shell: layout, header with language switcher, footer with Privacy Policy link, placeholder theme

## 2. Database schema & security

- [x] 2.1 Migration: `profiles` (with `is_admin`, locale, default_address) + trigger creating a profile on auth signup
- [x] 2.2 Migration: `services`, `availability_rules`, `blockouts`, `settings` singleton (seed defaults: buffer 10, cutoff 24h, notice 24h)
- [x] 2.3 Migration: `booking_series` and `bookings` with status enums and the exclusion constraint on `tstzrange(starts_at, ends_at + buffer)` for pending/confirmed rows
- [x] 2.4 RLS policies: students access own rows only; admin flag grants full read/write; service-role bypass for cron
- [x] 2.5 Seed script: placeholder services (one per audience segment) and Maria's initial weekly availability

## 3. Accounts

- [x] 3.1 Registration and sign-in pages (email+password) with locale captured on the profile
- [x] 3.2 Google OAuth provider configured in Supabase and wired into the sign-in page
- [x] 3.3 Email confirmation + password reset flows (branded template script blocked on custom SMTP → launch checklist)
- [x] 3.4 Profile page: edit name, phone, locale, default address, password; registration copy stating the parent/16+ account-holder rule
- [x] 3.5 Route protection middleware: student area requires auth, admin area requires `is_admin` (enforced by RLS as well)

## 4. Service catalog & availability admin

- [x] 4.1 Admin services CRUD UI: bilingual fields, hourly rate, duration bounds (30-min validation), attendee cap, active toggle
- [x] 4.2 Admin weekly availability editor with overlap validation
- [x] 4.3 Admin blockouts editor (create/delete date ranges)
- [x] 4.4 Admin settings editor: buffer, cancellation cutoff, booking notice, travel-fee amount and threshold

## 5. Slot engine & booking flow

- [x] 5.1 Slot-generation function (rules − blockouts − held bookings − buffer, grid, notice, window) with unit tests covering the spec scenarios
- [x] 5.2 Booking form: service → date/slot picker → duration → attendees (cap enforced) → address (autofill + override) → live price estimate with travel-fee notice
- [x] 5.3 Create-request Server Action: validation, soft-hold insert handling the exclusion-constraint conflict gracefully
- [x] 5.4 Approve action (travel-fee toggle, note) and decline action (note) as Server Actions
- [x] 5.5 Student cancellation action with cutoff enforcement; admin cancellation action without cutoff
- [x] 5.6 Lapsed-request handling: queue and slot queries ignore past-dated pending rows

## 6. Recurring series

- [x] 6.1 Series request form (weekday/time from offered slots, duration, optional end date) and pending-series soft-hold of window occurrences
- [x] 6.2 Approve-once action materializing confirmed occurrences within the window; series decline releasing all holds
- [x] 6.3 Rolling materialization job (idempotent) extending open-ended series as the window advances
- [x] 6.4 Blockout precedence: creating a blockout flips overlapping occurrences to `skipped_blockout` (no emails, GCal cleanup)
- [x] 6.5 Per-occurrence and whole-series cancellation actions with cutoff rules

## 7. Notifications

- [x] 7.1 React Email templates in PT and EN: request received, new-request alert, confirmation, decline, cancellation ×2, reminder
- [x] 7.2 Resend integration and send helper keyed to recipient profile locale; wire lifecycle emails into booking/series actions
- [x] 7.3 Hourly cron endpoint (`CRON_SECRET`-protected) sending 24h reminders idempotently via `reminder_sent_at`
- [x] 7.4 GitHub Actions scheduled workflow invoking the cron endpoints hourly

## 8. Google Calendar sync

- [ ] 8.1 Google Cloud project, Calendar API, OAuth consent (testing mode, Maria as test user); admin "Connect" flow storing the encrypted refresh token
- [ ] 8.2 Push on transitions: confirm → insert event, cancel/skip → delete, storing `gcal_event_id`
- [ ] 8.3 Failure isolation + retry from the hourly cron; disconnected-state banner in the admin panel

## 9. Dashboards

- [x] 9.1 Student dashboard: upcoming/past bookings with all statuses (incl. "tutor unavailable"), pending requests, book-again prefill
- [x] 9.2 Student series view: definition + occurrence list with statuses and cancellation actions
- [x] 9.3 Admin approval queue (mobile-first) with approve/decline inline
- [x] 9.4 Admin bookings overview: filterable list + week calendar with addresses

## 9b. Design pass (added after group 9 — see DESIGN.md)

- [x] 9b.1 Theme tokens in Tailwind/shadcn (palette, Lora + Source Sans 3 per the final handoff, radii)
- [x] 9b.2 Rebuild booking slot picker as a month-grid calendar with time chips
- [x] 9b.3 Restyle public pages, auth, dashboards, and admin to the brief (mobile-first)
- [x] 9b.4 Restyle transactional email template (tile band header, brief palette)
- [ ] 9b.5 Sync design-system components to the Claude Design project for Maria's review

## 10. Public site & launch

- [ ] 10.1 Home, About, Contact pages in both locales (placeholder brand, real structure)
- [ ] 10.2 Pricing page driven by active services with travel-fee notice
- [ ] 10.3 Privacy Policy page (PT/EN) covering minors' data, addresses, and data minimization
- [ ] 10.4 E2E smoke test of the golden path: register → request → approve → confirmation email → reminder → cancel
- [ ] 10.5 Launch checklist: buy domain, verify on Resend, point DNS at Vercel, switch email sender, create Maria's admin + support admin accounts, seed real services and availability
