import * as React from "react";

const STYLES: Record<string, string> = {
  pending: "bg-warning-tint text-warning",
  confirmed: "bg-positive-tint text-positive",
  declined: "bg-danger-tint text-destructive",
  cancelled_student: "bg-danger-tint text-destructive",
  cancelled_admin: "bg-danger-tint text-destructive",
  skipped_blockout: "bg-muted text-muted-foreground",
};

export function StatusBadge({
  status,
  children,
}: {
  status: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium whitespace-nowrap ${STYLES[status] ?? STYLES.pending}`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
