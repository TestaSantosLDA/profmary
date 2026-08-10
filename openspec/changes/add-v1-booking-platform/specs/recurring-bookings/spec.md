# recurring-bookings

## ADDED Requirements

### Requirement: Series request
Students SHALL request a weekly recurring series by choosing a service, weekday and start time from offered slots, duration, attendees, address, and an optional end date (default open-ended). The series enters status `pending` and soft-holds all its occurrences within the booking window.

#### Scenario: Open-ended series request
- **WHEN** a student requests "every Tuesday 17:00, 60 minutes" with no end date
- **THEN** a pending series is created and every Tuesday 17:00 within the booking window is soft-held

### Requirement: Approve-once semantics
Admin approval of a series SHALL confirm the whole series in one action: all occurrences within the booking window are materialized as confirmed bookings, without per-occurrence approval.

#### Scenario: Series approval
- **WHEN** the admin approves a pending series
- **THEN** the series becomes `active`, each occurrence in the window becomes a confirmed booking, one confirmation email is sent, and calendar events are created per occurrence

### Requirement: Rolling materialization
For active open-ended series, a scheduled job SHALL materialize new occurrences as the booking window rolls forward, idempotently, until the series ends or is cancelled.

#### Scenario: Window advances
- **WHEN** the daily materialization job runs and a new week has entered the booking window
- **THEN** that week's occurrence exists as a confirmed booking exactly once, regardless of how many times the job runs

### Requirement: Blockout precedence with silent skip
When a blockout overlaps future occurrences, those occurrences SHALL transition to `skipped_blockout` — visible in student and admin dashboards as "tutor unavailable" — with no email sent, and their calendar events removed. Blockouts never cancel the series itself.

#### Scenario: Vacation over a series
- **WHEN** the admin blocks two weeks overlapping an active series
- **THEN** the two affected occurrences become `skipped_blockout` with no emails, their reminders never fire, and later occurrences are untouched

### Requirement: Series precedence over new requests
Slots held by pending or active series occurrences SHALL be unavailable to new one-off or series requests, under the same database-level guarantee as single bookings.

#### Scenario: One-off request on a series slot
- **WHEN** a student attempts to book a slot occupied by an active series occurrence
- **THEN** the slot is not offered and any race-condition attempt is rejected

### Requirement: Per-occurrence and whole-series cancellation
Students SHALL cancel a single occurrence (cancellation cutoff applies) or the entire series (ends the series and cancels only future occurrences, cutoff applying to the nearest one). Admins SHALL do both without cutoff restrictions.

#### Scenario: Student cancels one occurrence
- **WHEN** a student cancels next Tuesday's occurrence 48 hours ahead
- **THEN** only that occurrence becomes `cancelled_student`; the series and later occurrences continue

#### Scenario: Student ends the series
- **WHEN** a student cancels the whole series
- **THEN** the series becomes `cancelled`, all future occurrences outside the cutoff are cancelled, the admin is notified once, and calendar events are removed
