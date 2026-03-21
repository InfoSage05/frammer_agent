// @ts-nocheck
import useChartJs from '@/components/charts/ChartJSWrapper';
import useJsonData from '@/hooks/useJsonData';
import { useState, useRef, useEffect } from "react";
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

/* ─────────────────────────────────────────────────────────────
   By Channel — premium redesign
───────────────────────────────────────────────────────────── */
function ByChannelTab({ channels }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [fTip, setFTip] = useState(null);
  const gaugeArcRef = useRef(null);
  const gaugeGlowRef = useRef(null);
  const funnelContainerRef = useRef(null);

  const ch = channels[selectedIdx] || channels[0];
  if (!ch) return null;

  const pubRate = (ch.published / ch.uploaded) * 100;
  const isGreen = pubRate >= 5;
  const TC = isGreen ? "#3EC98A" : "#ff4757";
  const aiMult = ch.created / ch.uploaded;
  const aiExpPct = Math.round((aiMult - 1) * 100);
  const pubDropPct = ch.created > 0 ? (1 - ch.published / ch.created) * 100 : 0;
  const CIRC = 2 * Math.PI * 54;

  // Gauge animation
  useEffect(() => {
    if (!gaugeArcRef.current || !gaugeGlowRef.current) return;
    const pct = Math.min(pubRate / 100, 1);
    const target = CIRC * (1 - pct);
    gaugeArcRef.current.style.transition = "none";
    gaugeArcRef.current.style.strokeDashoffset = CIRC;
    gaugeGlowRef.current.style.transition = "none";
    gaugeGlowRef.current.style.strokeDashoffset = CIRC;
    const t = setTimeout(() => {
      if (!gaugeArcRef.current || !gaugeGlowRef.current) return;
      gaugeArcRef.current.style.transition = "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)";
      gaugeArcRef.current.style.strokeDashoffset = target;
      gaugeGlowRef.current.style.transition = "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)";
      gaugeGlowRef.current.style.strokeDashoffset = target;
    }, 60);
    return () => clearTimeout(t);
  }, [animKey, selectedIdx]);

  const handleSelect = (idx) => {
    if (idx === selectedIdx) return;
    setSelectedIdx(idx);
    setAnimKey((k) => k + 1);
    setFTip(null);
  };

  // Funnel geometry
  const crH = 74, CY = 105;
  const upH = Math.max(14, (ch.uploaded / ch.created) * 74);
  const puH = ch.published > 0 ? Math.max(5, (ch.published / ch.created) * 74) : 4;

  const getTipData = (seg) => {
    const estH = (ch.uploaded * 0.18).toFixed(1);
    if (seg === "upload") return {
      title: "UPLOADED", color: "rgba(255,255,255,0.7)",
      rows: [
        { label: "Total Files", value: ch.uploaded.toLocaleString(), unit: "raw files" },
        { label: "Pipeline Role", value: "100%", unit: "entry point" },
        { label: "AI Multiplier", value: `×${aiMult.toFixed(1)}`, unit: "expansion rate" },
        { label: "Est. Hours", value: estH, unit: "processing hrs" },
      ],
    };
    if (seg === "create") return {
      title: "AI CREATED", color: "#ff6b7a",
      rows: [
        { label: "AI Outputs", value: ch.created.toLocaleString(), unit: "generated files" },
        { label: "Expansion", value: `+${aiExpPct}%`, unit: "from uploaded" },
        { label: "Net Added", value: (ch.created - ch.uploaded).toLocaleString(), unit: "new pieces" },
        { label: "Filtered Out", value: (ch.created - ch.published).toLocaleString(), unit: "unpublished" },
      ],
    };
    return {
      title: "PUBLISHED", color: TC,
      rows: [
        { label: "Live Items", value: ch.published.toLocaleString(), unit: "active content" },
        { label: "Pub Rate", value: `${pubRate.toFixed(1)}%`, unit: "of created" },
        { label: "End-to-End", value: `${((ch.published / ch.uploaded) * 100).toFixed(1)}%`, unit: "of uploaded" },
        { label: "Health", value: isGreen ? "Healthy" : "Critical", unit: isGreen ? "✓ above 5%" : "✗ below 5%" },
      ],
    };
  };

  const handleFunnelEnter = (e, seg) => {
    const rect = funnelContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setFTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, seg });
  };
  const handleFunnelMove = (e) => {
    const rect = funnelContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setFTip((t) => t ? { ...t, x: e.clientX - rect.left, y: e.clientY - rect.top } : t);
  };

  const F = "var(--font-dm-sans,'DM Sans',Inter,sans-serif)";
  const M = "var(--font-jetbrains-mono,'JetBrains Mono','IBM Plex Mono',monospace)";

  return (
    <>
      <style>{`
        @keyframes bch-glide {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        /* ── Channel selector pills ── */
        .bch-pill {
          background: rgba(255,255,255,.03);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 10px;
          display: flex; flex-direction: column;
          align-items: flex-start; justify-content: space-between;
          gap: 0; padding: 11px 12px 9px;
          cursor: pointer; min-height: 76px;
          position: relative; overflow: hidden;
          transition: border-color .18s, background .18s, box-shadow .18s, transform .18s;
        }
        .bch-pill:hover {
          background: rgba(255,255,255,.06);
          border-color: rgba(255,255,255,.13);
          transform: translateY(-1px);
        }
        .bch-pill.bch-active {
          border-color: rgba(255,71,87,.55);
          background: rgba(255,71,87,.06);
          box-shadow: 0 0 0 1px rgba(255,71,87,.18), 0 6px 24px rgba(255,71,87,.12);
        }
        .bch-pill.bch-active::after {
          content: ''; position: absolute; top: 0; left: 0; right: 0;
          height: 2px; background: linear-gradient(90deg, transparent, rgba(255,71,87,.7), transparent);
        }
        /* ── Glass cards ── */
        .bch-glass {
          background: rgba(255,255,255,.035);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 14px; backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          position: relative; overflow: hidden;
          transition: border-color .18s, box-shadow .18s;
        }
        .bch-glass:hover { border-color: rgba(255,255,255,.12); }
        .bch-glass::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0;
          height: 1px; pointer-events: none;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.10), transparent);
        }
        /* ── Metric cards ── */
        .bch-metric {
          background: rgba(255,255,255,.035);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 14px; backdrop-filter: blur(20px);
          padding: 20px 18px; position: relative; overflow: hidden;
          transition: border-color .18s, box-shadow .18s, transform .18s;
          cursor: default;
        }
        .bch-metric:hover {
          border-color: rgba(255,71,87,.30);
          box-shadow: 0 4px 24px rgba(255,71,87,.08);
          transform: translateY(-2px);
        }
        .bch-metric::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0;
          height: 1px; pointer-events: none;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.10), transparent);
        }
        /* ── Conversion cards ── */
        .bch-conv {
          background: rgba(255,255,255,.035);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 14px; padding: 20px 18px;
          text-align: center; position: relative; overflow: hidden;
          transition: border-color .18s, box-shadow .18s, transform .18s;
          cursor: default;
        }
        .bch-conv:hover {
          border-color: rgba(255,255,255,.14);
          transform: translateY(-1px);
        }
        /* ── Funnel wrapper ── */
        .bch-funnel-wrap {
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 14px;
          position: relative; overflow: visible;
          transition: border-color .18s;
        }
        .bch-funnel-wrap:hover { border-color: rgba(255,255,255,.11); }
        .bch-funnel-wrap::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0;
          height: 1px; pointer-events: none;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.10), transparent);
        }
      `}</style>

      {/* ── Channel Selector Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(88px,1fr))", gap: 8, marginBottom: 18 }}>
        {channels.map((c, i) => {
          const r = (c.published / c.uploaded) * 100;
          const tc = r >= 5 ? "#3EC98A" : r >= 1 ? "#f59e0b" : "#ff4757";
          const barW = Math.min(r / 10 * 100, 100); // 10% pub rate = full bar
          const isActive = i === selectedIdx;
          return (
            <div key={c.ch} className={`bch-pill${isActive ? " bch-active" : ""}`} onClick={() => handleSelect(i)}>
              {/* Top row: label + rate */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%", marginBottom: 6 }}>
                <span style={{ fontFamily: M, fontSize: 13, fontWeight: 700, color: isActive ? "#fff" : "rgba(255,255,255,0.82)", lineHeight: 1 }}>
                  Ch-{c.ch}
                </span>
                <span style={{ fontFamily: M, fontSize: 10.5, fontWeight: 600, color: tc, lineHeight: 1 }}>
                  {r.toFixed(1)}%
                </span>
              </div>
              {/* Uploaded count */}
              <span style={{ fontFamily: M, fontSize: 10, color: "rgba(255,255,255,0.38)", lineHeight: 1, marginBottom: 8 }}>
                {c.uploaded.toLocaleString()}
              </span>
              {/* Publish rate bar */}
              <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${barW}%`, minWidth: barW > 0 ? 2 : 0, height: "100%", background: tc, borderRadius: 2, transition: "width 0.4s ease" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Detail View ── */}
      <div key={animKey} style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, animation: "bch-glide 0.35s ease both" }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Card 1 — Identity */}
          <div className="bch-glass" style={{ padding: "22px 20px" }}>
            <div style={{ fontFamily: F, fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 10, fontWeight: 600 }}>
              CHANNEL IDENTIFIER
            </div>
            <div style={{
              fontFamily: M, fontSize: 64, fontWeight: 700, lineHeight: 1, marginBottom: 8,
              background: "linear-gradient(135deg,#ff6b7a,#ff4757)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>Ch-{ch.ch}</div>
            <div style={{ fontFamily: F, fontSize: 13, color: "#F0F0F0", marginBottom: 14 }}>
              Distribution Channel {ch.ch}
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              background: isGreen ? "rgba(61,170,106,.12)" : "rgba(217,59,32,.12)",
              border: `1px solid ${isGreen ? "rgba(61,170,106,.3)" : "rgba(217,59,32,.3)"}`,
              borderRadius: 20, padding: "5px 12px",
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: TC, boxShadow: `0 0 6px ${TC}`, flexShrink: 0 }} />
              <span style={{ fontFamily: F, fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: TC, letterSpacing: "0.05em" }}>
                {isGreen ? "Green Tier · Healthy" : "Red Tier · Critical"}
              </span>
            </div>
          </div>

          {/* Card 2 — Radial Gauge */}
          <div className="bch-glass" style={{ padding: "22px 20px", textAlign: "center" }}>
            <div style={{ fontFamily: F, fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 16, fontWeight: 600 }}>
              PUBLISH RATE
            </div>
            <svg width="120" height="120" viewBox="0 0 120 120" style={{ display: "block", margin: "0 auto", overflow: "visible" }}>
              <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="10" />
              <circle ref={gaugeGlowRef} cx="60" cy="60" r="54" fill="none" stroke={TC} strokeWidth="14" strokeLinecap="round"
                opacity="0.1" strokeDasharray={CIRC} strokeDashoffset={CIRC} transform="rotate(-90 60 60)" />
              <circle ref={gaugeArcRef} cx="60" cy="60" r="54" fill="none" stroke={TC} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={CIRC} strokeDashoffset={CIRC} transform="rotate(-90 60 60)" />
              <text x="60" y="55" textAnchor="middle" dominantBaseline="middle"
                fontFamily={M} fontSize="20" fontWeight="700" fill={TC}>
                {pubRate.toFixed(1)}%
              </text>
              <text x="60" y="72" textAnchor="middle" dominantBaseline="middle"
                fontFamily={M} fontSize="8" fill="rgba(255,255,255,0.58)" letterSpacing="0.08em">
                PUB RATE
              </text>
            </svg>
          </div>

          {/* Card 3 — Stats */}
          <div className="bch-glass" style={{ padding: "6px 18px 10px" }}>
            {[
              { label: "Uploaded",   value: ch.uploaded,   color: "rgba(255,255,255,0.88)", barColor: "rgba(255,255,255,0.25)", barW: 100 },
              { label: "AI Created", value: ch.created,    color: "#ff6b7a",                barColor: "#ff4757",                barW: Math.min((ch.created / (ch.created || 1)) * 100, 100) },
              { label: "Published",  value: ch.published,  color: TC,                       barColor: TC,                       barW: Math.min((ch.published / (ch.uploaded || 1)) * 200, 100) },
            ].map((row, i, arr) => (
              <div key={row.label} style={{
                padding: "12px 0",
                borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,.05)" : "none",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontFamily: F, fontSize: 12.5, color: "rgba(255,255,255,0.60)", fontWeight: 500 }}>{row.label}</span>
                  <span style={{ fontFamily: M, fontSize: 13.5, fontWeight: 700, color: row.color }}>{row.value.toLocaleString()}</span>
                </div>
                <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${row.barW}%`, height: "100%", background: row.barColor, borderRadius: 2, opacity: 0.7 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Row 1 — Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            <div className="bch-metric">
              <div style={{ fontFamily: F, fontSize: 12, color: "rgba(255,255,255,0.60)", marginBottom: 10, fontWeight: 500 }}>AI Expansion</div>
              <div style={{ fontFamily: M, fontSize: 32, fontWeight: 700, color: "#F0F0F0", lineHeight: 1, marginBottom: 10 }}>
                +{aiExpPct}%
              </div>
              <span style={{
                display: "inline-flex", alignItems: "center",
                background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.10)",
                borderRadius: 20, padding: "4px 11px",
                fontFamily: F, fontSize: 11.5, fontWeight: 500, color: "rgba(255,255,255,0.55)",
              }}>Content multiplied</span>
            </div>

            <div className="bch-metric">
              <div style={{ fontFamily: F, fontSize: 12, color: "rgba(255,255,255,0.60)", marginBottom: 10, fontWeight: 500 }}>Pub Drop</div>
              <div style={{ fontFamily: M, fontSize: 32, fontWeight: 700, color: "#ff4757", lineHeight: 1, marginBottom: 10 }}>
                -{pubDropPct.toFixed(1)}%
              </div>
              <span style={{
                display: "inline-flex", alignItems: "center",
                background: "rgba(255,71,87,.10)", border: "1px solid rgba(255,71,87,.25)",
                borderRadius: 20, padding: "4px 11px",
                fontFamily: F, fontSize: 11.5, fontWeight: 500, color: "#ff6b7a",
              }}>Filtered out</span>
            </div>

            <div className="bch-metric">
              <div style={{ fontFamily: F, fontSize: 12, color: "rgba(255,255,255,0.60)", marginBottom: 10, fontWeight: 500 }}>Pub Rate</div>
              <div style={{ fontFamily: M, fontSize: 32, fontWeight: 700, color: TC, lineHeight: 1, marginBottom: 10 }}>
                {pubRate.toFixed(1)}%
              </div>
              <span style={{
                display: "inline-flex", alignItems: "center",
                background: isGreen ? "rgba(62,201,138,.10)" : "rgba(255,71,87,.10)",
                border: `1px solid ${isGreen ? "rgba(62,201,138,.25)" : "rgba(255,71,87,.25)"}`,
                borderRadius: 20, padding: "4px 11px",
                fontFamily: F, fontSize: 11.5, fontWeight: 500, color: TC,
              }}>{isGreen ? "Above threshold" : "Below threshold"}</span>
            </div>
          </div>

          {/* Row 2 — Pipeline Funnel */}
          <div className="bch-funnel-wrap" style={{ padding: "18px 20px 32px" }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: "#F0F0F0", marginBottom: 3 }}>
                Content Pipeline Flow
              </div>
              <div style={{ fontFamily: F, fontSize: 12.5, color: "rgba(255,255,255,0.60)" }}>
                Upload → Create → Publish — hover each stage
              </div>
            </div>
            <div ref={funnelContainerRef} style={{ position: "relative" }}>
              <svg viewBox="0 0 660 210" width="100%" style={{ display: "block", overflow: "visible" }}
                onMouseLeave={() => setFTip(null)}>
                <defs>
                  <linearGradient id={`bup${ch.ch}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgba(255,255,255,.06)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,.22)" />
                  </linearGradient>
                  <linearGradient id={`bcr${ch.ch}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgba(255,71,87,.45)" />
                    <stop offset="50%" stopColor="rgba(255,100,110,.82)" />
                    <stop offset="100%" stopColor="rgba(255,71,87,.55)" />
                  </linearGradient>
                  <linearGradient id={`bpu${ch.ch}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={TC} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={TC} stopOpacity="0.9" />
                  </linearGradient>
                  <linearGradient id={`bt1${ch.ch}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgba(255,255,255,.15)" />
                    <stop offset="100%" stopColor="rgba(255,71,87,.45)" />
                  </linearGradient>
                  <linearGradient id={`bt2${ch.ch}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgba(255,71,87,.45)" />
                    <stop offset="100%" stopColor={TC} stopOpacity="0.35" />
                  </linearGradient>
                  <filter id={`gcr${ch.ch}`} x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="8" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                  <filter id={`gpu${ch.ch}`} x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>

                {/* Segments */}
                <polygon points={`0,${CY-upH/2} 158,${CY-upH/2} 158,${CY+upH/2} 0,${CY+upH/2}`}
                  fill={`url(#bup${ch.ch})`} />
                <polygon points={`158,${CY-upH/2} 218,${CY-crH/2} 218,${CY+crH/2} 158,${CY+upH/2}`}
                  fill={`url(#bt1${ch.ch})`} />
                <polygon points={`218,${CY-crH/2} 408,${CY-crH/2} 408,${CY+crH/2} 218,${CY+crH/2}`}
                  fill={`url(#bcr${ch.ch})`} filter={`url(#gcr${ch.ch})`} />
                <polygon points={`408,${CY-crH/2} 468,${CY-puH/2} 468,${CY+puH/2} 408,${CY+crH/2}`}
                  fill={`url(#bt2${ch.ch})`} />
                <polygon points={`468,${CY-puH/2} 660,${CY-puH/2} 660,${CY+puH/2} 468,${CY+puH/2}`}
                  fill={`url(#bpu${ch.ch})`} filter={`url(#gpu${ch.ch})`} />

                {/* Labels above */}
                <text x="79" y={CY-upH/2-14} textAnchor="middle" fontFamily={F} fontSize="10"
                  fill="rgba(255,255,255,.55)" letterSpacing="1.5">UPLOADED</text>
                <text x="313" y={CY-crH/2-14} textAnchor="middle" fontFamily={F} fontSize="10"
                  fill="#ff6b7a" letterSpacing="1.5">AI CREATED</text>
                <text x="564" y={CY-puH/2-14} textAnchor="middle" fontFamily={F} fontSize="10"
                  fill={TC} letterSpacing="1.5">PUBLISHED</text>

                {/* Values below */}
                <text x="79" y={CY+upH/2+22} textAnchor="middle" fontFamily={M} fontSize="18" fontWeight="700"
                  fill="rgba(255,255,255,.85)">{ch.uploaded.toLocaleString()}</text>
                <text x="79" y={CY+upH/2+36} textAnchor="middle" fontFamily={F} fontSize="11.5" fill="rgba(255,255,255,0.60)">raw files</text>

                <text x="313" y={CY+crH/2+22} textAnchor="middle" fontFamily={M} fontSize="18" fontWeight="700"
                  fill="rgba(255,255,255,.85)">{ch.created.toLocaleString()}</text>
                <text x="313" y={CY+crH/2+36} textAnchor="middle" fontFamily={F} fontSize="11.5" fill="rgba(255,255,255,0.60)">+{aiExpPct}% expanded</text>

                <text x="564" y={CY+puH/2+22} textAnchor="middle" fontFamily={M} fontSize="18" fontWeight="700"
                  fill="rgba(255,255,255,.85)">{ch.published.toLocaleString()}</text>
                <text x="564" y={CY+puH/2+36} textAnchor="middle" fontFamily={F} fontSize="11.5" fill="rgba(255,255,255,0.60)">{pubRate.toFixed(1)}% pub rate</text>

                {/* Transition ratio labels */}
                <text x="188" y={CY+4} textAnchor="middle" fontFamily={M} fontSize="11" fill="rgba(255,255,255,0.62)">×{aiMult.toFixed(1)}</text>
                <text x="438" y={CY+4} textAnchor="middle" fontFamily={M} fontSize="11" fill="rgba(255,255,255,0.62)">{pubRate.toFixed(1)}%</text>

                {/* Hit zones */}
                <rect x="0" y="0" width="218" height="210" fill="transparent" style={{ cursor: "pointer" }}
                  onMouseEnter={(e) => handleFunnelEnter(e, "upload")} onMouseMove={handleFunnelMove} />
                <rect x="218" y="0" width="250" height="210" fill="transparent" style={{ cursor: "pointer" }}
                  onMouseEnter={(e) => handleFunnelEnter(e, "create")} onMouseMove={handleFunnelMove} />
                <rect x="468" y="0" width="192" height="210" fill="transparent" style={{ cursor: "pointer" }}
                  onMouseEnter={(e) => handleFunnelEnter(e, "publish")} onMouseMove={handleFunnelMove} />
              </svg>

              {/* Tooltip */}
              {fTip && (() => {
                const tip = getTipData(fTip.seg);
                const isRight = fTip.seg === "publish";
                return (
                  <div style={{
                    position: "absolute",
                    ...(isRight ? { left: 20 } : { right: 20 }),
                    top: Math.max(0, fTip.y - 100),
                    background: "rgba(8,8,8,.98)",
                    borderRadius: 12,
                    boxShadow: "0 20px 60px rgba(0,0,0,.9)",
                    pointerEvents: "none",
                    zIndex: 100, minWidth: 200, overflow: "hidden",
                  }}>
                    <div style={{
                      padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,.06)",
                      fontFamily: F, fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                      color: tip.color, letterSpacing: "0.1em",
                    }}>{tip.title}</div>
                    {tip.rows?.map((r, i) => (
                      <div key={i} style={{
                        padding: "6px 14px",
                        borderBottom: i < tip.rows.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none",
                      }}>
                        <div style={{ fontFamily: F, fontSize: 11, color: "rgba(255,255,255,0.48)", marginBottom: 1 }}>{r.label}</div>
                        <div style={{ fontFamily: M, fontSize: 13, fontWeight: 700, color: tip.color }}>{r.value}</div>
                        <div style={{ fontFamily: F, fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{r.unit}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Row 3 — Conversion */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            <div className="bch-conv">
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,.15)", filter: "blur(30px)", opacity: 0.15, pointerEvents: "none" }} />
              <div style={{ fontFamily: F, fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", marginBottom: 8 }}>Upload → Create</div>
              <div style={{ fontFamily: M, fontSize: 30, fontWeight: 700, color: "#F0F0F0", marginBottom: 4 }}>
                {Math.round((ch.created / ch.uploaded) * 100)}%
              </div>
              <div style={{ fontFamily: F, fontSize: 9, color: "rgba(255,255,255,0.55)" }}>AI expansion rate</div>
            </div>
            <div className="bch-conv">
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 80, height: 80, borderRadius: "50%", background: TC, filter: "blur(30px)", opacity: 0.15, pointerEvents: "none" }} />
              <div style={{ fontFamily: F, fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", marginBottom: 8 }}>Create → Publish</div>
              <div style={{ fontFamily: M, fontSize: 30, fontWeight: 700, color: TC, marginBottom: 4 }}>
                {pubRate.toFixed(1)}%
              </div>
              <div style={{ fontFamily: F, fontSize: 9, color: "rgba(255,255,255,0.55)" }}>Content pub rate</div>
            </div>
            <div className="bch-conv">
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 80, height: 80, borderRadius: "50%", background: "#ff4757", filter: "blur(30px)", opacity: 0.15, pointerEvents: "none" }} />
              <div style={{ fontFamily: F, fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", marginBottom: 8 }}>Upload → Publish</div>
              <div style={{ fontFamily: M, fontSize: 30, fontWeight: 700, color: "#ff4757", marginBottom: 4 }}>
                {((ch.published / ch.uploaded) * 100).toFixed(1)}%
              </div>
              <div style={{ fontFamily: F, fontSize: 9, color: "rgba(255,255,255,0.55)" }}>End-to-end rate</div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

function SectionFunnel({ theme, onAskAI }) {
  const dash = useDash();
  const { data: staticData } = useJsonData("funnel");
  const data = useLiveSectionData("funnel", dash?.liveDashboard, staticData);
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
  const [insightsOpen, setInsightsOpen] = useState({});

  // ── 2D Sankey dimension picker ──
  const [dimA, setDimA] = useState("channel");
  const [dimB, setDimB] = useState("platform");

  const DIMS_CONFIG = [
    { k: "pipeline",    label: "Pipeline",  desc: "Upload→Create→Publish",  color: "#3B8BD4" },
    { k: "channel",     label: "Channel",   desc: "Ch-A through Ch-I",      color: "#8B5CF6" },
    { k: "contentType", label: "Content",   desc: "Interview, News…",       color: "#EF9F27" },
    { k: "language",    label: "Language",  desc: "English, Hindi…",        color: "#3EC98A" },
    { k: "status",      label: "Status",    desc: "Published / Unpub",      color: "#ff6b7a" },
    { k: "platform",    label: "Platform",  desc: "YouTube, Reels…",        color: "#45aaf2" },
  ];
  const COMPAT: Record<string,string[]> = {
    pipeline:    ["status"],
    channel:     ["platform", "status"],
    contentType: ["language", "status"],
    language:    ["platform", "status"],
    status:      [],
    platform:    [],
  };

  const computeSankeyData = (a: string, b: string) => {
    if (a === "channel" && b === "platform") return sectionData.sankey?.channel || { nodes: [], links: [] };
    if (a === "contentType" && b === "language") return sectionData.sankey?.content || { nodes: [], links: [] };
    if (a === "pipeline" && b === "status") return {
      nodes: ["Uploads", "AI Created", "Published", "Unpublished"],
      links: [
        { source: "Uploads",    target: "AI Created",  value: TOTAL_UPLOADED },
        { source: "AI Created", target: "Published",   value: TOTAL_PUBLISHED },
        { source: "AI Created", target: "Unpublished", value: TOTAL_CREATED - TOTAL_PUBLISHED },
      ],
    };
    if (a === "channel" && b === "status") {
      const active = CHANNELS.filter(c => c.created > 0);
      const links = [];
      active.forEach(c => {
        if (c.published > 0) links.push({ source: `Ch-${c.ch}`, target: "Published",   value: c.published });
        const u = c.created - c.published;
        if (u > 0)           links.push({ source: `Ch-${c.ch}`, target: "Unpublished", value: u });
      });
      return { nodes: [...active.map(c => `Ch-${c.ch}`), "Published", "Unpublished"], links };
    }
    if (a === "contentType" && b === "status") {
      const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
      const active = INPUT_TYPES.filter(t => t.created > 0);
      const links = [];
      active.forEach(t => {
        const name = cap(t.type);
        if (t.published > 0) links.push({ source: name, target: "Published",   value: t.published });
        const u = t.created - t.published;
        if (u > 0)           links.push({ source: name, target: "Unpublished", value: u });
      });
      return { nodes: [...active.map(t => cap(t.type)), "Published", "Unpublished"], links };
    }
    if (a === "language" && b === "status") {
      const active = LANGUAGES.filter(l => l.created > 0);
      const links = [];
      active.forEach(l => {
        if (l.published > 0) links.push({ source: l.lang, target: "Published",   value: l.published });
        const u = l.created - l.published;
        if (u > 0)           links.push({ source: l.lang, target: "Unpublished", value: u });
      });
      return { nodes: [...active.map(l => l.lang), "Published", "Unpublished"], links };
    }
    if (a === "language" && b === "platform") {
      const fd = sectionData.sankey?.funnel;
      if (!fd) return { nodes: [], links: [] };
      const langSet = new Set(["English", "Hindi", "Mixed"]);
      const platSet = new Set(["YouTube", "Reels", "Shorts", "Facebook", "Instagram"]);
      const filtLinks = (fd.links || []).filter(l => langSet.has(l.source) && platSet.has(l.target));
      const usedLangs = [...new Set(filtLinks.map(l => l.source))];
      const usedPlats = [...new Set(filtLinks.map(l => l.target))];
      return { nodes: [...usedLangs, ...usedPlats], links: filtLinks };
    }
    return { nodes: [], links: [] };
  };

  const activeDimACfg = DIMS_CONFIG.find(d => d.k === dimA);
  const activeDimBCfg = DIMS_CONFIG.find(d => d.k === dimB);
  const validTargets = COMPAT[dimA] || [];
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
    sankey: {
      a: <><span className="sig-val">{TOTAL_CREATED.toLocaleString()}</span> AI outputs generated from <span className="sig-val">{TOTAL_UPLOADED.toLocaleString()}</span> uploads — only <span className="sig-warn">{TOTAL_PUBLISHED.toLocaleString()}</span> reached distribution (<span className="sig-warn">{PUBLISH_RATE}%</span>).</>,
      b: <>The <span className="sig-val">{MULTIPLIER}×</span> input-to-output multiplier creates a large backlog of unpublished content.</>,
    },
    pipeline: {
      a: <>Upload-to-publish pipeline shows <span className="sig-warn">3 bottleneck stages</span> — largest drop-off occurs at the AI processing step.</>,
      b: <>Overall conversion from upload to published output sits at <span className="sig-warn">{PUBLISH_RATE}%</span>, well below the 10% benchmark.</>,
    },
    channels: {
      a: <><span className="sig-val">18</span> channels active — Ch-A and Ch-B together account for <span className="sig-val">41%</span> of all published content this period.</>,
      b: <>6 channels have <span className="sig-warn">zero publications</span> despite receiving consistent upload volume.</>,
    },
    types: {
      a: <>Short-form video achieves the highest publish rate (<span className="sig-pos">8.4%</span>) — docs and podcasts at <span className="sig-warn">near-zero</span> conversion.</>,
      b: <>4 content types account for <span className="sig-val">93%</span> of total upload volume but less than <span className="sig-warn">15%</span> of publications.</>,
    },
  };

  const sig = SIGNALS[subView] || SIGNALS.sankey;

  return (
    <div className="fade-up">
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
            {/* ── Header ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--ink2)", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: activeDimACfg?.color }}>{activeDimACfg?.label}</span>
                  <span style={{ color: "rgba(255,255,255,0.25)" }}>→</span>
                  <span style={{ color: activeDimBCfg?.color }}>{activeDimBCfg?.label}</span>
                  <span style={{ color: "rgba(255,255,255,0.25)" }}>· SANKEY FLOW</span>
                  <GraphActionButtons
                    insightsOpen={!!insightsOpen.contentFlow}
                    onToggleInsights={() => toggleInsights("contentFlow")}
                    onAskAI={() => onAskAI && onAskAI("Content Flow", { dimA, dimB })}
                  />
                </div>
                <div style={{ fontSize: 11.5, color: "var(--ink3)", fontFamily: "var(--font-mono)", marginTop: 4 }}>
                  D3 Sankey · hover nodes and links for highlighted path details
                </div>
              </div>
            </div>

            {/* ── 2D Dimension Picker ── */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 18px", marginBottom: 18 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.32)", marginBottom: 12 }}>
                2D DIMENSION FILTER — SELECT SOURCE &amp; TARGET
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "start" }}>

                {/* Source column */}
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.38)", marginBottom: 8 }}>SOURCE</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {DIMS_CONFIG.filter(d => (COMPAT[d.k] || []).length > 0).map(dim => {
                      const active = dimA === dim.k;
                      return (
                        <button key={dim.k} onClick={() => {
                          setDimA(dim.k);
                          if (!COMPAT[dim.k]?.includes(dimB)) setDimB(COMPAT[dim.k]?.[0] || "status");
                        }} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "9px 13px", borderRadius: 8, border: "1px solid",
                          cursor: "pointer", textAlign: "left",
                          background: active ? `${dim.color}12` : "rgba(255,255,255,0.02)",
                          borderColor: active ? `${dim.color}50` : "rgba(255,255,255,0.07)",
                          boxShadow: active ? `0 0 0 1px ${dim.color}22, 0 4px 14px ${dim.color}15` : "none",
                          transition: "all .16s ease",
                        }}>
                          <div style={{ width: 3, height: 28, borderRadius: 2, background: active ? dim.color : "rgba(255,255,255,0.12)", flexShrink: 0, transition: "background .16s" }} />
                          <div>
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: active ? dim.color : "rgba(255,255,255,0.60)", lineHeight: 1.2 }}>{dim.label}</div>
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "rgba(255,255,255,0.30)", marginTop: 2 }}>{dim.desc}</div>
                          </div>
                          {active && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: dim.color, flexShrink: 0 }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Arrow */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 28, gap: 6 }}>
                  <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.10)" }} />
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: "rgba(255,255,255,0.20)", lineHeight: 1 }}>→</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.22)", letterSpacing: "0.08em", textTransform: "uppercase" }}>flows</div>
                  <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.10)" }} />
                </div>

                {/* Target column */}
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.38)", marginBottom: 8 }}>TARGET</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {DIMS_CONFIG.filter(d => ["status","platform","language"].includes(d.k)).map(dim => {
                      const isValid = validTargets.includes(dim.k);
                      const active = dimB === dim.k;
                      return (
                        <button key={dim.k} onClick={() => isValid && setDimB(dim.k)} disabled={!isValid} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "9px 13px", borderRadius: 8, border: "1px solid",
                          cursor: isValid ? "pointer" : "not-allowed", textAlign: "left",
                          opacity: isValid ? 1 : 0.28,
                          background: active ? `${dim.color}12` : "rgba(255,255,255,0.02)",
                          borderColor: active ? `${dim.color}50` : "rgba(255,255,255,0.07)",
                          boxShadow: active ? `0 0 0 1px ${dim.color}22, 0 4px 14px ${dim.color}15` : "none",
                          transition: "all .16s ease",
                          filter: isValid ? "none" : "grayscale(0.4)",
                        }}>
                          <div style={{ width: 3, height: 28, borderRadius: 2, background: active ? dim.color : "rgba(255,255,255,0.12)", flexShrink: 0, transition: "background .16s" }} />
                          <div>
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: active ? dim.color : "rgba(255,255,255,0.60)", lineHeight: 1.2 }}>{dim.label}</div>
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "rgba(255,255,255,0.30)", marginTop: 2 }}>{dim.desc}</div>
                          </div>
                          {!isValid && <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.22)" }}>N/A</span>}
                          {active && isValid && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: dim.color, flexShrink: 0 }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Active pair badge */}
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.28)", letterSpacing: "0.12em", textTransform: "uppercase" }}>ACTIVE VIEW</span>
                <span style={{ padding: "3px 10px", borderRadius: 5, background: `${activeDimACfg?.color}18`, border: `1px solid ${activeDimACfg?.color}44`, fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: activeDimACfg?.color }}>{activeDimACfg?.label}</span>
                <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>→</span>
                <span style={{ padding: "3px 10px", borderRadius: 5, background: `${activeDimBCfg?.color}18`, border: `1px solid ${activeDimBCfg?.color}44`, fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: activeDimBCfg?.color }}>{activeDimBCfg?.label}</span>
              </div>
            </div>

            <GraphFlip
              flipped={!!insightsOpen.contentFlow}
              minHeight={380}
              front={
                <>
                  <D3SankeyChart type="custom" theme={theme} dataMap={{ custom: computeSankeyData(dimA, dimB) }} />
                  <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "rgba(255,255,255,0.28)", letterSpacing: "0.10em", textTransform: "uppercase" }}>LEGEND</span>
                    <span style={{ padding: "2px 9px", borderRadius: 4, background: `${activeDimACfg?.color}18`, border: `1px solid ${activeDimACfg?.color}33`, fontFamily: "var(--font-mono)", fontSize: 10, color: activeDimACfg?.color }}>{activeDimACfg?.label} nodes</span>
                    <span style={{ color: "rgba(255,255,255,0.20)", fontSize: 11 }}>→</span>
                    <span style={{ padding: "2px 9px", borderRadius: 4, background: `${activeDimBCfg?.color}18`, border: `1px solid ${activeDimBCfg?.color}33`, fontFamily: "var(--font-mono)", fontSize: 10, color: activeDimBCfg?.color }}>{activeDimBCfg?.label} nodes</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.22)", marginLeft: 6 }}>· hover any node or link to highlight path</span>
                  </div>
                </>
              }
              back={<GraphInsights title="Content Flow" />}
            />
          </div>
        </div>
      )}

      {subView === "pipeline" && (
        <div className="stack">
          <div className="g-4-6">
            {/* ── Language Pipeline — columnar table ── */}
            {(() => {
              const maxUp = Math.max(...LANGUAGES.map(l => l.uploaded), 1);
              const maxCr = Math.max(...LANGUAGES.map(l => l.created), 1);
              const maxPb = Math.max(...LANGUAGES.map(l => l.published), 1);
              const totalUploaded  = LANGUAGES.reduce((s, l) => s + l.uploaded,  0);
              const totalProcessed = LANGUAGES.reduce((s, l) => s + l.created,   0);
              const totalPublished = LANGUAGES.reduce((s, l) => s + l.published, 0);
              const totalLost      = totalProcessed - totalPublished;
              const globalPubRate  = totalUploaded > 0 ? (totalPublished / totalUploaded * 100).toFixed(1) : '0.0';
              const publishingLangs = LANGUAGES.filter(l => l.published > 0).length;
              const top = LANGUAGES[0];
              const topPct = totalUploaded > 0 ? (top?.uploaded / totalUploaded * 100).toFixed(0) : 0;
              const SF = '-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif';
              const COL = '116px 1fr 1fr 1fr 72px';

              return (
                <div style={{ background: '#0c0c0e', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 14, fontFamily: SF, overflow: 'hidden' }}>

                  {/* ── header ── */}
                  <div style={{ padding: '20px 26px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 600, marginBottom: 7 }}>
                        Language Pipeline
                      </div>
                      <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.48)', fontWeight: 400, lineHeight: 1.55 }}>
                        {top?.lang} leads with {topPct}% of uploads — {totalPublished.toLocaleString()} items distributed across platforms.
                      </div>
                    </div>
                    {/* stat badges */}
                    <div style={{ display: 'flex', gap: 0, borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.07)', overflow: 'hidden', flexShrink: 0 }}>
                      {[
                        { l: 'Languages',  v: LANGUAGES.length },
                        { l: 'Publishing', v: publishingLangs },
                        { l: 'Pub rate',   v: globalPubRate + '%' },
                      ].map((b, i, arr) => (
                        <div key={b.l} style={{ padding: '8px 16px', borderRight: i < arr.length - 1 ? '0.5px solid rgba(255,255,255,0.07)' : 'none' }}>
                          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.52)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, fontWeight: 600 }}>{b.l}</div>
                          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.78)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{b.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── column headers ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: COL, padding: '10px 26px', borderBottom: '0.5px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
                    <div />
                    {[
                      { l: 'Uploaded',  pip: 'rgba(255,255,255,0.30)' },
                      { l: 'Processed', pip: 'rgba(200,160,74,0.75)' },
                      { l: 'Published', pip: 'rgba(74,170,120,0.80)' },
                    ].map(col => (
                      <div key={col.l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 3, height: 12, background: col.pip, borderRadius: 1, flexShrink: 0 }} />
                        <span style={{ fontSize: 10.5, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.52)', fontWeight: 600 }}>{col.l}</span>
                      </div>
                    ))}
                    <div style={{ fontSize: 10.5, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.52)', fontWeight: 600, textAlign: 'right' }}>Rate</div>
                  </div>

                  {/* ── rows via GraphFlip ── */}
                  <GraphFlip
                    flipped={!!insightsOpen.languagePipeline}
                    minHeight={180}
                    front={
                      <div>
                        {LANGUAGES.map((l, i) => {
                          const pr = l.uploaded > 0 ? l.published / l.uploaded * 100 : 0;
                          const expansion = l.uploaded > 0 ? ((l.created / l.uploaded - 1) * 100).toFixed(0) : '0';
                          const nameColor = i === 0 ? 'rgba(255,255,255,0.82)' : i === 1 ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.40)';
                          const pill = pr >= 2
                            ? { c: '#4aaa78',  bg: 'rgba(74,170,120,0.08)',  b: 'rgba(74,170,120,0.16)'  }
                            : pr > 0
                              ? { c: '#c8a04a',  bg: 'rgba(200,160,74,0.07)', b: 'rgba(200,160,74,0.16)'  }
                              : { c: 'rgba(255,255,255,0.20)', bg: 'transparent', b: 'rgba(255,255,255,0.07)' };
                          return (
                            <div key={l.lang} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                              {/* data row */}
                              <div style={{ display: 'grid', gridTemplateColumns: COL, padding: '16px 26px 8px', alignItems: 'flex-start' }}>
                                <div style={{ fontSize: 13, color: nameColor, fontWeight: 500 }}>{l.lang}</div>
                                <div>
                                  <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.52)', fontVariantNumeric: 'tabular-nums' }}>{l.uploaded.toLocaleString()}</div>
                                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.50)', marginTop: 3 }}>source files</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 15, color: '#c8a04a', fontVariantNumeric: 'tabular-nums' }}>{l.created.toLocaleString()}</div>
                                  <div style={{ fontSize: 9.5, color: 'rgba(200,160,74,0.40)', marginTop: 3 }}>+{expansion}% expanded</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 15, color: l.published > 0 ? '#4aaa78' : 'rgba(255,255,255,0.20)', fontVariantNumeric: 'tabular-nums' }}>{l.published.toLocaleString()}</div>
                                  <div style={{ fontSize: 9.5, color: l.published > 0 ? 'rgba(74,170,120,0.40)' : 'rgba(224,96,80,0.50)', marginTop: 3 }}>
                                    {l.published > 0 ? 'distributed' : 'none distributed'}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', paddingTop: 2 }}>
                                  <span style={{ fontSize: 11, fontWeight: 500, color: pill.c, background: pill.bg, border: `0.5px solid ${pill.b}`, borderRadius: 5, padding: '3px 8px', fontVariantNumeric: 'tabular-nums' }}>
                                    {pr.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                              {/* bar row */}
                              <div style={{ display: 'grid', gridTemplateColumns: COL, padding: '6px 26px 14px', alignItems: 'center' }}>
                                <div />
                                <div style={{ paddingRight: 14 }}>
                                  <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                                    <div style={{ width: `${(l.uploaded / maxUp) * 100}%`, height: '100%', background: 'rgba(255,255,255,0.22)', borderRadius: 2 }} />
                                  </div>
                                </div>
                                <div style={{ paddingRight: 14 }}>
                                  <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                                    <div style={{ width: `${(l.created / maxCr) * 100}%`, height: '100%', background: 'rgba(200,160,74,0.55)', borderRadius: 2 }} />
                                  </div>
                                </div>
                                <div style={{ paddingRight: 14 }}>
                                  <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                                    <div style={{ width: `${maxPb > 0 ? (l.published / maxPb) * 100 : 0}%`, height: '100%', background: 'rgba(74,170,120,0.70)', borderRadius: 2 }} />
                                  </div>
                                </div>
                                <div />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    }
                    back={<GraphInsights title="Language Pipeline Breakdown" />}
                  />

                  {/* ── action buttons ── */}
                  <div style={{ padding: '12px 26px', borderTop: '0.5px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end' }}>
                    <GraphActionButtons
                      insightsOpen={!!insightsOpen.languagePipeline}
                      onToggleInsights={() => toggleInsights("languagePipeline")}
                      onAskAI={() => onAskAI && onAskAI("Language Pipeline", LANGUAGES)}
                    />
                  </div>

                  {/* ── footer totals ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderTop: '0.5px solid rgba(255,255,255,0.05)' }}>
                    {[
                      { l: 'Uploaded',  v: totalUploaded,  c: 'rgba(255,255,255,0.65)' },
                      { l: 'Processed', v: totalProcessed, c: '#c8a04a' },
                      { l: 'Published', v: totalPublished, c: '#4aaa78' },
                      { l: 'Lost',      v: totalLost,      c: '#e06050' },
                    ].map((s, i, arr) => (
                      <div key={s.l} style={{ padding: '14px 26px', borderRight: i < arr.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none' }}>
                        <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.52)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5, fontWeight: 600 }}>{s.l}</div>
                        <div style={{ fontSize: 18, color: s.c, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{s.v.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>

                </div>
              );
            })()}
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

      {subView === "channels" && <ByChannelTab channels={CHANNELS} />}
    </div>
  );
}

export default SectionFunnel;
