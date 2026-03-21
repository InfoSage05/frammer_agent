// @ts-nocheck
import useJsonData from '@/hooks/useJsonData';
import { useLiveSectionData } from '@/hooks/useDashboardData';
import { useDash } from '@/lib/contexts';
import { M } from '@/lib/constants';
import { useState } from 'react';
import Ring from '../charts/Ring';
import GraphActionButtons from '../ui/GraphActionButtons';
import GraphFlip from '../ui/GraphFlip';
import GraphInsights from '../ui/GraphInsights';

function SectionClient({ onClose, onAskAI }) {
  const dash = useDash();
  const { data } = useJsonData("client");
  const { data: explorerData } = useJsonData("explorer");
  const CHANNELS = data?.channels || [];
  const [subView, setSubView] = useState("overview");
  const [insightsOpen, setInsightsOpen] = useState({});
  const toggleInsights = (key) => setInsightsOpen(prev => ({ ...prev, [key]: !prev[key] }));

  const dataQualityRows = explorerData?.dataQualityRows || [];

  if (!data) return null;

  const SUB_TABS = [
    ["overview", "Overview"],
    ["quality", "Data Quality"],
  ];

  return (
    <div className="fade-up" style={{ padding: "0 0 80px" }}>
      {/* Premium header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "28px 32px 0", marginBottom: 0,
      }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(232,67,45,0.85)", marginBottom: 6, fontFamily: "var(--font-sans)" }}>
            CLIENT INTELLIGENCE
          </div>
          <div style={{ fontSize: 22, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.02em", fontFamily: "var(--font-sans)" }}>
            Account Overview
          </div>
        </div>
        {onClose && (
          <button className="ctrl-btn" onClick={onClose} style={{ fontSize: 11 }}>← Back</button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="sub-tabs" style={{ margin: "20px 32px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {SUB_TABS.map(([k, l]) => (
          <div
            key={k}
            className={`sub-tab${subView === k ? " active" : ""}`}
            onClick={() => setSubView(k)}
          >
            {l}
          </div>
        ))}
      </div>

      <div className="stack" style={{ padding: "28px 32px 0" }}>

        {subView === "overview" && (
          <>
            <div className="g4 stagger">
              {data.summaryCards.map((m) => (
                <div
                  key={m.l}
                  className="card card-gold fade-up"
                  style={{ padding: "20px 22px" }}
                >
                  <div style={{
                    fontSize: 11, fontFamily: "var(--font-sans)", color: "rgba(255,255,255,0.35)",
                    letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 10,
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <span style={{ color: "var(--pri)", fontSize: 12 }}>{m.icon}</span>
                    {m.l}
                  </div>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: 28, color: m.c, lineHeight: 1, fontWeight: 400 }}>
                    {m.v}
                  </div>
                </div>
              ))}
            </div>

            <div className="g2">
              <div className="card" style={{ padding: "20px 22px" }}>
                <div style={{
                  fontSize: 11, fontFamily: "var(--font-sans)", letterSpacing: "0.04em",
                  textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 16,
                }}>
                  Pipeline Summary
                </div>
                {data.pipelineSummary.map((r) => (
                  <div key={r.l} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--line-lt)" }}>
                    <span style={{ fontSize: 12, fontFamily: "var(--font-sans)", color: "rgba(255,255,255,0.45)", minWidth: 148 }}>{r.l}</span>
                    <div style={{ flex: 1, height: 5, background: "var(--sankey-bg)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(r.pct, 100)}%`, height: "100%", background: r.color, borderRadius: 3, transition: "width 0.6s cubic-bezier(.4,0,.2,1)" }} />
                    </div>
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500, color: r.color, minWidth: 56, textAlign: "right" }}>{r.v}</span>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding: "20px 22px" }}>
                <div style={{
                  fontSize: 11, fontFamily: "var(--font-sans)", letterSpacing: "0.04em",
                  textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 16,
                }}>
                  Key Signals
                </div>
                {(data.keySignals || []).map((signal) => (
                  <div key={signal.tag} className={`callout callout-${signal.type}`} style={{ marginBottom: 10 }}>
                    <div className="c-tag">{signal.tag}</div>
                    <div className="c-text">{signal.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: "20px 22px" }}>
              <div style={{
                fontSize: 11, fontFamily: "var(--font-sans)", letterSpacing: "0.04em",
                textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 16,
              }}>
                Channel Breakdown
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(100px,1fr))", gap: 10 }}>
                {CHANNELS.map((ch) => {
                  const rate = (ch.published / ch.uploaded) * 100;
                  const col = rate >= 10 ? "var(--green)" : rate >= 5 ? "var(--pri)" : rate >= 1 ? "var(--warn)" : "var(--red-lt)";
                  return (
                    <div key={ch.ch} style={{ background: "var(--sankey-bg)", border: "1px solid var(--line-lt)", borderRadius: "var(--radius)", padding: "14px 12px", textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 500, color: "var(--ink)", marginBottom: 6 }}>Ch-{ch.ch}</div>
                      <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: col, marginBottom: 4, fontWeight: 500 }}>{rate.toFixed(1)}%</div>
                      <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "rgba(255,255,255,0.30)" }}>{ch.uploaded} up</div>
                      <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: ch.published > 0 ? "var(--pri)" : "var(--red-lt)" }}>{ch.published} pub</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {subView === "quality" && (
          <div className="card" style={{ padding: "24px 28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--pri)", marginBottom: 4, fontFamily: "var(--font-sans)" }}>
                  Data Quality Layer
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-sans)" }}>
                  Monitoring coverage, integrity, and validity across 4,453 records
                </div>
              </div>
              <GraphActionButtons
                insightsOpen={!!insightsOpen.dataQuality}
                onToggleInsights={() => toggleInsights("dataQuality")}
                onAskAI={() => onAskAI && onAskAI("Data Quality Layer", { rings: explorerData?.completenessRings, rows: dataQualityRows })}
              />
            </div>
            <GraphFlip
              flipped={!!insightsOpen.dataQuality}
              minHeight={400}
              front={<>
                {explorerData && (
                  <div style={{ display: "flex", alignItems: "center", gap: 40, padding: "16px 24px", background: "var(--bg3)", borderRadius: "var(--radius)", marginBottom: 24, flexWrap: "wrap" }}>
                    {(explorerData.completenessRings || []).map((ring) => (
                      <Ring key={ring.label} pct={ring.pct} color={ring.color} label={ring.label} size={ring.size} />
                    ))}
                    <div style={{ marginLeft: "auto", display: "flex", gap: 20 }}>
                      {[
                        { l: "Critical Issues", v: dataQualityRows.filter(r => r.severity === "critical").length, c: "var(--red-lt)" },
                        { l: "Warnings", v: dataQualityRows.filter(r => r.severity === "warning").length, c: "var(--amber-lt)" },
                        { l: "Total Checks", v: dataQualityRows.length, c: "rgba(255,255,255,0.45)" },
                      ].map(s => (
                        <div key={s.l} style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "var(--font-sans)", fontSize: 22, fontWeight: 500, color: s.c, lineHeight: 1 }}>{s.v}</div>
                          <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "rgba(255,255,255,0.28)", letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 5 }}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {dataQualityRows.map((row) => (
                    <div key={row.l} style={{ padding: "16px 18px", border: "1px solid var(--line-lt)", borderRadius: "var(--radius)", background: "var(--bg3)", borderLeft: `3px solid ${row.c}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontFamily: "var(--font-sans)", fontWeight: 500, color: "var(--ink)" }}>{row.l}</span>
                          {row.severity && (
                            <span style={{
                              fontSize: 10, fontFamily: "var(--font-sans)", letterSpacing: "0.06em", padding: "2px 7px", borderRadius: 3,
                              background: row.severity === "critical" ? "rgba(255,71,87,0.1)" : "rgba(224,168,56,0.1)",
                              color: row.severity === "critical" ? "var(--red-lt)" : "var(--amber-lt)",
                              border: `1px solid ${row.severity === "critical" ? "rgba(255,71,87,0.22)" : "rgba(224,168,56,0.22)"}`,
                              textTransform: "uppercase",
                            }}>
                              {row.severity === "critical" ? "⚑ Critical" : "⚠ Warning"}
                            </span>
                          )}
                        </div>
                        <span style={{ fontFamily: "var(--font-sans)", fontSize: 20, fontWeight: 500, color: row.c, flexShrink: 0, marginLeft: 12 }}>{row.v}</span>
                      </div>
                      {row.pct != null && (
                        <div style={{ height: 4, background: "var(--line)", borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
                          <div style={{ width: `${Math.min(row.pct, 100)}%`, height: "100%", background: row.c, borderRadius: 3, transition: "width 0.5s cubic-bezier(.4,0,.2,1)" }} />
                        </div>
                      )}
                      {row.detail && (
                        <div style={{ fontSize: 12, fontFamily: "var(--font-sans)", color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>{row.detail}</div>
                      )}
                    </div>
                  ))}
                </div>
              </>}
              back={<GraphInsights title="Data Quality Layer" />}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default SectionClient;
