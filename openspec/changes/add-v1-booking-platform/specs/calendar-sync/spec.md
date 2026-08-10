# calendar-sync

## ADDED Requirements

### Requirement: One-time admin connection
The admin panel SHALL offer a "Connect Google Calendar" flow using OAuth with offline access; the refresh token is stored encrypted server-side. The panel SHALL show connection status and allow reconnecting.

#### Scenario: Admin connects
- **WHEN** the admin completes the Google consent flow
- **THEN** the refresh token is stored and the panel shows the calendar as connected

### Requirement: One-way push on booking transitions
Confirmed bookings SHALL be pushed as events to the connected calendar (title with service and student name, time, lesson address); cancellation or blockout-skip SHALL delete the event. Sync is one-way only — calendar edits never flow back.

#### Scenario: Approval creates an event
- **WHEN** a booking is confirmed
- **THEN** a calendar event is created at the lesson time with the address in the location field, and its id is stored on the booking

#### Scenario: Cancellation removes the event
- **WHEN** a confirmed booking with a calendar event is cancelled or skipped
- **THEN** the corresponding event is deleted

### Requirement: Sync failures never block bookings
Calendar API failures SHALL NOT fail or delay the booking action that triggered them; failed syncs are recorded and retried by the hourly scheduled job, idempotently via the stored event id.

#### Scenario: Google API down during approval
- **WHEN** event creation fails during approval
- **THEN** the booking is still confirmed and emails sent, and the event is created on a later retry without duplication

#### Scenario: Connection lost
- **WHEN** the refresh token becomes invalid
- **THEN** bookings continue to work, and the admin panel prominently shows the sync-disconnected state
