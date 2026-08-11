"use server";

import { getTranslations } from "next-intl/server";
import { emailLayout, sendEmail } from "@/lib/email/send";
import { createServiceClient } from "@/lib/supabase/server";

export type ContactActionState = { error: string | null; success: boolean };

export async function sendContactMessage(
  _prev: ContactActionState,
  formData: FormData
): Promise<ContactActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  // Honeypot: bots fill every field; humans never see this one.
  const website = String(formData.get("website") ?? "");

  if (website) {
    return { error: null, success: true };
  }
  if (!name || !email || !message) {
    return { error: "missing_fields", success: false };
  }
  if (message.length > 4000) {
    return { error: "too_long", success: false };
  }

  const supabase = createServiceClient();
  const { data: admins } = await supabase
    .from("profiles")
    .select("email")
    .eq("is_admin", true)
    .neq("email", "");

  const t = await getTranslations({ locale: "pt", namespace: "ContactPage" });
  for (const admin of admins ?? []) {
    await sendEmail(
      admin.email,
      t("emailSubject", { name }),
      emailLayout(
        `<p><strong>${name}</strong> (${email})</p>
         <p style="white-space:pre-wrap;">${message
           .replaceAll("&", "&amp;")
           .replaceAll("<", "&lt;")}</p>`
      )
    );
  }

  return { error: null, success: true };
}
