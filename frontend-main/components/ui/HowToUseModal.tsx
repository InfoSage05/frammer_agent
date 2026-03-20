// @ts-nocheck
"use client";
import { useState } from "react";

const STEPS = [
  {
    icon: "◈",
    title: "Executive Overview",
    color: "var(--amber-lt)",
    desc: "Start here for the big picture. 10 KPI flashcards give you instant platform health at a glance. Click any card to ask the AI for a deep explanation.",
    tips: ["Hover sparklines for monthly breakdown", "Red cards = critical metrics needing attention", "Green = healthy performance"],
  },
  {
    icon: "⌇",
    title: "Performance Trends",
    color: "var(--blue-lt)",
    desc: "Analyse 12-month upload vs. creation vs. publish trajectories. Use filters to isolate channels or time periods. Toggle the 3-month forecast to see projected trends.",
    tips: ["Switch metric between Count and Duration", "Enable 'Show Forecast' for linear regression projections", "H1 vs H2 comparison reveals seasonal patterns"],
  },
  {
    icon: "⬡",
    title: "Multi-Dimensional Analysis",
    color: "var(--green-lt)",
    desc: "Compare 3 metrics simultaneously using the Ternary / Triangular view. Each point is a channel plotted against all three axes at once.",
    tips: ["Scroll to zoom, drag to pan", "Double-click to reset view", "Points near a vertex = dominant in that metric"],
  },
  {
    icon: "▽",
    title: "Content Funnel",
    color: "var(--pri)",
    desc: "Track content flow from Upload → AI Creation → Publish. Channels are split into Green Tier (≥5% pub rate) and Red Tier (needs attention) for quick triage.",
    tips: ["Green tier = healthy publishing pipeline", "Red tier = AI output bottleneck", "Click 'Ask AI' on any channel for diagnosis"],
  },
  {
    icon: "⊞",
    title: "Explorer & Diagnostics",
    color: "var(--amber-lt)",
    desc: "Deep-dive into user rankings, channel drilldowns, data quality, and the full KPI framework hierarchy. The Advanced KPI tab shows calculated efficiency scores.",
    tips: ["KPI nodes with red rings = critical alerts", "Click nodes to expand/collapse the tree", "Data Quality tab flags completeness issues"],
  },
  {
    icon: "⊹",
    title: "AI Copilot",
    color: "var(--pri)",
    desc: "Every chart has an 'Ask AI' button that sends live graph data to the AI. The right panel Copilot maintains full conversation context across your session.",
    tips: ["Use ⌘K to search across all sections", "Pin findings from the Evidence panel", "Role switcher changes which metrics are highlighted"],
  },
];

export default function HowToUseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  if (!open) return null;

  const current = STEPS[step];

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        zIndex: 9010, width: 520, maxWidth: "calc(100vw - 32px)",
        background: "var(--bg)", border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xl)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 20px 14px",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg2)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink4)", marginBottom: 4 }}>
              DASHBOARD GUIDE
            </div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--ink)" }}>
              How to use Frammer Analytics
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink4)", fontSize: 18, lineHeight: 1, padding: 4 }}>
            ×
          </button>
        </div>

        {/* Step nav */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--line)", overflow: "hidden" }}>
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              style={{
                flex: 1, padding: "8px 4px", background: step === i ? "var(--bg3)" : "transparent",
                border: "none", borderBottom: step === i ? `2px solid ${s.color}` : "2px solid transparent",
                cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 16, color: step === i ? s.color : "var(--ink4)",
                transition: "all 0.15s",
              }}
              title={s.title}
            >
              {s.icon}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
              background: `color-mix(in srgb, ${current.color} 15%, transparent)`,
              border: `1px solid color-mix(in srgb, ${current.color} 30%, transparent)`,
              fontSize: 18, color: current.color,
            }}>
              {current.icon}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink4)", marginBottom: 2 }}>
                SECTION {step + 1} OF {STEPS.length}
              </div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 17, color: "var(--ink)" }}>{current.title}</div>
            </div>
          </div>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--ink3)", lineHeight: 1.65, marginBottom: 16 }}>
            {current.desc}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {current.tips.map((tip, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: `color-mix(in srgb, ${current.color} 15%, transparent)`, border: `1px solid color-mix(in srgb, ${current.color} 25%, transparent)`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                  <span style={{ fontSize: 8, color: current.color }}>✓</span>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--ink3)", lineHeight: 1.5 }}>{tip}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 24px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)" }}>
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, background: "none", border: "1px solid var(--line)", borderRadius: 4, padding: "6px 14px", cursor: step === 0 ? "not-allowed" : "pointer", color: step === 0 ? "var(--ink4)" : "var(--ink)", opacity: step === 0 ? 0.4 : 1 }}
          >
            ← Prev
          </button>
          <div style={{ display: "flex", gap: 5 }}>
            {STEPS.map((_, i) => (
              <div key={i} onClick={() => setStep(i)} style={{ width: 6, height: 6, borderRadius: "50%", background: step === i ? "var(--pri)" : "var(--line)", cursor: "pointer", transition: "background 0.15s" }} />
            ))}
          </div>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
              style={{ fontFamily: "var(--font-mono)", fontSize: 11, background: "var(--pri)", border: "none", borderRadius: 4, padding: "6px 14px", cursor: "pointer", color: "#fff" }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={onClose}
              style={{ fontFamily: "var(--font-mono)", fontSize: 11, background: "var(--green)", border: "none", borderRadius: 4, padding: "6px 14px", cursor: "pointer", color: "#fff" }}
            >
              Get started ✓
            </button>
          )}
        </div>
      </div>
    </>
  );
}
