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
  const TC = isGreen ? "#3DAA6A" : "#D93B20";
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
      title: "AI CREATED", color: "#FF6040",
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
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bch-spin { to { transform: rotate(360deg); } }
        .bch-pill {
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 12px;
          backdrop-filter: blur(10px);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 6px; padding: 12px 8px;
          cursor: pointer; min-height: 68px;
          position: relative; overflow: hidden;
          transition: transform .18s ease, border-color .18s ease,
                      background .18s ease, box-shadow .18s ease;
        }
        .bch-pill:hover { transform: translateY(-2px); background: rgba(255,255,255,.07); }
        .bch-pill.bch-active {
          border-color: rgba(217,59,32,.7);
          box-shadow: 0 0 0 1px rgba(217,59,32,.3), 0 4px 20px rgba(217,59,32,.15);
        }
        .bch-pill.bch-active::before {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(135deg, rgba(217,59,32,.18) 0%, transparent 70%);
        }
        .bch-glass {
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 16px; backdrop-filter: blur(16px);
          position: relative; overflow: hidden;
        }
        .bch-glass::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0;
          height: 1px; z-index: 1; pointer-events: none;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.12), transparent);
        }
        .bch-metric {
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 16px; backdrop-filter: blur(16px);
          padding: 20px; position: relative; overflow: hidden;
          transition: transform .18s ease;
        }
        .bch-metric::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0;
          height: 1px; pointer-events: none;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.12), transparent);
        }
        .bch-metric:hover { transform: translateY(-2px); }
        .bch-conv {
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 14px; padding: 18px;
          text-align: center; position: relative; overflow: hidden;
        }
        .bch-funnel-wrap {
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 16px; backdrop-filter: blur(16px);
          position: relative; overflow: visible;
        }
        .bch-funnel-wrap::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0;
          height: 1px; z-index: 1; pointer-events: none;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.12), transparent);
        }
      `}</style>

      {/* ── Channel Selector Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 8, marginBottom: 16 }}>
        {channels.map((c, i) => {
          const r = (c.published / c.uploaded) * 100;
          const tc = r >= 5 ? "#3DAA6A" : "#D93B20";
          return (
            <div key={c.ch} className={`bch-pill${i === selectedIdx ? " bch-active" : ""}`} onClick={() => handleSelect(i)}>
              <span style={{ fontFamily: M, fontSize: 22, fontWeight: 700, color: tc, lineHeight: 1 }}>{c.ch}</span>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: tc, boxShadow: `0 0 6px ${tc}` }} />
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
              background: "linear-gradient(135deg,#FF6040,#D93B20)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>{ch.ch}</div>
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
          <div className="bch-glass" style={{ padding: "4px 20px" }}>
            {[
              { label: "Uploaded", value: ch.uploaded.toLocaleString(), color: "#F0F0F0" },
              { label: "AI Created", value: ch.created.toLocaleString(), color: "#FF6040" },
              { label: "Published", value: ch.published.toLocaleString(), color: TC },
            ].map((row, i, arr) => (
              <div key={row.label} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "13px 0",
                borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,.05)" : "none",
              }}>
                <span style={{ fontFamily: F, fontSize: 12.5, color: "rgba(255,255,255,0.62)" }}>{row.label}</span>
                <span style={{ fontFamily: M, fontSize: 13, fontWeight: 700, color: row.color }}>{row.value}</span>
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
                background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)",
                borderRadius: 20, padding: "3px 10px",
                fontFamily: F, fontSize: 9, fontWeight: 700, color: "#888",
              }}>Content multiplied</span>
            </div>

            <div className="bch-metric">
              <div style={{ fontFamily: F, fontSize: 12, color: "rgba(255,255,255,0.60)", marginBottom: 10, fontWeight: 500 }}>Pub Drop</div>
              <div style={{ fontFamily: M, fontSize: 32, fontWeight: 700, color: "#D93B20", lineHeight: 1, marginBottom: 10 }}>
                -{pubDropPct.toFixed(1)}%
              </div>
              <span style={{
                display: "inline-flex", alignItems: "center",
                background: "rgba(217,59,32,.1)", border: "1px solid rgba(217,59,32,.25)",
                borderRadius: 20, padding: "3px 10px",
                fontFamily: F, fontSize: 9, fontWeight: 700, color: "#D93B20",
              }}>Filtered out</span>
            </div>

            <div className="bch-metric">
              <div style={{ fontFamily: F, fontSize: 12, color: "rgba(255,255,255,0.60)", marginBottom: 10, fontWeight: 500 }}>Pub Rate</div>
              <div style={{ fontFamily: M, fontSize: 32, fontWeight: 700, color: TC, lineHeight: 1, marginBottom: 10 }}>
                {pubRate.toFixed(1)}%
              </div>
              <span style={{
                display: "inline-flex", alignItems: "center",
                background: isGreen ? "rgba(61,170,106,.1)" : "rgba(217,59,32,.1)",
                border: `1px solid ${isGreen ? "rgba(61,170,106,.25)" : "rgba(217,59,32,.25)"}`,
                borderRadius: 20, padding: "3px 10px",
                fontFamily: F, fontSize: 9, fontWeight: 700, color: TC,
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
                    <stop offset="0%" stopColor="rgba(255,96,64,.5)" />
                    <stop offset="50%" stopColor="rgba(255,130,60,.82)" />
                    <stop offset="100%" stopColor="rgba(217,59,32,.55)" />
                  </linearGradient>
                  <linearGradient id={`bpu${ch.ch}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={TC} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={TC} stopOpacity="0.9" />
                  </linearGradient>
                  <linearGradient id={`bt1${ch.ch}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgba(255,255,255,.18)" />
                    <stop offset="100%" stopColor="rgba(255,96,64,.5)" />
                  </linearGradient>
                  <linearGradient id={`bt2${ch.ch}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgba(217,59,32,.5)" />
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
                  fill="#FF6040" letterSpacing="1.5">AI CREATED</text>
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
                      fontFamily: F, fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                      color: tip.color, letterSpacing: "0.1em",
                    }}>{tip.title}</div>
                    {tip.rows?.map((r, i) => (
                      <div key={i} style={{
                        padding: "6px 14px",
                        borderBottom: i < tip.rows.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none",
                      }}>
                        <div style={{ fontFamily: F, fontSize: 10, color: "#444", marginBottom: 1 }}>{r.label}</div>
                        <div style={{ fontFamily: M, fontSize: 12, fontWeight: 700, color: tip.color }}>{r.value}</div>
                        <div style={{ fontFamily: F, fontSize: 9, color: "#383838" }}>{r.unit}</div>
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
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 80, height: 80, borderRadius: "50%", background: "#FF6040", filter: "blur(30px)", opacity: 0.15, pointerEvents: "none" }} />
              <div style={{ fontFamily: F, fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", marginBottom: 8 }}>Upload → Publish</div>
              <div style={{ fontFamily: M, fontSize: 30, fontWeight: 700, color: "#FF6040", marginBottom: 4 }}>
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
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color: "var(--ink2)",
                    fontWeight: 600,
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
                    fontSize: 11.5,
                    color: "var(--ink3)",
                    fontFamily: "var(--font-mono)",
                    marginTop: 4,
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
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "var(--ink2)",
                  fontWeight: 600,
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
