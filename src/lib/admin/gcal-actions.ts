"use server";

import { randomBytes } from "node:crypto";
import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { consentUrl, OAUTH_STATE_COOKIE } from "@/lib/gcal/client";
import { hasTokenKey } from "@/lib/gcal/crypto";
import { createClient } from "@/lib/supabase/server";
import type { AdminActionState } from "./services-actions";

export async function connectGoogleCalendar(
  _prev: AdminActionState,
  _formData: FormData
): Promise<AdminActionState> {
  const locale = await getLocale();
  await requireAdmin(locale);

  // Fail before the Google round-trip if the callback couldn't store the token.
  if (!hasTokenKey()) {
    return { error: "missing_key", success: false };
  }

  const nonce = randomBytes(16).toString("hex");
  (await cookies()).set(OAUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });

  // The locale rides along in state so the callback can land back on the
  // right admin settings page; the nonce half is CSRF protection.
  redirect(consentUrl(`${nonce}:${locale}`));
}

export async function disconnectGoogleCalendar(
  _prev: AdminActionState,
  _formData: FormData
): Promise<AdminActionState> {
  const locale = await getLocale();
  await requireAdmin(locale);

  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update({ gcal_refresh_token: null, gcal_sync_error: null })
    .eq("id", true);

  if (error) {
    return { error: "save_failed", success: false };
  }

  revalidatePath("/", "layout");
  return { error: null, success: true };
}
