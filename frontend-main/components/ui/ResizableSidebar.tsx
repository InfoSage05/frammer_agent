// @ts-nocheck
import { useCallback, useState, useRef } from "react";

function ResizableSidebar({ collapsed, setCollapsed, children }) {
  const [width, setWidth] = useState(210);
  const [dragging, setDragging] = useState(false);
  const sideRef = useRef(null);
  const startResize = useCallback(
    (e) => {
      e.preventDefault();
      const startX = e.clientX,
        startW = width;
      setDragging(true);
      const onMove = (ev) => {
        const newW = Math.max(
          50,
          Math.min(320, startW + (ev.clientX - startX)),
        );
        setWidth(newW);
        if (newW < 80) setCollapsed(true);
        else setCollapsed(false);
      };
      const onUp = () => {
        setDragging(false);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [width],
  );
  return (
    <aside
      ref={sideRef}
      className={`sidebar${collapsed ? " collapsed" : ""}`}
      style={{ width: collapsed ? 50 : width }}
    >
      {children}
      {!collapsed && (
        <div
          className={`sb-resize-handle${dragging ? " dragging" : ""}`}
          onMouseDown={startResize}
        />
      )}
      <div
        className="sb-collapse-btn"
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? "›" : "‹"}
      </div>
    </aside>
  );
}

export default ResizableSidebar;