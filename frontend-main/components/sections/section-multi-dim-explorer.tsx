// @ts-nocheck
import useJsonData from '@/hooks/useJsonData';
import { useState } from "react";
import BarRow from "../charts/BarRow";
import Treemap from "../charts/Treemap";
import GraphActionButtons from "../ui/GraphActionButtons";
import GraphFlip from "../ui/GraphFlip";
import GraphInsights from "../ui/GraphInsights";
import SectionInfoHint from '@/components/ui/SectionInfoHint';
import { useDash } from '@/lib/contexts';
import { M } from '@/lib/constants';

function SectionMultiDim({ theme, onAskAI }) {
  const dash = useDash();
  const { data } = useJsonData("multidim");
  const [kpi, setKpi] = useState("uploaded");
  const [view, setView] = useState("bar");
  const [insightsOpen, setInsightsOpen] = useState({});
  const INPUT_TYPES = data?.inputTypes || [];
  const LANGUAGES = data?.languages || [];
  const kpiOpts = data?.kpiOptions || [];
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
  const toggleInsights = (key) =>
    setInsightsOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  if (!data) return null;

  return (
    <div className="fade-up">
      <p className="sig-line">Video drives <span className="sig-val">61%</span> of uploads — publish rate varies from <span className="sig-warn">0%</span> to <span className="sig-pos">8.4%</span> across content types</p>
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
    </div>
  );
}

export default SectionMultiDim;
