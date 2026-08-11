import { defineConfig } from "@playwright/test";

// E2E smoke test against the LOCAL stack only: `supabase start` must be
// running. The dev server is launched with the local Supabase keys (the
// standard supabase-cli demo JWTs), overriding whatever .env.local points at.
// RESEND_API_KEY is left empty on purpose: the send helper logs and skips,
// so no real email leaves the machine.

const LOCAL_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const LOCAL_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000,
  expect: { timeout: 15_000 },
  retries: 0,
  workers: 1,
  use: {
    baseURL: "http://localhost:3111",
    actionTimeout: 15_000,
  },
  webServer: {
    command: "npx next dev --port 3111",
    url: "http://localhost:3111/pt",
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: LOCAL_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: LOCAL_SERVICE_KEY,
      NEXT_PUBLIC_SITE_URL: "http://localhost:3111",
      BOOKING_WINDOW_MONTHS: "3",
      CRON_SECRET: "e2e-cron-secret",
      RESEND_API_KEY: "",
      EMAIL_FROM: "",
      GCAL_TOKEN_KEY: "",
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "",
    },
  },
});
