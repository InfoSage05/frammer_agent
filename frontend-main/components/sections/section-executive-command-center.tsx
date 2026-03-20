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
  const TOTAL_CREATED = data?.totals?.totalCreated || 0;
  const MULTIPLIER = data?.totals?.multiplier || 0;
  const TOTAL_UPLOADED = data?.totals?.totalUploaded || 0;
  const TOTAL_PUBLISHED = data?.totals?.totalPublished || 0;
  const PUBLISH_RATE = data?.totals?.publishRate || 0;
  const zp = MONTHLY_DATA.filter((m) => m.published === 0).length;
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
  const ZERO_PUB_MONTHS = 3;
  const TOP_CHANNEL = 'Ch-A';
  const PEAK_MONTH = "Feb '26";
  const PEAK_COUNT = 2756;
  const CONTENT_GAP = TOTAL_CREATED - TOTAL_PUBLISHED;
  const PROCESS_RATE = Math.round((TOTAL_CREATED / TOTAL_UPLOADED) * 100);

  const FLASHCARDS = [
    {
      id: 'ai_outputs', label: 'AI OUTPUTS CREATED', value: TOTAL_CREATED.toLocaleString(),
      sub: `${MULTIPLIER}× input-to-output ratio`, color: 'var(--amber-lt)',
      spark: MONTHLY_DATA.map(m => m.created), accent: 'card-amber', icon: '⊹',
    },
    {
      id: 'uploaded', label: 'TOTAL UPLOADED', value: TOTAL_UPLOADED.toLocaleString(),
      sub: '807 hrs source footage', color: 'var(--ink2)',
      spark: MONTHLY_DATA.map(m => m.uploaded), accent: '', icon: '↑',
    },
    {
      id: 'published', label: 'PUBLISHED', value: TOTAL_PUBLISHED.toLocaleString(),
      sub: 'distributed to platforms', color: 'var(--green-lt)',
      spark: MONTHLY_DATA.map(m => m.published), accent: 'card-green', icon: '✓',
    },
    {
      id: 'pub_rate', label: 'PUBLISH RATE', value: `${PUBLISH_RATE}%`,
      sub: '⚠ below 10% benchmark', color: 'var(--red-lt)',
      spark: null, accent: 'card-red', icon: '⚑',
    },
    {
      id: 'process_rate', label: 'PROCESS RATE', value: `${PROCESS_RATE}%`,
      sub: 'uploads → AI outputs', color: 'var(--amber-lt)',
      spark: null, accent: 'card-amber', icon: '⚙',
    },
    {
      id: 'content_gap', label: 'CONTENT GAP', value: CONTENT_GAP.toLocaleString(),
      sub: 'AI outputs never distributed', color: 'var(--red-lt)',
      spark: null, accent: 'card-red', icon: '△',
    },
    {
      id: 'active_channels', label: 'ACTIVE CHANNELS', value: '18 / 18',
      sub: '100% channel coverage', color: 'var(--green-lt)',
      spark: null, accent: 'card-green', icon: '◈',
    },
    {
      id: 'active_users', label: 'ACTIVE USERS', value: `${ACTIVE_USERS} / 45`,
      sub: '1 zero-upload user (Sumit)', color: 'var(--ink2)',
      spark: null, accent: '', icon: '⊞',
    },
    {
      id: 'peak_month', label: 'PEAK MONTH', value: PEAK_MONTH,
      sub: `${PEAK_COUNT.toLocaleString()} outputs · +194% MoM`, color: 'var(--amber-lt)',
      spark: null, accent: 'card-amber', icon: '⬆',
    },
    {
      id: 'zero_pub_months', label: 'ZERO-PUB MONTHS', value: `${ZERO_PUB_MONTHS} / 12`,
      sub: 'Mar, Jul, Sep 2025 gaps', color: 'var(--red-lt)',
      spark: null, accent: 'card-red', icon: '⊘',
    },
  ];

  const SUB_TABS = [
    ["summary", "Summary"],
    ["signals", "Signals"],
    ["channels", "Channels"],
    ["content_mix", "Content Mix"],
  ];

  return (
    <div className="fade-up">
      <div className="sec-hd">
        <div className="sec-tag">
          {data.meta.tag}
        </div>
        <div className="sec-title">{data.meta.title}</div>
        <div className="sec-sub">
          {data.meta.sub}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="sub-tabs">
        {SUB_TABS.map(([k, l]) => (
          <div key={k} className={`sub-tab${subView === k ? " active" : ""}`} onClick={() => setSubView(k)}>{l}</div>
        ))}
      </div>

      {/* ── SUMMARY ── */}
      {subView === "summary" && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 18 }} className="stagger">
            {FLASHCARDS.map((card, idx) => (
              <div
                key={card.id}
                className={`card ${card.accent} fade-up`}
                style={{ padding: '14px 15px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                onClick={() => onAskAI && onAskAI(card.label, { value: card.value, sub: card.sub })}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink4)' }}>
                    {card.label}
                  </div>
                  <span style={{ fontSize: 11, opacity: 0.5 }}>{card.icon}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, color: card.color, lineHeight: 1, letterSpacing: '-0.01em' }}>
                  {card.value}
                </div>
                <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--ink4)', marginTop: 5, lineHeight: 1.3 }}>
                  {card.sub}
                </div>
                {card.spark && (
                  <div style={{ marginTop: 8 }}>
                    <Sparkline data={card.spark} max={Math.max(...card.spark)} color={card.color} h={20} />
                  </div>
                )}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: card.color, opacity: 0.25 }} />
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
                  padding: "10px 16px",
                  borderRight: i < 4 ? "1px solid var(--line-lt)" : "none",
                }}
              >
                <div
                  style={{
                    fontSize: 6.5,
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--ink4)",
                    marginBottom: 5,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 17,
                    color: "var(--ink)",
                    lineHeight: 1,
                  }}
                >
                  {s.v}
                </div>
                <div
                  style={{
                    fontSize: 8,
                    fontFamily: "var(--font-mono)",
                    color: "var(--ink4)",
                    marginTop: 4,
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
                fontSize: 7,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--pri)",
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
                  MONTHLY UPLOAD vs CREATION VOLUME
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
                    fontSize: 9.5,
                    color: "var(--ink4)",
                    fontFamily: "var(--font-mono)",
                    marginTop: 2,
                  }}
                >
                  Mar 2025 – Feb 2026 · hover bars for details
                </div>
              </div>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "var(--green)",
                  background: "rgba(48,176,96,0.1)",
                  padding: "2px 7px",
                  borderRadius: 3,
                  border: "1px solid rgba(48,176,96,0.2)",
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
                        <span style={{ fontSize: 12 }}>{l}</span>
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
                  fontSize: 8,
                  fontFamily: "var(--font-mono)",
                  color: "var(--ink4)",
                  letterSpacing: "0.06em",
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
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--ink3)", marginBottom: 10 }}>
              CONTENT STATUS SPLIT
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
                        <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--ink2)", flex: 1, minWidth: 0 }}>{s.label}</span>
                        <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--ink3)", fontWeight: 600 }}>{s.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              }
              back={<GraphInsights title="Content Status Split" />}
            />
          </div>
          <div className="card" style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--ink3)", marginBottom: 6 }}>
              INPUT TYPE RADAR (UPLOADS)
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
