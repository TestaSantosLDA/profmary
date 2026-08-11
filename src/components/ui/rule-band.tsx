import type { CSSProperties } from "react";

// Signature divider: thin blue rules with a terracotta margin line, after
// the ruling of a Portuguese exercise book. The rules are full-bleed and
// evenly spaced, fading from the strongest at the top to the faintest at the
// bottom; with align="page" the margin line tracks the centred content
// column, with align="edge" it sits at a fixed inset from the viewport edge.
const TONES = {
  blue: {
    rgb: "36, 86, 166",
    strongAlpha: 0.4,
    faintAlpha: 0.2,
    margin: "rgba(201, 111, 74, 0.75)",
  },
  ivory: {
    rgb: "255, 255, 255",
    strongAlpha: 0.55,
    faintAlpha: 0.28,
    margin: "rgba(255, 255, 255, 0.75)",
  },
} as const;

export function RuleBand({
  height = 20,
  lines = 2,
  tone = "blue",
  align = "page",
  maxWidth = 1040,
  inset = 20,
  margin = true,
}: {
  height?: number;
  lines?: number;
  tone?: keyof typeof TONES;
  align?: "page" | "edge";
  maxWidth?: number;
  inset?: number;
  margin?: boolean;
}) {
  const colors = TONES[tone];
  const rule = (index: number): CSSProperties => {
    const alpha =
      lines > 1
        ? colors.strongAlpha +
          ((colors.faintAlpha - colors.strongAlpha) * index) / (lines - 1)
        : colors.strongAlpha;
    return {
      top: Math.round((height * (index + 1)) / (lines + 1)),
      height: 1,
      background: `rgba(${colors.rgb}, ${alpha})`,
    };
  };
  const marginLine = (
    <span
      className="absolute inset-y-0 block"
      style={{ left: inset, width: 2, background: colors.margin }}
    />
  );

  return (
    <div aria-hidden className="relative w-full" style={{ height }}>
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className="absolute inset-x-0 block" style={rule(i)} />
      ))}
      {margin &&
        (align === "page" ? (
          <span className="absolute inset-0 mx-auto block w-full" style={{ maxWidth }}>
            {marginLine}
          </span>
        ) : (
          marginLine
        ))}
    </div>
  );
}
