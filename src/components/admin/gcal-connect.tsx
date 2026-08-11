"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
} from "@/lib/admin/gcal-actions";
import type { AdminActionState } from "@/lib/admin/services-actions";

const initialState: AdminActionState = { error: null, success: false };

type Props = {
  connected: boolean;
  /** Set when the sync engine detected a revoked/expired grant. */
  broken: boolean;
  /** Feedback from the OAuth callback redirect (?gcal / ?gcal_error). */
  justConnected: boolean;
  callbackError: string | null;
};

export function GcalConnect({
  connected,
  broken,
  justConnected,
  callbackError,
}: Props) {
  const t = useTranslations("AdminSettings.gcal");
  const [connectState, connectAction, connecting] = useActionState(
    connectGoogleCalendar,
    initialState
  );
  const [disconnectState, disconnectAction, disconnecting] = useActionState(
    disconnectGoogleCalendar,
    initialState
  );

  const error =
    connectState.error === "missing_key"
      ? t("errors.missing_key")
      : connectState.error || disconnectState.error || callbackError
        ? t("errors.connect_failed")
        : null;

  return (
    <section className="max-w-[480px] space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-base font-semibold">{t("title")}</h2>
        {connected && (
          <StatusBadge status="confirmed">{t("connected")}</StatusBadge>
        )}
      </div>

      {broken && <p className="text-sm text-destructive">{t("expired")}</p>}
      {justConnected && !broken && (
        <p className="text-sm text-positive">{t("justConnected")}</p>
      )}
      <p className="text-xs text-muted-foreground">
        {connected ? t("connectedHint") : t("notConnected")}
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {connected ? (
        <form action={disconnectAction}>
          <Button type="submit" variant="outline" disabled={disconnecting}>
            {t("disconnect")}
          </Button>
        </form>
      ) : (
        <form action={connectAction}>
          <Button type="submit" variant="outline" disabled={connecting}>
            {t("connect")}
          </Button>
        </form>
      )}
    </section>
  );
}
