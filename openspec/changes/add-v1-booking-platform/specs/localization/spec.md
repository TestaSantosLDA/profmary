# localization

## ADDED Requirements

### Requirement: Bilingual UI with locale-prefixed routes
The system SHALL serve every page in Portuguese and English under locale-prefixed routes (`/pt/...`, `/en/...`), with a visible language switcher on all pages.

#### Scenario: Visitor switches language
- **WHEN** a visitor on any page activates the language switcher
- **THEN** the same page renders in the other locale and subsequent navigation stays in that locale

#### Scenario: First visit locale resolution
- **WHEN** a visitor arrives without a locale prefix
- **THEN** the system redirects to a locale based on browser preference, defaulting to Portuguese when no preference matches

### Requirement: Locale persisted on the account
The system SHALL store each user's preferred locale on their profile, set from the active locale at registration and editable in the profile, and SHALL use it for all emails sent to that user.

#### Scenario: Registration captures locale
- **WHEN** a user registers while browsing in English
- **THEN** their profile locale is set to `en`

#### Scenario: Emails follow profile locale
- **WHEN** any transactional email is sent to a user whose profile locale is `pt`
- **THEN** the email content is in Portuguese regardless of the locale the triggering action occurred in

### Requirement: No hardcoded user-facing strings
All user-facing text (pages, dashboard, admin panel, emails, validation messages) SHALL come from locale message catalogs; both locales MUST have complete catalogs.

#### Scenario: Missing translation caught
- **WHEN** the build or test suite runs
- **THEN** a message key present in one locale but missing in the other fails the check
