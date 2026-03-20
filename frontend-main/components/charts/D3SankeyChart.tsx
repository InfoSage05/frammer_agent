// @ts-nocheck
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
// @ts-nocheck
import * as d3 from 'd3';

import { useRef, useEffect, useCallback } from "react";

function D3SankeyChart({ type = "funnel", theme, dataMap = {} }) {
  const ref = useRef(null);
  const dark = theme !== "light";

  const getSankeyData = useCallback((t) => {
    const COLORS16 = [
      "#ff4757",
      "#1D9E75",
      "#ffffff",
      "rgba(255,71,87,0.78)",
      "rgba(255,255,255,0.78)",
      "rgba(255,71,87,0.62)",
      "rgba(255,255,255,0.62)",
      "#3EC98A",
      "#0F6E56",
      "rgba(255,71,87,0.48)",
      "rgba(255,255,255,0.48)",
      "rgba(255,71,87,0.34)",
      "rgba(62,201,138,0.72)",
      "rgba(255,255,255,0.34)",
      "rgba(255,71,87,0.22)",
      "rgba(255,255,255,0.22)",
    ];
    const sectionData = dataMap[t];
    if (!sectionData) return { nodes: [], links: [] };
    const nodes = (sectionData.nodes || []).map((name) => ({ name }));
    const idx = (n) => nodes.findIndex((x) => x.name === n);
    const links = (sectionData.links || []).map((link) => ({
      source: typeof link.source === "number" ? link.source : idx(link.source),
      target: typeof link.target === "number" ? link.target : idx(link.target),
      value: link.value,
    }));
    return { nodes, links };
  }, [dataMap]);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    container.innerHTML = "";
    const W = container.clientWidth || 700,
      H = 380;
    const { nodes, links } = getSankeyData(type);
    if (!nodes.length) return;
    const textColor = dark ? "#ffffff" : "#0e0f11";
    const COLORS16 = [
      "#ff4757",
      "#1D9E75",
      "#ffffff",
      "rgba(255,71,87,0.78)",
      "rgba(255,255,255,0.78)",
      "rgba(255,71,87,0.62)",
      "rgba(255,255,255,0.62)",
      "#3EC98A",
      "#0F6E56",
      "rgba(255,71,87,0.48)",
      "rgba(255,255,255,0.48)",
      "rgba(255,71,87,0.34)",
      "rgba(62,201,138,0.72)",
      "rgba(255,255,255,0.34)",
      "rgba(255,71,87,0.22)",
      "rgba(255,255,255,0.22)",
    ];

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", "100%")
      .attr("viewBox", `0 0 ${W} ${H}`)
      .style("display", "block");
    const sankeyInst = sankey()
      .nodeWidth(16)
      .nodePadding(type === "funnel" ? 28 : 8)
      .extent([
        [32, 14],
        [W - 130, H - 14],
      ]);
    let sdata;
    try {
      sdata = sankeyInst({
        nodes: nodes.map((d) => Object.assign({}, d)),
        links: links.map((d) => Object.assign({}, d)),
      });
    } catch (e) {
      return;
    }
    const { nodes: N, links: L } = sdata;
    const defs = svg.append("defs");
    L.forEach((l, i) => {
      const id = "slg" + i;
      const grad = defs
        .append("linearGradient")
        .attr("id", id)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", l.source.x1)
        .attr("x2", l.target.x0);
      grad
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", COLORS16[l.source.index % COLORS16.length])
        .attr("stop-opacity", 0.5);
      grad
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", COLORS16[l.target.index % COLORS16.length])
        .attr("stop-opacity", 0.3);
    });
    svg
      .append("g")
      .selectAll("path")
      .data(L)
      .join("path")
      .attr("d", sankeyLinkHorizontal())
      .attr("stroke", (_, i) => `url(#slg${i})`)
      .attr("stroke-width", (d) => Math.max(1, d.width))
      .attr("fill", "none")
      .attr("opacity", 0.8)
      .on("mouseover", function () {
        d3.select(this).attr("opacity", 1);
      })
      .on("mouseout", function () {
        d3.select(this).attr("opacity", 0.8);
      });
    const g = svg.append("g").selectAll("g").data(N).join("g");
    g.append("rect")
      .attr("x", (d) => d.x0)
      .attr("y", (d) => d.y0)
      .attr("width", (d) => d.x1 - d.x0)
      .attr("height", (d) => Math.max(2, d.y1 - d.y0))
      .attr("fill", (d) => COLORS16[d.index % COLORS16.length])
      .attr("rx", 2)
      .attr("opacity", 0.9);
    g.append("text")
      .attr("x", (d) => (d.x1 > W / 2 ? d.x0 - 5 : d.x1 + 5))
      .attr("y", (d) => (d.y0 + d.y1) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", (d) => (d.x1 > W / 2 ? "end" : "start"))
      .attr("font-size", 10)
      .attr("fill", textColor)
      .attr("font-family", "var(--font-mono)")
      .text((d) => {
        const v = d.value;
        const lbl = d.name.length > 14 ? d.name.slice(0, 13) + "…" : d.name;
        return `${lbl} (${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v})`;
      });
  }, [type, theme, getSankeyData, dark]);

  return <div ref={ref} id="d3-sankey-container" style={{ width: "100%" }} />;
}

export default D3SankeyChart;
