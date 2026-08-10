# booking-requests

## ADDED Requirements

### Requirement: Booking request creation
Authenticated students SHALL request a booking by choosing a service, an offered slot, a duration within the service bounds, attendee names (≥1, within cap), and a lesson address (autofilled from the profile default, overridable per request). The request enters status `pending`.

#### Scenario: Successful request
- **WHEN** a student submits a valid request
- **THEN** a pending booking is created, the slot is soft-held, and request-received/new-request notifications fire per the notifications capability

#### Scenario: Address autofill with override
- **WHEN** a student with a saved default address opens the booking form
- **THEN** the address is prefilled and remains editable before submission

### Requirement: Price estimate
Each request SHALL compute and display an estimate of hourly rate × duration in hours × attendee count, presented as an estimate payable in person, with a notice that a travel fee may be added on approval.

#### Scenario: Estimate calculation
- **WHEN** a student books 90 minutes for 2 attendees at €15/hour
- **THEN** the displayed estimate is €45.00

### Requirement: Soft-hold semantics
A pending request SHALL occupy its slot (plus buffer) so no other request can take an overlapping span, enforced by a database-level constraint. The hold persists until the admin acts; requests whose start time has passed are ignored — hidden from the approval queue with no state change or notification.

#### Scenario: Concurrent request for a held slot
- **WHEN** a second student submits a request overlapping a pending booking
- **THEN** the second request is rejected and the student is prompted to pick another slot

#### Scenario: Request lapses silently
- **WHEN** a pending request's start time passes without admin action
- **THEN** it disappears from the approval queue, no email is sent, and no status change occurs

### Requirement: Approval
Admins SHALL approve a pending request, optionally applying the configured travel fee and adding a note. Approval sets status `confirmed`, finalizes the estimate (including any fee), and triggers confirmation email and calendar sync.

#### Scenario: Approval with travel fee
- **WHEN** an admin approves a request toggling the travel fee
- **THEN** the booking is confirmed and the confirmation email shows the estimate including the fee

### Requirement: Decline
Admins SHALL decline a pending request with an optional personal note. Decline releases the slot and notifies the student.

#### Scenario: Decline with note
- **WHEN** an admin declines a request adding a note
- **THEN** the booking becomes `declined`, the slot is released, and the student receives the decline email containing the note

### Requirement: Student cancellation with cutoff
Students SHALL cancel their own pending or confirmed bookings up to the configured cutoff before start time; inside the cutoff, self-service cancellation is blocked with guidance to contact Maria directly. Rescheduling is cancel + new request.

#### Scenario: Cancel outside cutoff
- **WHEN** a student cancels a confirmed lesson 48 hours ahead with a 24-hour cutoff
- **THEN** the booking becomes `cancelled_student`, the slot is released, and the admin is notified

#### Scenario: Cancel inside cutoff blocked
- **WHEN** a student attempts to cancel 3 hours before start with a 24-hour cutoff
- **THEN** the action is refused with a localized message telling them to contact Maria

### Requirement: Admin cancellation
Admins SHALL cancel any pending or confirmed booking at any time, with an optional note; the student is notified and the slot is released.

#### Scenario: Admin cancels a confirmed lesson
- **WHEN** the admin cancels a confirmed booking
- **THEN** it becomes `cancelled_admin`, the student receives a cancellation email with any note, and the calendar event is removed
