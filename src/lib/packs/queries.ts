import "server-only";

import { createServiceClient } from "@/lib/supabase/server";

export type PackRow = {
  id: string;
  service_id: string;
  lessons: number;
  price_per_lesson_cents: number;
  validity_months: number | null;
  active: boolean;
};

export type PurchaseRow = {
  id: string;
  account_id: string;
  pack_id: string;
  service_id: string;
  lessons_total: number;
  lessons_remaining: number;
  price_per_lesson_cents: number;
  price_paid_cents: number;
  validity_months: number | null;
  status: "requested" | "active" | "declined" | "expired";
  confirmed_at: string | null;
  expires_at: string | null;
};

/** Per-service pack standing for one account, for the booking form. */
export type ServicePackBalance = {
  remaining: number;
  /** True when the account ever held a pack for this service — drives the
   *  "pack esgotado" note instead of silently showing nothing. */
  everPurchased: boolean;
};

function live(p: PurchaseRow, now: Date): boolean {
  return (
    p.status === "active" &&
    p.lessons_remaining > 0 &&
    (p.expires_at === null || new Date(p.expires_at) > now)
  );
}

/** All purchases of an account, newest first. Service-client: RLS keeps
 *  purchases admin/owner-only and callers have already authenticated. */
export async function accountPurchases(accountId: string): Promise<PurchaseRow[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("pack_purchases")
    .select(
      "id, account_id, pack_id, service_id, lessons_total, lessons_remaining, price_per_lesson_cents, price_paid_cents, validity_months, status, confirmed_at, expires_at"
    )
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .returns<PurchaseRow[]>();
  return data ?? [];
}

export function packBalancesByService(
  purchases: PurchaseRow[],
  now = new Date()
): Record<string, ServicePackBalance> {
  const balances: Record<string, ServicePackBalance> = {};
  for (const p of purchases) {
    const entry = balances[p.service_id] ?? { remaining: 0, everPurchased: false };
    if (p.status !== "requested") entry.everPurchased = true;
    if (live(p, now)) entry.remaining += p.lessons_remaining;
    balances[p.service_id] = entry;
  }
  return balances;
}

/**
 * The purchase a new lesson should draw on: live, matching the service,
 * expiring soonest (never-expiring ones last).
 */
export async function spendablePurchase(
  accountId: string,
  serviceId: string
): Promise<PurchaseRow | null> {
  const now = new Date();
  const candidates = (await accountPurchases(accountId)).filter(
    (p) => p.service_id === serviceId && live(p, now)
  );
  candidates.sort((a, b) => {
    if (a.expires_at === null) return b.expires_at === null ? 0 : 1;
    if (b.expires_at === null) return -1;
    return a.expires_at.localeCompare(b.expires_at);
  });
  return candidates[0] ?? null;
}
