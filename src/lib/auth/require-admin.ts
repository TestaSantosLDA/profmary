import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side admin gate for admin pages and actions. RLS remains the
 * authoritative enforcement at the data layer; this provides the UX layer.
 */
export async function requireAdmin(locale: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
    throw new Error("unreachable");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect({ href: "/dashboard", locale });
    throw new Error("unreachable");
  }

  return { supabase, user };
}
