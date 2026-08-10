const LISBON = "Europe/Lisbon";

export function formatLessonDate(locale: string, iso: string): string {
  return new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", {
    timeZone: LISBON,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function euros(cents: number): string {
  return `${(cents / 100).toFixed(2)}€`;
}
