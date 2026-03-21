// @ts-nocheck
import useJsonData from '@/hooks/useJsonData';
import { useLiveSectionData } from '@/hooks/useDashboardData';
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
  const { data: staticData } = useJsonData("executive");
  const data = useLiveSectionData("executive", dash?.liveDashboard, staticData);
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
      <div className="sub-tabs">
        {SUB_TABS.map(([k, l]) => (
          <div key={k} className={`sub-tab${subView === k ? " active" : ""}`} onClick={() => setSubView(k)}>{l}</div>
        ))}
      </div>

      {/* ── SUMMARY ── */}
      {subView === "summary" && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }} className="stagger">
            {FLASHCARDS.map((card) => (
              <div
                key={card.id}
                className={`card ${card.accent} fade-up`}
                style={{ padding: '24px 26px 22px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                onClick={() => onAskAI && onAskAI(card.label, { value: card.value, sub: card.sub })}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                    {card.label}
                  </div>
                  <span style={{ fontSize: 14, opacity: 0.45 }}>{card.icon}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 36, color: card.color, lineHeight: 1, letterSpacing: '-0.03em', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                  {card.value}
                </div>
                <div style={{ fontSize: 12.5, fontFamily: 'var(--font-ui)', color: 'rgba(255,255,255,0.52)', marginTop: 10, lineHeight: 1.45, letterSpacing: '0.01em' }}>
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
              marginBottom: 28,
              border: "0.5px solid rgba(255,255,255,0.07)",
              borderRadius: 13,
              overflow: "hidden",
              background: "rgba(9,9,9,0.97)",
            }}
          >
            {data.contextStrip.map((s, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  padding: "18px 24px",
                  borderRight: i < 4 ? "0.5px solid rgba(255,255,255,0.06)" : "none",
                }}
              >
                <div
                  style={{
                    fontSize: 11.5,
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.55)",
                    marginBottom: 8,
                    fontWeight: 600,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-sans)',
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
                    fontSize: 12.5,
                    fontFamily: 'var(--font-ui)',
                    color: "rgba(255,255,255,0.52)",
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
      {subView === "signals" && (() => {
        const SIG_COLORS = {
          crit: { accent: "#ff4757", bg: "rgba(255,71,87,0.06)", border: "rgba(255,71,87,0.22)", glow: "rgba(255,71,87,0.18)", num: "#ff6b7a", tag: "rgba(255,107,122,0.90)" },
          warn: { accent: "#ffb340", bg: "rgba(255,179,64,0.06)", border: "rgba(255,179,64,0.22)", glow: "rgba(255,179,64,0.18)", num: "#ffc966", tag: "rgba(255,179,64,0.90)" },
          ok:   { accent: "#3EC98A", bg: "rgba(62,201,138,0.06)", border: "rgba(62,201,138,0.22)", glow: "rgba(62,201,138,0.18)", num: "#3EC98A", tag: "rgba(62,201,138,0.90)" },
          info: { accent: "#5B9BF5", bg: "rgba(91,155,245,0.06)", border: "rgba(91,155,245,0.22)", glow: "rgba(91,155,245,0.18)", num: "#7fb3ff", tag: "rgba(127,179,255,0.90)" },
        };
        return (
          <div style={{ padding: "4px 0" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 3, height: 18, borderRadius: 2, background: "linear-gradient(180deg,#ff4757,#ffb340)" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.70)" }}>
                Strategic Signals
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.30)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "2px 9px" }}>
                {data.strategicSignals.length} active
              </span>
            </div>

            {/* Signal cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.strategicSignals.map((c, idx) => {
                const col = SIG_COLORS[c.type] || SIG_COLORS.info;
                const isOpen = expanded === c.k;
                return (
                  <div
                    key={c.k}
                    onClick={() => setExpanded(isOpen ? null : c.k)}
                    style={{
                      position: "relative",
                      background: col.bg,
                      border: `1px solid ${col.border}`,
                      borderRadius: 12,
                      padding: "18px 20px 16px 24px",
                      cursor: "pointer",
                      overflow: "hidden",
                      transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
                      boxShadow: isOpen ? `0 8px 32px ${col.glow}, inset 0 0 0 1px ${col.border}` : "none",
                      transform: isOpen ? "translateX(4px)" : "translateX(0)",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateX(4px)"; e.currentTarget.style.boxShadow = `0 8px 32px ${col.glow}`; e.currentTarget.style.borderColor = col.accent; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = isOpen ? "translateX(4px)" : "translateX(0)"; e.currentTarget.style.boxShadow = isOpen ? `0 8px 32px ${col.glow}` : "none"; e.currentTarget.style.borderColor = col.border; }}
                  >
                    {/* Left accent bar */}
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: col.accent, borderRadius: "12px 0 0 12px", opacity: isOpen ? 1 : 0.6 }} />

                    {/* Rank badge top-right */}
                    <div style={{ position: "absolute", top: 14, right: 16, fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: col.tag, background: `rgba(${c.type === "ok" ? "62,201,138" : c.type === "warn" ? "255,179,64" : c.type === "info" ? "91,155,245" : "255,71,87"},0.10)`, border: `1px solid ${col.border}`, borderRadius: 20, padding: "3px 10px", textTransform: "uppercase" }}>
                      {c.tag}
                    </div>

                    {/* Hero number + text */}
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6, marginTop: 2, paddingRight: 120 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 38, fontWeight: 700, lineHeight: 1, color: col.num, letterSpacing: "-0.02em" }}>
                        {c.num}
                      </span>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 400, color: "rgba(255,255,255,0.80)", lineHeight: 1.35 }}>
                        {c.text}
                      </span>
                    </div>

                    {/* Stat line */}
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "rgba(255,255,255,0.48)", letterSpacing: "0.01em", marginBottom: isOpen && c.expand ? 10 : 0 }}>
                      {c.stat}
                    </div>

                    {/* Expanded detail */}
                    {isOpen && c.expand && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${col.border}`, fontFamily: "var(--font-ui)", fontSize: 13, color: "rgba(255,255,255,0.62)", lineHeight: 1.6 }}>
                        {c.expand}
                      </div>
                    )}

                    {/* Expand hint */}
                    <div style={{ position: "absolute", bottom: 12, right: 16, fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.22)", letterSpacing: "0.06em" }}>
                      {isOpen ? "▲ COLLAPSE" : "▼ EXPAND"}
                    </div>

                    {/* Subtle bg glow orb */}
                    <div style={{ position: "absolute", right: -30, bottom: -30, width: 100, height: 100, borderRadius: "50%", background: col.accent, filter: "blur(40px)", opacity: 0.06, pointerEvents: "none" }} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── CHANNELS ── */}
      {subView === "channels" && (
        <>
          <div className="card card-gold" style={{ padding: 0, marginBottom: 16 }}>
            <div className="card-head">
              <span className="card-lbl">Monthly Upload vs Creation Volume</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", fontFamily: "var(--font-sans)", letterSpacing: "0.01em" }}>
                  Mar 2025 – Feb 2026
                </span>
                <span style={{ fontSize: 11, color: "rgba(48,209,88,0.80)", background: "rgba(48,176,96,0.07)", padding: "3px 9px", borderRadius: 5, border: "0.5px solid rgba(48,176,96,0.18)", fontWeight: 400, fontFamily: "var(--font-sans)" }}>
                  {data.monthlyChart.badge}
                </span>
                <GraphActionButtons
                  insightsOpen={!!insightsOpen.monthly}
                  onToggleInsights={() => toggleInsights("monthly")}
                  onAskAI={() => onAskAI && onAskAI("Monthly Upload vs Creation Volume", MONTHLY_DATA)}
                />
              </div>
            </div>
            <div style={{ padding: "16px 22px 14px" }}>
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
          <div className="card" style={{ padding: 0 }}>
            <div className="card-head">
              <span className="card-lbl">Content Status Split</span>
              <GraphActionButtons
                insightsOpen={!!insightsOpen.status}
                onToggleInsights={() => toggleInsights("status")}
                onAskAI={() => onAskAI && onAskAI("Content Status Split", { segments: statusDonut })}
              />
            </div>
            <GraphFlip
              flipped={!!insightsOpen.status}
              minHeight={320}
              front={
                <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "24px 24px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <DonutChart segments={statusDonut} size={190} label="111" sub="published" />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {statusDonut.map((s) => (
                      <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 8, height: 8, background: s.color, borderRadius: "50%", flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontFamily: "var(--font-sans)", color: "rgba(255,255,255,0.50)", flex: 1 }}>{s.label}</span>
                        <span style={{ fontSize: 14, fontFamily: "var(--font-sans)", color: "rgba(255,255,255,0.82)", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{s.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              }
              back={<GraphInsights title="Content Status Split" />}
            />
          </div>
          <div className="card" style={{ padding: 0 }}>
            <div className="card-head">
              <span className="card-lbl">Input Type Radar</span>
              <GraphActionButtons
                insightsOpen={!!insightsOpen.radar}
                onToggleInsights={() => toggleInsights("radar")}
                onAskAI={() => onAskAI && onAskAI("Input Type Radar", { data: inputRadarData })}
              />
            </div>
            <GraphFlip
              flipped={!!insightsOpen.radar}
              minHeight={320}
              front={
                <div style={{ padding: "20px 16px 16px", display: "flex", justifyContent: "center" }}>
                  <RadarChart data={inputRadarData} size={300} />
                </div>
              }
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
