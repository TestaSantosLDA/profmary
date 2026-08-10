# notifications

## ADDED Requirements

### Requirement: Locale-aware transactional email
All emails SHALL be sent via Resend using templates rendered in the recipient's profile locale (admin emails in Portuguese), from the platform's verified domain in production.

#### Scenario: English-locale student
- **WHEN** any lifecycle email is sent to a student whose locale is `en`
- **THEN** subject and body are in English

### Requirement: Booking lifecycle emails
The system SHALL send: request-received to the student and new-request alert to the admin on request creation; confirmation (with final estimate including any travel fee, date/time, address, and service) on approval; decline with optional admin note; cancellation notice to the admin on student cancellation; cancellation notice with optional note to the student on admin cancellation.

#### Scenario: Request submitted
- **WHEN** a student submits a booking request
- **THEN** the student receives "request awaiting approval" and the admin receives a new-request alert with a link to the approval queue

#### Scenario: Approval email content
- **WHEN** the admin approves with a travel fee applied
- **THEN** the student's confirmation email shows the total estimate including the fee

### Requirement: 24-hour reminder
The system SHALL email students a reminder for each confirmed booking approximately 24 hours before start, exactly once per booking, driven by an hourly scheduled job.

#### Scenario: Reminder idempotency
- **WHEN** the hourly job runs multiple times while a lesson is inside the reminder window
- **THEN** exactly one reminder is sent for that booking

#### Scenario: Cancelled lesson sends no reminder
- **WHEN** a booking is cancelled or skipped before its reminder window
- **THEN** no reminder is sent

### Requirement: Silence for blockout skips
Occurrences transitioned to `skipped_blockout` SHALL generate no email in either direction.

#### Scenario: Vacation skip
- **WHEN** a blockout skips three occurrences of a series
- **THEN** zero emails are sent as a result
