"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = { error: string | null };

export async function signUp(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const locale = await getLocale();
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!email || !password || !name) {
    return { error: "missing_fields" };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, locale },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.code ?? "signup_failed" };
  }

  revalidatePath("/", "layout");
  // No session yet = email confirmation is on: point the user at their inbox.
  if (!data.session) {
    redirect({ href: "/login?notice=confirm_email", locale });
  }
  redirect({ href: "/dashboard", locale });
  return { error: null }; // unreachable — redirect throws
}

export async function signIn(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const locale = await getLocale();
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      error:
        error.code === "email_not_confirmed"
          ? "email_not_confirmed"
          : "invalid_credentials",
    };
  }

  revalidatePath("/", "layout");
  redirect({ href: "/dashboard", locale });
  return { error: null }; // unreachable — redirect throws
}

export async function signInWithGoogle(): Promise<void> {
  const locale = await getLocale();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}/auth/callback`,
    },
  });

  if (error || !data.url) {
    redirect({ href: "/login?error=oauth", locale });
    return;
  }

  // Supabase returns the Google consent URL; send the browser there.
  const { redirect: nextRedirect } = await import("next/navigation");
  nextRedirect(data.url);
}

export type ResetRequestState = { error: string | null; sent: boolean };

export async function requestPasswordReset(
  _prev: ResetRequestState,
  formData: FormData
): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "missing_fields", sent: false };
  }

  const locale = await getLocale();
  const supabase = await createClient();
  // Always claim success — never reveal which emails have accounts.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}/auth/callback?next=/reset-password`,
  });

  return { error: null, sent: true };
}

export async function resetPassword(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const locale = await getLocale();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The recovery link signs the user in; no session means it expired.
  if (!user) {
    return { error: "reset_link_expired" };
  }

  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { error: "password_too_short" };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "reset_failed" };
  }

  revalidatePath("/", "layout");
  redirect({ href: "/dashboard", locale });
  return { error: null }; // unreachable — redirect throws
}

export async function signOut(): Promise<void> {
  const locale = await getLocale();
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect({ href: "/", locale });
}
