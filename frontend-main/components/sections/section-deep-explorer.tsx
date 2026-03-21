// @ts-nocheck
import useChartJs from '@/components/charts/ChartJSWrapper';
import useJsonData from '@/hooks/useJsonData';
import { useLiveSectionData } from '@/hooks/useDashboardData';
import { useState } from "react";
import ScatterChart from "../charts/ScatterChart";
import ChannelPlatformHeatmap from "../charts/ChannelHeatmap";
import Ring from "../charts/Ring";
import DonutChart from "../charts/DonutCharts";
import BarRow from "../charts/BarRow";
import KPITree from "../charts/KPITree";
import D3CollapsibleTree from "../charts/D3CollapsibleTree";
import GraphActionButtons from "../ui/GraphActionButtons";
import GraphFlip from "../ui/GraphFlip";
import GraphInsights from "../ui/GraphInsights";
import SectionInfoHint from '@/components/ui/SectionInfoHint';
import { useDash } from '@/lib/contexts';
import { M } from '@/lib/constants';

function SectionExplorer({ theme, onAskAI }) {
  const dash = useDash();
  const { data: staticData } = useJsonData("explorer");
  const data = useLiveSectionData("explorer", dash?.liveDashboard, staticData);
  const [subView, setSubView] = useState("users");
  const [userSort, setUserSort] = useState("created");
  const [treeRoot, setTreeRoot] = useState("channel");
  const [treeChild, setTreeChild] = useState("user");
  const [treeMetric, setTreeMetric] = useState("cr");
  const [insightsOpen, setInsightsOpen] = useState({});
  const USERS = data?.users || [];
  const LANGUAGES = data?.languages || [];
  const toggleInsights = (key) =>
    setInsightsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  const unusual = USERS.filter((u) => u.created > 400 && u.published === 0).map(
    (u) => u.user,
  );

  const sortedUsers = [...USERS].sort((a, b) => b[userSort] - a[userSort]);
  const topPublishers = USERS.filter((u) => u.published > 0)
    .sort((a, b) => b.published - a.published)
    .slice(0, 6);
  const channelHeatmapData = (data?.platformHeatmap || []).map((row) => ({
    channel: row.channel,
    platforms: (data?.platformNames || []).reduce((acc, platform, idx) => {
      acc[platform] = row.values[idx];
      return acc;
    }, {}),
  }));
  const dataQualityRows = data?.dataQualityRows || [];

  const TICK_OPT = {
    color: theme === "light" ? "#000000" : "#ffffff",
    font: { size: 10, family: "var(--font-mono)" },
  };
  const GRID_OPT = { color: "var(--chart-grid)" };
  const TT_OPT = {
    backgroundColor:
      theme === "dark" ? "rgba(20,16,10,0.92)" : "rgba(255,252,248,0.96)",
    titleColor: "var(--ink)",
    bodyColor: "var(--ink3)",
    padding: 8,
    cornerRadius: 4,
    borderColor: "var(--line)",
    borderWidth: 1,
  };

  const userBarRef = useChartJs(
    "explorer-userbar",
    {
      type: "bar",
      data: {
        labels: USERS.slice(0, 12).map((u) => u.user.split(" ")[0]),
        datasets: [
          {
            label: "Created",
            data: USERS.slice(0, 12).map((u) => u.created),
            backgroundColor: "rgba(232,38,90,0.55)",
            borderColor: "#e8265a",
            borderWidth: 1,
          },
          {
            label: "Published",
            data: USERS.slice(0, 12).map((u) => u.published),
            backgroundColor: "rgba(48,176,96,0.65)",
            borderColor: "#30b060",
            borderWidth: 1,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: TT_OPT },
        scales: {
          x: { ticks: TICK_OPT, grid: GRID_OPT },
          y: {
            ticks: { ...TICK_OPT, font: { size: 10 } },
            grid: GRID_OPT,
          },
        },
      },
    },
    [theme, USERS],
  );

  const paretoRef = useChartJs(
    "explorer-pareto",
    {
      type: "bar",
      data: (() => {
        const sorted = [...USERS].sort((a, b) => b.created - a.created);
        const total = sorted.reduce((s, u) => s + u.created, 0);
        let cum = 0;
        const cumPct = sorted.map((u) => {
          cum += u.created;
          return +((cum / total) * 100).toFixed(1);
        });
        return {
          labels: sorted.slice(0, 12).map((u, i) => u.user.split(" ")[0]),
          datasets: [
            {
              type: "bar",
              label: "Created",
              data: sorted.slice(0, 12).map((u) => u.created),
              backgroundColor: "rgba(232,38,90,0.55)",
              borderColor: "#e8265a",
              borderWidth: 1,
              yAxisID: "y",
            },
            {
              type: "line",
              label: "Cumulative %",
              data: cumPct.slice(0, 12),
              borderColor: "#e03030",
              borderWidth: 2,
              pointRadius: 3,
              yAxisID: "y2",
              fill: false,
              tension: 0.3,
            },
          ],
        };
      })(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: TT_OPT },
        scales: {
          x: { ticks: { ...TICK_OPT, maxRotation: 45 }, grid: GRID_OPT },
          y: { ticks: TICK_OPT, grid: GRID_OPT },
          y2: {
            position: "right",
            min: 0,
            max: 100,
            ticks: { ...TICK_OPT, callback: (v) => v + "%" },
            grid: { display: false },
          },
        },
      },
    },
    [theme, USERS],
  );

  if (!data) return null;

  const SIGNALS = {
    users: {
      a: <>Top <span className="sig-val">{unusual.length > 0 ? unusual.length : 3} users</span> account for <span className="sig-val">61%</span> of total watch time — <span className="sig-warn">{unusual.length} flagged</span> with high creation and zero publications.</>,
      b: <>Quality score sitting at <span className="sig-pos">78 / 100</span>, up from last period — sort by any metric to drill down.</>,
    },
    channels: {
      a: <><span className="sig-val">18</span> channels tracked across <span className="sig-val">4</span> platforms — heatmap reveals <span className="sig-warn">3 underperforming</span> channels with low coverage.</>,
      b: <>Ch-A leads across all platform metrics — <span className="sig-warn">6 channels</span> have zero publications this period.</>,
    },
    quality: {
      a: <>Data completeness at <span className="sig-pos">94.2%</span> across all tracked fields — <span className="sig-warn">3 fields</span> with gaps identified in the last 30 days.</>,
      b: <>Thumbnail and duration metadata are the most common <span className="sig-warn">missing fields</span> — affects 12 channels.</>,
    },
    advanced_kpi: {
      a: <>Full KPI reference framework — <span className="sig-val">24 metrics</span> across 4 operational tiers with definitions and formulas.</>,
      b: <>This view is for advanced analysis — use the hierarchy to trace metric dependencies upstream.</>,
    },
  };

  const sig = SIGNALS[subView] || SIGNALS.users;

  return (
    <div className="fade-up">
      <div className="sig-block">
        <p className="sig-line">{sig.a}</p>
        <p className="sig-line">{sig.b}</p>
      </div>

      <div className="sub-tabs">
        {data.subTabs.map(([k, l]) => (
          <div
            key={k}
            className={`sub-tab${subView === k ? " active" : ""}${k === "advanced_kpi" ? " premium" : ""}`}
            onClick={() => setSubView(k)}
          >
            {l}
          </div>
        ))}
      </div>

      {subView === "users" && (
        <div className="stack">
          <div className="filter-panel">
            <div className="filter-group">
              <div className="filter-group-label">Sort by</div>
              <div className="dim-row">
                {data.userSortOptions.map(([k, l]) => (
                  <button
                    key={k}
                    className={`dim-opt${userSort === k ? " active" : ""}`}
                    onClick={() => setUserSort(k)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="g-6-4">
            <div className="card" style={{ padding: 0 }}>
              <div className="card-head">
                <span className="card-lbl">User Performance Matrix</span>
                <GraphActionButtons
                  insightsOpen={!!insightsOpen.userMatrix}
                  onToggleInsights={() => toggleInsights("userMatrix")}
                  onAskAI={() =>
                    onAskAI &&
                    onAskAI("User Performance Matrix", {
                      sortBy: userSort,
                      users: sortedUsers,
                    })
                  }
                />
              </div>
              <GraphFlip
                flipped={!!insightsOpen.userMatrix}
                minHeight={380}
                front={<table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Uploaded</th>
                    <th>Created</th>
                    <th>Published</th>
                    <th>Pub Rate</th>
                    <th>Hrs</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map((u) => {
                    const rate = ((u.published / u.uploaded) * 100).toFixed(1);
                    const isA = u.created > 400 && u.published === 0;
                    return (
                      <tr key={u.user} className={isA ? "anomaly" : ""}>
                        <td
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                          }}
                        >
                          {isA && (
                            <span
                              className="pdot pdot-a"
                              style={{ marginRight: 5 }}
                            />
                          )}
                          {u.user}
                        </td>
                        <td
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10.5,
                          }}
                        >
                          {u.uploaded}
                        </td>
                        <td
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10.5,
                            color: "var(--pri)",
                          }}
                        >
                          {u.created}
                        </td>
                        <td
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10.5,
                            color:
                              u.published === 0
                                ? "var(--red-lt)"
                                : "var(--green-lt)",
                          }}
                        >
                          {u.published}
                        </td>
                        <td>
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 9.5,
                              color:
                                parseFloat(rate) > 3
                                  ? "var(--green-lt)"
                                  : parseFloat(rate) > 0
                                    ? "var(--warn)"
                                    : "var(--red-lt)",
                            }}
                          >
                            {rate}%
                          </span>
                        </td>
                        <td
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 9.5,
                            color: "var(--ink3)",
                          }}
                        >
                          {u.uploadedH.toFixed(0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>}
                back={<GraphInsights title="User Performance Matrix" />}
              />
            </div>
            <div className="stack">
              <div className="card" style={{ padding: "13px 15px" }}>
                <div
                  style={{
                    fontSize: 8,
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--ink3)",
                    marginBottom: 8,
                  }}
                >
                  TOP PUBLISHERS
                </div>
                <div style={{ marginBottom: 8, display: "flex", justifyContent: "flex-end" }}>
                  <GraphActionButtons
                    insightsOpen={!!insightsOpen.topPublishers}
                    onToggleInsights={() => toggleInsights("topPublishers")}
                    onAskAI={() =>
                      onAskAI &&
                      onAskAI("Top Publishers", {
                        users: topPublishers,
                      })
                    }
                  />
                </div>
                <GraphFlip
                  flipped={!!insightsOpen.topPublishers}
                  minHeight={180}
                  front={<>{topPublishers.map((u) => (
                    <BarRow
                      key={u.user}
                      label={u.user}
                      value={u.published}
                      max={Math.max(...USERS.map((x) => x.published))}
                      fillClass="bf-gold"
                    />
                  ))}</>}
                  back={<GraphInsights title="Top Publishers" />}
                />
              </div>
              <div className="card" style={{ padding: "13px 15px" }}>
                <div
                  style={{
                    fontSize: 8,
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                   color: "var(--warn)",
                   marginBottom: 8,
                 }}
               >
                 HIGH VOLUME · ZERO PUBLISH
                </div>
                <div style={{ marginBottom: 8, display: "flex", justifyContent: "flex-end" }}>
                  <GraphActionButtons
                    insightsOpen={!!insightsOpen.zeroPublishUsers}
                    onToggleInsights={() => toggleInsights("zeroPublishUsers")}
                    onAskAI={() =>
                      onAskAI &&
                      onAskAI("High Volume Zero Publish Users", {
                        users: unusual,
                      })
                    }
                  />
                </div>
                <GraphFlip
                  flipped={!!insightsOpen.zeroPublishUsers}
                  minHeight={180}
                  front={<>{unusual.map((u) => (
                  <div
                    key={u}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "5px 0",
                      borderBottom: "1px solid var(--line-lt)",
                      fontSize: 11,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--ink3)",
                        fontSize: 10,
                      }}
                    >
                      {u}
                    </span>
                    <span
                      className="badge badge-amber"
                      style={{ fontSize: 7.5 }}
                    >
                      flagged
                    </span>
                  </div>
                ))}</>}
                  back={<GraphInsights title="High Volume Zero Publish Users" />}
                />
              </div>
            </div>
          </div>
          <div className="g2">
            <div className="card" style={{ padding: "16px 18px" }}>
              <div
                style={{
                  fontSize: 8,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--ink3)",
                  marginBottom: 12,
                }}
              >
                TOP 12 USERS — CREATED VS PUBLISHED
              </div>
              <div style={{ marginBottom: 10, display: "flex", justifyContent: "flex-end" }}>
                <GraphActionButtons
                  insightsOpen={!!insightsOpen.top12Users}
                  onToggleInsights={() => toggleInsights("top12Users")}
                  onAskAI={() =>
                    onAskAI &&
                    onAskAI("Top 12 Users Created vs Published", {
                      users: USERS.slice(0, 12).map((u) => ({
                        user: u.user,
                        created: u.created,
                        published: u.published,
                      })),
                    })
                  }
                />
              </div>
              <div className="legend" style={{ marginBottom: 10 }}>
                {[
                  ["Created", "#e8625a"],
                  ["Published", "#30b060"],
                ].map(([l, c]) => (
                  <div key={l} className="leg-item">
                    <div className="leg-dot" style={{ background: c }} />
                    {l}
                  </div>
                ))}
              </div>
              <GraphFlip
                flipped={!!insightsOpen.top12Users}
                minHeight={320}
                front={
                  <div className="cjs-wrap" style={{ height: 320 }}>
                    <canvas ref={userBarRef} />
                  </div>
                }
                back={<GraphInsights title="Top 12 Users Created vs Published" />}
              />
            </div>
            <div className="card" style={{ padding: "16px 18px" }}>
              <div
                style={{
                  fontSize: 8,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--ink3)",
                  marginBottom: 12,
                }}
              >
                USER CONCENTRATION — PARETO
              </div>
              <div style={{ marginBottom: 10, display: "flex", justifyContent: "flex-end" }}>
                <GraphActionButtons
                  insightsOpen={!!insightsOpen.pareto}
                  onToggleInsights={() => toggleInsights("pareto")}
                  onAskAI={() =>
                    onAskAI &&
                    onAskAI("User Concentration Pareto", {
                      users: [...USERS]
                        .sort((a, b) => b.created - a.created)
                        .map((u) => ({
                          user: u.user,
                          created: u.created,
                        })),
                    })
                  }
                />
              </div>
              <div
                style={{
                  fontSize: 9,
                  fontFamily: "var(--font-mono)",
                  color: "var(--ink4)",
                  marginBottom: 10,
                }}
              >
                Bar = created volume · Line = cumulative %
              </div>
              <GraphFlip
                flipped={!!insightsOpen.pareto}
                minHeight={320}
                front={
                  <div className="cjs-wrap" style={{ height: 320 }}>
                    <canvas ref={paretoRef} />
                  </div>
                }
                back={<GraphInsights title="User Concentration Pareto" />}
              />
            </div>
          </div>
        </div>
      )}

      {subView === "channels" && (
        <div className="stack">
          <div className="card" style={{ padding: "16px 18px" }}>
            <div
              style={{
                fontSize: 8,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--ink3)",
                marginBottom: 12,
              }}
              >
                USER EFFICIENCY — UPLOADS vs CREATED (size = published)
              </div>
            <div style={{ marginBottom: 10, display: "flex", justifyContent: "flex-end" }}>
              <GraphActionButtons
                insightsOpen={!!insightsOpen.scatter}
                onToggleInsights={() => toggleInsights("scatter")}
                onAskAI={() =>
                  onAskAI &&
                  onAskAI("User Efficiency Scatter", {
                    users: USERS.map((u) => ({
                      user: u.user,
                      uploaded: u.uploaded,
                      created: u.created,
                      published: u.published,
                    })),
                  })
                }
              />
            </div>
            <div
              style={{
                fontSize: 9,
                fontFamily: "var(--font-mono)",
                color: "var(--ink4)",
                marginBottom: 10,
              }}
            >
               Color: <span style={{ color: "var(--pri)" }}>●</span> &gt;10 pub{" "}
               <span style={{ color: "var(--warn)" }}>●</span> 1–10{" "}
              <span style={{ color: "var(--red-lt)" }}>●</span> 0 pub
            </div>
            <GraphFlip
              flipped={!!insightsOpen.scatter}
              minHeight={240}
              front={
                <ScatterChart
                  data={USERS}
                  height={220}
                  xKey="uploaded"
                  yKey="created"
                  rKey="published"
                  xLabel="Uploads"
                  yLabel="Created"
                  theme={theme}
                />
              }
              back={<GraphInsights title="User Efficiency Scatter" />}
            />
          </div>
          <div className="card" style={{ padding: "16px 18px" }}>
            <div
              style={{
                fontSize: 8,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--ink3)",
                marginBottom: 12,
              }}
              >
                PLATFORM × CHANNEL HEATMAP
              </div>
            <div style={{ marginBottom: 12, display: "flex", justifyContent: "flex-end" }}>
              <GraphActionButtons
                insightsOpen={!!insightsOpen.channelHeatmap}
                onToggleInsights={() => toggleInsights("channelHeatmap")}
                onAskAI={() =>
                  onAskAI &&
                  onAskAI("Platform × Channel Heatmap", {
                    data: channelHeatmapData,
                  })
                }
              />
            </div>
            <GraphFlip
              flipped={!!insightsOpen.channelHeatmap}
              minHeight={260}
              front={
                <ChannelPlatformHeatmap
                  platforms={data.platformNames}
                  rows={data.platformHeatmap}
                />
              }
              back={<GraphInsights title="Platform × Channel Heatmap" />}
            />
          </div>
        </div>
      )}

      {subView === "quality" && (
        <div className="stack">
          <div className="card" style={{ padding: "24px 28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--pri)", marginBottom: 4 }}>
                  DATA QUALITY LAYER
                </div>
                <div style={{ fontSize: 11, color: "var(--ink3)" }}>
                  Monitoring coverage, integrity, and validity across 4,453 records
                </div>
              </div>
              <GraphActionButtons
                insightsOpen={!!insightsOpen.dataCompleteness}
                onToggleInsights={() => toggleInsights("dataCompleteness")}
                onAskAI={() => onAskAI && onAskAI("Data Quality Layer", { rings: data.completenessRings, rows: dataQualityRows })}
              />
            </div>
            <GraphFlip
              flipped={!!insightsOpen.dataCompleteness}
              minHeight={400}
              front={<>
                {/* Rings row */}
                <div style={{ display: "flex", alignItems: "center", gap: 40, padding: "16px 24px", background: "var(--bg3)", borderRadius: "var(--radius)", marginBottom: 24 }}>
                  {data.completenessRings.map((ring) => (
                    <Ring key={ring.label} pct={ring.pct} color={ring.color} label={ring.label} size={ring.size} />
                  ))}
                  <div style={{ marginLeft: "auto", display: "flex", gap: 20 }}>
                    {[
                      { l: "Critical Issues", v: dataQualityRows.filter(r => r.severity === "critical").length, c: "var(--red-lt)" },
                      { l: "Warnings", v: dataQualityRows.filter(r => r.severity === "warning").length, c: "var(--amber-lt)" },
                      { l: "Total Checks", v: dataQualityRows.length, c: "var(--ink3)" },
                    ].map(s => (
                      <div key={s.l} style={{ textAlign: "center" }}>
                        <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: s.c, lineHeight: 1 }}>{s.v}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--ink4)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Metric cards in 2-column grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {dataQualityRows.map((row) => (
                    <div key={row.l} style={{
                      padding: "16px 18px",
                      border: "1px solid var(--line-lt)",
                      borderRadius: "var(--radius)",
                      background: "var(--bg3)",
                      borderLeft: `3px solid ${row.c}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--ink)", fontWeight: 600 }}>{row.l}</span>
                          {row.severity && (
                            <span style={{
                              fontSize: 7.5, fontFamily: "var(--font-mono)", letterSpacing: "0.1em", padding: "2px 7px", borderRadius: 3,
                              background: row.severity === "critical" ? "rgba(255,71,87,0.1)" : "rgba(224,168,56,0.1)",
                              color: row.severity === "critical" ? "var(--red-lt)" : "var(--amber-lt)",
                              border: `1px solid ${row.severity === "critical" ? "rgba(255,71,87,0.22)" : "rgba(224,168,56,0.22)"}`,
                              textTransform: "uppercase",
                            }}>
                              {row.severity === "critical" ? "⚑ CRITICAL" : "⚠ WARNING"}
                            </span>
                          )}
                        </div>
                        <span style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: row.c, fontWeight: 400, flexShrink: 0, marginLeft: 12 }}>{row.v}</span>
                      </div>
                      {row.pct != null && (
                        <div style={{ height: 5, background: "var(--line)", borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
                          <div style={{ width: `${Math.min(row.pct, 100)}%`, height: "100%", background: row.c, borderRadius: 3, transition: "width 0.5s cubic-bezier(.4,0,.2,1)" }} />
                        </div>
                      )}
                      {row.detail && (
                        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink4)", lineHeight: 1.6 }}>{row.detail}</div>
                      )}
                    </div>
                  ))}
                </div>
              </>}
              back={<GraphInsights title="Data Quality Layer" />}
            />
          </div>
        </div>
      )}

      {subView === "advanced_kpi" && (
        <div className="stack">
          {/* KPI Framework Document */}
          <div className="card card-gold" style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--pri)", marginBottom: 6 }}>
                  KPI FRAMEWORK DOCUMENT
                </div>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: "var(--ink)", marginBottom: 4 }}>
                  Frammer AI — Performance KPI Reference
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink4)" }}>
                  Mar 2025 – Feb 2026 · Derived from KPI Framework PDF
                </div>
              </div>
              <GraphActionButtons
                insightsOpen={!!insightsOpen.kpiDoc}
                onToggleInsights={() => toggleInsights("kpiDoc")}
                onAskAI={() => onAskAI && onAskAI("KPI Framework", {})}
              />
            </div>

            {[
              {
                section: "[A] Usage & Adoption",
                color: "var(--amber-lt)",
                kpis: [
                  { name: "Total Platform Volume", formula: "SUM(Uploaded)", value: "4,453", avail: "direct", critical: false, desc: "Total videos uploaded across all channels in the period." },
                  { name: "Total AI Outputs Created", formula: "SUM(Created)", value: "15,119", avail: "direct", critical: false, desc: "Total AI-generated video assets produced from uploads." },
                  { name: "Total Published", formula: "SUM(Published)", value: "111", avail: "direct", critical: true, desc: "Content that reached end audiences on distribution platforms." },
                  { name: "AI Creation Multiplier", formula: "Created / Uploaded", value: "3.35×", avail: "derived", critical: false, desc: "How many AI outputs are generated per uploaded source video." },
                  { name: "Active Channels", formula: "COUNT(channels with Uploaded > 0)", value: "18 / 18", avail: "direct", critical: false, desc: "Channels with at least one upload in the period." },
                  { name: "Monthly Upload Volume", formula: "SUM(Uploaded) per month", value: "194–676/mo", avail: "direct", critical: false, desc: "Range of monthly upload activity across the 12-month period." },
                  { name: "Active Users", formula: "COUNT(users with Uploaded > 0)", value: "44 / 45", avail: "direct", critical: false, desc: "Users who contributed at least one upload." },
                ],
              },
              {
                section: "[B] Output Quality & Publish",
                color: "var(--pri)",
                kpis: [
                  { name: "Platform Publish Rate", formula: "Published / Uploaded × 100", value: "2.5%", avail: "derived", critical: true, desc: "End-to-end conversion from source upload to live distribution. Benchmark: ≥10%." },
                  { name: "AI-to-Publish Rate", formula: "Published / Created × 100", value: "0.73%", avail: "derived", critical: true, desc: "Share of AI-generated content that reaches audiences. Benchmark: ≥5%." },
                  { name: "Distribution Bottleneck", formula: "1 − (Published / Created)", value: "97.5%", avail: "derived", critical: true, desc: "Percentage of AI output stuck between creation and distribution." },
                  { name: "Top Channel Pub Rate", formula: "Published_ChD / Uploaded_ChD", value: "17.5% (Ch-D)", avail: "derived", critical: false, desc: "Best-performing channel by publish rate. Benchmarks other channels." },
                  { name: "Zero-Publish Months", formula: "COUNT(months with Published = 0)", value: "3 / 12", avail: "direct", critical: true, desc: "Mar, Jul, Sep 2025 had zero published output — operational gap months." },
                ],
              },
              {
                section: "[C] Efficiency & Concentration",
                color: "var(--green-lt)",
                kpis: [
                  { name: "User Productivity Index", formula: "Total Created / Active Users", value: "344/user", avail: "derived", critical: false, desc: "Average AI outputs per contributing user in the period." },
                  { name: "Top-5 User Concentration", formula: "Top5 Created / Total Created", value: "~50%", avail: "derived", critical: false, desc: "Output skew — top 5 users account for half of all AI-generated content." },
                  { name: "Top-3 Channel Concentration", formula: "Top3 Created / Total Created", value: "~60%", avail: "derived", critical: false, desc: "Production dependency on a small number of channels." },
                  { name: "Content Gap (Unlocked Asset Pool)", formula: "Created − Published", value: "15,008", avail: "derived", critical: true, desc: "AI-generated content never distributed — represents untapped asset value." },
                  { name: "Platform Utilisation Score", formula: "MIN(PubRate × 5, 100)", value: "12.5 / 100", avail: "derived", critical: true, desc: "Composite score; full marks at ≥20% publish rate. Currently critically low." },
                ],
              },
            ].map(({ section, color, kpis }) => (
              <div key={section} style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid color-mix(in srgb, ${color} 35%, transparent)` }}>
                  <div style={{ width: 4, height: 20, background: color, borderRadius: 2 }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color, fontWeight: 700 }}>{section}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {kpis.map((kpi, idx) => (
                    <div key={kpi.name} style={{ display: "grid", gridTemplateColumns: "260px 200px 90px 60px 1fr", gap: 12, alignItems: "start", padding: "10px 0", borderBottom: "1px solid var(--line-lt)" }}>
                      <div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink2)", fontWeight: 600, marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
                          {kpi.critical && <span style={{ color: "var(--pri)", fontSize: 10 }}>⚑</span>}
                          {kpi.name}
                        </div>
                        <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--ink4)", lineHeight: 1.4 }}>{kpi.desc}</div>
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink4)" }}>
                        <span style={{ color: "var(--ink3)", fontSize: 10 }}>Formula: </span>{kpi.formula}
                      </div>
                      <div style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: kpi.critical ? "var(--pri)" : color, fontWeight: 400, lineHeight: 1.2 }}>
                        {kpi.value}
                      </div>
                      <div>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, padding: "2px 6px", borderRadius: 3, background: kpi.avail === "direct" ? "rgba(62,201,138,0.12)" : "rgba(255,71,87,0.1)", color: kpi.avail === "direct" ? "var(--green-lt)" : "var(--amber-lt)", border: `1px solid ${kpi.avail === "direct" ? "rgba(62,201,138,0.2)" : "rgba(255,71,87,0.2)"}` }}>
                          {kpi.avail}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        {kpi.critical && (
                          <div style={{ padding: "3px 8px", background: "rgba(255,71,87,0.08)", border: "1px solid rgba(255,71,87,0.2)", borderRadius: 3 }}>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--pri)" }}>⚑ CRITICAL ALERT</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ marginTop: 8, padding: "12px 16px", background: "var(--bg3)", borderRadius: "var(--radius)", border: "1px solid var(--line-lt)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink4)", marginBottom: 6 }}>LEGEND</div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {[["direct", "var(--green-lt)", "rgba(62,201,138,0.12)", "rgba(62,201,138,0.2)", "Directly available from raw data"], ["derived", "var(--amber-lt)", "rgba(255,71,87,0.1)", "rgba(255,71,87,0.2)", "Calculated from raw data"], ["⚑", "var(--pri)", "rgba(255,71,87,0.08)", "rgba(255,71,87,0.2)", "Critical KPI — needs immediate attention"]].map(([label, c, bg, border, desc]) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, padding: "2px 6px", borderRadius: 3, background: bg, color: c, border: `1px solid ${border}` }}>{label}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink4)" }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SectionExplorer;