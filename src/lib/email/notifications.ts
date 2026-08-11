import "server-only";

import { getTranslations } from "next-intl/server";
import { createServiceClient } from "@/lib/supabase/server";
import { emailLayout, sendEmail } from "./send";

const LISBON = "Europe/Lisbon";

type Locale = "pt" | "en";

function intlLocale(locale: string): string {
  return locale === "pt" ? "pt-PT" : "en-GB";
}

function formatWhen(locale: string, iso: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: LISBON,
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(iso));
}

function formatSeriesWhen(
  locale: string,
  weekday: number,
  time: string
): string {
  // Reference week starting Sunday 2023-01-01 to render the weekday name.
  const ref = new Date(Date.UTC(2023, 0, 1 + weekday, 12));
  const day = new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "long",
    timeZone: "UTC",
  }).format(ref);
  return `${day}, ${time.slice(0, 5)}`;
}

function euros(cents: number): string {
  return `${(cents / 100).toFixed(2)}€`;
}

type Recipient = { name: string; email: string; locale: Locale };

type LoadedBooking = {
  when: string;
  serviceTitle: (locale: string) => string;
  address: string;
  price: number;
  note: string | null;
  student: Recipient;
};

async function loadBooking(id: string): Promise<LoadedBooking | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("bookings")
    .select(
      "starts_at, address, price_estimate_cents, admin_note, services(title_pt, title_en), profiles(name, email, locale)"
    )
    .eq("id", id)
    .single();

  if (!data) return null;
  const service = data.services as unknown as { title_pt: string; title_en: string };
  const profile = data.profiles as unknown as Recipient;

  return {
    when: data.starts_at,
    serviceTitle: (locale) => (locale === "pt" ? service.title_pt : service.title_en),
    address: data.address,
    price: data.price_estimate_cents,
    note: data.admin_note,
    student: profile,
  };
}

type LoadedSeries = {
  weekday: number;
  time: string;
  serviceTitle: (locale: string) => string;
  student: Recipient;
};

async function loadSeries(id: string): Promise<LoadedSeries | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("booking_series")
    .select("weekday, start_time, services(title_pt, title_en), profiles(name, email, locale)")
    .eq("id", id)
    .single();

  if (!data) return null;
  const service = data.services as unknown as { title_pt: string; title_en: string };
  const profile = data.profiles as unknown as Recipient;

  return {
    weekday: data.weekday,
    time: data.start_time,
    serviceTitle: (locale) => (locale === "pt" ? service.title_pt : service.title_en),
    student: profile,
  };
}

async function adminEmails(): Promise<string[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("email")
    .eq("is_admin", true)
    .neq("email", "");
  return (data ?? []).map((p) => p.email);
}

async function t(locale: string) {
  return getTranslations({ locale, namespace: "Email" });
}

// {service}/{when} render bold in every body. Tags can't live in the
// messages (plain t() rejects rich text), so emphasis wraps the values.
const strong = (s: string) => `<strong>${s}</strong>`;

const SITE = () => process.env.NEXT_PUBLIC_SITE_URL ?? "";

/** Request submitted: acknowledgement to the student + alert to admins. */
export async function notifyRequestReceived(
  kind: "booking" | "series",
  id: string
): Promise<void> {
  try {
    const loaded =
      kind === "booking" ? await loadBooking(id) : await loadSeries(id);
    if (!loaded) return;

    const { student } = loaded;
    const when =
      kind === "booking"
        ? formatWhen(student.locale, (loaded as LoadedBooking).when)
        : formatSeriesWhen(
            student.locale,
            (loaded as LoadedSeries).weekday,
            (loaded as LoadedSeries).time
          );

    const ts = await t(student.locale);
    await sendEmail(
      student.email,
      ts("requestReceived.subject"),
      emailLayout(
        `<p>${ts("greeting", { name: student.name })}</p>
         <p>${ts("requestReceived.body", {
           service: strong(loaded.serviceTitle(student.locale)),
           when: strong(when),
         })}</p>
         <p>${ts("requestReceived.next")}</p>`
      )
    );

    const ta = await t("pt");
    const whenPt =
      kind === "booking"
        ? formatWhen("pt", (loaded as LoadedBooking).when)
        : formatSeriesWhen(
            "pt",
            (loaded as LoadedSeries).weekday,
            (loaded as LoadedSeries).time
          );
    for (const admin of await adminEmails()) {
      await sendEmail(
        admin,
        ta("adminNewRequest.subject"),
        emailLayout(
          `<p>${ta("adminNewRequest.body", {
            student: student.name,
            service: strong(loaded.serviceTitle("pt")),
            when: strong(whenPt),
          })}</p>
           <p><a href="${SITE()}/pt/admin">${ta("adminNewRequest.cta")}</a></p>`
        )
      );
    }
  } catch (err) {
    console.error("[email] notifyRequestReceived failed:", err);
  }
}

