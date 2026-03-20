// @ts-nocheck
import useJsonData from '@/hooks/useJsonData';
import { useState } from "react";
import TernaryCanvasChart from "../charts/TernaryCanvasChart";
import BarRow from "../charts/BarRow";
import Treemap from "../charts/Treemap";
import GraphActionButtons from "../ui/GraphActionButtons";
import GraphFlip from "../ui/GraphFlip";
import GraphInsights from "../ui/GraphInsights";
import { useDash } from '@/lib/contexts';
import { M } from '@/lib/constants';

function SectionMultiDim({ theme, onAskAI }) {
  const dash = useDash();
  const { data } = useJsonData("multidim");
  const [kpi, setKpi] = useState("uploaded");
  const [view, setView] = useState("bar");
  const [ternDataset, setTernDataset] = useState("channels");
  const [ternTop, setTernTop] = useState("pub_rate");
  const [ternLeft, setTernLeft] = useState("uploaded");
  const [ternRight, setTernRight] = useState("created");
  const [insightsOpen, setInsightsOpen] = useState({});
  const INPUT_TYPES = data?.inputTypes || [];
  const LANGUAGES = data?.languages || [];
  const USERS = data?.users || [];
  const CHANNELS = data?.channelMetrics || [];
  const kpiOpts = data?.kpiOptions || [];
  const heatData = data?.heatData || [];
  const inputs = [...new Set(heatData.map((d) => d.input))],
    langs = [...new Set(heatData.map((d) => d.lang))];
  const maxHeat = Math.max(...heatData.map((d) => d.val));
  const treemapData = INPUT_TYPES.map((t, i) => ({
    label: t.type.substring(0, 12),
    value: t.uploaded,
    note: `Pub rate: ${((t.published / t.uploaded) * 100).toFixed(1)}%`,
      color: (data?.treemapColors || [])[i % 10],
    }));
  const getKpiVal = (t, k) =>
    k === "pub_rate"
      ? parseFloat(((t.published / t.uploaded) * 100).toFixed(1))
      : t[
          k === "created"
            ? "created"
            : k === "published"
              ? "published"
              : "uploaded"
        ];
  const getKpiMax = (arr, k) =>
    k === "pub_rate"
      ? Math.max(...arr.map((t) => getKpiVal(t, k))) * 1.1
      : Math.max(
          ...arr.map(
            (t) =>
              t[
                k === "created"
                  ? "created"
                  : k === "published"
                    ? "published"
                    : "uploaded"
              ],
          ),
        );
  const inputTypeData = INPUT_TYPES.slice(0, 8).map((t) => ({
    type: t.type,
    value: getKpiVal(t, kpi),
  }));
  const languageData = LANGUAGES.map((l) => ({
    lang: l.lang,
    value:
      kpi === "pub_rate"
        ? parseFloat(((l.published / l.uploaded) * 100).toFixed(1))
        : l[
            kpi === "created"
              ? "created"
              : kpi === "published"
                ? "published"
                : "uploaded"
          ],
  }));
  const ternaryPoints =
    ternDataset === "channels"
      ? CHANNELS.map((row) => ({
          label: row.label,
          uploaded: row.uploaded,
          created: row.created,
          published: row.published,
          pub_rate: row.created ? +((row.published / row.created) * 100).toFixed(2) : 0,
          multiplier: row.uploaded ? +(row.created / row.uploaded).toFixed(2) : 0,
        }))
      : ternDataset === "users"
        ? USERS.map((u) => ({
            label: u.user,
            uploaded: u.uploaded,
            created: u.created,
            published: u.published,
            pub_rate: u.created ? +((u.published / u.created) * 100).toFixed(2) : 0,
            multiplier: u.uploaded ? +(u.created / u.uploaded).toFixed(2) : 0,
          }))
        : INPUT_TYPES.map((t) => ({
            label: t.type,
            uploaded: t.uploaded,
            created: t.created,
            published: t.published,
            pub_rate: t.created ? +((t.published / t.created) * 100).toFixed(2) : 0,
            multiplier: t.uploaded ? +(t.created / t.uploaded).toFixed(2) : 0,
          }));
  const toggleInsights = (key) =>
    setInsightsOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  if (!data) return null;

  return (
    <div className="fade-up">
      <div className="sec-hd">
        <div className="sec-tag">{data.meta.tag}</div>
        <div className="sec-title">{data.meta.title}</div>
        <div className="sec-sub">{data.meta.sub}</div>
      </div>
      <div className="filter-panel">
        <div className="filter-group">
          <div className="filter-group-label">KPI Metric</div>
          <div className="dim-row">
            {kpiOpts.map((o) => (
              <button
                key={o.k}
                className={`dim-opt${kpi === o.k ? " active" : ""}`}
                onClick={() => setKpi(o.k)}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <div className="filter-group-label">Visualisation</div>
          <div className="dim-row">
            {data.viewOptions.map(([k, l]) => (
              <button
                key={k}
                className={`dim-opt${view === k ? " active" : ""}`}
                onClick={() => setView(k)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "bar" && (
        <div className="g2">
          <div className="card" style={{ padding: "14px 16px" }}>
            <div
              style={{
                fontSize: 8,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--ink3)",
                marginBottom: 12,
              }}
            >
              BY INPUT TYPE —{" "}
              {kpiOpts.find((o) => o.k === kpi)?.l.toUpperCase()}
            </div>
            <div style={{ marginBottom: 12, display: "flex", justifyContent: "flex-end" }}>
              <GraphActionButtons
                insightsOpen={!!insightsOpen.inputType}
                onToggleInsights={() => toggleInsights("inputType")}
                onAskAI={() =>
                  onAskAI &&
                  onAskAI("Input Type Breakdown", {
                    metric: kpi,
                    data: inputTypeData,
                  })
                }
              />
            </div>
            <GraphFlip
              flipped={!!insightsOpen.inputType}
              minHeight={260}
              front={
                <>
                  {INPUT_TYPES.slice(0, 8).map((t) => (
                    <BarRow
                      key={t.type}
                      label={t.type}
                      value={getKpiVal(t, kpi)}
                      max={getKpiMax(INPUT_TYPES, kpi)}
                      fillClass={kpi === "pub_rate" ? "bf-amber" : "bf-gold"}
                      extra={kpi === "pub_rate" ? "%" : null}
                    />
                  ))}
                </>
              }
              back={<GraphInsights title="Input Type Breakdown" />}
            />
          </div>
          <div className="card" style={{ padding: "14px 16px" }}>
            <div
              style={{
                fontSize: 8,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--ink3)",
                marginBottom: 12,
              }}
            >
              BY LANGUAGE — {kpiOpts.find((o) => o.k === kpi)?.l.toUpperCase()}
            </div>
            <div style={{ marginBottom: 12, display: "flex", justifyContent: "flex-end" }}>
              <GraphActionButtons
                insightsOpen={!!insightsOpen.language}
                onToggleInsights={() => toggleInsights("language")}
                onAskAI={() =>
                  onAskAI &&
                  onAskAI("Language Breakdown", {
                    metric: kpi,
                    data: languageData,
                  })
                }
              />
            </div>
            <GraphFlip
              flipped={!!insightsOpen.language}
              minHeight={260}
              front={
                <>
                  {LANGUAGES.map((l) => {
                    const v =
                      kpi === "pub_rate"
                        ? parseFloat(((l.published / l.uploaded) * 100).toFixed(1))
                        : l[
                            kpi === "created"
                              ? "created"
                              : kpi === "published"
                                ? "published"
                                : "uploaded"
                          ];
                    return (
                      <BarRow
                        key={l.lang}
                        label={l.lang}
                        value={v}
                        max={
                          kpi === "pub_rate"
                            ? 10
                            : Math.max(
                                ...LANGUAGES.map(
                                  (x) =>
                                    x[
                                      kpi === "created"
                                        ? "created"
                                        : kpi === "published"
                                          ? "published"
                                          : "uploaded"
                                    ],
                                ),
                              )
                        }
                        fillClass={kpi === "pub_rate" ? "bf-amber" : "bf-ink"}
                        extra={kpi === "pub_rate" ? "%" : null}
                      />
                    );
                  })}
                </>
              }
              back={<GraphInsights title="Language Breakdown" />}
            />
          </div>
        </div>
      )}

      {view === "heatmap" && (
        <div className="card" style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--ink3)", marginBottom: 14 }}>
            INPUT TYPE × LANGUAGE — {(kpiOpts.find(o => o.k === kpi)?.l || "Upload Count").toUpperCase()}
          </div>
          <div style={{ marginBottom: 14, display: "flex", justifyContent: "flex-end" }}>
            <GraphActionButtons
              insightsOpen={!!insightsOpen.heatmap}
              onToggleInsights={() => toggleInsights("heatmap")}
              onAskAI={() => onAskAI && onAskAI("Input Type × Language Heatmap", { data: heatData, metric: kpi })}
            />
          </div>
          <GraphFlip
            flipped={!!insightsOpen.heatmap}
            minHeight={340}
            front={(() => {
              // Build per-input-type, per-language aggregates for the selected kpi
              const getVal = (inp, lang) => {
                const inputRow = INPUT_TYPES.find(t => t.type === inp);
                const langRow = LANGUAGES.find(l => l.lang === lang);
                if (!inputRow || !langRow) return 0;
                // Use heatData as base weight to distribute the metric
                const hd = heatData.find(h => h.input === inp && h.lang === lang);
                if (!hd) return 0;
                const totalForInput = heatData.filter(h => h.input === inp).reduce((s, h) => s + h.val, 0);
                const share = totalForInput > 0 ? hd.val / totalForInput : 0;
                const metricVal = kpi === "pub_rate"
                  ? parseFloat(((inputRow.published / inputRow.uploaded) * 100).toFixed(1))
                  : kpi === "created" ? inputRow.created
                  : kpi === "published" ? inputRow.published
                  : inputRow.uploaded;
                return kpi === "pub_rate" ? metricVal : Math.round(metricVal * share);
              };
              const allVals = inputs.flatMap(inp => langs.map(lang => getVal(inp, lang)));
              const maxV = Math.max(...allVals, 1);
              return (
                <div style={{ display: "grid", gridTemplateColumns: `160px repeat(${langs.length},1fr)`, gap: 3 }}>
                  <div />
                  {langs.map(l => (
                    <div key={l} style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--ink3)", paddingBottom: 7 }}>
                      {l.toUpperCase()}
                    </div>
                  ))}
                  {inputs.map(inp => [
                    <div key={`lbl-${inp}`} style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink2)", padding: "5px 0", display: "flex", alignItems: "center" }}>
                      {inp}
                    </div>,
                    ...langs.map(lang => {
                      const v = getVal(inp, lang);
                      const pct = v / maxV;
                      const bg = pct > 0.6 ? "#b87514" : pct > 0.35 ? "#c8941e" : pct > 0.15 ? "#7a4a10" : pct > 0 ? "#3a2008" : "var(--sankey-bg)";
                      const display = kpi === "pub_rate" ? `${v}%` : v > 999 ? `${(v/1000).toFixed(1)}k` : v || "—";
                      return (
                        <div key={`${inp}-${lang}`} style={{ background: bg, height: 36, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: pct > 0.3 ? "rgba(255,255,255,0.9)" : "var(--ink3)", cursor: "pointer", transition: "filter .1s", border: "1px solid var(--line-xs)", borderRadius: 2 }}
                          title={`${inp} × ${lang}: ${display}`}>
                          {display}
                        </div>
                      );
                    }),
                  ])}
                </div>
              );
            })()}
            back={<GraphInsights title="Input Type × Language Heatmap" />}
          />
        </div>
      )}

      {view === "treemap" && (
        <div className="card" style={{ padding: "14px 16px" }}>
          <div
            style={{
              fontSize: 8,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--ink3)",
              marginBottom: 10,
            }}
          >
            INPUT TYPE — UPLOAD VOLUME TREEMAP
          </div>
          <div style={{ marginBottom: 10, display: "flex", justifyContent: "flex-end" }}>
            <GraphActionButtons
              insightsOpen={!!insightsOpen.treemap}
              onToggleInsights={() => toggleInsights("treemap")}
              onAskAI={() =>
                onAskAI &&
                onAskAI("Input Type Upload Volume Treemap", {
                  data: treemapData,
                })
              }
            />
          </div>
          <GraphFlip
            flipped={!!insightsOpen.treemap}
            minHeight={280}
            front={<Treemap data={treemapData} height={280} />}
            back={<GraphInsights title="Input Type Upload Volume Treemap" />}
          />
        </div>
      )}

      {view === "ternary" && (
        <div className="card" style={{ padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--pri)", marginBottom: 4 }}>
                TERNARY / TRIANGULAR ANALYSIS
              </div>
              <div style={{ fontSize: 13, color: "var(--ink3)", lineHeight: 1.5, maxWidth: 600 }}>
                Compare 3 metrics simultaneously. Each point is plotted proportionally across all three axes.
              </div>
            </div>
            <GraphActionButtons
              insightsOpen={!!insightsOpen.ternary}
              onToggleInsights={() => toggleInsights("ternary")}
              onAskAI={() => onAskAI && onAskAI("Ternary Analysis", { dataset: ternDataset, axes: { top: ternTop, left: ternLeft, right: ternRight }, points: ternaryPoints })}
            />
          </div>

          {/* Explainer callout */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16, padding: "12px 14px", background: "rgba(255,71,87,0.05)", border: "1px solid rgba(255,71,87,0.15)", borderRadius: "var(--radius)" }}>
            {[
              { icon: "△", title: "How to read", text: "Each vertex = 100% of that metric. A point near the top vertex scores highest on the top-axis metric." },
              { icon: "⊹", title: "What points mean", text: "A point at the centre scores equally on all 3 axes. Points cluster toward their dominant dimension." },
              { icon: "↔", title: "How to interact", text: "Scroll to zoom · Drag to pan · Double-click to reset. Hover any point for its exact values." },
            ].map(({ icon, title, text }) => (
              <div key={title} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ fontSize: 18, color: "var(--pri)", flexShrink: 0, lineHeight: 1, marginTop: 1 }}>{icon}</div>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--ink2)", marginBottom: 4 }}>{title}</div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--ink4)", lineHeight: 1.5 }}>{text}</div>
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <div>
              <div className="filter-label" style={{ marginBottom: 4 }}>
                Dataset
              </div>
              <select
                value={ternDataset}
                onChange={(e) => setTernDataset(e.target.value)}
              >
                {data.ternaryAxisOptions.dataset.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="filter-label" style={{ marginBottom: 4 }}>
                Top axis
              </div>
              <select
                value={ternTop}
                onChange={(e) => setTernTop(e.target.value)}
              >
                {data.ternaryAxisOptions.common.map((k) => (
                  <option key={k} value={k}>
                    {k.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="filter-label" style={{ marginBottom: 4 }}>
                Left axis
              </div>
              <select
                value={ternLeft}
                onChange={(e) => setTernLeft(e.target.value)}
              >
                {data.ternaryAxisOptions.common.map((k) => (
                  <option key={k} value={k}>
                    {k.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="filter-label" style={{ marginBottom: 4 }}>
                Right axis
              </div>
              <select
                value={ternRight}
                onChange={(e) => setTernRight(e.target.value)}
              >
                {data.ternaryAxisOptions.right.map((k) => (
                  <option key={k} value={k}>
                    {k.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <GraphFlip
            flipped={!!insightsOpen.ternary}
            minHeight={420}
            front={
              <TernaryCanvasChart
                dataset={ternDataset}
                topKey={ternTop}
                leftKey={ternLeft}
                rightKey={ternRight}
                dataMap={data.ternaryDatasets}
              />
            }
            back={<GraphInsights title="Ternary Analysis" />}
          />
        </div>
      )}
    </div>
  );
}

export default SectionMultiDim;
