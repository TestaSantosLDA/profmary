# accounts

## ADDED Requirements

### Requirement: Registration and sign-in
The system SHALL allow users to register and sign in with email+password or Google OAuth, via Supabase Auth with cookie-based sessions.

#### Scenario: Email registration
- **WHEN** a visitor registers with email and password
- **THEN** an account and profile are created and the user is signed in (subject to email confirmation)

#### Scenario: Google sign-in
- **WHEN** a visitor authenticates with Google
- **THEN** an account is created on first sign-in and reused on subsequent sign-ins

### Requirement: Minimal profile data
The profile SHALL store only: name, email, preferred locale, optional phone, and optional default lesson address. No other personal data SHALL be collected at registration.

#### Scenario: Registration form fields
- **WHEN** a visitor registers
- **THEN** only name, email, password (unless OAuth), and locale are captured; phone and address remain optional and editable later

### Requirement: Account holders are adults or 16+ students
Registration SHALL state that the account holder must be a parent/guardian or a student aged 16+; accounts are never created for younger minors — their names appear only as attendees on bookings made by the account holder.

#### Scenario: Parent books for a child
- **WHEN** a parent holds the account and requests a booking for their child
- **THEN** the child is recorded only as an attendee name on that booking, with no account of their own

### Requirement: Profile self-management
Users SHALL be able to edit their name, phone, locale, and default lesson address, and change their password, from their profile page.

#### Scenario: Default address updated
- **WHEN** a user saves a new default address
- **THEN** subsequent booking forms autofill with the new address

### Requirement: Role-based access
Each profile SHALL carry a role flag distinguishing students from admins. Admin capabilities (approval queue, catalog, availability, settings) MUST be inaccessible to non-admin users at both the UI and data layer (RLS).

#### Scenario: Student hits an admin route
- **WHEN** an authenticated non-admin user navigates to an admin page or invokes an admin action
- **THEN** access is denied at the data layer, not merely hidden in the UI

#### Scenario: Support admin account
- **WHEN** a second account is flagged as admin in the database
- **THEN** it has the same administrative capabilities as the primary admin
