import "server-only";

import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

/** "5,00€ por aula" — the global at-home fee, for service-form hints. */
export async function globalFeeLabel(): Promise<string> {
  const supabase = await createClient();
  const [{ data: settings }, t] = await Promise.all([
    supabase.from("settings").select("onsite_fee_cents, onsite_fee_mode").single(),
    getTranslations("AdminServices"),
  ]);
  const amount = `${((settings?.onsite_fee_cents ?? 500) / 100).toFixed(2).replace(".", ",")}€`;
  return t(
    settings?.onsite_fee_mode === "per_hour" ? "feePerHour" : "feePerLesson",
    { amount }
  );
}
