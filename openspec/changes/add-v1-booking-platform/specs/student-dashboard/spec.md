# student-dashboard

## ADDED Requirements

### Requirement: Bookings overview
Authenticated students SHALL see their upcoming and past bookings with status (pending, confirmed, declined, cancelled, tutor unavailable), service, date/time, address, attendees, and price estimate.

#### Scenario: Skipped occurrence visible
- **WHEN** a series occurrence was skipped by a blockout
- **THEN** it appears in the student's list as "cancelled — tutor unavailable" even though no email was sent

#### Scenario: Pending request status
- **WHEN** a student has an unanswered request
- **THEN** it is listed as awaiting approval

### Requirement: Self-service actions
From the dashboard, students SHALL cancel bookings (respecting the cutoff), cancel a single series occurrence or the whole series, and start a new request prefilled from a past booking ("book again").

#### Scenario: Cutoff-blocked cancel explains itself
- **WHEN** a student views a lesson inside the cancellation cutoff
- **THEN** the cancel action is disabled with a localized explanation and contact guidance

#### Scenario: Book again
- **WHEN** a student uses "book again" on a past lesson
- **THEN** the booking form opens prefilled with the same service, duration, attendees, and address

### Requirement: Series management
Students SHALL see each recurring series (weekday, time, service, status, end date) with its upcoming occurrences grouped under it.

#### Scenario: Series view
- **WHEN** a student opens a series
- **THEN** they see the series definition and its future occurrences with individual statuses

### Requirement: Profile access
The dashboard SHALL link to profile management (name, phone, locale, default address, password) as specified in the accounts capability.

#### Scenario: Navigation to profile
- **WHEN** a student opens the dashboard
- **THEN** profile settings are reachable within one click
