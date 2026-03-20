// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import Tooltip from "../ui/Tooltip";

function Treemap({ data, height = 200, onSelect }) {
  const [tip, setTip] = useState(null);
  const ref = useRef(null);
  const [dims, setDims] = useState({ w: 600, h: height });
  useEffect(() => {
    const ob = new ResizeObserver((es) =>
      setDims({ w: es[0].contentRect.width, h: height }),
    );
    if (ref.current) ob.observe(ref.current);
    return () => ob.disconnect();
  }, []);
  const total = data.reduce((a, b) => a + b.value, 0);
  function layout(items, x, y, w, h) {
    if (!items.length) return [];
    const sorted = [...items].sort((a, b) => b.value - a.value);
    const result = [];
    let rem = [...sorted];
    let rx = x,
      ry = y,
      rw = w,
      rh = h;
    while (rem.length > 0) {
      const isH = rw > rh;
      let best = 1;
      for (let n = 1; n <= rem.length; n++) {
        const sl = rem.slice(0, n);
        const sT = sl.reduce((a, b) => a + b.value, 0);
        const sP = sT / total;
        const dim = isH ? rw * sP : rh * sP;
        let mAR = 0;
        sl.forEach((it) => {
          const p = it.value / sT;
          const cw = isH ? dim : rw * p;
          const ch = isH ? rh * p : dim;
          const ar = Math.max(cw / ch, ch / cw);
          if (ar > mAR) mAR = ar;
        });
        if (n === 1 || mAR < 3) best = n;
        else break;
      }
      const sl = rem.slice(0, best);
      const sT = sl.reduce((a, b) => a + b.value, 0);
      const sP = sT / total;
      const sD = isH ? rw * sP : rh * sP;
      let cx2 = rx,
        cy2 = ry;
      sl.forEach((it) => {
        const p = it.value / sT;
        const cw = isH ? sD : rw * p;
        const ch = isH ? rh * p : sD;
        result.push({ ...it, x: cx2, y: cy2, w: cw, h: ch });
        if (isH) cy2 += ch;
        else cx2 += cw;
      });
      if (isH) {
        rx += sD;
        rw -= sD;
      } else {
        ry += sD;
        rh -= sD;
      }
      rem = rem.slice(best);
    }
    return result;
  }
  const cells = layout(data, 0, 0, dims.w, height);
  return (
    <div ref={ref} style={{ height, width: "100%", position: "relative" }}>
      {cells.map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: c.x + 1,
            top: c.y + 1,
            width: Math.max(0, c.w - 2),
            height: Math.max(0, c.h - 2),
            background: c.color,
            cursor: "pointer",
            transition: "filter .15s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            overflow: "hidden",
            padding: 4,
            borderRadius: 2,
            border: "1px solid rgba(0,0,0,0.3)",
          }}
          onClick={() => onSelect && onSelect(c)}
          onMouseEnter={(e) => {
            setTip({
              x: e.clientX,
              y: e.clientY,
              txt: `${c.label}\n${c.value.toLocaleString()}${c.note ? "\n" + c.note : ""}`,
            });
          }}
          onMouseLeave={() => setTip(null)}
          onMouseOver={(e) => {
            e.currentTarget.style.filter = "brightness(1.15)";
            e.currentTarget.style.zIndex = 3;
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.filter = "none";
            e.currentTarget.style.zIndex = 0;
          }}
        >
          {c.h > 30 && c.w > 60 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
                textAlign: "center",
                lineHeight: 1.2,
                pointerEvents: "none",
              }}
            >
              {c.label}
            </span>
          )}
          {c.h > 44 && c.w > 50 && (
            <span
              style={{
                fontSize: 8,
                fontFamily: "var(--font-mono)",
                color: "rgba(255,255,255,0.6)",
                pointerEvents: "none",
                marginTop: 2,
              }}
            >
              {c.value.toLocaleString()}
            </span>
          )}
        </div>
      ))}
      <Tooltip tip={tip} />
    </div>
  );
}

export default Treemap;
