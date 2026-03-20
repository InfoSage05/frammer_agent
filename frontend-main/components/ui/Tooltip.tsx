// @ts-nocheck
import { createPortal } from "react-dom";

function Tooltip({ tip }) {
  if (!tip || typeof document === "undefined") return null;
  const TW = 230,
    TH = 80; // safe estimate
  const x = Math.min(tip.x + 12, window.innerWidth - TW - 6);
  const y = Math.max(tip.y + 12, 6);
  const yFinal = y + TH > window.innerHeight ? tip.y - TH - 8 : y;
  
  return createPortal(
    <div className="tip" style={{ left: x, top: yFinal }}>
      {tip.txt?.split("\n").map((l, i) => (
        <div
          key={i}
          style={i === 0 ? { fontWeight: 600, marginBottom: 2 } : {}}
        >
          {l}
        </div>
      ))}
    </div>,
    document.body
  );
}

export default Tooltip;
