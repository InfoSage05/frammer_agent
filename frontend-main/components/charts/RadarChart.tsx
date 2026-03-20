// @ts-nocheck
import { useState } from "react";
import Tooltip from "../ui/Tooltip";

function RadarChart({ data, size = 240 }) {
  const [tip, setTip] = useState(null);
  const padding = 52;
  const cx = size / 2, cy = size / 2;
  const r = (size - padding * 2) / 2;
  const n = data.length;
  const angle = (i) => (i / n) * Math.PI * 2 - Math.PI / 2;
  const pt = (i, pct) => ({
    x: cx + r * pct * Math.cos(angle(i)),
    y: cy + r * pct * Math.sin(angle(i)),
  });
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const rings = [0.25, 0.5, 0.75, 1.0];

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible", maxWidth: "100%" }}>
        {/* Ring grid */}
        {rings.map((rv, ri) => (
          <polygon
            key={rv}
            points={Array.from({ length: n }, (_, i) => `${pt(i, rv).x},${pt(i, rv).y}`).join(" ")}
            fill={rv === 1 ? "rgba(255,71,87,0.04)" : "none"}
            stroke={rv === 1 ? "rgba(255,71,87,0.22)" : "rgba(255,255,255,0.08)"}
            strokeWidth={rv === 1 ? 1 : 0.8}
          />
        ))}
        {/* Spokes */}
        {Array.from({ length: n }, (_, i) => (
          <line key={i} x1={cx} y1={cy} x2={pt(i, 1).x} y2={pt(i, 1).y} stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
        ))}
        {/* Ring value labels */}
        {[0.5, 1.0].map((rv) => (
          <text key={rv} x={cx + 4} y={cy - r * rv - 3} fontSize="8" fill="rgba(245,245,247,0.35)" fontFamily="var(--font-ibm-plex-mono,monospace)">
            {Math.round(maxVal * rv).toLocaleString()}
          </text>
        ))}
        {/* Data polygon */}
        <polygon
          points={data.map((d, i) => { const pct = d.value / maxVal; return `${pt(i, pct).x},${pt(i, pct).y}`; }).join(" ")}
          fill="rgba(255,71,87,0.15)"
          stroke="#ff4757"
          strokeWidth="1.8"
        />
        {/* Data points + labels */}
        {data.map((d, i) => {
          const pct = d.value / maxVal;
          const p = pt(i, pct);
          const lp = pt(i, 1.28);
          const anchor = lp.x < cx - 6 ? "end" : lp.x > cx + 6 ? "start" : "middle";
          return (
            <g key={i}>
              <circle cx={lp.x} cy={lp.y} r="22" fill="transparent"
                onMouseEnter={(e) => setTip({ x: e.clientX, y: e.clientY, txt: `${d.label}\n${d.value.toLocaleString()}` })}
                onMouseLeave={() => setTip(null)}
              />
              <circle cx={p.x} cy={p.y} r="4" fill="#ff4757" stroke="#0e0f11" strokeWidth="1.5"
                onMouseEnter={(e) => setTip({ x: e.clientX, y: e.clientY, txt: `${d.label}\n${d.value.toLocaleString()}` })}
                onMouseLeave={() => setTip(null)}
                style={{ cursor: "pointer" }}
              />
              <text x={lp.x} y={lp.y + 4} textAnchor={anchor} fontSize="10" fill="rgba(245,245,247,0.75)"
                fontFamily="var(--font-ibm-plex-mono,monospace)" dominantBaseline="middle">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {/* Legend table */}
      <div style={{ width: "100%", marginTop: 10, display: "flex", flexWrap: "wrap", gap: "4px 14px", justifyContent: "center" }}>
        {data.map(d => (
          <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ff4757" }} />
            <span style={{ fontFamily: "var(--font-ibm-plex-mono,monospace)", fontSize: 10, color: "rgba(245,245,247,0.6)" }}>
              {d.label}: <strong style={{ color: "#f5f5f7" }}>{d.value.toLocaleString()}</strong>
            </span>
          </div>
        ))}
      </div>
      <Tooltip tip={tip} />
    </div>
  );
}

export default RadarChart;
