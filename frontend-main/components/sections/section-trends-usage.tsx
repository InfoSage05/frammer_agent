// @ts-nocheck
import useChartJs from '@/components/charts/ChartJSWrapper';
import useJsonData from '@/hooks/useJsonData';
import { useLiveSectionData } from '@/hooks/useDashboardData';

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
  const { data: staticData } = useJsonData("trends");
  const data = useLiveSectionData("trends", dash?.liveDashboard, staticData);
  const sectionData = data || {
    meta: { tag: "", title: "", sub: "" },
    metricOptions: [],
    timeOptions: [],
    compareToggle: "",
    heatLegend: { colors: [], label: "" },
    durationLegend: [],
  };
  const [metric, setMetric] = useState("count");
  const [compare, setCompare] = useState(false);
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
      <div className="sig-block">
        <p className="sig-line">Feb '26 peaked at <span className="sig-pos">2,756 outputs (+194% MoM)</span> — H2 outperformed H1 by <span className="sig-val">3.2×</span> across all content types.</p>
        <p className="sig-line">Upload volume was steady across 12 months, while publish rate declined in <span className="sig-warn">Q4 2025</span>.</p>
      </div>
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
          <div className="filter-group-label">Half-Year Overlay</div>
          <button
            className={`dim-opt${compare ? " active" : ""}`}
            onClick={() => setCompare(!compare)}
            style={compare ? { borderColor: "var(--amber-lt)", color: "var(--amber-lt)" } : {}}
          >
            {compare ? "⇔ H1 vs H2 ON" : "⇔ Compare H1 / H2"}
          </button>
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

      <div className="card card-gold mb12" style={{ padding: "18px 20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif',
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.22)",
              fontWeight: 400,
            }}
          >
            12-Month {metric === "count" ? "Video Count" : "Duration (hrs)"} Trajectory
          </div>
          <GraphActionButtons
            insightsOpen={!!insightsOpen.trajectory}
            onToggleInsights={() => toggleInsights("trajectory")}
            onAskAI={() =>
              onAskAI &&
              onAskAI("12-Month Trajectory", {
                metric,
                monthRange,
                series: trajectoryData,
              })
            }
          />
          <div className="legend" style={{ gap: 18 }}>
            {labels.map((l, i) => {
              const c = [
                colors[0],
                "#ff4757",
                "#30b060",
              ][i];
              return (
                <div key={l} className="leg-item">
                  <div
                    className="leg-dot"
                    style={{
                      background: c,
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                    }}
                  />
                  <span>{l}</span>
                </div>
              );
            })}
          </div>
        </div>
        <GraphFlip
          flipped={!!insightsOpen.trajectory}
          minHeight={260}
          front={
            <div className="cjs-wrap" style={{ height: 260 }}>
              <canvas ref={trajRef} />
            </div>
          }
          back={<GraphInsights title="12-Month Trajectory" />}
        />
      </div>


      <div className="g2 mb12">
        <div className="card" style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 11, fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif', letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", marginBottom: 12, fontWeight: 400 }}>
            Duration Trend — Hours
          </div>
          <div style={{ marginBottom: 12, display: "flex", justifyContent: "flex-end" }}>
            <GraphActionButtons
              insightsOpen={!!insightsOpen.duration}
              onToggleInsights={() => toggleInsights("duration")}
              onAskAI={() => onAskAI && onAskAI("Duration Trend", { series: durationTrendData })}
            />
          </div>
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
        <div className="card" style={{ padding: "16px 18px" }}>
          <div
            style={{
              fontSize: 11,
              fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif',
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.22)",
              marginBottom: 12,
              fontWeight: 400,
            }}
          >
            Monthly Creation Heat Calendar
          </div>
          <div style={{ marginBottom: 12, display: "flex", justifyContent: "flex-end" }}>
            <GraphActionButtons
              insightsOpen={!!insightsOpen.heat}
              onToggleInsights={() => toggleInsights("heat")}
              onAskAI={() =>
                onAskAI &&
                onAskAI("Monthly Creation Heat Calendar", {
                  monthlyData: MONTHLY_DATA.map((m) => ({
                    month: m.month,
                    created: m.created,
                    uploaded: m.uploaded,
                    published: m.published,
                  })),
                })
              }
            />
          </div>
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
                  <div
                    style={{
                      fontSize: 11,
                      fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif',
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.22)",
                      marginBottom: 10,
                      paddingTop: 6,
                      borderTop: "1px solid var(--line-lt)",
                      fontWeight: 400,
                    }}
                  >
                    Monthly Upload Volume
                  </div>
                  {monthlyUploadVolume.map((m) => (
                    <BarRow
                      key={m.month}
                      label={m.month}
                      value={m.uploaded}
                      max={Math.max(...MONTHLY_DATA.map((x) => x.uploaded))}
                      fillClass="bf-ink"
                    />
                  ))}
                </div>
              </>
            }
            back={<GraphInsights title="Monthly Creation Heat Calendar" />}
          />
        </div>
      </div>

      {compare && (
        <div className="card" style={{ padding: "18px 20px", marginTop: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif', letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,179,64,0.80)", marginBottom: 3, fontWeight: 400 }}>
                ⇔ H1 vs H2 — Half-Year Overlay
              </div>
              <div style={{ fontSize: 11.5, fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif', color: "rgba(255,255,255,0.25)", letterSpacing: '0.01em' }}>
                H1: Mar–Aug 2025 · H2: Sep 2025–Feb 2026 · {metric === "count" ? "Video Count" : "Duration (hrs)"}
              </div>
            </div>
            <GraphActionButtons
              insightsOpen={!!insightsOpen.h1h2}
              onToggleInsights={() => toggleInsights("h1h2")}
              onAskAI={() => onAskAI && onAskAI("H1 vs H2 Comparison", { h1: comparisonData[0].summary, h2: comparisonData[1].summary })}
            />
          </div>
          <GraphFlip
            flipped={!!insightsOpen.h1h2}
            minHeight={200}
            front={
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {comparisonData.map(({ title, data: hdata, summary }) => {
                  const isH2 = title.includes("H2");
                  const borderColor = isH2 ? "var(--amber-lt)" : "var(--blue-lt)";
                  return (
                    <div key={title} style={{ border: `1px solid color-mix(in srgb, ${borderColor} 30%, transparent)`, borderRadius: "var(--radius)", padding: "14px 16px", background: `color-mix(in srgb, ${borderColor} 4%, transparent)` }}>
                      <div style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif', fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: borderColor, marginBottom: 12, fontWeight: 400 }}>
                        {title}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                        {[
                          ["Uploaded", sum(hdata, keys[0]), "rgba(255,255,255,0.78)"],
                          ["Created", sum(hdata, keys[1]), "rgba(232,100,80,0.85)"],
                          ["Published", sum(hdata, keys[2]), "rgba(48,209,88,0.80)"],
                        ].map(([l, v, c]) => (
                          <div key={l} style={{ padding: "8px 10px", border: "1px solid var(--line-lt)", borderRadius: "var(--radius-sm)", background: "var(--bg3)" }}>
                            <div style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif', fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", marginBottom: 4, fontWeight: 400 }}>{l}</div>
                            <div style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif', fontSize: 20, color: c, lineHeight: 1, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{v.toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {hdata.map(m => {
                          const val = m[keys[0]] || 0;
                          const maxVal = Math.max(...[...h1, ...h2].map(x => x[keys[0]] || 0), 1);
                          return (
                            <div key={m.month} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif', fontSize: 11.5, color: "rgba(255,255,255,0.28)", width: 50, flexShrink: 0 }}>{m.month}</span>
                              <div style={{ flex: 1, height: 6, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
                                <div style={{ width: `${(val / maxVal) * 100}%`, height: "100%", background: isH2 ? "var(--amber-lt)" : "var(--blue-lt)", borderRadius: 3, transition: "width 0.3s" }} />
                              </div>
                              <span style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif', fontSize: 13, color: "rgba(255,255,255,0.55)", width: 40, textAlign: "right", fontVariantNumeric: 'tabular-nums' }}>{val.toLocaleString()}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            }
            back={<GraphInsights title="H1 vs H2 Comparison" />}
          />
        </div>
      )}
    </div>
  );
}

export default SectionTrends;
