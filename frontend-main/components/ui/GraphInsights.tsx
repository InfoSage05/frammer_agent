function GraphInsights({ title }) {
  return (
    <div
      style={{
        height: "100%",
        minHeight: 220,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 12,
        padding: "18px 20px",
        border: "1px solid var(--line-lt)",
        borderRadius: "var(--radius)",
        background:
          "linear-gradient(135deg, rgba(212,149,42,0.12), rgba(224,112,56,0.08))",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 8,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--gold)",
        }}
      >
        Quick Insights
      </div>
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 24,
          lineHeight: 1.1,
          color: "var(--ink)",
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--ink2)" }}>
        This graph suggests a strong pattern, a few hidden anomalies, and at
        least one trend that deserves a deeper look. The current insight text is
        placeholder copy, so this panel can be replaced later with generated or
        computed commentary.
      </div>
      <div style={{ fontSize: 11, lineHeight: 1.6, color: "var(--ink3)" }}>
        Another random observation: the shape of the data implies momentum in
        some segments, drag in others, and a useful story for the AI copilot to
        explain in context.
      </div>
    </div>
  );
}

export default GraphInsights;
