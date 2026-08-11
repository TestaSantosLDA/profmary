export function TileBand({
  height = 12,
  tone = "blue",
}: {
  height?: number;
  tone?: "blue" | "ivory";
}) {
  const c1 = tone === "ivory" ? "rgba(255,255,255,0.9)" : "#2456A6";
  const c2 = tone === "ivory" ? "rgba(255,255,255,0.45)" : "#173A75";
  const u = height;
  return (
    <svg width="100%" height={height} className="block" aria-hidden>
      <defs>
        <pattern
          id={`tile-${tone}-${height}`}
          width={u * 2}
          height={u}
          patternUnits="userSpaceOnUse"
        >
          <rect
            x={u * 0.5}
            y={u * 0.5}
            width={u * 0.62}
            height={u * 0.62}
            fill={c1}
            transform={`rotate(45 ${u * 0.81} ${u * 0.81})`}
          />
          <rect x={u * 1.36} y={u * 0.36} width={u * 0.28} height={u * 0.28} fill={c2} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#tile-${tone}-${height})`} />
    </svg>
  );
}
