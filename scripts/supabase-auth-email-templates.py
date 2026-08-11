#!/usr/bin/env python3
"""Apply the branded bilingual auth email templates to the Supabase project.

BLOCKED until launch: the free tier rejects template changes while on the
default email provider. Run this after configuring custom SMTP (Resend) in
the Supabase dashboard — Settings > Auth > SMTP — which itself requires the
production domain to be verified on Resend.

Usage: python3 scripts/supabase-auth-email-templates.py
Token: $SUPABASE_ACCESS_TOKEN, or the Supabase CLI keychain entry (macOS).
"""

import json
import os
import subprocess
import urllib.request

PROJECT_REF = "knwhiubrwfugaqesbosf"
FONT = "'Source Sans 3',Helvetica,Arial,sans-serif"


def shell(body: str) -> str:
    return f"""<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F1EDE6"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;">
<tr><td height="10" bgcolor="#2456A6" style="height:10px;line-height:10px;font-size:0;border-radius:12px 12px 0 0;">&nbsp;</td></tr>
<tr><td bgcolor="#173A75" style="padding:20px 28px;"><span style="font-family:Lora,Georgia,serif;font-weight:600;font-size:22px;color:#ffffff;">ProfMary</span></td></tr>
<tr><td bgcolor="#ffffff" style="padding:28px;border-radius:0 0 12px 12px;font-family:{FONT};font-size:15px;line-height:1.6;color:#22252B;">{body}</td></tr>
<tr><td style="padding:16px 28px 0;font-family:{FONT};font-size:12px;color:#6E7076;">ProfMary — Aulas de Português</td></tr>
</table></td></tr></table>"""


def cta(label: str) -> str:
    return (
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 16px;">'
        '<tr><td bgcolor="#2456A6" style="border-radius:10px;">'
        f'<a href="{{{{ .ConfirmationURL }}}}" style="display:inline-block;padding:13px 24px;'
        f'font-family:{FONT};font-size:15px;font-weight:500;color:#ffffff;text-decoration:none;">{label}</a>'
        "</td></tr></table>"
    )


P = 'style="margin:0 0 16px;"'
MUTED = 'style="margin:0 0 16px;color:#6E7076;font-size:14px;"'
LINK_LINE = (
    '<p style="margin:0;color:#6E7076;font-size:12px;word-break:break-all;">'
    "Se o botão não funcionar, use este link / If the button doesn’t work, use this link:<br />"
    "{{ .ConfirmationURL }}</p>"
)

PAYLOAD = {
    "mailer_subjects_confirmation": "Confirme o seu email · Confirm your email — ProfMary",
    "mailer_templates_confirmation_content": shell(
        f"<p {P}>Olá,</p>"
        f"<p {P}>Confirme o seu endereço de email para terminar de criar a sua conta ProfMary.</p>"
        f"<p {MUTED}>Confirm your email address to finish creating your ProfMary account.</p>"
        + cta("Confirmar email · Confirm email")
        + LINK_LINE
    ),
    "mailer_subjects_recovery": "Repor a palavra-passe · Reset your password — ProfMary",
    "mailer_templates_recovery_content": shell(
        f"<p {P}>Olá,</p>"
        f"<p {P}>Recebemos um pedido para repor a sua palavra-passe. Se não fez este pedido, pode ignorar este email.</p>"
        f"<p {MUTED}>We received a request to reset your password. If this wasn’t you, you can safely ignore this email.</p>"
        + cta("Repor palavra-passe · Reset password")
        + LINK_LINE
    ),
}


def token() -> str:
    if os.environ.get("SUPABASE_ACCESS_TOKEN"):
        return os.environ["SUPABASE_ACCESS_TOKEN"]
    return subprocess.run(
        ["security", "find-generic-password", "-s", "Supabase CLI", "-w"],
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()


def main() -> None:
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/config/auth",
        data=json.dumps(PAYLOAD).encode(),
        headers={
            "Authorization": f"Bearer {token()}",
            "Content-Type": "application/json",
        },
        method="PATCH",
    )
    with urllib.request.urlopen(req) as res:
        body = json.load(res)
    print("status:", res.status)
    print("confirmation subject:", body.get("mailer_subjects_confirmation"))
    print("recovery subject:", body.get("mailer_subjects_recovery"))


if __name__ == "__main__":
    main()
