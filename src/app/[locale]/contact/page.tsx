import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContactForm } from "@/components/contact/contact-form";

export default async function ContactPage({
  params,
}: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("ContactPage");

  // TODO(Maria): real contact details — cards hidden until provided.
  const email = "";
  const phone = "";

  return (
    <main className="mx-auto w-full max-w-[520px] flex-1 px-4 py-12">
      <h1 className="text-3xl">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("intro")}</p>

      {(email || phone) && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {email && (
            <a
              href={`mailto:${email}`}
              className="rounded-xl border border-border bg-card p-5 no-underline card-hover hover:no-underline"
            >
              <p className="font-heading font-semibold text-foreground">
                {t("emailCard")}
              </p>
              <p className="mt-1 text-sm text-primary">{email}</p>
            </a>
          )}
          {phone && (
            <a
              href={`tel:${phone}`}
              className="rounded-xl border border-border bg-card p-5 no-underline card-hover hover:no-underline"
            >
              <p className="font-heading font-semibold text-foreground">
                {t("phoneCard")}
              </p>
              <p className="mt-1 text-sm text-primary">{phone}</p>
            </a>
          )}
        </div>
      )}

      <div className="mt-8">
        <ContactForm />
      </div>
    </main>
  );
}
