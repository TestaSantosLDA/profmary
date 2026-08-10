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

  const { error } = await supabase.auth.signUp({
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
    return { error: "invalid_credentials" };
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

export async function signOut(): Promise<void> {
  const locale = await getLocale();
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect({ href: "/", locale });
}
