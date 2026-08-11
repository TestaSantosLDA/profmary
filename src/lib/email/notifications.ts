import "server-only";

import { getTranslations } from "next-intl/server";
import { createServiceClient } from "@/lib/supabase/server";
import { emailAddendum, emailLayout, secondaryCtaButton, sendEmail } from "./send";

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
  mode: "online" | "onsite";
  price: number;
  note: string | null;
  student: Recipient;
};

async function loadBooking(id: string): Promise<LoadedBooking | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("bookings")
    .select(
      "starts_at, address, mode, price_estimate_cents, admin_note, services(title_pt, title_en), profiles(name, email, locale)"
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
    mode: data.mode,
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

type FichaLink = { id: string; name: string; questionnaire_token: string };

/**
 * Fichas on this booking/series that never got their questionnaire link.
 * Sent once per ficha with the first confirmation, then marked so later
 * confirmations stay quiet.
 */
async function unsentFichas(
  kind: "booking" | "series",
  id: string
): Promise<FichaLink[]> {
  const supabase = createServiceClient();

  let bookingIds = [id];
  if (kind === "series") {
    const { data } = await supabase
      .from("bookings")
      .select("id")
      .eq("series_id", id);
    bookingIds = (data ?? []).map((b) => b.id);
    if (bookingIds.length === 0) return [];
  }

  const { data } = await supabase
    .from("booking_attendees")
    .select("students(id, name, questionnaire_token, questionnaire_sent_at)")
    .in("booking_id", bookingIds);

  const fichas = new Map<string, FichaLink>();
  for (const row of data ?? []) {
    const s = row.students as unknown as FichaLink & {
      questionnaire_sent_at: string | null;
    };
    if (s && s.questionnaire_sent_at === null) fichas.set(s.id, s);
  }
  return [...fichas.values()];
}

async function markQuestionnaireSent(studentIds: string[]): Promise<void> {
  if (studentIds.length === 0) return;
  const supabase = createServiceClient();
  await supabase
    .from("students")
    .update({ questionnaire_sent_at: new Date().toISOString() })
    .in("id", studentIds);
}

function questionnaireUrl(locale: string, token: string): string {
  return `${SITE()}/${locale}/questionario/${token}`;
}

/**
 * The questionnaire addendum for a first-lesson confirmation. Deliberately
 * secondary: the confirmation itself stays the email's primary action.
 */
async function questionnaireAddendum(
  kind: "booking" | "series",
  id: string,
  locale: Locale
): Promise<string> {
  const fichas = await unsentFichas(kind, id);
  if (fichas.length === 0) return "";

  const ts = await t(locale);
  const buttons = fichas.map((f) =>
    secondaryCtaButton(
      questionnaireUrl(locale, f.questionnaire_token),
      fichas.length > 1
        ? ts("questionnaire.ctaFor", { name: f.name })
        : ts("questionnaire.cta")
    )
  );

  await markQuestionnaireSent(fichas.map((f) => f.id));
  return emailAddendum(ts("questionnaire.intro"), buttons);
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

    // Online lessons have no address — the meeting link is sent separately.
    const details =
      kind === "booking" && decision === "confirmed"
        ? `<p class="details">${
            (loaded as LoadedBooking).mode === "onsite"
              ? ts("confirmed.details", {
                  address: (loaded as LoadedBooking).address,
                  price: euros((loaded as LoadedBooking).price),
                })
              : ts("confirmed.detailsOnline", {
                  price: euros((loaded as LoadedBooking).price),
                })
          }</p>`
        : "";
    const note =
      kind === "booking" && (loaded as LoadedBooking).note
        ? `<p><em>${ts("notePrefix")}: ${(loaded as LoadedBooking).note}</em></p>`
        : "";

    const questionnaire =
      decision === "confirmed"
        ? await questionnaireAddendum(kind, id, student.locale)
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
         ${details}${note}${questionnaire}`
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

type LoadedPackPurchase = {
  lessons: number;
  totalCents: number;
  expiresAt: string | null;
  serviceTitle: (locale: string) => string;
  student: Recipient;
};

async function loadPackPurchase(id: string): Promise<LoadedPackPurchase | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("pack_purchases")
    .select(
      "lessons_total, price_paid_cents, expires_at, services(title_pt, title_en), profiles(name, email, locale)"
    )
    .eq("id", id)
    .single();

  if (!data) return null;
  const service = data.services as unknown as { title_pt: string; title_en: string };
  const profile = data.profiles as unknown as Recipient;

  return {
    lessons: data.lessons_total,
    totalCents: data.price_paid_cents,
    expiresAt: data.expires_at,
    serviceTitle: (locale) => (locale === "pt" ? service.title_pt : service.title_en),
    student: profile,
  };
}

/** Pack requested: alert to admins (always PT). Payment happens offline. */
export async function notifyPackRequest(purchaseId: string): Promise<void> {
  try {
    const loaded = await loadPackPurchase(purchaseId);
    if (!loaded) return;

    const ta = await t("pt");
    for (const admin of await adminEmails()) {
      await sendEmail(
        admin,
        ta("packRequest.subject"),
        emailLayout(
          `<p>${ta("packRequest.body", {
            student: loaded.student.name,
            lessons: loaded.lessons,
            service: strong(loaded.serviceTitle("pt")),
            total: strong(euros(loaded.totalCents)),
          })}</p>
           <p><a href="${SITE()}/pt/admin">${ta("packRequest.cta")}</a></p>`
        )
      );
    }
  } catch (err) {
    console.error("[email] notifyPackRequest failed:", err);
  }
}

/** Pack activated (payment confirmed) or declined: one email to the student. */
export async function notifyPackDecision(
  purchaseId: string,
  decision: "active" | "declined"
): Promise<void> {
  try {
    const loaded = await loadPackPurchase(purchaseId);
    if (!loaded) return;

    const { student } = loaded;
    const ts = await t(student.locale);
    const key = decision === "active" ? "packActivated" : "packDeclined";

    const expiryLine =
      decision === "active" && loaded.expiresAt
        ? `<p>${ts("packActivated.expiry", {
            date: new Intl.DateTimeFormat(intlLocale(student.locale), {
              timeZone: LISBON,
              dateStyle: "long",
            }).format(new Date(loaded.expiresAt)),
          })}</p>`
        : "";

    await sendEmail(
      student.email,
      ts(`${key}.subject`),
      emailLayout(
        `<p>${ts("greeting", { name: student.name })}</p>
         <p>${ts(`${key}.body`, {
           lessons: loaded.lessons,
           service: strong(loaded.serviceTitle(student.locale)),
         })}</p>
         ${expiryLine}`
      )
    );
  } catch (err) {
    console.error("[email] notifyPackDecision failed:", err);
  }
}

/**
 * Standalone questionnaire link (the ficha's "Reenviar link" action).
 * Here the questionnaire IS the email's point, so the button is primary.
 */
export async function sendQuestionnaireLink(studentId: string): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("students")
      .select("id, name, email, questionnaire_token, profiles(name, email, locale)")
      .eq("id", studentId)
      .single();

    if (!data) return;
    const account = data.profiles as unknown as Recipient;
    const to = data.email || account.email;
    if (!to) return;

    const ts = await t(account.locale);
    await sendEmail(
      to,
      ts("questionnaire.subject"),
      emailLayout(
        `<p>${ts("greeting", { name: account.name })}</p>
         <p>${ts("questionnaire.resendBody", { student: strong(data.name) })}</p>
         <p><a href="${questionnaireUrl(account.locale, data.questionnaire_token)}">${ts("questionnaire.cta")}</a></p>`
      )
    );

    await markQuestionnaireSent([data.id]);
  } catch (err) {
    console.error("[email] sendQuestionnaireLink failed:", err);
  }
}

/** 24h reminder for one confirmed booking. */
export async function sendReminder(bookingId: string): Promise<void> {
  try {
    const loaded = await loadBooking(bookingId);
    if (!loaded) return;

    const { student } = loaded;
    const ts = await t(student.locale);
    const body =
      loaded.mode === "onsite"
        ? ts("reminder.body", {
            service: strong(loaded.serviceTitle(student.locale)),
            when: strong(formatWhen(student.locale, loaded.when)),
            address: loaded.address,
          })
        : ts("reminder.bodyOnline", {
            service: strong(loaded.serviceTitle(student.locale)),
            when: strong(formatWhen(student.locale, loaded.when)),
          });
    await sendEmail(
      student.email,
      ts("reminder.subject"),
      emailLayout(
        `<p>${ts("greeting", { name: student.name })}</p>
         <p>${body}</p>`
      )
    );
  } catch (err) {
    console.error("[email] sendReminder failed:", err);
  }
}
