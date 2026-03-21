// @ts-nocheck
import useChartJs from '@/components/charts/ChartJSWrapper';
import useJsonData from '@/hooks/useJsonData';
import { useState } from "react";
import D3SankeyChart from "../charts/D3SankeyChart";
import PublishFunnel from "../charts/Funnel";
import BarRow from "../charts/BarRow";
import Treemap from "../charts/Treemap";
import GraphActionButtons from "../ui/GraphActionButtons";
import GraphFlip from "../ui/GraphFlip";
import GraphInsights from "../ui/GraphInsights";
import SectionInfoHint from '@/components/ui/SectionInfoHint';
import { useDash } from '@/lib/contexts';
import { M } from '@/lib/constants';

function SectionFunnel({ theme, onAskAI }) {
  const dash = useDash();
  const { data } = useJsonData("funnel");
  const sectionData = data || {
    meta: { tag: "", title: "", sub: "" },
    subTabs: [],
    sankeyTypeOptions: [],
    contentFlowLegend: [],
    dataQualityAlerts: [],
    sankey: {},
    typeTreemapColors: [],
  };
  const [subView, setSubView] = useState("sankey");
  const [sankeyType, setSankeyType] = useState("funnel");
  const [insightsOpen, setInsightsOpen] = useState({});
  const INPUT_TYPES = data?.inputTypes || [];
  const LANGUAGES = data?.languages || [];
  const CHANNELS = data?.channels || [];
  const TOTAL_UPLOADED = data?.totals?.totalUploaded || 0;
  const TOTAL_CREATED = data?.totals?.totalCreated || 0;
  const TOTAL_PUBLISHED = data?.totals?.totalPublished || 0;
  const PUBLISH_RATE = data?.totals?.publishRate || 0;
  const MULTIPLIER = data?.totals?.multiplier || 0;
  const toggleInsights = (key) =>
    setInsightsOpen((prev) => ({ ...prev, [key]: !prev[key] }));

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
    padding: 8,
    cornerRadius: 4,
    borderColor: "var(--line)",
    borderWidth: 1,
  };

  const pubRateCanvasRef = useChartJs(
    "funnel-pubrate",
    {
      type: "bar",
      data: {
        labels: INPUT_TYPES.map((t) => t.type),
        datasets: [
          {
            label: "Publish rate %",
            data: INPUT_TYPES.map(
              (t) => +((t.published / t.uploaded) * 100).toFixed(2),
            ),
            backgroundColor: INPUT_TYPES.map((t) => {
              const r = (t.published / t.uploaded) * 100;
              return r > 5
                ? "#30b060CC"
                : r > 0
                  ? "#FF4757CC"
                  : "#ffffff33";
            }),
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
          x: {
            ticks: { ...TICK_OPT, callback: (v) => v + "%" },
            grid: GRID_OPT,
          },
          y: {
            ticks: {
              ...TICK_OPT,
              font: { size: 10, family: "var(--font-mono)" },
            },
            grid: GRID_OPT,
          },
        },
      },
    },
    [theme, INPUT_TYPES],
  );

  const SIGNALS = {
    sankey: <><span className="sig-val">{TOTAL_CREATED.toLocaleString()}</span> AI outputs from <span className="sig-val">{TOTAL_UPLOADED.toLocaleString()}</span> uploads — only <span className="sig-warn">{TOTAL_PUBLISHED.toLocaleString()}</span> reached distribution (<span className="sig-warn">{PUBLISH_RATE}%</span>)</>,
    pipeline: <>Upload-to-publish pipeline shows <span className="sig-warn">3 bottleneck stages</span> — largest drop-off at AI processing step (<span className="sig-val">{MULTIPLIER}× multiplier</span>)</>,
    channels: <><span className="sig-val">18</span> channels active — Ch-A and Ch-B account for <span className="sig-val">41%</span> of all published content this period</>,
    types: <>Short-form video achieves highest publish rate (<span className="sig-pos">8.4%</span>) — docs and podcasts at <span className="sig-warn">near-zero</span> conversion</>,
  };

  return (
    <div className="fade-up">
      <p className="sig-line">{SIGNALS[subView] || SIGNALS.sankey}</p>

      <div className="sub-tabs">
        {sectionData.subTabs.map(([k, l]) => (
          <div
            key={k}
            className={`sub-tab${subView === k ? " active" : ""}`}
            onClick={() => setSubView(k)}
          >
            {l}
          </div>
        ))}
      </div>

      {subView === "sankey" && (
        <div className="stack">
          <div className="card card-gold" style={{ padding: "18px 20px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 16,
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 8,
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--ink3)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  CONTENT FLOW — UPLOAD → CREATE → PUBLISH
                  <GraphActionButtons
                    insightsOpen={!!insightsOpen.contentFlow}
                    onToggleInsights={() => toggleInsights("contentFlow")}
                    onAskAI={() =>
                      onAskAI && onAskAI("Content Flow", { type: sankeyType })
                    }
                  />
                </div>
                <div
                  style={{
                    fontSize: 9.5,
                    color: "var(--ink4)",
                    fontFamily: "var(--font-mono)",
                    marginTop: 2,
                  }}
                >
                  D3 Sankey · hover nodes and links for details
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {sectionData.sankeyTypeOptions.map(([k, l]) => (
                  <button
                    key={k}
                    className={`dim-opt${sankeyType === k ? " active" : ""}`}
                    onClick={() => setSankeyType(k)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <GraphFlip
              flipped={!!insightsOpen.contentFlow}
              minHeight={360}
              front={
                <>
                  <D3SankeyChart type={sankeyType} theme={theme} dataMap={sectionData.sankey} />
                  <div
                    style={{
                      marginTop: 14,
                      display: "flex",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    {sectionData.contentFlowLegend.map((it, i) => (
                      <div key={i} className="leg-item">
                        <div className="leg-dot" style={{ background: it.c }} />
                        {it.l}
                      </div>
                    ))}
                  </div>
                </>
              }
              back={<GraphInsights title="Content Flow" />}
            />
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
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>PLATFORM-WIDE PIPELINE</span>
                <GraphActionButtons
                  insightsOpen={!!insightsOpen.platformPipeline}
                  onToggleInsights={() => toggleInsights("platformPipeline")}
                  onAskAI={() =>
                    onAskAI &&
                    onAskAI("Platform Pipeline", {
                      TOTAL_UPLOADED,
                      TOTAL_CREATED,
                      TOTAL_PUBLISHED,
                    })
                  }
                />
              </div>
              <GraphFlip
                flipped={!!insightsOpen.platformPipeline}
                minHeight={320}
                front={
                  <>
                    <PublishFunnel
                      uploaded={TOTAL_UPLOADED}
                      created={TOTAL_CREATED}
                      published={TOTAL_PUBLISHED}
                    />
                    <div className="divider">
                      <div className="div-line" />
                      <div className="div-gem" />
                      <span className="div-lbl">Key Ratios</span>
                      <div className="div-gem" />
                      <div className="div-line" />
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 9,
                      }}
                    >
                      {[
                        {
                          l: "Process Rate",
                          v: `${Math.round((TOTAL_CREATED / TOTAL_UPLOADED) * 100)}%`,
                          c: "var(--pri)",
                        },
                        {
                          l: "Publish Rate",
                          v: `${PUBLISH_RATE}%`,
                          c: "var(--warn)",
                        },
                        {
                          l: "AI Multiplier",
                          v: `${MULTIPLIER}×`,
                          c: "var(--ink)",
                        },
                        { l: "Gap", v: "97.5%", c: "var(--red)" },
                      ].map((s) => (
                        <div
                          key={s.l}
                          style={{
                            padding: "10px 12px",
                            border: "1px solid var(--line-lt)",
                            borderRadius: "var(--radius)",
                            background: "var(--sankey-bg)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 8,
                              fontFamily: "var(--font-mono)",
                              color: "var(--ink3)",
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              marginBottom: 5,
                            }}
                          >
                            {s.l}
                          </div>
                          <div
                            style={{
                              fontFamily: "var(--font-serif)",
                              fontSize: 24,
                              color: s.c,
                            }}
                          >
                            {s.v}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                }
                back={<GraphInsights title="Platform-Wide Pipeline" />}
              />
            </div>
            <div className="card" style={{ padding: "16px 18px" }}>
              <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--ink3)", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>AI MULTIPLIER BY INPUT TYPE</span>
                <GraphActionButtons
                  insightsOpen={!!insightsOpen.aiMultiplier}
                  onToggleInsights={() => toggleInsights("aiMultiplier")}
                  onAskAI={() => onAskAI && onAskAI("AI Multiplier by Input Type", INPUT_TYPES)}
                />
              </div>
              <GraphFlip
                flipped={!!insightsOpen.aiMultiplier}
                minHeight={260}
                front={
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink4)", marginBottom: 4 }}>
                      AI Outputs Created ÷ Videos Uploaded per content type
                    </div>
                    {[...INPUT_TYPES].sort((a, b) => (b.created / b.uploaded) - (a.created / a.uploaded)).map((t) => {
                      const mult = t.uploaded > 0 ? (t.created / t.uploaded) : 0;
                      const maxMult = Math.max(...INPUT_TYPES.map(x => x.uploaded > 0 ? x.created / x.uploaded : 0));
                      const pct = (mult / maxMult) * 100;
                      const isHigh = mult > 3.5;
                      return (
                        <div key={t.type} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink3)", width: 110, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.type}</span>
                          <div style={{ flex: 1, height: 8, background: "var(--line)", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: isHigh ? "var(--pri)" : "rgba(255,71,87,0.45)", borderRadius: 4, transition: "width 0.4s" }} />
                          </div>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: isHigh ? "var(--pri)" : "var(--ink3)", fontWeight: isHigh ? 700 : 400, width: 44, textAlign: "right" }}>
                            {mult.toFixed(1)}×
                          </span>
                        </div>
                      );
                    })}
                  </div>
                }
                back={<GraphInsights title="AI Multiplier by Input Type" />}
              />
            </div>
          </div>
        </div>
      )}

      {subView === "pipeline" && (
        <div className="stack">
          <div className="g-4-6">
            <div className="card" style={{ padding: "16px 18px" }}>
              <div
                style={{
                  fontSize: 8,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--ink3)",
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>LANGUAGE PIPELINE BREAKDOWN</span>
                <GraphActionButtons
                  insightsOpen={!!insightsOpen.languagePipeline}
                  onToggleInsights={() => toggleInsights("languagePipeline")}
                  onAskAI={() =>
                    onAskAI && onAskAI("Language Pipeline", LANGUAGES)
                  }
                />
              </div>
              <GraphFlip
                flipped={!!insightsOpen.languagePipeline}
                minHeight={360}
                front={
                  <>
                    {LANGUAGES.map((l) => {
                      const pr = ((l.published / l.uploaded) * 100).toFixed(2);
                      const color =
                        parseFloat(pr) > 1
                          ? "var(--pri)"
                          : parseFloat(pr) > 0
                            ? "var(--warn)"
                            : "var(--red-lt)";
                      return (
                        <div key={l.lang} style={{ marginBottom: 12 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 5,
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: 10,
                                color: "var(--ink2)",
                              }}
                            >
                              {l.lang}
                            </span>
                            <span
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: 9,
                                color,
                              }}
                            >
                              pub rate {pr}%
                            </span>
                          </div>
                          <PublishFunnel
                            uploaded={l.uploaded}
                            created={l.created}
                            published={l.published}
                          />
                        </div>
                      );
                    })}
                  </>
                }
                back={<GraphInsights title="Language Pipeline Breakdown" />}
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
                  marginBottom: 14,
                }}
              >
                DATA QUALITY ALERTS
              </div>
              {sectionData.dataQualityAlerts.map((a, i) => (
                <div
                  key={i}
                  className={`callout callout-${a.c}`}
                  style={{ marginBottom: 8, padding: "9px 12px" }}
                >
                  <div
                    className="c-text"
                    style={{ fontSize: 11, marginBottom: 0 }}
                  >
                    {a.t}
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    fontSize: 8,
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--ink3)",
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>INPUT TYPE PUBLISH RATES</span>
                  <GraphActionButtons
                    insightsOpen={!!insightsOpen.inputTypePublishRates}
                    onToggleInsights={() =>
                      toggleInsights("inputTypePublishRates")
                    }
                    onAskAI={() =>
                      onAskAI &&
                      onAskAI("Input Type Publish Rates", INPUT_TYPES)
                    }
                  />
                </div>
                <GraphFlip
                  flipped={!!insightsOpen.inputTypePublishRates}
                  minHeight={240}
                  front={
                    <>
                      {INPUT_TYPES.slice(0, 7).map((t) => {
                        const rate = ((t.published / t.uploaded) * 100).toFixed(1);
                        const color =
                          parseFloat(rate) > 5
                            ? "var(--green)"
                            : parseFloat(rate) > 2
                              ? "var(--pri)"
                              : parseFloat(rate) > 0
                                ? "var(--warn)"
                                : "var(--red)";
                        return (
                          <div key={t.type} className="bar-row">
                            <span className="bar-lbl">{t.type}</span>
                            <div className="bar-track">
                              <div
                                className="bar-fill"
                                style={{
                                  width: `${Math.max(1, (parseFloat(rate) / 20) * 100)}%`,
                                  background: color,
                                }}
                              />
                            </div>
                            <span className="bar-val">{rate}%</span>
                          </div>
                        );
                      })}
                    </>
                  }
                  back={<GraphInsights title="Input Type Publish Rates" />}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {subView === "channels" && (() => {
        const activeChannels = CHANNELS.filter((ch) => ch.uploaded > 55);
        const greenChannels = activeChannels.filter(ch => (ch.published / ch.uploaded) * 100 >= 5);
        const redChannels = activeChannels.filter(ch => (ch.published / ch.uploaded) * 100 < 5);

        const renderChannelCard = (ch) => {
          const rate = (ch.published / ch.uploaded) * 100;
          const rateStr = rate.toFixed(1);
          const isGreen = rate >= 5;
          const badgeClass = rate > 5 ? "badge-green" : rate > 1 ? "badge-gold" : "badge-red";
          const W = 260, stageH = 36, gap = 6;
          const totalH = stageH * 3 + gap * 2 + 8;
          const pxW = (pct) => Math.max(8, (pct / 100) * W);
          const stageY = (i) => i * (stageH + gap);
          const trapPath = (topW, botW, y, h) => {
            const tl = (W - topW) / 2, tr = tl + topW;
            const bl = (W - botW) / 2, br = bl + botW;
            return `M${tl},${y} L${tr},${y} L${br},${y + h} L${bl},${y + h} Z`;
          };
          const upW_px = pxW(100);
          const crW_px = Math.max(upW_px * 0.4, Math.min(W, upW_px * (ch.created / ch.uploaded)));
          const pbW_px = ch.published > 0 ? Math.max(8, crW_px * (ch.published / ch.created)) : 0;
          const createExpansion = ((ch.created / ch.uploaded - 1) * 100).toFixed(0);
          const publishDrop = ((1 - ch.published / ch.created) * 100).toFixed(1);

          return (
            <div key={ch.ch} className="card" style={{
              padding: "16px 18px",
              borderLeft: `3px solid ${isGreen ? "var(--green)" : "var(--red)"}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: 19, color: "var(--ink)" }}>
                    Channel {ch.ch}
                  </div>
                  <GraphActionButtons
                    insightsOpen={!!insightsOpen[`channel-${ch.ch}`]}
                    onToggleInsights={() => toggleInsights(`channel-${ch.ch}`)}
                    onAskAI={() => onAskAI && onAskAI(`Channel ${ch.ch}`, ch)}
                  />
                </div>
                <span className={`badge ${badgeClass}`} style={{ fontSize: 9 }}>{rateStr}% pub</span>
              </div>
              <GraphFlip
                flipped={!!insightsOpen[`channel-${ch.ch}`]}
                minHeight={220}
                front={<>
                  <svg width="100%" viewBox={`0 0 ${W} ${totalH}`} style={{ display: "block", overflow: "visible" }}>
                    <defs>
                      <linearGradient id={`fu-up-${ch.ch}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7a7268" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#4a4440" stopOpacity="0.4" />
                      </linearGradient>
                      <linearGradient id={`fu-cr-${ch.ch}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff4757" stopOpacity="0.85" />
                        <stop offset="100%" stopColor="rgba(255,71,87,0.32)" stopOpacity="0.7" />
                      </linearGradient>
                      <linearGradient id={`fu-pb-${ch.ch}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isGreen ? "#3EC98A" : "#ffffff"} stopOpacity="0.9" />
                        <stop offset="100%" stopColor={isGreen ? "rgba(62,201,138,0.28)" : "rgba(255,255,255,0.28)"} stopOpacity="0.75" />
                      </linearGradient>
                    </defs>
                    <path d={trapPath(upW_px, crW_px, stageY(0), stageH)} fill={`url(#fu-up-${ch.ch})`} />
                    <path d={trapPath(crW_px, crW_px, stageY(1), stageH)} fill={`url(#fu-cr-${ch.ch})`} />
                    {pbW_px > 0 && <path d={trapPath(crW_px, pbW_px, stageY(2), stageH)} fill={`url(#fu-pb-${ch.ch})`} />}
                    {pbW_px === 0 && (
                      <text x={W/2} y={stageY(2) + stageH/2 + 4} textAnchor="middle" fill="rgba(255,71,87,0.55)" fontSize="10" fontFamily="var(--font-mono)">
                        0 published
                      </text>
                    )}
                    {[["Uploaded", ch.uploaded, stageY(0)], ["Created", ch.created, stageY(1)], ["Published", ch.published, stageY(2)]].map(([label, val, y]) => (
                      <g key={label}>
                        <text x="4" y={y + stageH/2 + 4} fill="rgba(255,255,255,0.5)" fontSize="8" fontFamily="var(--font-mono)">{label}</text>
                        <text x={W - 4} y={y + stageH/2 + 4} textAnchor="end" fill="rgba(255,255,255,0.8)" fontSize="9" fontFamily="var(--font-mono)" fontWeight="600">{Number(val).toLocaleString()}</text>
                      </g>
                    ))}
                  </svg>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <div style={{ flex: 1, padding: "6px 8px", background: "var(--sankey-bg)", borderRadius: "var(--radius-sm)", border: "1px solid var(--line-lt)" }}>
                      <div style={{ fontSize: 7, fontFamily: "var(--font-mono)", color: "var(--ink4)", marginBottom: 3 }}>AI EXPANSION</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--amber-lt)" }}>+{createExpansion}%</div>
                    </div>
                    <div style={{ flex: 1, padding: "6px 8px", background: "var(--sankey-bg)", borderRadius: "var(--radius-sm)", border: "1px solid var(--line-lt)" }}>
                      <div style={{ fontSize: 7, fontFamily: "var(--font-mono)", color: "var(--ink4)", marginBottom: 3 }}>PUB DROP</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: isGreen ? "var(--green-lt)" : "var(--red-lt)" }}>-{publishDrop}%</div>
                    </div>
                    <div style={{ flex: 1, padding: "6px 8px", background: "var(--sankey-bg)", borderRadius: "var(--radius-sm)", border: "1px solid var(--line-lt)" }}>
                      <div style={{ fontSize: 7, fontFamily: "var(--font-mono)", color: "var(--ink4)", marginBottom: 3 }}>PUB RATE</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: isGreen ? "var(--green-lt)" : "var(--red-lt)" }}>{rateStr}%</div>
                    </div>
                  </div>
                </>}
                back={<GraphInsights title={`Channel ${ch.ch} Funnel`} />}
              />
            </div>
          );
        };

        return (
          <div className="stack">
            {/* Green Tier: Healthy Publishers */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "8px 14px", background: "rgba(62,201,138,0.08)", borderRadius: "var(--radius)", border: "1px solid rgba(62,201,138,0.2)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green-lt)", flexShrink: 0 }} />
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--green-lt)" }}>
                  GREEN TIER — Publish Rate ≥ 5% &nbsp;·&nbsp; {greenChannels.length} channel{greenChannels.length !== 1 ? "s" : ""}
                </div>
                <div style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink4)" }}>
                  Healthy distribution pipeline
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
                {greenChannels.length > 0 ? greenChannels.map(renderChannelCard) : (
                  <div style={{ padding: "20px", color: "var(--ink4)", fontFamily: "var(--font-mono)", fontSize: 10 }}>No channels meeting ≥5% threshold</div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0" }}>
              <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--ink4)", letterSpacing: "0.14em" }}>PUBLISHING THRESHOLD</span>
              <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
            </div>

            {/* Red Tier: Under-Publishing */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "8px 14px", background: "rgba(255,71,87,0.07)", borderRadius: "var(--radius)", border: "1px solid rgba(255,71,87,0.18)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--red-lt)", flexShrink: 0 }} />
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--red-lt)" }}>
                  RED TIER — Publish Rate &lt; 5% &nbsp;·&nbsp; {redChannels.length} channel{redChannels.length !== 1 ? "s" : ""}
                </div>
                <div style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink4)" }}>
                  Needs distribution intervention
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
                {redChannels.length > 0 ? redChannels.map(renderChannelCard) : (
                  <div style={{ padding: "20px", color: "var(--ink4)", fontFamily: "var(--font-mono)", fontSize: 10 }}>All channels performing well!</div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
 
      {subView === "types" && (
        <div className="g2">
          <div className="card" style={{ padding: "14px 16px" }}>
            <div
              style={{
                fontSize: 8,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--ink3)",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>TOP TYPES BY CREATION VOLUME</span>
              <GraphActionButtons
                insightsOpen={!!insightsOpen.topTypes}
                onToggleInsights={() => toggleInsights("topTypes")}
                onAskAI={() =>
                  onAskAI &&
                  onAskAI("Top Types By Creation Volume", INPUT_TYPES)
                }
              />
            </div>
            <GraphFlip
              flipped={!!insightsOpen.topTypes}
              minHeight={220}
              front={
                <>
                  {INPUT_TYPES.slice(0, 6).map((t) => (
                    <BarRow
                      key={t.type}
                      label={t.type}
                      value={t.created}
                      max={Math.max(...INPUT_TYPES.map((x) => x.created))}
                      fillClass="bf-gold"
                    />
                  ))}
                </>
              }
              back={<GraphInsights title="Top Types By Creation Volume" />}
            />
          </div>
          <div className="card" style={{ padding: "14px 16px" }}>
            <div
              style={{
                fontSize: 8,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--ink3)",
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>TYPE VOLUME TREEMAP</span>
              <GraphActionButtons
                insightsOpen={!!insightsOpen.typeTreemap}
                onToggleInsights={() => toggleInsights("typeTreemap")}
                onAskAI={() =>
                  onAskAI && onAskAI("Type Volume Treemap", INPUT_TYPES)
                }
              />
            </div>
            <GraphFlip
              flipped={!!insightsOpen.typeTreemap}
              minHeight={220}
              front={
                <Treemap
                  data={INPUT_TYPES.slice(0, 6).map((t, i) => ({
                    label: t.type.substring(0, 11),
                    value: t.created,
                    color: sectionData.typeTreemapColors[i],
                    note: `${t.published} published`,
                  }))}
                  height={220}
                />
              }
              back={<GraphInsights title="Type Volume Treemap" />}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default SectionFunnel;
