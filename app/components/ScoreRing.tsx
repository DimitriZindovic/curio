export function scoreColor(score: number): string {
  if (score >= 85) return "var(--color-accent)";
  if (score >= 70) return "var(--color-accent-dim)";
  return "var(--color-score-low)";
}

export default function ScoreRing({
  score,
  size = 58,
  surface = "var(--color-surface)",
}: {
  score: number;
  size?: number;
  surface?: string;
}) {
  const color = scoreColor(score);
  const deg = Math.round(Math.min(100, Math.max(0, score)) * 3.6);
  const inset = Math.round(size * 0.086);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: `conic-gradient(${color} ${deg}deg, var(--color-track) 0deg)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset,
          borderRadius: "50%",
          background: surface,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: size * 0.31,
            fontWeight: 800,
            lineHeight: 1,
            color,
          }}
        >
          {score}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: Math.max(7, size * 0.12),
            letterSpacing: "0.1em",
            color: "var(--color-faint)",
            marginTop: 1,
          }}
        >
          SCORE
        </span>
      </div>
    </div>
  );
}
