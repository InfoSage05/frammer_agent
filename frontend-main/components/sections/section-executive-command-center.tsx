// @ts-nocheck
import useJsonData from '@/hooks/useJsonData';
import { useState, useEffect } from "react";
import Sparkline from "../charts/Sparkline";
import Ring from "../charts/Ring";
import StackedBarChart from "../charts/StackedBarChart";
import ChannelTable from "../charts/ChannelTable";
import DonutChart from "../charts/DonutCharts";
import RadarChart from "../charts/RadarChart";
import Drawer from "../ui/DrawerChannelDetails";
import GraphActionButtons from "../ui/GraphActionButtons";
import GraphFlip from "../ui/GraphFlip";
import GraphInsights from "../ui/GraphInsights";
import TrustBadge from '@/components/ui/TrustBadge';
import SectionInfoHint from '@/components/ui/SectionInfoHint';
import { useDash } from '@/lib/contexts';
import { M } from '@/lib/constants';

function SectionExecutive({ addToast, theme, onAskAI }) {
  const dash = useDash();
  const { data } = useJsonData("executive");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCh, setDrawerCh] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [insightsOpen, setInsightsOpen] = useState({});
  const [subView, setSubView] = useState("summary");
  const MONTHLY_DATA = data?.monthlyData || [];
  const INPUT_TYPES = data?.inputTypes || [];
  const CHANNELS = data?.channels || [];
  const TOTAL_UPLOADED = data?.totals?.totalUploaded || 0;
  const TOTAL_PUBLISHED = data?.totals?.totalPublished || 0;
  const PUBLISH_RATE = data?.totals?.publishRate || 0;
  const toggleInsights = (key) =>
    setInsightsOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    if (!data?.toasts?.length) return;
    const timers = data.toasts.map((toast) =>
      setTimeout(
        () => addToast(toast.text, toast.tone, toast.title),
        toast.delay,
      ),
    );
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [addToast, data]);

  const statusDonut = data?.statusDonut || [];
  const inputRadarData = INPUT_TYPES.slice(0, 6).map((t) => ({
    label: t.type.substring(0, 8),
    value: t.uploaded,
  }));

  if (!data) return null;

  // Derive flashcard data
  const ACTIVE_USERS = 44;
  const PEAK_MONTH = "Feb '26";
  const PEAK_COUNT = 2756;

  const FLASHCARDS = [
    {
      id: 'uploaded', label: 'TOTAL UPLOADED', value: TOTAL_UPLOADED.toLocaleString(),
      sub: '807 hrs source footage', color: 'var(--ink)',
      spark: MONTHLY_DATA.map(m => m.uploaded), accent: '', icon: '↑',
    },
    {
      id: 'published', label: 'PUBLISHED', value: TOTAL_PUBLISHED.toLocaleString(),
      sub: 'distributed to platforms', color: 'var(--suc-lt)',
      spark: MONTHLY_DATA.map(m => m.published), accent: 'card-green', icon: '✓',
    },
    {
      id: 'pub_rate', label: 'PUBLISH RATE', value: `${PUBLISH_RATE}%`,
      sub: '⚠ below 10% benchmark', color: 'var(--dan-lt)',
      spark: null, accent: 'card-red', icon: '⚑',
    },
    {
      id: 'active_channels', label: 'ACTIVE CHANNELS', value: '18 / 18',
      sub: '100% channel coverage', color: 'var(--suc-lt)',
      spark: null, accent: 'card-green', icon: '◈',
    },
    {
      id: 'active_users', label: 'ACTIVE USERS', value: `${ACTIVE_USERS} / 45`,
      sub: '1 zero-upload user (Sumit)', color: 'var(--ink)',
      spark: null, accent: '', icon: '⊞',
    },
    {
      id: 'peak_month', label: 'PEAK MONTH', value: PEAK_MONTH,
      sub: `${PEAK_COUNT.toLocaleString()} outputs · +194% MoM`, color: 'var(--amber-lt)',
      spark: null, accent: 'card-amber', icon: '⬆',
    },
  ];

  const SUB_TABS = [
    ["summary", "Summary"],
    ["signals", "Signals"],
    ["channels", "Channels"],
    ["content_mix", "Content Mix"],
  ];

  const SIGNALS = {
    summary: {
      a: <><span className="sig-val">{TOTAL_PUBLISHED.toLocaleString()}</span> videos published from <span className="sig-val">{TOTAL_UPLOADED.toLocaleString()}</span> uploads — publish rate at <span className="sig-warn">{PUBLISH_RATE}%</span>, below the 10% benchmark.</>,
      b: <><span className="sig-val">{ACTIVE_USERS} / 45</span> users active, peak month <span className="sig-pos">Feb '26</span> with <span className="sig-val">{PEAK_COUNT.toLocaleString()}</span> outputs.</>,
    },
    signals: {
      a: <>3 <span className="sig-warn">critical operational gaps</span> detected this period — zero-publish months in <span className="sig-warn">Mar, Jul, Sep 2025</span>.</>,
      b: <>Publish rate trending down in Q4 — <span className="sig-warn">1 user</span> with 400+ creations and zero publications flagged.</>,
    },
    channels: {
      a: <><span className="sig-val">18 / 18</span> channels active with 100% coverage — <span className="sig-val">Ch-A</span> leads with highest output volume this period.</>,
      b: <>4 channels show below-average publish rates — heatmap reveals uneven platform distribution.</>,
    },
    content_mix: {
      a: <>Short-form dominates at <span className="sig-val">68%</span> of created output — long-form at <span className="sig-warn">3%</span> publish rate, the lowest tier.</>,
      b: <>Docs and podcast formats account for <span className="sig-warn">near-zero</span> publications despite consistent upload volume.</>,
    },
  };

  const sig = SIGNALS[subView] || SIGNALS.summary;

  return (
    <div className="fade-up">
      <div className="sig-block">
        <p className="sig-line">{sig.a}</p>
        <p className="sig-line">{sig.b}</p>
      </div>

      <div className="sub-tabs">
        {SUB_TABS.map(([k, l]) => (
          <div key={k} className={`sub-tab${subView === k ? " active" : ""}`} onClick={() => setSubView(k)}>{l}</div>
        ))}
      </div>

      {/* ── SUMMARY ── */}
      {subView === "summary" && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }} className="stagger">
            {FLASHCARDS.map((card) => (
              <div
                key={card.id}
                className={`card ${card.accent} fade-up`}
                style={{ padding: '20px 22px 18px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                onClick={() => onAskAI && onAskAI(card.label, { value: card.value, sub: card.sub })}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', fontWeight: 400 }}>
                    {card.label}
                  </div>
                  <span style={{ fontSize: 13, opacity: 0.25 }}>{card.icon}</span>
                </div>
                <div style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif', fontSize: 36, color: card.color, lineHeight: 1, letterSpacing: '-0.03em', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                  {card.value}
                </div>
                <div style={{ fontSize: 11.5, fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif', color: 'rgba(255,255,255,0.25)', marginTop: 10, lineHeight: 1.45, letterSpacing: '0.01em' }}>
                  {card.sub}
                </div>
                {card.spark && (
                  <div style={{ marginTop: 14 }}>
                    <Sparkline data={card.spark} max={Math.max(...card.spark)} color={card.color} h={24} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Context strip */}
          <div
            style={{
              display: "flex",
              gap: 0,
              marginBottom: 20,
              border: "1px solid var(--line)",
              borderRadius: "var(--radius)",
              overflow: "hidden",
              background: "var(--bg2)",
            }}
          >
            {data.contextStrip.map((s, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  padding: "14px 20px",
                  borderRight: i < 4 ? "1px solid var(--line-lt)" : "none",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif',
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.22)",
                    marginBottom: 8,
                    fontWeight: 400,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif',
                    fontSize: 20,
                    color: "var(--ink)",
                    lineHeight: 1,
                    fontWeight: 500,
                    letterSpacing: '-0.02em',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {s.v}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif',
                    color: "rgba(255,255,255,0.25)",
                    marginTop: 6,
                    lineHeight: 1.4,
                    letterSpacing: '0.01em',
                  }}
                >
                  {s.sub}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── SIGNALS ── */}
      {subView === "signals" && (
        <>
          <div className="smart-actions" style={{ marginBottom: 20 }}>
            <button className="action-chip danger" onClick={() => dash?.startInvestigation?.('pub_gap')}>⚑ Investigate publish gap</button>
            <button className="action-chip" onClick={() => dash?.openCompare?.('channel', 'A', 'channel', 'D')}>⇔ Compare Ch-A vs Ch-D</button>
            <button className="action-chip" onClick={() => dash?.openCompare?.('period', 'H1', 'period', 'H2')}>⇔ H1 vs H2 comparison</button>
          </div>
          <div className="card" style={{ padding: "16px 18px" }}>
            <div
              style={{
                fontSize: 11,
                fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif',
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "rgba(232,100,80,0.80)",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
                borderBottom: "1px solid var(--line-lt)",
                paddingBottom: 9,
              }}
            >
              ⚡ STRATEGIC SIGNALS
            </div>
            {data.strategicSignals.map((c) => (
              <div
                key={c.k}
                className={`callout callout-${c.type}`}
                onClick={() => setExpanded(expanded === c.k ? null : c.k)}
                style={{ marginBottom: 8 }}
              >
                <div className="c-tag">{c.tag}</div>
                <div className="c-text">
                  <span className="c-num">{c.num}</span>
                  {c.text}
                  {expanded === c.k && c.expand && (
                    <span style={{ color: "var(--ink3)" }}> {c.expand}</span>
                  )}
                </div>
                <div className="c-stat">{c.stat}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── CHANNELS ── */}
      {subView === "channels" && (
        <>
          <div className="card card-gold" style={{ padding: "16px 18px", marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 14,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif',
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.22)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  Monthly Upload vs Creation Volume
                  <GraphActionButtons
                    insightsOpen={!!insightsOpen.monthly}
                    onToggleInsights={() => toggleInsights("monthly")}
                    onAskAI={() =>
                      onAskAI &&
                      onAskAI("Monthly Upload vs Creation Volume", MONTHLY_DATA)
                    }
                  />
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "rgba(255,255,255,0.25)",
                    fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif',
                    marginTop: 2,
                    letterSpacing: '0.01em',
                  }}
                >
                  Mar 2025 – Feb 2026 · hover bars for details
                </div>
              </div>
              <span
                style={{
                  fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif',
                  fontSize: 11,
                  color: "rgba(48,209,88,0.80)",
                  background: "rgba(48,176,96,0.08)",
                  padding: "3px 8px",
                  borderRadius: 4,
                  border: "0.5px solid rgba(48,176,96,0.18)",
                  fontWeight: 400,
                }}
              >
                {data.monthlyChart.badge}
              </span>
            </div>
            <GraphFlip
              flipped={!!insightsOpen.monthly}
              minHeight={280}
              front={
                <>
                  <StackedBarChart data={MONTHLY_DATA} height={240} theme={theme} />
                  <div className="legend" style={{ marginTop: 12, gap: 16 }}>
                    {data.monthlyChart.legend.map(([l, c]) => (
                      <div key={l} className="leg-item">
                        <div className="leg-dot" style={{ background: c, width: 10, height: 10, borderRadius: 2 }} />
                        <span>{l}</span>
                      </div>
                    ))}
                  </div>
                </>
              }
              back={<GraphInsights title="Monthly Upload vs Creation Volume" />}
            />
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div className="card-head">
              <span className="card-lbl">Channel Efficiency Matrix</span>
              <GraphActionButtons
                insightsOpen={!!insightsOpen.channelMatrix}
                onToggleInsights={() => toggleInsights("channelMatrix")}
                onAskAI={() =>
                  onAskAI &&
                  onAskAI("Channel Efficiency Matrix", {
                    channels: CHANNELS,
                  })
                }
              />
              <span
                style={{
                  fontSize: 11.5,
                  fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif',
                  color: "rgba(255,255,255,0.25)",
                  letterSpacing: "0.01em",
                }}
              >
                Click row for deep-dive →
              </span>
            </div>
            <GraphFlip
              flipped={!!insightsOpen.channelMatrix}
              minHeight={280}
              front={
                <div style={{ padding: "7px 0" }}>
                  <ChannelTable
                    channels={CHANNELS}
                    onRowClick={(ch) => {
                      setDrawerCh(ch);
                      setDrawerOpen(true);
                    }}
                  />
                </div>
              }
              back={<GraphInsights title="Channel Efficiency Matrix" />}
            />
          </div>
        </>
      )}

      {/* ── CONTENT MIX ── */}
      {subView === "content_mix" && (
        <div className="g2">
          <div className="card" style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: 11, fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif', letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", marginBottom: 10, fontWeight: 400 }}>
              Content Status Split
            </div>
            <div style={{ marginBottom: 10, display: "flex", justifyContent: "flex-end" }}>
              <GraphActionButtons
                insightsOpen={!!insightsOpen.status}
                onToggleInsights={() => toggleInsights("status")}
                onAskAI={() => onAskAI && onAskAI("Content Status Split", { segments: statusDonut })}
              />
            </div>
            <GraphFlip
              flipped={!!insightsOpen.status}
              minHeight={220}
              front={
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <DonutChart segments={statusDonut} size={130} label="111" sub="published" />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {statusDonut.map((s) => (
                      <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 10, height: 10, background: s.color, borderRadius: 2, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", flex: 1, minWidth: 0 }}>{s.label}</span>
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.78)", fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{s.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              }
              back={<GraphInsights title="Content Status Split" />}
            />
          </div>
          <div className="card" style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: 11, fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif', letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", marginBottom: 6, fontWeight: 400 }}>
              Input Type Radar
            </div>
            <div style={{ marginBottom: 6, display: "flex", justifyContent: "flex-end" }}>
              <GraphActionButtons
                insightsOpen={!!insightsOpen.radar}
                onToggleInsights={() => toggleInsights("radar")}
                onAskAI={() => onAskAI && onAskAI("Input Type Radar", { data: inputRadarData })}
              />
            </div>
            <GraphFlip
              flipped={!!insightsOpen.radar}
              minHeight={280}
              front={<RadarChart data={inputRadarData} size={240} />}
              back={<GraphInsights title="Input Type Radar" />}
            />
          </div>
        </div>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        channel={drawerCh}
      />
    </div>
  );
}

export default SectionExecutive;
