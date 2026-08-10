"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  changePassword,
  updateProfile,
  type ProfileActionState,
} from "@/lib/profile/actions";
import { routing } from "@/i18n/routing";

const initialState: ProfileActionState = { error: null, success: false };

type Profile = {
  name: string;
  phone: string | null;
  locale: string;
  default_address: string | null;
};

export function ProfileForm({ profile }: { profile: Profile }) {
  const t = useTranslations("Profile");
  const [state, formAction, pending] = useActionState(
    updateProfile,
    initialState
  );
  const [pwState, pwAction, pwPending] = useActionState(
    changePassword,
    initialState
  );

  return (
    <div className="space-y-10">
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t("name")}</Label>
          <Input id="name" name="name" defaultValue={profile.name} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">{t("phone")}</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={profile.phone ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="locale">{t("language")}</Label>
          <select
            id="locale"
            name="locale"
            defaultValue={profile.locale}
            className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            {routing.locales.map((l) => (
              <option key={l} value={l}>
                {t(`locales.${l}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="default_address">{t("defaultAddress")}</Label>
          <Textarea
            id="default_address"
            name="default_address"
            defaultValue={profile.default_address ?? ""}
            placeholder={t("defaultAddressHint")}
          />
        </div>
        {state.error && (
          <p className="text-sm text-destructive">{t(`errors.${state.error}`)}</p>
        )}
        {state.success && (
          <p className="text-sm text-green-600">{t("saved")}</p>
        )}
        <Button type="submit" disabled={pending}>
          {t("save")}
        </Button>
      </form>

      <form action={pwAction} className="space-y-4 border-t pt-8">
        <h2 className="text-lg font-semibold">{t("changePassword")}</h2>
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
        {pwState.error && (
          <p className="text-sm text-destructive">
            {t(`errors.${pwState.error}`)}
          </p>
        )}
        {pwState.success && (
          <p className="text-sm text-green-600">{t("passwordChanged")}</p>
        )}
        <Button type="submit" variant="outline" disabled={pwPending}>
          {t("changePassword")}
        </Button>
      </form>
    </div>
  );
}
