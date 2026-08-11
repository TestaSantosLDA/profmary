import { expect, test, type Page } from "@playwright/test";

// Golden-path smoke test (task 10.4): register → request → approve →
// [confirmation email] → reminder → cancel.
//
// Email delivery itself is not asserted: RESEND_API_KEY is empty so the send
// helper logs-and-skips (its designed failure mode). What IS asserted is the
// full state machine around each email: booking statuses, the reminder claim
// (reminder_sent_at) and the cancellation transition.

const API = "http://127.0.0.1:54321";
const SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const run = Date.now();
const STUDENT = {
  name: "Aluna E2E",
  email: `e2e-student-${run}@example.com`,
  password: "senha-e2e-123",
};
const ADMIN = {
  email: `e2e-admin-${run}@example.com`,
  password: "senha-admin-123",
};

async function rest(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${API}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  expect(res.ok, `${path}: ${res.status}`).toBeTruthy();
  return res;
}

async function bookFirstAvailableSlot(page: Page, address: string) {
  await page.goto("/pt/book");
  // At-home lesson: shows the address field and adds the travel fee.
  await page.getByRole("button", { name: /Ao domicílio/ }).click();
  await expect(page.getByText("Taxa de deslocação")).toBeVisible();
  await expect(page.getByText("Total estimado")).toBeVisible();
  // Wait for slots to load, then pick the first available day and time chip.
  const day = page
    .locator("button:enabled")
    .filter({ hasText: /^\d{1,2}$/ })
    .first();
  await day.click();
  await page
    .getByRole("button", { name: /^\d{2}:\d{2}$/ })
    .first()
    .click();
  await page.getByPlaceholder("Nome do participante 1").fill(STUDENT.name);
  await page.locator("#address").fill(address);
  await page.getByRole("button", { name: "Enviar pedido" }).click();
  await page.waitForURL(/\/pt\/dashboard\?requested=1/);
  await expect(page.getByText("Pedido enviado!")).toBeVisible();
}

test("golden path: register → request → approve → reminder → cancel", async ({
  page,
}) => {
  await test.step("clean slate: no leftover bookings from earlier runs", async () => {
    await rest("bookings?id=not.is.null", { method: "DELETE" });
    await rest("booking_series?id=not.is.null", { method: "DELETE" });
  });

  await test.step("seed the admin account", async () => {
    const res = await fetch(`${API}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: ADMIN.email,
        password: ADMIN.password,
        email_confirm: true,
        user_metadata: { name: "Professora E2E", locale: "pt" },
      }),
    });
    expect(res.ok).toBeTruthy();
    const user = (await res.json()) as { id: string };
    await rest(`profiles?id=eq.${user.id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_admin: true }),
    });
  });

  await test.step("student registers and lands on the dashboard", async () => {
    await page.goto("/pt/register");
    await page.locator("#name").fill(STUDENT.name);
    await page.locator("#email").fill(STUDENT.email);
    await page.locator("#password").fill(STUDENT.password);
    await page.getByRole("button", { name: "Criar conta" }).click();
    await page.waitForURL(/\/pt\/dashboard/);
  });

  await test.step("student requests two lessons", async () => {
    await bookFirstAvailableSlot(page, "Rua de Teste 1, Lisboa");
    await bookFirstAvailableSlot(page, "Rua de Teste 1, Lisboa");
    const res = await rest(
      "bookings?select=id,status,mode,onsite_fee_applied_cents&order=starts_at.asc"
    );
    const rows = (await res.json()) as {
      status: string;
      mode: string;
      onsite_fee_applied_cents: number;
    }[];
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.status === "pending")).toBeTruthy();
    // At-home mode snapshots the default 5€ travel fee on each request.
    expect(rows.every((r) => r.mode === "onsite")).toBeTruthy();
    expect(rows.every((r) => r.onsite_fee_applied_cents === 500)).toBeTruthy();
  });

  await test.step("admin approves both requests", async () => {
    await page.context().clearCookies();
    await page.goto("/pt/login");
    await page.locator("#email").fill(ADMIN.email);
    await page.locator("#password").fill(ADMIN.password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL(/\/pt\/dashboard/);

    await page.goto("/pt/admin");
    const approve = page.getByRole("button", { name: "Aprovar" });
    await expect(approve).toHaveCount(2);
    await approve.first().click();
    await expect(approve).toHaveCount(1);
    await approve.first().click();
    await expect(page.getByText("Sem pedidos pendentes")).toBeVisible();

    const res = await rest("bookings?select=id,status");
    const rows = (await res.json()) as { status: string }[];
    expect(rows.every((r) => r.status === "confirmed")).toBeTruthy();
  });

  await test.step("hourly cron sends the 24h reminder exactly once", async () => {
    // Pull the earliest lesson into the reminder window (T+2h).
    const res = await rest("bookings?select=id&order=starts_at.asc&limit=1");
    const [{ id }] = (await res.json()) as { id: string }[];
    const startsAt = new Date(Date.now() + 2 * 3600_000);
    const endsAt = new Date(startsAt.getTime() + 3600_000);
    await rest(`bookings?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        buffered_until: new Date(endsAt.getTime() + 600_000).toISOString(),
      }),
    });

    const cron = () =>
      fetch("http://localhost:3111/api/cron/hourly", {
        method: "POST",
        headers: { Authorization: "Bearer e2e-cron-secret" },
      }).then((r) => r.json() as Promise<{ reminders: number }>);

    expect((await cron()).reminders).toBe(1);
    // Idempotent: a re-run must not claim (or send) it again.
    expect((await cron()).reminders).toBe(0);

    const after = await rest(`bookings?id=eq.${id}&select=reminder_sent_at`);
    const [row] = (await after.json()) as { reminder_sent_at: string | null }[];
    expect(row.reminder_sent_at).not.toBeNull();
  });

  await test.step("student cancels the lesson outside the cutoff", async () => {
    await page.context().clearCookies();
    await page.goto("/pt/login");
    await page.locator("#email").fill(STUDENT.email);
    await page.locator("#password").fill(STUDENT.password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL(/\/pt\/dashboard/);

    // The T+2h lesson is inside the 24h cutoff — only the far one is
    // cancellable, so exactly one Cancelar button shows.
    page.on("dialog", (dialog) => dialog.accept());
    const cancel = page.getByRole("button", { name: "Cancelar" });
    await expect(cancel).toHaveCount(1);
    await cancel.click();
    await expect(cancel).toHaveCount(0);

    const res = await rest(
      "bookings?select=status&order=starts_at.desc&limit=1"
    );
    const [row] = (await res.json()) as { status: string }[];
    expect(row.status).toBe("cancelled_student");
  });
});
