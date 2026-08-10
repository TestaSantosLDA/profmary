# service-catalog

## ADDED Requirements

### Requirement: Admin-managed services
Admins SHALL create, edit, deactivate, and reorder services. Each service stores: title and description in both locales, hourly rate per person, minimum and maximum bookable duration, and attendee cap.

#### Scenario: Admin creates a service
- **WHEN** an admin submits a new service with PT/EN title and description, hourly rate, and duration bounds
- **THEN** the service is persisted and immediately bookable and visible on the Pricing page

#### Scenario: Service with bookings is deactivated, not deleted
- **WHEN** an admin deactivates a service that has existing bookings
- **THEN** the service disappears from Pricing and the booking flow, while existing bookings keep referencing it intact

### Requirement: Duration bounds in 30-minute increments
Service duration bounds SHALL be multiples of 30 minutes with minimum ≤ maximum; defaults are 60 and 120 minutes. The booking flow SHALL offer only durations within the service's bounds.

#### Scenario: Invalid bounds rejected
- **WHEN** an admin sets a minimum of 45 minutes or a minimum greater than the maximum
- **THEN** validation rejects the input with a localized message

#### Scenario: Booking duration options
- **WHEN** a student books a service with bounds 60–120 minutes
- **THEN** the duration choices offered are exactly 60, 90, and 120 minutes

### Requirement: Attendee cap
Each service SHALL have an attendee cap; the value -1 means uncapped and is the default. The booking flow MUST reject attendee counts above a positive cap.

#### Scenario: Uncapped service
- **WHEN** a service has cap -1 and a student books 5 attendees
- **THEN** the request is accepted

#### Scenario: Capped service
- **WHEN** a service has cap 2 and a student attempts 3 attendees
- **THEN** the request is rejected with a localized message
