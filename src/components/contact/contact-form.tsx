"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  sendContactMessage,
  type ContactActionState,
} from "@/lib/contact/actions";

const initialState: ContactActionState = { error: null, success: false };

export function ContactForm() {
  const t = useTranslations("ContactPage");
  const [state, formAction, pending] = useActionState(
    sendContactMessage,
    initialState
  );

  if (state.success) {
    return (
      <div className="rounded-xl bg-positive-tint p-6 text-center font-medium text-positive">
        {t("sent")}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden
      />
      <div className="space-y-2">
        <Label htmlFor="name">{t("name")}</Label>
        <Input id="name" name="name" required autoComplete="name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">{t("message")}</Label>
        <Textarea id="message" name="message" required rows={5} />
        <p className="text-[13px] text-muted-foreground">{t("messageHint")}</p>
      </div>
      {state.error && (
        <p className="text-sm text-destructive">{t(`errors.${state.error}`)}</p>
      )}
      <Button type="submit" disabled={pending}>
        {t("send")}
      </Button>
    </form>
  );
}
