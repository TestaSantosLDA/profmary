"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  signIn,
  signInWithGoogle,
  signUp,
  type AuthActionState,
} from "@/lib/auth/actions";
import { Link } from "@/i18n/navigation";

const initialState: AuthActionState = { error: null };

export function AuthForm({
  mode,
  notice,
  urlError,
}: {
  mode: "login" | "register";
  /** One-shot info banner from a redirect (e.g. "confirm your email"). */
  notice?: string | null;
  /** One-shot error from a redirect (e.g. a failed auth callback). */
  urlError?: string | null;
}) {
  const t = useTranslations("Auth");
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="mx-auto w-full max-w-sm space-y-6">
      {notice && (
        <div className="rounded-[10px] bg-positive-tint px-4 py-3 text-sm text-positive">
          {t(`notices.${notice}`)}
        </div>
      )}
      {urlError && (
        <p className="text-sm text-destructive">{t(`errors.${urlError}`)}</p>
      )}
      <form action={formAction} className="space-y-4">
        {mode === "register" && (
          <div className="space-y-2">
            <Label htmlFor="name">{t("name")}</Label>
            <Input id="name" name="name" required autoComplete="name" />
          </div>
        )}
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
        <div className="space-y-2">
          <Label htmlFor="password">{t("password")}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </div>
        {mode === "login" && (
          <p className="text-right text-sm">
            <Link
              href="/forgot-password"
              className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              {t("forgotPassword")}
            </Link>
          </p>
        )}
        {state.error && (
          <p className="text-sm text-destructive">{t(`errors.${state.error}`)}</p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {mode === "login" ? t("signIn") : t("createAccount")}
        </Button>
      </form>

      <form action={signInWithGoogle}>
        <Button type="submit" variant="outline" className="w-full">
          {t("continueWithGoogle")}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            {t("noAccount")}{" "}
            <Link href="/register" className="underline underline-offset-4">
              {t("createAccount")}
            </Link>
          </>
        ) : (
          <>
            {t("haveAccount")}{" "}
            <Link href="/login" className="underline underline-offset-4">
              {t("signIn")}
            </Link>
          </>
        )}
      </p>

      {mode === "register" && (
        <p className="text-center text-xs text-muted-foreground">
          {t("accountHolderNotice")}
        </p>
      )}
    </div>
  );
}
