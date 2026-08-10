# public-site

## ADDED Requirements

### Requirement: Public marketing pages
The system SHALL serve public pages — Home, About, Pricing, Contact, and Privacy Policy — accessible without authentication, in both Portuguese and English.

#### Scenario: Visitor browses without an account
- **WHEN** an unauthenticated visitor navigates to any public page
- **THEN** the page renders fully without requiring sign-in

#### Scenario: Privacy policy is reachable
- **WHEN** a visitor opens the footer of any public page
- **THEN** a link to the Privacy Policy page is present in the active locale

### Requirement: Pricing page reflects the service catalog
The Pricing page SHALL list all active services with their localized title, description, hourly per-person rate, and allowed duration range, sourced live from the service catalog.

#### Scenario: Admin edits a service price
- **WHEN** the admin changes a service's hourly rate and a visitor reloads the Pricing page
- **THEN** the new rate is displayed without any code change or redeploy

#### Scenario: Deactivated service hidden
- **WHEN** a service is marked inactive
- **THEN** it no longer appears on the Pricing page

### Requirement: Travel fee notice
Public pages that present pricing SHALL display a notice that lessons beyond the configured distance may carry an additional travel fee, using the configured fee amount.

#### Scenario: Visitor reads pricing
- **WHEN** a visitor views the Pricing page and a travel fee is configured
- **THEN** a localized notice states the potential travel fee amount and the distance context

### Requirement: Call-to-action into booking
Public pages SHALL guide visitors toward booking: primary calls-to-action lead to the booking flow, prompting sign-in/registration when unauthenticated.

#### Scenario: Visitor clicks "Book a lesson"
- **WHEN** an unauthenticated visitor activates a booking call-to-action
- **THEN** they are taken to sign-in/registration and, after authenticating, continue into the booking flow
