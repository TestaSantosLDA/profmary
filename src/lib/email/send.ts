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

const FONT = "'Source Sans 3',Helvetica,Arial,sans-serif";

// Azulejo CTA button — bgcolor on the td so Outlook paints it without CSS.
function ctaButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#2456A6" style="border-radius:10px;"><a href="${href}" style="display:inline-block;padding:13px 24px;font-family:${FONT};font-size:15px;font-weight:500;color:#ffffff;text-decoration:none;">${label}</a></td></tr></table>`;
}

// Ivory details box (address/price in confirmation emails).
function detailsBox(content: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;"><tr><td bgcolor="#FAF7F2" style="border:1px solid #E8E2D9;border-radius:12px;padding:14px 18px;font-family:${FONT};font-size:14px;line-height:1.5;color:#6E7076;">${content}</td></tr></table>`;
}

// Bodies arrive as bare <p>/<em>/<a> markup; email clients ignore <style>
// blocks, so every style must be inlined here, per element.
function inlineBodyStyles(body: string): string {
  let html = body
    .replace(/<p class="details">([\s\S]*?)<\/p>/g, (_, content) =>
      detailsBox(content)
    )
    .replace(
      /<p>\s*<a href="([^"]*)"[^>]*>([\s\S]*?)<\/a>\s*<\/p>/g,
      (_, href, label) => ctaButton(href, label)
    )
    .replace(
      /<p><em>([\s\S]*?)<\/em><\/p>/g,
      '<p style="margin:0 0 16px;font-style:italic;color:#6E7076;font-size:14px;">$1</p>'
    )
    .replace(/<p>/g, '<p style="margin:0 0 16px;">');

  // A final paragraph drops its bottom margin so the card padding closes evenly.
  const marker = '<p style="margin:0 0 16px;';
  const last = html.lastIndexOf(marker);
  if (
    last !== -1 &&
    html.indexOf("<p", last + 1) === -1 &&
    html.trimEnd().endsWith("</p>")
  ) {
    html =
      html.slice(0, last) + '<p style="margin:0;' + html.slice(last + marker.length);
  }
  return html;
}

export function emailLayout(body: string): string {
  const year = new Date().getFullYear();
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background-color:#F1EDE6;" bgcolor="#F1EDE6">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F1EDE6">
      <tr>
        <td align="center" style="padding:32px 12px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;">
            <tr>
              <!-- Tile band: solid azulejo until the pattern PNG is hosted; Outlook needs the bgcolor fallback either way. -->
              <td height="10" bgcolor="#2456A6" style="height:10px;line-height:10px;font-size:0;border-radius:12px 12px 0 0;">&nbsp;</td>
            </tr>
            <tr>
              <td bgcolor="#173A75" style="padding:20px 28px;">
                <span style="font-family:Lora,Georgia,serif;font-weight:600;font-size:22px;color:#ffffff;">ProfMary</span>
              </td>
            </tr>
            <tr>
              <td bgcolor="#ffffff" style="padding:28px;border-radius:0 0 12px 12px;font-family:${FONT};font-size:15px;line-height:1.6;color:#22252B;">
                ${inlineBodyStyles(body)}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 0;font-family:${FONT};font-size:12px;color:#6E7076;">© ${year} ProfMary — Aulas de Português</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
