-- Distinguishes "the connection broke" (revoked/expired refresh token,
-- reported by the sync engine) from "never connected" (token and error both
-- null) so the admin UI can say which and show the reconnect banner.
alter table public.settings add column gcal_sync_error text;
