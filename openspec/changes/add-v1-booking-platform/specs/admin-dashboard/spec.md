# admin-dashboard

## ADDED Requirements

### Requirement: Approval queue
Admins SHALL see all actionable pending requests (single and series) ordered by lesson start time, each showing student, service, time, duration, attendees, address, and estimate, with approve (travel-fee toggle + optional note) and decline (optional note) actions. Requests whose start time has passed are hidden.

#### Scenario: Approving from the queue
- **WHEN** the admin approves a request with the travel-fee toggle on
- **THEN** the booking is confirmed with the fee included and disappears from the queue

#### Scenario: Lapsed request hidden
- **WHEN** a pending request's start time passes
- **THEN** it no longer appears in the queue

### Requirement: Bookings overview
Admins SHALL view all bookings in list and week-calendar form, filterable by status and date range, showing student contact details and lesson addresses for confirmed lessons.

#### Scenario: Planning the week
- **WHEN** the admin opens the week view
- **THEN** confirmed lessons appear at their times with student name and address visible

### Requirement: Catalog, availability, and settings management
The admin panel SHALL host the service catalog CRUD, the weekly availability and blockout editors, the settings editor (buffer, cancellation cutoff, booking notice, travel-fee amount and threshold), and the Google Calendar connection, per their respective capabilities.

#### Scenario: Settings change takes effect immediately
- **WHEN** the admin saves a new buffer value
- **THEN** subsequent slot generation uses it without redeploy

### Requirement: Mobile-usable admin
Admin pages SHALL be responsive and fully operable on a phone-sized viewport, since approvals will mostly happen from Maria's phone.

#### Scenario: Approving on a phone
- **WHEN** the admin opens the approval queue at a 390px-wide viewport
- **THEN** all information and actions are accessible without horizontal scrolling
