"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword, type AuthActionState } from "@/lib/auth/actions";

const initialState: AuthActionState = { error: null };

export function ResetPasswordForm() {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(
    resetPassword,
    initialState
  );

  return (
    <form action={formAction} className="mx-auto w-full max-w-sm space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">{t("newPassword")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
        />
      </div>
      {state.error && (
        <p className="text-sm text-destructive">{t(`errors.${state.error}`)}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {t("resetSubmit")}
      </Button>
    </form>
  );
}
