"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  requestPasswordReset,
  type ResetRequestState,
} from "@/lib/auth/actions";

const initialState: ResetRequestState = { error: null, sent: false };

export function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    initialState
  );

  return (
    <div className="mx-auto w-full max-w-sm space-y-6">
      {state.sent ? (
        <div className="rounded-[10px] bg-positive-tint px-4 py-3 text-sm text-positive">
          {t("resetEmailSent")}
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("forgotHint")}</p>
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
          </div>
          {state.error && (
            <p className="text-sm text-destructive">
              {t(`errors.${state.error}`)}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {t("sendResetLink")}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="underline underline-offset-4">
          {t("backToLogin")}
        </Link>
      </p>
    </div>
  );
}
