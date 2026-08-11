"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export function ProfileForm({
  profile,
  isAdmin,
}: {
  profile: Profile;
  isAdmin: boolean;
}) {
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
    <div className="space-y-6">
      <form
        action={formAction}
        className="space-y-4 rounded-xl border border-border bg-card p-5"
      >
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
          <Select name="locale" defaultValue={profile.locale}>
            <SelectTrigger id="locale" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {routing.locales.map((l) => (
                <SelectItem key={l} value={l}>
                  {t(`locales.${l}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* The teacher has no lesson address of her own. */}
        {!isAdmin && (
          <div className="space-y-2">
            <Label htmlFor="default_address">{t("defaultAddress")}</Label>
            <Textarea
              id="default_address"
              name="default_address"
              defaultValue={profile.default_address ?? ""}
            />
            <p className="text-xs text-muted-foreground">
              {t("defaultAddressHint")}
            </p>
          </div>
        )}
        {state.error && (
          <p className="text-sm text-destructive">{t(`errors.${state.error}`)}</p>
        )}
        {state.success && <p className="text-sm text-positive">{t("saved")}</p>}
        <Button type="submit" disabled={pending}>
          {t("save")}
        </Button>
      </form>

      <form
        action={pwAction}
        className="space-y-4 rounded-xl border border-border bg-card p-5"
      >
        <h2 className="font-heading text-[1.15rem] font-semibold">
          {t("changePassword")}
        </h2>
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
          <p className="text-sm text-positive">{t("passwordChanged")}</p>
        )}
        <Button type="submit" variant="outline" disabled={pwPending}>
          {t("changePassword")}
        </Button>
      </form>
    </div>
  );
}
