// @ts-nocheck
import useChartJs from '@/components/charts/ChartJSWrapper';
import useJsonData from '@/hooks/useJsonData';

import { useState } from "react";
import HeatCalendar from "../charts/HeatCalendar";
import BarRow from "../charts/BarRow";
import GraphActionButtons from "../ui/GraphActionButtons";
import GraphFlip from "../ui/GraphFlip";
import GraphInsights from "../ui/GraphInsights";
import SectionInfoHint from '@/components/ui/SectionInfoHint';
import { useDash } from '@/lib/contexts';
import { M } from '@/lib/constants';

function SectionTrends({ theme, onAskAI }) {
  const dash = useDash();
  const { data } = useJsonData("trends");
  const { data: funnelData } = useJsonData("funnel");
  const INPUT_TYPES = funnelData?.inputTypes || [];
  const sectionData = data || {
    meta: { tag: "", title: "", sub: "" },
    metricOptions: [],
    timeOptions: [],
    compareToggle: "",
    heatLegend: { colors: [], label: "" },
    durationLegend: [],
  };
  const [metric, setMetric] = useState("count");
  const [monthRange, setMonthRange] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [showForecast, setShowForecast] = useState(true);
  const [insightsOpen, setInsightsOpen] = useState({});
  const MONTHLY_DATA = data?.monthlyData || [];
  const keys =
    metric === "count"
      ? ["uploaded", "created", "published"]
      : ["uploadedDur", "createdDur", "publishedDur"];
  const colors = ["#ffffff", "#ff4757", "#30b060"];
  const labels =
    metric === "count"
      ? ["Uploaded", "Created", "Published"]
      : ["Upload Hrs", "Created Hrs", "Published Hrs"];
  const h1 = MONTHLY_DATA.slice(0, 6),
    h2 = MONTHLY_DATA.slice(6);
  const sum = (arr, k) => arr.reduce((a, b) => a + (b[k] || 0), 0);
  const filteredData =
    monthRange === "h1" ? h1 : monthRange === "h2" ? h2 : MONTHLY_DATA;
  const trajectoryData = filteredData.map((d) => ({
    month: d.month,
    [labels[0]]: d[keys[0]] || 0,
    [labels[1]]: d[keys[1]] || 0,
    [labels[2]]: d[keys[2]] || 0,
  }));
  const durationTrendData = MONTHLY_DATA.map((m) => ({
    month: m.month,
    uploadHours: +m.uploadedDur.toFixed(1),
    createdHours: +m.createdDur.toFixed(1),
    publishedHours: +m.publishedDur.toFixed(2),
  }));
  const monthlyUploadVolume = MONTHLY_DATA.map((m) => ({
    month: m.month,
    uploaded: m.uploaded,
    created: m.created,
  }));
  const comparisonData = [
    {
      title: "H1 — Mar–Aug 2025",
      data: h1,
      summary: {
        uploaded: sum(h1, "uploaded"),
        created: sum(h1, "created"),
        published: sum(h1, "published"),
      },
    },
    {
      title: "H2 — Sep 2025–Feb 2026",
      data: h2,
      summary: {
        uploaded: sum(h2, "uploaded"),
        created: sum(h2, "created"),
        published: sum(h2, "published"),
      },
    },
  ];
  const toggleInsights = (key) =>
    setInsightsOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  // Chart.js duration chart
  const TICK_OPT = {
    color: theme === "light" ? "#000000" : "#ffffff",
    font: { size: 10, family: "var(--font-mono)" },
  };
  const GRID_OPT = { color: "var(--chart-grid)" };
  const TT_OPT = {
    backgroundColor:
      theme === "dark" ? "rgba(14,15,17,0.92)" : "rgba(255,255,255,0.96)",
    titleColor: "var(--ink)",
    bodyColor: "var(--ink3)",
    padding: 10,
    cornerRadius: 4,
    borderColor: "var(--line)",
    borderWidth: 1,
    titleFont: { family: "var(--font-mono)", size: 11 },
    bodyFont: { family: "var(--font-mono)", size: 10 },
  };

  const durCanvasRef = useChartJs(
    "trends-duration",
    {
      type: "line",
      data: {
        labels: MONTHLY_DATA.map((m) => m.month),
        datasets: [
          {
            label: "Upload hrs",
            data: MONTHLY_DATA.map((m) => m.uploadedDur.toFixed(1)),
            borderColor: "#ff4757",
            backgroundColor: "rgba(255,71,87,0.15)",
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: "#ff4757",
          },
          {
            label: "Created hrs",
            data: MONTHLY_DATA.map((m) => m.createdDur.toFixed(1)),
            borderColor: "#ffffff",
            backgroundColor: "rgba(255,255,255,0.10)",
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: "#ffffff",
          },
          {
            label: "Published hrs",
            data: MONTHLY_DATA.map((m) => m.publishedDur.toFixed(2)),
            borderColor: "#30b060",
            backgroundColor: "rgba(48,176,96,0.10)",
            fill: true,
            tension: 0.4,
            borderWidth: 1.5,
            pointRadius: 3,
            pointBackgroundColor: "#30b060",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: TT_OPT },
        scales: {
          x: { ticks: { ...TICK_OPT, maxRotation: 45 }, grid: GRID_OPT },
          y: {
            ticks: { ...TICK_OPT, callback: (v) => v + "h" },
            grid: GRID_OPT,
          },
        },
      },
    },
    [theme, MONTHLY_DATA],
  );

  // Chart.js trajectory chart (replaces custom SVG LineChart for HD quality)
  const trajLabels = filteredData.map((m) => m.month);
  const trajRef = useChartJs(
    "trends-traj-" + metric + "-" + monthRange,
    {
      type: "line",
      data: {
        labels: trajLabels,
        datasets: [
          {
            label: labels[0],
            data: filteredData.map((d) => d[keys[0]] || 0),
            borderColor: colors[0],
            backgroundColor: colors[0]
              .replace("#ffffff", "rgba(255,255,255,0.12)")
              .replace("#ff4757", "rgba(255,71,87,0.14)")
              .replace("#30b060", "rgba(48,176,96,0.10)"),
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: colors[0],
            pointBorderColor:
              theme === "dark" ? "rgba(10,10,10,0.8)" : "rgba(255,255,255,0.8)",
            pointBorderWidth: 1.5,
          },
          {
            label: labels[1],
            data: filteredData.map((d) => d[keys[1]] || 0),
            borderColor: "#ff4757",
            backgroundColor: "rgba(255,71,87,0.14)",
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: "#ff4757",
            pointBorderColor:
              theme === "dark" ? "rgba(10,10,10,0.8)" : "rgba(255,255,255,0.8)",
            pointBorderWidth: 1.5,
          },
          {
            label: labels[2],
            data: filteredData.map((d) => d[keys[2]] || 0),
            borderColor: "#30b060",
            backgroundColor: "rgba(48,176,96,0.10)",
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: "#30b060",
            pointBorderColor:
              theme === "dark" ? "rgba(10,10,10,0.8)" : "rgba(255,255,255,0.8)",
            pointBorderWidth: 1.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TT_OPT,
            callbacks: {
              label: (ctx) =>
                `  ${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString()}`,
            },
          },
        },
        scales: {
          x: {
            ticks: {
              ...TICK_OPT,
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 12,
              padding: 6,
            },
            grid: { ...GRID_OPT, drawBorder: false },
            border: { display: false },
          },
          y: {
            ticks: {
              ...TICK_OPT,
              padding: 8,
              callback: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v),
            },
            grid: GRID_OPT,
            border: { display: false },
            beginAtZero: true,
          },
        },
        layout: { padding: { top: 8, right: 16, bottom: 4, left: 4 } },
      },
    },
    [theme, metric, monthRange, filteredData],
  );

  // Linear regression forecast for next 3 months
  const FORECAST_MONTHS = ['Mar \'26', 'Apr \'26', 'May \'26'];
  const computeForecast = (arr) => {
    const n = arr.length;
    const sumX = arr.reduce((s, _, i) => s + i, 0);
    const sumY = arr.reduce((s, v) => s + v, 0);
    const sumXY = arr.reduce((s, v, i) => s + i * v, 0);
    const sumX2 = arr.reduce((s, _, i) => s + i * i, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return FORECAST_MONTHS.map((_, i) => Math.max(0, Math.round(slope * (n + i) + intercept)));
  };
  const uploadForecast = computeForecast(MONTHLY_DATA.map(m => m.uploaded));
  const createdForecast = computeForecast(MONTHLY_DATA.map(m => m.created));
  const publishedForecast = computeForecast(MONTHLY_DATA.map(m => m.published));

  const forecastRef = useChartJs(
    "trends-forecast",
    {
      type: "line",
      data: {
        labels: [...MONTHLY_DATA.map(m => m.month), ...FORECAST_MONTHS],
        datasets: [
          {
            label: "Uploaded (actual)",
            data: [...MONTHLY_DATA.map(m => m[keys[0]] || 0), ...uploadForecast.map(() => null)],
            borderColor: colors[0],
            backgroundColor: "transparent",
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 2,
            pointBackgroundColor: colors[0],
          },
          {
            label: "Uploaded (forecast)",
            data: [...MONTHLY_DATA.map(() => null), MONTHLY_DATA[MONTHLY_DATA.length-1]?.[keys[0]] || 0, ...uploadForecast.slice(1)],
            borderColor: colors[0],
            backgroundColor: "transparent",
            tension: 0.35,
            borderWidth: 2,
            borderDash: [5, 4],
            pointRadius: 3,
            pointStyle: "circle",
            pointBackgroundColor: colors[0],
          },
          {
            label: "Created (actual)",
            data: [...MONTHLY_DATA.map(m => m[keys[1]] || 0), ...createdForecast.map(() => null)],
            borderColor: "#ff4757",
            backgroundColor: "transparent",
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 2,
            pointBackgroundColor: "#ff4757",
          },
          {
            label: "Created (forecast)",
            data: [...MONTHLY_DATA.map(() => null), MONTHLY_DATA[MONTHLY_DATA.length-1]?.[keys[1]] || 0, ...createdForecast.slice(1)],
            borderColor: "#ff4757",
            backgroundColor: "transparent",
            tension: 0.35,
            borderWidth: 2,
            borderDash: [5, 4],
            pointRadius: 3,
            pointBackgroundColor: "#ff4757",
          },
          {
            label: "Published (actual)",
            data: [...MONTHLY_DATA.map(m => m[keys[2]] || 0), ...publishedForecast.map(() => null)],
            borderColor: "#30b060",
            backgroundColor: "transparent",
            tension: 0.35,
            borderWidth: 1.5,
            pointRadius: 2,
            pointBackgroundColor: "#30b060",
          },
          {
            label: "Published (forecast)",
            data: [...MONTHLY_DATA.map(() => null), MONTHLY_DATA[MONTHLY_DATA.length-1]?.[keys[2]] || 0, ...publishedForecast.slice(1)],
            borderColor: "#30b060",
            backgroundColor: "transparent",
            tension: 0.35,
            borderWidth: 1.5,
            borderDash: [5, 4],
            pointRadius: 3,
            pointBackgroundColor: "#30b060",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TT_OPT,
            callbacks: {
              label: (ctx) => `  ${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString()}`,
            },
          },
          annotation: {},
        },
        scales: {
          x: {
            ticks: { ...TICK_OPT, maxRotation: 45, font: { size: 9, family: "var(--font-mono)" } },
            grid: { ...GRID_OPT },
            border: { display: false },
          },
          y: {
            ticks: { ...TICK_OPT, padding: 8, callback: (v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v },
            grid: GRID_OPT,
            border: { display: false },
            beginAtZero: true,
          },
        },
        layout: { padding: { top: 8, right: 16, bottom: 4, left: 4 } },
      },
    },
    [theme, metric, MONTHLY_DATA, showForecast],
  );

  return (
    <div className="fade-up">
      <div className="filter-panel">
        <div className="filter-group">
          <div className="filter-group-label">Metric</div>
          <div className="dim-row">
            {sectionData.metricOptions.map(([k, l]) => (
              <button
                key={k}
                className={`dim-opt${metric === k ? " active" : ""}`}
                onClick={() => setMetric(k)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <div className="filter-group-label">Time Period</div>
          <div className="dim-row">
            {sectionData.timeOptions.map(([k, l]) => (
              <button
                key={k}
                className={`dim-opt${monthRange === k ? " active" : ""}`}
                onClick={() => setMonthRange(k)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <div className="filter-group-label">3-Month Forecast</div>
          <button
            className={`dim-opt${showForecast ? " active" : ""}`}
            onClick={() => setShowForecast(!showForecast)}
            style={showForecast ? { borderColor: "var(--pri)", color: "var(--pri)" } : {}}
          >
            {showForecast ? "⬡ Forecast ON" : "⬡ Show Forecast"}
          </button>
        </div>
      </div>

      <div className="card card-gold mb12" style={{ padding: 0 }}>
        <div className="card-head">
          <span className="card-lbl">12-Month {metric === "count" ? "Video Count" : "Duration (hrs)"} Trajectory</span>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginLeft: "auto" }}>
            <div className="legend" style={{ gap: 14 }}>
              {labels.map((l, i) => {
                const c = [colors[0], "#ff4757", "#30b060"][i];
                return (
                  <div key={l} className="leg-item">
                    <div className="leg-dot" style={{ background: c, width: 8, height: 8, borderRadius: "50%" }} />
                    <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)" }}>{l}</span>
                  </div>
                );
              })}
            </div>
            <GraphActionButtons
              insightsOpen={!!insightsOpen.trajectory}
              onToggleInsights={() => toggleInsights("trajectory")}
              onAskAI={() => onAskAI && onAskAI("12-Month Trajectory", { metric, monthRange, series: trajectoryData })}
            />
          </div>
        </div>
        <GraphFlip
          flipped={!!insightsOpen.trajectory}
          minHeight={260}
          front={
            <div className="cjs-wrap" style={{ height: 260, padding: "16px 20px 12px" }}>
              <canvas ref={trajRef} />
            </div>
          }
          back={<GraphInsights title="12-Month Trajectory" />}
        />
      </div>


      <div className="g2 mb12">
        <div className="card" style={{ padding: 0 }}>
          <div className="card-head">
            <span className="card-lbl">Duration Trend — Hours</span>
            <GraphActionButtons
              insightsOpen={!!insightsOpen.duration}
              onToggleInsights={() => toggleInsights("duration")}
              onAskAI={() => onAskAI && onAskAI("Duration Trend", { series: durationTrendData })}
            />
          </div>
          <div style={{ padding: "16px 20px 12px" }}>
          <GraphFlip
            flipped={!!insightsOpen.duration}
            minHeight={260}
            front={
              <>
                <div className="cjs-wrap" style={{ height: 200 }}>
                  <canvas ref={durCanvasRef} />
                </div>
                <div className="legend" style={{ marginTop: 10 }}>
                  {sectionData.durationLegend.map(([l, c]) => (
                    <div key={l} className="leg-item">
                      <div className="leg-dot" style={{ background: c }} />
                      {l}
                    </div>
                  ))}
                </div>
                {/* Forecast inline below duration chart */}
                {showForecast && (
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line-lt)" }}>
                    <div style={{ fontSize: 11, fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif', letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(232,100,80,0.75)", marginBottom: 10, fontWeight: 400 }}>
                      ⬡ 3-Month Forecast — Mar–May 2026
                    </div>
                    <div className="cjs-wrap" style={{ height: 180 }}>
                      <canvas ref={forecastRef} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 12 }}>
                      {FORECAST_MONTHS.map((month, i) => (
                        <div key={month} style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", background: "var(--bg3)" }}>
                          <div style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif', fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(232,100,80,0.75)", marginBottom: 8, fontWeight: 400 }}>
                            {month}
                          </div>
                          {[["↑ Uploaded", uploadForecast[i], colors[0]], ["⊹ Created", createdForecast[i], "#ff4757"], ["✓ Published", publishedForecast[i], "#30b060"]].map(([lbl, val, c]) => (
                            <div key={lbl} style={{ display: "flex", justifyContent: "space-between", fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif', fontSize: 13, marginBottom: 3 }}>
                              <span style={{ color: "rgba(255,255,255,0.45)" }}>{lbl}</span>
                              <span style={{ color: c, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{val.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            }
            back={<GraphInsights title="Duration Trend" />}
          />
          </div>
        </div>
        <div className="card" style={{ padding: 0 }}>
          <div className="card-head">
            <span className="card-lbl">Monthly Creation Heat Calendar</span>
            <GraphActionButtons
              insightsOpen={!!insightsOpen.heat}
              onToggleInsights={() => toggleInsights("heat")}
              onAskAI={() => onAskAI && onAskAI("Monthly Creation Heat Calendar", { monthlyData: MONTHLY_DATA.map((m) => ({ month: m.month, created: m.created, uploaded: m.uploaded, published: m.published })) })}
            />
          </div>
          <div style={{ padding: "16px 20px 12px" }}>
          <GraphFlip
            flipped={!!insightsOpen.heat}
            minHeight={430}
            front={
              <>
                <HeatCalendar data={MONTHLY_DATA} />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 12,
                  }}
                >
                  {sectionData.heatLegend.colors.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        width: 16,
                        height: 10,
                        background: c,
                        borderRadius: 2,
                      }}
                    />
                  ))}
                  <span
                    style={{
                      fontSize: 11.5,
                      fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif',
                      color: "rgba(255,255,255,0.25)",
                      marginLeft: 4,
                      letterSpacing: '0.01em',
                    }}
                  >
                    {sectionData.heatLegend.label}
                  </span>
                </div>
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(255,255,255,0.38)", marginBottom: 10, paddingTop: 6, borderTop: "1px solid var(--line-lt)", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>AI MULTIPLIER BY INPUT TYPE</span>
                  </div>
                  <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.28)", marginBottom: 12 }}>
                    AI Outputs Created ÷ Videos Uploaded per content type
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {[...INPUT_TYPES].sort((a, b) => (b.created / b.uploaded) - (a.created / a.uploaded)).map((t) => {
                      const mult = t.uploaded > 0 ? (t.created / t.uploaded) : 0;
                      const maxMult = Math.max(...INPUT_TYPES.map(x => x.uploaded > 0 ? x.created / x.uploaded : 0), 1);
                      const pct = (mult / maxMult) * 100;
                      const isHigh = mult > 3.5;
                      const barColor = isHigh ? "#ff4757" : "rgba(255,71,87,0.45)";
                      const valColor = isHigh ? "#ff6b7a" : "rgba(255,255,255,0.38)";
                      return (
                        <div key={t.type} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "rgba(255,255,255,0.50)", width: 106, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.type}</span>
                          <div style={{ flex: 1, height: 7, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 4, transition: "width 0.4s ease" }} />
                          </div>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: valColor, fontWeight: isHigh ? 700 : 400, width: 40, textAlign: "right", flexShrink: 0 }}>{mult.toFixed(1)}×</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            }
            back={<GraphInsights title="Monthly Creation Heat Calendar" />}
          />
          </div>
        </div>
      </div>

      {/* ── H1 vs H2 — premium half-year comparison ── */}
      {(() => {
        const MONO = "var(--font-mono)";
        const SANS = "var(--font-sans)";
        // Dashboard-consistent colors: H1 uses the site's soft blue, H2 uses gold
        const H1C = "#5B9BF5";   // softer, less saturated blue
        const H2C = "#C8A04A";   // dashboard gold (matches --gold)
        const h1s = comparisonData[0].summary;
        const h2s = comparisonData[1].summary;

        // Summary data
        const ALL_METRICS = metric === "count"
          ? [
              { k: "uploaded",  label: "Uploaded",  h1v: h1s.uploaded,  h2v: h2s.uploaded,  accent: "rgba(255,255,255,0.55)" },
              { k: "created",   label: "Created",   h1v: h1s.created,   h2v: h2s.created,   accent: "rgba(255,107,122,0.80)" },
              { k: "published", label: "Published", h1v: h1s.published, h2v: h2s.published, accent: "rgba(62,201,138,0.80)" },
            ]
          : [
              { k: "uploadedDur",  label: "Upload hrs",  h1v: sum(h1,"uploadedDur"),  h2v: sum(h2,"uploadedDur"),  accent: "rgba(255,255,255,0.55)" },
              { k: "createdDur",   label: "Created hrs", h1v: sum(h1,"createdDur"),   h2v: sum(h2,"createdDur"),   accent: "rgba(255,107,122,0.80)" },
              { k: "publishedDur", label: "Pub hrs",     h1v: sum(h1,"publishedDur"), h2v: sum(h2,"publishedDur"), accent: "rgba(62,201,138,0.80)" },
            ];

        // Table view key — independent of global metric toggle
        const [tableKey, setTableKey] = [keys[0], () => {}]; // follows global metric

        const fmt = (v) => metric === "count" ? Math.round(v).toLocaleString() : v.toFixed(1) + "h";
        const calcDelta = (h1v, h2v) => {
          if (!h1v) return { pct: "—", pos: null };
          const pct = ((h2v - h1v) / h1v) * 100;
          return { pct: Math.abs(pct).toFixed(1), pos: pct > 0.05, neg: pct < -0.05 };
        };

        // Dashboard-consistent delta colors (warm palette, not jarring pure red/green)
        const POS_C  = "rgba(62,201,138,0.78)";   // muted green
        const NEG_C  = "rgba(255,107,122,0.78)";   // site's soft coral/pink
        const NEU_C  = "rgba(255,255,255,0.28)";

        const deltaColor = (d) => d.pos ? POS_C : d.neg ? NEG_C : NEU_C;
        const deltaStr   = (v1, v2) => {
          const d = v2 - v1;
          return d === 0 ? "—" : (d > 0 ? "+" : "") + Math.round(d).toLocaleString();
        };

        const allVals = [...h1, ...h2].map(m => m[keys[0]] || 0);
        const maxVal  = Math.max(...allVals, 1);

        const H2_MONTHS = ["Sep'25","Oct'25","Nov'25","Dec'25","Jan'26","Feb'26"];
        const COLS = "100px 1fr 60px 20px 100px 1fr 60px 58px";

        return (
          <div style={{ background: "var(--bg2,#0e0e11)", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>

            {/* ── Thin top gradient rule ── */}
            <div style={{ height: 2, background: `linear-gradient(90deg, ${H1C}90 0%, rgba(255,255,255,0.04) 50%, ${H2C}90 100%)` }} />

            {/* ── Header ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 26px 16px", borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.30)" }}>Half-Year Comparison</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {[{ label: "H1 — Mar–Aug 2025", c: H1C }, { sep: true }, { label: "H2 — Sep 2025–Feb 2026", c: H2C }].map((x, xi) =>
                    x.sep
                      ? <span key={xi} style={{ fontFamily: MONO, fontSize: 11, color: "rgba(255,255,255,0.16)" }}>⇔</span>
                      : <div key={xi} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 11px", borderRadius: 6, background: `${x.c}10`, border: `0.5px solid ${x.c}30` }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: x.c, opacity: 0.85 }} />
                          <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, color: x.c, letterSpacing: "0.03em" }}>{x.label}</span>
                        </div>
                  )}
                </div>
              </div>
              <GraphActionButtons
                insightsOpen={!!insightsOpen.h1h2}
                onToggleInsights={() => toggleInsights("h1h2")}
                onAskAI={() => onAskAI && onAskAI("H1 vs H2 Comparison", { h1: h1s, h2: h2s })}
              />
            </div>

            <GraphFlip flipped={!!insightsOpen.h1h2} minHeight={500} front={<>

              {/* ── KPI Summary Row ── */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}>
                {ALL_METRICS.map(({ label, h1v, h2v, accent }, ci) => {
                  const d = calcDelta(h1v, h2v);
                  const dc = deltaColor(d);
                  const h1bar = (h1v / Math.max(h1v, h2v)) * 100;
                  const h2bar = (h2v / Math.max(h1v, h2v)) * 100;
                  return (
                    <div key={label} style={{ padding: "22px 26px", borderRight: ci < 2 ? "0.5px solid rgba(255,255,255,0.05)" : "none", position: "relative", overflow: "hidden", transition: "background .18s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.018)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {/* Ambient glow */}
                      <div style={{ position: "absolute", bottom: -24, right: -16, width: 80, height: 80, borderRadius: "50%", background: accent, filter: "blur(32px)", opacity: 0.14, pointerEvents: "none" }} />

                      <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.20em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginBottom: 14 }}>{label}</div>

                      {/* H1 / H2 side by side */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                        {[{ v: h1v, c: H1C, lbl: "H1", bar: h1bar }, { v: h2v, c: H2C, lbl: "H2", bar: h2bar }].map(({ v, c, lbl, bar }) => (
                          <div key={lbl}>
                            <div style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, color: c, letterSpacing: "0.10em", marginBottom: 5, opacity: 0.80 }}>{lbl}</div>
                            <div style={{ fontFamily: MONO, fontSize: 30, fontWeight: 700, color: "rgba(255,255,255,0.88)", letterSpacing: "-0.025em", lineHeight: 1, marginBottom: 8 }}>{fmt(v)}</div>
                            <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                              <div style={{ width: `${bar}%`, height: "100%", background: c, borderRadius: 2, opacity: 0.65, transition: "width .4s ease" }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Delta */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 700, color: dc }}>
                          {d.pos ? "▲" : d.neg ? "▼" : ""} {d.pct}{d.pct !== "—" ? "%" : ""}
                        </span>
                        <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.22)", letterSpacing: "0.05em" }}>H2 vs H1</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Month-by-month table ── */}
              <div>

                {/* Column header */}
                <div style={{ display: "grid", gridTemplateColumns: COLS, alignItems: "center", padding: "10px 26px", background: "rgba(255,255,255,0.018)", borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: `${H1C}BB` }}>H1 Month</span>
                  <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)" }}>Volume</span>
                  <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, color: "rgba(255,255,255,0.25)", textAlign: "right" }}>#</span>
                  <span />
                  <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: `${H2C}BB`, paddingLeft: 14 }}>H2 Month</span>
                  <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)" }}>Volume</span>
                  <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, color: "rgba(255,255,255,0.25)", textAlign: "right" }}>#</span>
                  <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, color: "rgba(255,255,255,0.25)", textAlign: "right", letterSpacing: "0.06em" }}>ΔΔΔΔ</span>
                </div>

                {/* Data rows */}
                {h1.map((mh1, i) => {
                  const mh2    = h2[i];
                  const v1     = mh1[keys[0]] || 0;
                  const v2     = mh2?.[keys[0]] || 0;
                  const pct1   = (v1 / maxVal) * 100;
                  const pct2   = (v2 / maxVal) * 100;
                  const diff   = v2 - v1;
                  const diffD  = calcDelta(v1, v2);
                  const diffDC = deltaColor(diffD);
                  const dStr   = deltaStr(v1, v2);
                  const isLast = i === h1.length - 1;

                  return (
                    <div key={mh1.month}
                      style={{ display: "grid", gridTemplateColumns: COLS, alignItems: "center", padding: "12px 26px", borderBottom: isLast ? "none" : "0.5px solid rgba(255,255,255,0.035)", cursor: "default", transition: "background .14s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                    >
                      {/* H1 month */}
                      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.60)" }}>{mh1.month}</span>

                      {/* H1 bar */}
                      <div style={{ height: 7, background: "rgba(255,255,255,0.045)", borderRadius: 4, overflow: "hidden", marginRight: 10 }}>
                        <div style={{ width: `${pct1}%`, height: "100%", background: H1C, borderRadius: 4, opacity: 0.72, transition: "width .35s ease" }} />
                      </div>

                      {/* H1 value */}
                      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.65)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{v1.toLocaleString()}</span>

                      {/* Center divider */}
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.055)" }} />
                      </div>

                      {/* H2 month */}
                      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.60)", paddingLeft: 14 }}>{H2_MONTHS[i]}</span>

                      {/* H2 bar */}
                      <div style={{ height: 7, background: "rgba(255,255,255,0.045)", borderRadius: 4, overflow: "hidden", marginRight: 10 }}>
                        <div style={{ width: `${pct2}%`, height: "100%", background: H2C, borderRadius: 4, opacity: 0.72, transition: "width .35s ease" }} />
                      </div>

                      {/* H2 value */}
                      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.65)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{v2.toLocaleString()}</span>

                      {/* Delta — muted contextual color */}
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: diffDC, fontVariantNumeric: "tabular-nums",
                          padding: "2px 6px", borderRadius: 4,
                          background: diff === 0 ? "transparent" : diff > 0 ? "rgba(62,201,138,0.08)" : "rgba(255,107,122,0.08)",
                          border: diff === 0 ? "none" : `0.5px solid ${diff > 0 ? "rgba(62,201,138,0.18)" : "rgba(255,107,122,0.18)"}`,
                        }}>{dStr}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Totals footer */}
                <div style={{ display: "grid", gridTemplateColumns: COLS, alignItems: "center", padding: "11px 26px", background: "rgba(255,255,255,0.025)", borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.32)" }}>Total</span>
                  <span />
                  <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: H1C, textAlign: "right", fontVariantNumeric: "tabular-nums", opacity: 0.90 }}>{sum(h1,keys[0]).toLocaleString()}</span>
                  <span />
                  <span />
                  <span />
                  <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: H2C, textAlign: "right", fontVariantNumeric: "tabular-nums", opacity: 0.90 }}>{sum(h2,keys[0]).toLocaleString()}</span>
                  <div style={{ textAlign: "right" }}>
                    {(() => {
                      const td = sum(h2,keys[0]) - sum(h1,keys[0]);
                      const tdc = td > 0 ? POS_C : td < 0 ? NEG_C : NEU_C;
                      const tStr = td === 0 ? "—" : (td > 0 ? "+" : "") + td.toLocaleString();
                      return <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: tdc, fontVariantNumeric: "tabular-nums",
                        padding: "2px 7px", borderRadius: 4,
                        background: td === 0 ? "transparent" : td > 0 ? "rgba(62,201,138,0.09)" : "rgba(255,107,122,0.09)",
                        border: td === 0 ? "none" : `0.5px solid ${td > 0 ? "rgba(62,201,138,0.20)" : "rgba(255,107,122,0.20)"}`,
                      }}>{tStr}</span>;
                    })()}
                  </div>
                </div>
              </div>

            </>}
            back={<GraphInsights title="H1 vs H2 Comparison" />}
            />
          </div>
        );
      })()}
    </div>
  );
}

export default SectionTrends;
