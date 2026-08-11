import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

// Photo slot: renders the real image when `src` exists, otherwise a labelled
// placeholder frame carrying the shot brief (`note`) and suggested stock
// search terms (`search`). Nothing ships as a broken image.
export function Photo({
  src,
  alt = "",
  note,
  search,
  ratio = "4/3",
  radius = 12,
  round = false,
  showLabel = true,
  className,
  style,
}: {
  src?: string | null;
  alt?: string;
  note?: string;
  search?: string;
  /** CSS aspect-ratio, e.g. "4/5". Ignored when `round`. */
  ratio?: string;
  radius?: number;
  round?: boolean;
  showLabel?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const shape: CSSProperties = {
    aspectRatio: round ? "1 / 1" : ratio,
    borderRadius: round ? "9999px" : radius,
    ...style,
  };

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn("block w-full object-cover", className)}
        style={shape}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={cn(
        "flex w-full flex-col items-center justify-center gap-1.5 overflow-hidden border border-border bg-muted px-4 text-center",
        className
      )}
      style={shape}
    >
      {showLabel && (
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
          foto
        </span>
      )}
      {note && (
        <span className="max-w-[28ch] text-[13px] leading-snug text-muted-foreground">
          {note}
        </span>
      )}
      {search && (
        <span className="font-mono text-[11px] text-muted-foreground/80">
          {search}
        </span>
      )}
    </div>
  );
}