/** Approval or decline: one email to the student. */
export async function notifyDecision(
  kind: "booking" | "series",
  id: string,
  decision: "confirmed" | "declined"
): Promise<void> {
  try {
    const loaded =
      kind === "booking" ? await loadBooking(id) : await loadSeries(id);
    if (!loaded) return;

    const { student } = loaded;
    const ts = await t(student.locale);
    const when =
      kind === "booking"
        ? formatWhen(student.locale, (loaded as LoadedBooking).when)
        : formatSeriesWhen(
            student.locale,
            (loaded as LoadedSeries).weekday,
            (loaded as LoadedSeries).time
          );

    const details =
      kind === "booking" && decision === "confirmed"
        ? `<p class="details">${ts("confirmed.details", {
            address: (loaded as LoadedBooking).address,
            price: euros((loaded as LoadedBooking).price),
          })}</p>`
        : "";
    const note =
      kind === "booking" && (loaded as LoadedBooking).note
        ? `<p><em>${ts("notePrefix")}: ${(loaded as LoadedBooking).note}</em></p>`
        : "";

    await sendEmail(
      student.email,
      ts(`${decision}.subject`),
      emailLayout(
        `<p>${ts("greeting", { name: student.name })}</p>
         <p>${ts(`${decision}.body`, {
           service: strong(loaded.serviceTitle(student.locale)),
           when: strong(when),
         })}</p>
         ${details}${note}`
      )
    );
  } catch (err) {
    console.error("[email] notifyDecision failed:", err);
  }
}

/** Student cancelled: alert to admins (always PT). */
export async function notifyStudentCancelled(
  kind: "booking" | "series",
  id: string
): Promise<void> {
  try {
    const loaded =
      kind === "booking" ? await loadBooking(id) : await loadSeries(id);
    if (!loaded) return;

    const ta = await t("pt");
    const when =
      kind === "booking"
        ? formatWhen("pt", (loaded as LoadedBooking).when)
        : formatSeriesWhen(
            "pt",
            (loaded as LoadedSeries).weekday,
            (loaded as LoadedSeries).time
          );

    for (const admin of await adminEmails()) {
      await sendEmail(
        admin,
        ta("adminCancelled.subject"),
        emailLayout(
          `<p>${ta("adminCancelled.body", {
            student: loaded.student.name,
            service: strong(loaded.serviceTitle("pt")),
            when: strong(when),
          })}</p>`
        )
      );
    }
  } catch (err) {
    console.error("[email] notifyStudentCancelled failed:", err);
  }
}

/** Admin cancelled a lesson: email to the student with the optional note. */
export async function notifyAdminCancelled(bookingId: string): Promise<void> {
  try {
    const loaded = await loadBooking(bookingId);
    if (!loaded) return;

    const { student } = loaded;
    const ts = await t(student.locale);
    const note = loaded.note
      ? `<p><em>${ts("notePrefix")}: ${loaded.note}</em></p>`
      : "";

    await sendEmail(
      student.email,
      ts("cancelledByTeacher.subject"),
      emailLayout(
        `<p>${ts("greeting", { name: student.name })}</p>
         <p>${ts("cancelledByTeacher.body", {
           service: strong(loaded.serviceTitle(student.locale)),
           when: strong(formatWhen(student.locale, loaded.when)),
         })}</p>
         ${note}`
      )
    );
  } catch (err) {
    console.error("[email] notifyAdminCancelled failed:", err);
  }
}

/** 24h reminder for one confirmed booking. */
export async function sendReminder(bookingId: string): Promise<void> {
  try {
    const loaded = await loadBooking(bookingId);
    if (!loaded) return;

    const { student } = loaded;
    const ts = await t(student.locale);
    await sendEmail(
      student.email,
      ts("reminder.subject"),
      emailLayout(
        `<p>${ts("greeting", { name: student.name })}</p>
         <p>${ts("reminder.body", {
           service: strong(loaded.serviceTitle(student.locale)),
           when: strong(formatWhen(student.locale, loaded.when)),
           address: loaded.address,
         })}</p>`
      )
    );
  } catch (err) {
    console.error("[email] sendReminder failed:", err);
  }
}
