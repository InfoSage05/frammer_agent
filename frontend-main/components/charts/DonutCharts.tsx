// @ts-nocheck
import Tooltip from '@/components/ui/Tooltip';

import { useState } from "react";

function DonutChart({ segments, size = 130, label, sub }) {
  const [tip, setTip] = useState(null);
  const cx = size / 2,
    cy = size / 2,
    r = (size - 20) / 2,
    ir = r * 0.62;
  const total = segments.reduce((a, b) => a + b.value, 0);
  let angle = -Math.PI / 2;
  const paths = segments.map((s) => {
    const sa = angle,
      sw = (s.value / total) * Math.PI * 2;
    angle += sw;
    const x1 = cx + r * Math.cos(sa),
      y1 = cy + r * Math.sin(sa);
    const x2 = cx + r * Math.cos(angle),
      y2 = cy + r * Math.sin(angle);
    const ix1 = cx + ir * Math.cos(sa),
      iy1 = cy + ir * Math.sin(sa);
    const ix2 = cx + ir * Math.cos(angle),
      iy2 = cy + ir * Math.sin(angle);
    const large = sw > Math.PI ? 1 : 0;
    return {
      ...s,
      d: `M${ix1},${iy1} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${ix2},${iy2} A${ir},${ir} 0 ${large},0 ${ix1},${iy1} Z`,
    };
  });
  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <svg
        width={size}
        height={size}
        style={{ display: "block", overflow: "visible" }}
      >
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill={p.color}
            opacity={0.85}
            style={{ cursor: "pointer", transition: "opacity .15s" }}
            onMouseEnter={(e) => {
              setTip({
                x: e.clientX,
                y: e.clientY,
                txt: `${p.label}\n${p.value.toLocaleString()} (${((p.value / total) * 100).toFixed(1)}%)`,
              });
            }}
            onMouseLeave={() => setTip(null)}
            onMouseOver={(e) => {
              e.target.style.opacity = "1";
            }}
            onMouseOut={(e) => {
              e.target.style.opacity = "0.85";
            }}
          />
        ))}
        <circle cx={cx} cy={cy} r={ir - 1} fill="var(--bg2)" />
        {label && (
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            fontSize={size > 110 ? "8.5" : "7"}
            fill="var(--ink)"
            fontFamily="var(--font-serif)"
          >
            {label}
          </text>
        )}
        {sub && (
          <text
            x={cx}
            y={cy + 6}
            textAnchor="middle"
            fontSize="5"
            fill="var(--ink3)"
          >
            {sub}
          </text>
        )}
      </svg>
      <Tooltip tip={tip} />
    </div>
  );
}

export default DonutChart;
