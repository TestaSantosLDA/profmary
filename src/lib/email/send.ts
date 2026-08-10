import "server-only";

import { Resend } from "resend";

// Email must never break a booking action: failures are logged and swallowed.
export async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) {
    console.warn(`[email] skipped "${subject}" — missing API key or recipient`);
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "ProfMary <onboarding@resend.dev>",
      to,
      subject,
      html,
    });
    if (error) {
      console.error(`[email] failed "${subject}" to ${to}:`, error.message);
    }
  } catch (err) {
    console.error(`[email] failed "${subject}" to ${to}:`, err);
  }
}

export function emailLayout(body: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f5f3;font-family:Georgia,'Times New Roman',serif;color:#2b2825;">
    <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
      <p style="font-size:20px;font-weight:bold;margin:0 0 24px;">ProfMary</p>
      <div style="background:#ffffff;border-radius:8px;padding:24px;line-height:1.6;font-size:15px;">
        ${body}
      </div>
      <p style="font-size:12px;color:#8a857e;margin-top:16px;">ProfMary · Aulas de Português · Portuguese Lessons</p>
    </div>
  </body>
</html>`;
}
