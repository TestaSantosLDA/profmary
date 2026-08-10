# Proposal: add-v1-booking-platform

## Why

Maria Martins gives private in-person Portuguese lessons (to internationals living in Portugal and to Portuguese teens preparing for national exams) and currently has no online presence or structured way to receive bookings. This change builds ProfMary v1: a bilingual (PT/EN) website where she presents her services and students/parents request lessons directly, replacing ad-hoc WhatsApp/word-of-mouth scheduling — at effectively zero monthly cost (free tiers only).

## What Changes

- New Next.js application deployed on Vercel, with Supabase (Postgres + Auth) as the backend and Resend for transactional email.
- Public bilingual marketing site: Home, About, Pricing (driven by the service catalog), Contact, Privacy Policy.
- Account system for students/parents (email+password and Google sign-in); minimal personal data; account holder is a parent or a 16+ student.
- Admin-managed service catalog: each service has bilingual title/description, hourly rate per person, min/max duration, attendee cap.
- Availability engine: recurring weekly schedule + date blockouts, generating a 30-minute slot grid over a rolling booking window with configurable buffer and minimum booking notice.
- Request-and-confirm booking flow: requests soft-hold slots until Maria approves or declines; price shown as estimate (rate × hours × attendees, optional manual travel fee); payment stays offline (in person).
- Recurring weekly bookings: approved once, open-ended or with end date; blockouts silently cancel individual occurrences.
- Self-service cancellation with configurable cutoff; reschedule = cancel + new request.
- Locale-aware transactional emails: request received, new-request alert to admin, confirmation, decline, cancellation notices, 24h reminder.
- One-way sync of confirmed lessons to Maria's Google Calendar.
- Student dashboard (bookings, requests, series, profile with default lesson address) and admin dashboard (approval queue, bookings overview, services CRUD, availability editor, settings).

## Capabilities

### New Capabilities

- `public-site`: bilingual marketing pages (Home, About, Pricing, Contact, Privacy Policy) with language switcher.
- `localization`: PT/EN locale infrastructure for UI and emails; locale stored on the account.
- `accounts`: registration, sign-in (email+password, Google OAuth), profile management (name, email, optional phone, preferred language, default lesson address), student/admin roles.
- `service-catalog`: admin CRUD for services — bilingual title/description, hourly rate per person, min/max duration in 30-min increments, attendee cap (default unlimited).
- `availability`: recurring weekly schedule, blockouts, slot-grid generation over a rolling window (env-configurable, default 3 months) honoring buffer (default 10 min) and minimum booking notice (default 24h).
- `booking-requests`: request-and-confirm lifecycle — soft-hold, approve (with optional travel fee and note), decline (with optional note), student cancellation with configurable cutoff (default 24h), admin cancellation, expired-request handling, price estimation.
- `recurring-bookings`: weekly series requests, approve-once semantics, open-ended or end-dated, occurrence materialization within the booking window, blockout precedence with silent per-occurrence cancellation, per-occurrence and whole-series cancellation.
- `notifications`: locale-aware transactional emails via Resend — request received, new-request alert, confirmation, decline, cancellation (both directions), 24h reminder; no emails for blockout-driven occurrence skips.
- `calendar-sync`: one-way push of confirmed lessons (create/update/delete) to Maria's Google Calendar via OAuth.
- `student-dashboard`: authenticated area listing upcoming/past lessons, pending requests, recurring series management, profile editing.
- `admin-dashboard`: approval queue, bookings overview, service catalog management, availability editor, settings (buffer, cancellation cutoff, booking notice, travel-fee threshold and amount).

### Modified Capabilities

_None — greenfield project, no existing specs._

## Impact

- New codebase: Next.js (App Router, TypeScript) in this repository; deployed to Vercel free tier.
- New external services: Supabase project (Postgres, Auth, Row Level Security), Resend account (email), Google Cloud project (Calendar API + OAuth consent), Vercel project.
- Domain purchase (~€10/yr) is a launch dependency for production email sending (Resend domain verification); the app itself runs on free subdomains until then.
- Handles personal data of minors (attendee names) and home addresses — Privacy Policy page and data minimization are in scope from the start.
