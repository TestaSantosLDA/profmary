import type { CSSProperties } from "react";

// Signature divider: two thin blue rules with a terracotta margin line, after
// the ruling of a Portuguese exercise book. The rules are full-bleed; with
// align="page" the margin line tracks the centred content column, with
// align="edge" it sits at a fixed inset from the viewport edge.
const TONES = {
  blue: {
    rule1: "rgba(36, 86, 166, 0.4)",
    rule2: "rgba(36, 86, 166, 0.2)",
    margin: "rgba(201, 111, 74, 0.75)",
  },
  ivory: {
    rule1: "rgba(255, 255, 255, 0.55)",
    rule2: "rgba(255, 255, 255, 0.28)",
    margin: "rgba(255, 255, 255, 0.75)",
  },
} as const;

export function RuleBand({
  height = 20,
  tone = "blue",
  align = "page",
  maxWidth = 1040,
  inset = 20,
  margin = true,
}: {
  height?: number;
  tone?: keyof typeof TONES;
  align?: "page" | "edge";
  maxWidth?: number;
  inset?: number;
  margin?: boolean;
}) {
  const colors = TONES[tone];
  const rule = (top: number, background: string): CSSProperties => ({
    top: Math.round(top),
    height: 1,
    background,
  });
  const marginLine = (
    <span
      className="absolute inset-y-0 block"
      style={{ left: inset, width: 2, background: colors.margin }}
    />
  );

  return (
    <div aria-hidden className="relative w-full" style={{ height }}>
      <span className="absolute inset-x-0 block" style={rule(height * 0.4, colors.rule1)} />
      <span className="absolute inset-x-0 block" style={rule(height * 0.72, colors.rule2)} />
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
