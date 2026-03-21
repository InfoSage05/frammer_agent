// @ts-nocheck
import { useMemo, useState } from "react";
import useChartJs from "@/components/charts/ChartJSWrapper";
import GraphActionButtons from "../ui/GraphActionButtons";
import GraphInsights from "../ui/GraphInsights";
import GraphFlip from "../ui/GraphFlip";
import { fetchLiftScore } from "@/lib/api";

const SAMPLE_LIFT = {
  best_platform: "YouTube Shorts",
  probability: 0.74,
  rankings: [
    { platform: "YouTube Shorts", probability: 0.74 },
    { platform: "Instagram Reels", probability: 0.62 },
    { platform: "TikTok", probability: 0.58 },
  ],
  meta: { features: ["topic", "language", "platforms", "country", "hashtag_count", "engagement_score"] },
};

const BASELINE_POINTS = [
  { label: "T+0h", yhat: 1200, lower: 980, upper: 1420 },
  { label: "T+6h", yhat: 1800, lower: 1500, upper: 2140 },
  { label: "T+12h", yhat: 2450, lower: 2080, upper: 2830 },
  { label: "T+18h", yhat: 2900, lower: 2500, upper: 3300 },
  { label: "T+24h", yhat: 3320, lower: 2870, upper: 3760 },
  { label: "T+30h", yhat: 3580, lower: 3100, upper: 4020 },
  { label: "T+36h", yhat: 3710, lower: 3200, upper: 4180 },
];

const SCENARIO_POINTS = BASELINE_POINTS.map((p, i) => ({
  label: p.label,
  yhat: Math.round(p.yhat * 1.32 + (i > 1 ? 140 : 0)),
}));

