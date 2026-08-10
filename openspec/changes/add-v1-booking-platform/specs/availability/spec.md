# availability

## ADDED Requirements

### Requirement: Recurring weekly schedule
Admins SHALL define availability as recurring weekly rules (weekday, start time, end time), with multiple rules per weekday allowed and no overlapping rules on the same weekday.

#### Scenario: Admin sets weekly hours
- **WHEN** an admin adds rules Mon 17:00–20:00 and Wed 15:00–19:00
- **THEN** bookable slots are generated inside those windows on every future Monday and Wednesday within the booking window

#### Scenario: Overlapping rule rejected
- **WHEN** an admin adds Mon 18:00–21:00 while Mon 17:00–20:00 exists
- **THEN** the rule is rejected with a localized message

### Requirement: Blockouts
Admins SHALL create date-range blockouts (e.g. vacation) that remove all slots in the range. Blockouts take precedence over weekly rules and over recurring-series occurrences.

#### Scenario: Vacation blockout
- **WHEN** an admin blocks August 1–15
- **THEN** no slots are offered in that range and overlapping recurring occurrences are skipped per the recurring-bookings capability

### Requirement: Slot grid generation
The system SHALL derive bookable start times on demand — never stored — as a 30-minute grid within availability rules, excluding blockouts and any span occupied by pending or confirmed bookings plus the configured buffer, and only within [now + booking notice, now + booking window].

#### Scenario: Buffer excludes adjacent starts
- **WHEN** a confirmed lesson runs 17:00–18:00 with a 10-minute buffer
- **THEN** the next offered start time is 18:30 (first grid point ≥ 18:10) and no start is offered that would end after 16:50

#### Scenario: Booking notice enforced
- **WHEN** the booking notice is 24 hours
- **THEN** no slot starting within the next 24 hours is offered

#### Scenario: Window boundary
- **WHEN** the booking window is 3 months
- **THEN** no slot beyond 3 months from today is offered

### Requirement: Configurable scheduling parameters
Buffer minutes (default 10), cancellation cutoff hours (default 24), and booking notice hours (default 24) SHALL be admin-editable settings; the booking window SHALL be an environment variable (default 3 months).

#### Scenario: Admin raises notice before vacation
- **WHEN** the admin changes booking notice from 24 to 72 hours
- **THEN** slot generation immediately reflects the new notice without redeploy
