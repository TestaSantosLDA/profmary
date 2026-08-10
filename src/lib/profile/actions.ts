"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";

export type ProfileActionState = { error: string | null; success: boolean };

export async function updateProfile(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "not_authenticated", success: false };
  }

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const locale = String(formData.get("locale") ?? "");
  const defaultAddress = String(formData.get("default_address") ?? "").trim();

  if (!name) {
    return { error: "missing_name", success: false };
  }
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    return { error: "invalid_locale", success: false };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      name,
      phone: phone || null,
      locale,
      default_address: defaultAddress || null,
    })
    .eq("id", user.id);

  if (error) {
    return { error: "update_failed", success: false };
  }

  revalidatePath("/", "layout");
  return { error: null, success: true };
}

export async function changePassword(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "not_authenticated", success: false };
  }

  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { error: "password_too_short", success: false };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: "update_failed", success: false };
  }

  return { error: null, success: true };
}