function LiftSummary({ lift }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 12 }}>
      <div className="card" style={{ padding: 14 }}>
        <div className="card-lbl" style={{ fontSize: 11 }}>Best platform</div>
        <div style={{ fontSize: 20, fontWeight: 600 }}>{lift.best_platform}</div>
        <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 4 }}>
          {Math.round(lift.probability * 100)}% chance of hitting top quartile
        </div>
      </div>
      <div className="card" style={{ padding: 14 }}>
        <div className="card-lbl" style={{ fontSize: 11 }}>Top 3 lift picks</div>
        <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
          {lift.rankings.slice(0, 3).map((row) => (
            <div key={row.platform} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span>{row.platform}</span>
              <span style={{ color: "var(--pri)" }}>{Math.round(row.probability * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ padding: 14 }}>
        <div className="card-lbl" style={{ fontSize: 11 }}>Features used</div>
        <div style={{ fontSize: 12, color: "var(--ink3)", lineHeight: 1.5, marginTop: 6 }}>
          {(lift.meta?.features || ["topic", "language", "platforms", "country", "hashtag_count", "engagement_score"]).join(", ")}
        </div>
      </div>
    </div>
  );
}

export default function SectionLiftLab({ theme, onAskAI }) {
  const [liftResult, setLiftResult] = useState(SAMPLE_LIFT);
  const [showInsights, setShowInsights] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [topic, setTopic] = useState("Technology");
  const [region, setRegion] = useState("San Francisco, United States");
  const [language, setLanguage] = useState("en");
  const [engagement, setEngagement] = useState(0.85);
  const [platforms, setPlatforms] = useState("YouTube Shorts, Instagram Reels, TikTok");
  const [hashtags, setHashtags] = useState("#AI, #Tech, #Trending");

  const TICK_OPT = useMemo(
    () => ({
      color: theme === "light" ? "#000" : "#fff",
      font: { size: 10, family: "var(--font-mono)" },
    }),
    [theme],
  );

  const GRID_OPT = { color: "var(--chart-grid)" };

  useChartJs(
    "lift-lab-forecast",
    {
      type: "line",
      data: {
        labels: BASELINE_POINTS.map((p) => p.label),
        datasets: [
          {
            label: "Baseline band (low)",
            data: BASELINE_POINTS.map((p) => p.lower),
            borderColor: "rgba(0,224,255,0.12)",
            backgroundColor: "rgba(0,224,255,0.10)",
            pointRadius: 0,
            borderWidth: 1,
            fill: "-1",
          },
          {
            label: "Baseline band (high)",
            data: BASELINE_POINTS.map((p) => p.upper),
            borderColor: "rgba(0,224,255,0.12)",
            backgroundColor: "rgba(0,224,255,0.10)",
            pointRadius: 0,
            borderWidth: 1,
            fill: "-1",
          },
          {
            label: "Baseline yhat",
            data: BASELINE_POINTS.map((p) => p.yhat),
            borderColor: "#00e0ff",
            backgroundColor: "rgba(0,224,255,0.12)",
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 3,
          },
          {
            label: "+Delay +Hashtag (scenario)",
            data: SCENARIO_POINTS.map((p) => p.yhat),
            borderColor: "#ff5ce0",
            backgroundColor: "rgba(255,92,224,0.10)",
            tension: 0.35,
            borderWidth: 2.5,
            borderDash: [6, 4],
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: "bottom" },
          tooltip: {
            backgroundColor: theme === "dark" ? "rgba(14,15,17,0.92)" : "rgba(255,255,255,0.96)",
            titleColor: "var(--ink)",
            bodyColor: "var(--ink3)",
            padding: 10,
            cornerRadius: 4,
            borderColor: "var(--line)",
            borderWidth: 1,
            titleFont: { family: "var(--font-mono)", size: 11 },
            bodyFont: { family: "var(--font-mono)", size: 10 },
            callbacks: {
              label: (ctx) => `  ${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString()}`,
            },
          },
        },
        scales: {
          x: { ticks: { ...TICK_OPT, maxRotation: 0 }, grid: GRID_OPT },
          y: {
            ticks: {
              ...TICK_OPT,
              callback: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v),
              padding: 6,
            },
            grid: GRID_OPT,
            beginAtZero: true,
          },
        },
      },
    },
    [theme],
  );

  const parseList = (txt: string) =>
    txt
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const handleScore = async () => {
    setLoading(true);
    setError(null);
    const payload = {
      topic,
      region,
      language,
      engagement_score: Number(engagement) || 0,
      hashtags: parseList(hashtags),
    };
    const platList = parseList(platforms);

    // If backend has a trained model, call it; else fall back to local demo rankings using provided platforms.
    const apiResult = await fetchLiftScore(payload);
    if (apiResult) {
      setLiftResult(apiResult);
      setLoading(false);
      return;
    }

    // Local fallback: reuse sample probs and re-label platforms
    const ranked = platList.length
      ? platList.map((p, i) => ({ platform: p, probability: Math.max(0.35, 0.8 - i * 0.08) }))
      : SAMPLE_LIFT.rankings;
    setLiftResult({
      best_platform: ranked[0].platform,
      probability: ranked[0].probability,
      rankings: ranked,
      meta: SAMPLE_LIFT.meta,
    });
    setError("Using demo scoring — backend lift model not reachable.");
    setLoading(false);
  };

  return (
    <div className="fade-up">
      <div className="sig-block">
        <p className="sig-line">Upload a CSV or run the demo — we predict platform lift and forecast the next 36 hours with a causal what-if overlay.</p>
        <p className="sig-line">Outputs stay client-side for now; wire this to a backend endpoint later for real scoring.</p>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div className="card-head">
          <span className="card-lbl">Lift classifier · publish optimizer</span>
          <GraphActionButtons
            insightsOpen={showInsights}
            onToggleInsights={() => setShowInsights((v) => !v)}
            onAskAI={() => onAskAI && onAskAI("Lift classifier", liftResult)}
          />
        </div>
        <div className="card-sub">Enter video metadata and platforms; we score best platform. Training stays server-side; this UI sends a single payload.</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 12 }}>
          <div className="input-block">
            <label>Topic</label>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>
          <div className="input-block">
            <label>Language</label>
            <input value={language} onChange={(e) => setLanguage(e.target.value)} />
          </div>
          <div className="input-block">
            <label>Region</label>
            <input value={region} onChange={(e) => setRegion(e.target.value)} />
          </div>
          <div className="input-block">
            <label>Engagement score (0–1)</label>
            <input type="number" step="0.01" min="0" max="1" value={engagement} onChange={(e) => setEngagement(parseFloat(e.target.value))} />
          </div>
          <div className="input-block" style={{ gridColumn: "1 / -1" }}>
            <label>Hashtags (comma-separated)</label>
            <input value={hashtags} onChange={(e) => setHashtags(e.target.value)} />
          </div>
          <div className="input-block" style={{ gridColumn: "1 / -1" }}>
            <label>Candidate platforms (comma-separated)</label>
            <input value={platforms} onChange={(e) => setPlatforms(e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
          <button className="action-chip" onClick={handleScore} disabled={loading}>
            {loading ? "Scoring..." : "Score video"}
          </button>
          {error && <span style={{ fontSize: 12, color: "var(--amber)" }}>{error}</span>}
        </div>

        <GraphFlip
          flipped={showInsights}
          minHeight={200}
          front={<LiftSummary lift={liftResult} />}
          back={<GraphInsights title="Lift classifier" />}
        />
      </div>

      <div className="card" style={{ padding: 18 }}>
        <div className="card-head">
          <span className="card-lbl">Forecast + causal what-if</span>
          <button
            className="action-chip"
            onClick={() => onAskAI && onAskAI("Forecast what-if", { baseline: BASELINE_POINTS, scenario: SCENARIO_POINTS })}
          >
            Send to Copilot
          </button>
        </div>
        <div className="card-sub">Baseline Prophet-style forecast vs. scenario with +4h delay and 32% uplift for a trending hashtag.</div>
        <div style={{ height: 260, marginTop: 10 }}>
          <canvas id="lift-lab-forecast" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 12, fontSize: 12 }}>
          <div className="pill" style={{ padding: 10 }}>Baseline peak: 3.7k expected likes @ 36h</div>
          <div className="pill" style={{ padding: 10 }}>Scenario peak: {Math.max(...SCENARIO_POINTS.map((p) => p.yhat)).toLocaleString()} likes (+~32%)</div>
          <div className="pill" style={{ padding: 10 }}>Delay: +4h · Uplift multiplier: 1.32</div>
        </div>
      </div>
    </div>
  );
}
