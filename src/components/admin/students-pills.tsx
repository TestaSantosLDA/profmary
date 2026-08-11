import { Link } from "@/i18n/navigation";

// Sub-navigation of the Alunos tab: the list of fichas vs. the question
// builder. Server-rendered; each page states which pill it is.
export function StudentsPills({
  active,
  labels,
}: {
  active: "list" | "builder";
  labels: { list: string; builder: string };
}) {
  const pills = [
    { key: "list" as const, href: "/admin/students" as const, label: labels.list },
    {
      key: "builder" as const,
      href: "/admin/students/questionnaire" as const,
      label: labels.builder,
    },
  ];

  return (
    <nav className="flex gap-2">
      {pills.map(({ key, href, label }) => (
        <Link
          key={key}
          href={href}
          className={[
            "rounded-full border px-3.5 py-1.5 text-[13px] font-medium no-underline transition-colors hover:no-underline",
            key === active
              ? "border-primary bg-secondary text-primary"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
