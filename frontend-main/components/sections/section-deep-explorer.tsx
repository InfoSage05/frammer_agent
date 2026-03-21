// @ts-nocheck
import useChartJs from '@/components/charts/ChartJSWrapper';
import useJsonData from '@/hooks/useJsonData';
import { useLiveSectionData } from '@/hooks/useDashboardData';
import { useState } from "react";
import ScatterChart from "../charts/ScatterChart";
import ChannelPlatformHeatmap from "../charts/ChannelHeatmap";
import Ring from "../charts/Ring";
import DonutChart from "../charts/DonutCharts";
import BarRow from "../charts/BarRow";
import KPITree from "../charts/KPITree";
import D3CollapsibleTree from "../charts/D3CollapsibleTree";
import GraphActionButtons from "../ui/GraphActionButtons";
import GraphFlip from "../ui/GraphFlip";
import GraphInsights from "../ui/GraphInsights";
import SectionInfoHint from '@/components/ui/SectionInfoHint';
import { useDash } from '@/lib/contexts';
import { M } from '@/lib/constants';

/* ─────────────────────────────────────────────────────────────
   Advanced KPI — Platform Efficiency Score & Geo Value Index
───────────────────────────────────────────────────────────── */
function AdvancedKPITab({ onAskAI }) {
  const [kpiTab, setKpiTab] = useState("pes");
  const [pesCpw, setPesCpw] = useState(3.15);
  const [pesAvg, setPesAvg] = useState(3.15);
  const [gviCpw, setGviCpw] = useState(2.0);
  const [gviBudget, setGviBudget] = useState(1000);

  const MARKET_AVG = 3.15;
  const GEO_AVG = 2.0;
  const MONO = "var(--font-mono)";
  const SERIF = "var(--font-serif)";
  const SANS = "var(--font-sans)";

  // PES
  const pes = pesAvg / pesCpw;
  const pesWph = 1 / pesCpw;
  const pesSave = Math.max(0, (pesAvg - pesCpw) * 100 / pesAvg);
  const pesC = pes >= 1.5 ? "var(--green-lt)" : pes < 0.8 ? "var(--pri)" : "var(--amber-lt)";
  const pesVerd = pes >= 2
    ? { k: "good", t: `Excellent — PES ${pes.toFixed(2)}. Buying at ${((1/pes)*100).toFixed(0)}% of market rate. Strong ROI.` }
    : pes >= 1.2
    ? { k: "good", t: `Good — PES ${pes.toFixed(2)}. Slightly below market rate. Solid efficiency.` }
    : pes >= 0.85
    ? { k: "mid", t: `Average — PES ${pes.toFixed(2)}. Near market average. No significant advantage.` }
    : { k: "bad", t: `Premium — PES ${pes.toFixed(2)}. Paying ${((1/pes - 1)*100).toFixed(0)}% above market. Justify with audience quality.` };

  // GVI
  const gvi = (GEO_AVG / gviCpw) * 100;
  const gviHours = gviBudget / gviCpw;
  const gviImpr = (gviBudget / gviCpw) * 60 * 3 / 1000;
  const gviC = gvi >= 200 ? "var(--green-lt)" : gvi < 70 ? "var(--pri)" : "var(--amber-lt)";
  const gviVerd = gvi >= 300
    ? { k: "good", t: `High-reach — GVI ${Math.round(gvi)}. Your $${gviBudget.toLocaleString()} buys ${Math.round(gviHours).toLocaleString()} watch hours, ${(gvi/100).toFixed(1)}× the global average.` }
    : gvi >= 150
    ? { k: "good", t: `Good value — GVI ${Math.round(gvi)}. Above-average reach for your budget.` }
    : gvi >= 70
    ? { k: "mid",  t: `Near global average — GVI ${Math.round(gvi)}. Typical cost for this market.` }
    : { k: "bad",  t: `Premium market — GVI ${Math.round(gvi)}. Low reach per dollar. Audience quality must justify the spend.` };

  const VC = {
    good: { bg: "rgba(62,201,138,.10)", border: "rgba(62,201,138,.25)", color: "var(--green-lt)" },
    mid:  { bg: "rgba(255,179,64,.10)", border: "rgba(255,179,64,.25)", color: "var(--amber-lt)" },
    bad:  { bg: "rgba(255,71,87,.10)",  border: "rgba(255,71,87,.25)",  color: "var(--pri)" },
  };

  const pesPlatforms = [
    {p:"YouTube Shorts",cpw:5.0},{p:"Instagram Reels",cpw:6.0},
    {p:"Facebook Reels",cpw:6.0},{p:"X / Twitter",cpw:7.0},
    {p:"Threads",cpw:6.0},{p:"LinkedIn",cpw:12.0},
  ].sort((a,b)=>a.cpw-b.cpw);

  const gviConts = [
    {c:"North America",cpw:6.72},{c:"Europe",cpw:4.8},
    {c:"Oceania",cpw:7.68},{c:"East Asia",cpw:3.84},
    {c:"Middle East",cpw:2.4},{c:"Latin America",cpw:1.2},
    {c:"South Asia",cpw:0.58},{c:"Africa",cpw:1.2},
  ].sort((a,b)=>b.cpw-a.cpw);

  const FormulaBox = ({ label, text }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", background: "rgba(255,255,255,.03)", border: "0.5px solid var(--line-lt)", borderRadius: 8, padding: "12px 16px", marginBottom: 8 }}>
      <span style={{ fontFamily: MONO, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink4)", minWidth: 60 }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 12, color: "var(--ink2)", fontWeight: 500 }}>{text}</span>
    </div>
  );

  const ExCard = ({ title, body, result, note }) => (
    <div style={{ background: "rgba(255,255,255,.04)", border: "0.5px solid var(--line-lt)", borderRadius: 10, padding: 18 }}>
      <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink3)", marginBottom: 10 }}>{title}</div>
      <div style={{ fontFamily: SANS, fontSize: 12, color: "var(--ink3)", lineHeight: 1.7, marginBottom: 10 }} dangerouslySetInnerHTML={{ __html: body }} />
      <div style={{ fontFamily: SERIF, fontSize: 20, marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: result }} />
      <div style={{ fontFamily: SANS, fontSize: 11, color: "var(--ink4)" }}>{note}</div>
    </div>
  );

  const GaugeRow = ({ items }) => (
    <div style={{ display: "flex", gap: 14, marginTop: 16, flexWrap: "wrap" }}>
      {items.map((g, i) => (
        <div key={i} style={{ flex: 1, minWidth: 100, textAlign: "center" }}>
          <div style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1, marginBottom: 4, color: g.color, transition: "color .3s" }}>{g.val}</div>
          <div style={{ height: 4, background: "var(--line-lt)", borderRadius: 2, margin: "6px 4px", overflow: "hidden" }}>
            <div style={{ height: 4, borderRadius: 2, background: g.color, width: Math.min(100, g.barW) + "%", transition: "width .35s ease, background .3s" }} />
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink4)", lineHeight: 1.4 }}>{g.label}</div>
        </div>
      ))}
    </div>
  );

  const SimSlider = ({ label, min, max, step, val, set, fmt, accent }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <label style={{ fontFamily: SANS, fontSize: 12, color: "var(--ink3)", minWidth: 150 }}>{label}</label>
      <input type="range" min={min} max={max} step={step} value={val}
        onChange={e => set(+e.target.value)}
        style={{ flex: 1, height: 4, accentColor: accent, cursor: "pointer" }} />
      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 500, color: "var(--ink2)", minWidth: 60, textAlign: "right" }}>{fmt(val)}</span>
    </div>
  );

  const TH = { fontFamily: MONO, fontSize: 9, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", padding: "5px 8px", color: "var(--ink4)", borderBottom: "0.5px solid var(--line)", textAlign: "left" };
  const TD = { padding: "7px 8px", borderBottom: "0.5px solid var(--line-lt)" };

  return (
    <div className="stack">
      {/* Sub-tab strip */}
      <div style={{ display: "flex", gap: 8 }}>
        {[["pes","Platform Efficiency Score"],["gvi","Geo Value Index"]].map(([k, label]) => (
          <button key={k} onClick={() => setKpiTab(k)} style={{
            padding: "7px 18px",
            fontFamily: MONO, fontSize: 10, fontWeight: 600,
            letterSpacing: "0.08em", textTransform: "uppercase",
            borderRadius: 6, border: "1px solid",
            cursor: "pointer",
            background: kpiTab === k ? (k === "pes" ? "rgba(59,139,212,.12)" : "rgba(255,71,87,.12)") : "transparent",
            borderColor: kpiTab === k ? (k === "pes" ? "rgba(59,139,212,.45)" : "rgba(255,71,87,.4)") : "var(--line)",
            color: kpiTab === k ? (k === "pes" ? "#3B8BD4" : "var(--pri)") : "var(--ink3)",
            transition: "all 0.18s ease",
          }}>{label}</button>
        ))}
      </div>

      {/* ── PES Tab ── */}
      {kpiTab === "pes" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ height: 3, background: "linear-gradient(90deg,#3B8BD4,#1D9E75)" }} />
          <div style={{ padding: "24px 28px" }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#3B8BD4", marginBottom: 6 }}>
                  Dataset 1 · Platform × Topic Ad Cost
                </div>
                <div style={{ fontFamily: SERIF, fontSize: 26, color: "var(--ink)", marginBottom: 6 }}>
                  Platform Efficiency Score
                </div>
                <div style={{ fontFamily: SANS, fontSize: 13, color: "var(--ink3)", lineHeight: 1.6, maxWidth: 560 }}>
                  How much watch-time bang do you get per dollar, relative to the market average? A score above 1.0 means you're buying cheaper than the norm.
                </div>
              </div>
              <GraphActionButtons insightsOpen={false} onToggleInsights={() => {}} onAskAI={() => onAskAI && onAskAI("Platform Efficiency Score", {})} />
            </div>

            <FormulaBox label="Formula" text="PES = Avg CPW (all platforms) ÷ CPW (chosen platform & topic)" />
            <FormulaBox label="Interpret" text="PES > 1.0 → cheaper than average  |  PES = 1.0 → at par  |  PES < 1.0 → paying a premium" />

            {/* Examples */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 20, marginBottom: 24 }}>
              <ExCard
                title="Example A — Budget campaign"
                body="Running a <strong>Vlogging</strong> ad on <strong>YouTube Shorts</strong>.<br/>CPW = $0.80 &nbsp;·&nbsp; Market avg = $3.15"
                result={`<span style="color:var(--green-lt)">PES = 3.15 ÷ 0.80 = <span style="font-size:26px">3.94</span></span>`}
                note="Nearly 4× more efficient than average. Every $1 buys 4 hours of watch time vs 1 hour elsewhere."
              />
              <ExCard
                title="Example B — Premium campaign"
                body="Running a <strong>Finance</strong> ad on <strong>LinkedIn</strong>.<br/>CPW = $12.00 &nbsp;·&nbsp; Market avg = $3.15"
                result={`<span style="color:var(--pri)">PES = 3.15 ÷ 12.00 = <span style="font-size:26px">0.26</span></span>`}
                note="Only 26% as efficient as average. You're paying 4× more per watch hour than the norm."
              />
            </div>

            {/* Simulator */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink3)", marginBottom: 14 }}>
                Try it — PES Simulator
              </div>
              <SimSlider label="Your CPW ($)" min={0.8} max={12} step={0.1} val={pesCpw} set={setPesCpw} fmt={v => "$"+v.toFixed(2)} accent="#3B8BD4" />
              <SimSlider label="Market avg CPW ($)" min={1} max={6} step={0.05} val={pesAvg} set={setPesAvg} fmt={v => "$"+v.toFixed(2)} accent="#3B8BD4" />
              <GaugeRow items={[
                { label: "Platform Efficiency Score", val: pes.toFixed(2), color: pesC, barW: pes/5*100 },
                { label: "Watch hours per $1 spent",  val: pesWph.toFixed(1)+"h", color: "#1D9E75", barW: pesWph/4*100 },
                { label: "Savings per $100 vs avg",   val: "$"+pesSave.toFixed(0), color: "var(--amber-lt)", barW: pesSave },
              ]} />
              <div style={{ marginTop: 14, borderRadius: 8, padding: "10px 16px", fontFamily: SANS, fontSize: 12, lineHeight: 1.6, background: VC[pesVerd.k].bg, color: VC[pesVerd.k].color, border: `0.5px solid ${VC[pesVerd.k].border}`, transition: "background .3s, color .3s" }}>
                {pesVerd.t}
              </div>
            </div>

            {/* PES ranking table */}
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink3)", marginBottom: 12 }}>
                PES Ranking — all platforms, Finance topic
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>{["Platform","CPW","PES","Efficiency"].map((h,i) => <th key={h} style={{ ...TH, width: i===3?120:"auto" }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {pesPlatforms.map(r => {
                    const p = (MARKET_AVG / r.cpw).toFixed(2);
                    const c = +p >= 1 ? "var(--green-lt)" : "var(--pri)";
                    return (
                      <tr key={r.p}>
                        <td style={{ ...TD, fontFamily: SANS, color: "var(--ink2)" }}>{r.p}</td>
                        <td style={{ ...TD, fontFamily: MONO, color: "var(--ink3)" }}>${r.cpw.toFixed(2)}</td>
                        <td style={{ ...TD, fontFamily: MONO, fontWeight: 600, color: c }}>{p}</td>
                        <td style={TD}>
                          <div style={{ background: "var(--line-lt)", borderRadius: 3, height: 6, overflow: "hidden" }}>
                            <div style={{ height: 6, borderRadius: 3, background: c, width: Math.min(100,(+p/5)*100)+"%" }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── GVI Tab ── */}
      {kpiTab === "gvi" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ height: 3, background: "linear-gradient(90deg,#EF9F27,#E24B4A)" }} />
          <div style={{ padding: "24px 28px" }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--amber-lt)", marginBottom: 6 }}>
                  Dataset 2 · YouTube Continent × Topic Ad Cost
                </div>
                <div style={{ fontFamily: SERIF, fontSize: 26, color: "var(--ink)", marginBottom: 6 }}>
                  Geo Value Index
                </div>
                <div style={{ fontFamily: SANS, fontSize: 13, color: "var(--ink3)", lineHeight: 1.6, maxWidth: 560 }}>
                  Not all cheap markets are equal — this index scores each region by dividing reach per dollar by its market cost tier, revealing where you get high volume <em>and</em> value.
                </div>
              </div>
              <GraphActionButtons insightsOpen={false} onToggleInsights={() => {}} onAskAI={() => onAskAI && onAskAI("Geo Value Index", {})} />
            </div>

            <FormulaBox label="Formula" text="GVI = (Global avg CPW ÷ Local CPW) × 100" />
            <FormulaBox label="Interpret" text="GVI 100 = at global avg  |  GVI > 100 → above-average reach per $  |  GVI < 100 → premium market" />

            {/* Examples */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 20, marginBottom: 24 }}>
              <ExCard
                title="Example A — Reach campaign"
                body="Running a <strong>Tech_AI</strong> ad in <strong>South Asia</strong>.<br/>Local CPW = $0.36 &nbsp;·&nbsp; Global avg = $2.00"
                result={`<span style="color:var(--green-lt)">GVI = (2.00 ÷ 0.36) × 100 = <span style="font-size:26px">556</span></span>`}
                note="$100 buys 278 hours of Tech AI watch time here vs just 50 hours globally. Massive reach multiplier."
              />
              <ExCard
                title="Example B — Quality campaign"
                body="Running a <strong>Finance</strong> ad in <strong>Oceania</strong>.<br/>Local CPW = $7.68 &nbsp;·&nbsp; Global avg = $2.00"
                result={`<span style="color:var(--pri)">GVI = (2.00 ÷ 7.68) × 100 = <span style="font-size:26px">26</span></span>`}
                note="$100 buys only 13 watch hours vs 50 globally. You're paying for audience quality, not volume."
              />
            </div>

            {/* Simulator */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink3)", marginBottom: 14 }}>
                Try it — GVI Simulator
              </div>
              <SimSlider label="Local CPW ($)" min={0.12} max={7.68} step={0.01} val={gviCpw} set={setGviCpw} fmt={v => "$"+v.toFixed(2)} accent="#EF9F27" />
              <SimSlider label="Budget ($)" min={100} max={10000} step={100} val={gviBudget} set={setGviBudget} fmt={v => "$"+v.toLocaleString()} accent="#EF9F27" />
              <GaugeRow items={[
                { label: "Geo Value Index",          val: Math.round(gvi),  color: gviC, barW: gvi/8 },
                { label: "Watch hours bought",       val: gviHours >= 1000 ? (gviHours/1000).toFixed(1)+"K" : Math.round(gviHours)+"h", color: "#3B8BD4", barW: gviHours/gviBudget*10 },
                { label: "Est. impressions",         val: gviImpr >= 1000 ? (gviImpr/1000).toFixed(1)+"M" : Math.round(gviImpr)+"K", color: "#1D9E75", barW: gviImpr/1000*20 },
              ]} />
              <div style={{ marginTop: 14, borderRadius: 8, padding: "10px 16px", fontFamily: SANS, fontSize: 12, lineHeight: 1.6, background: VC[gviVerd.k].bg, color: VC[gviVerd.k].color, border: `0.5px solid ${VC[gviVerd.k].border}`, transition: "background .3s, color .3s" }}>
                {gviVerd.t}
              </div>
            </div>

            {/* GVI ranking table */}
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink3)", marginBottom: 12 }}>
                GVI Ranking — all continents, Finance topic
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>{["Continent","CPW","GVI","Watch hrs per $100"].map((h,i) => <th key={h} style={{ ...TH, width: i===3?170:"auto" }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {gviConts.map(r => {
                    const gviR = Math.round((GEO_AVG / r.cpw) * 100);
                    const hrs = (100 / r.cpw).toFixed(1);
                    const c = gviR >= 100 ? "var(--green-lt)" : "var(--pri)";
                    return (
                      <tr key={r.c}>
                        <td style={{ ...TD, fontFamily: SANS, color: "var(--ink2)" }}>{r.c}</td>
                        <td style={{ ...TD, fontFamily: MONO, color: "var(--ink3)" }}>${r.cpw.toFixed(2)}</td>
                        <td style={{ ...TD, fontFamily: MONO, fontWeight: 600, color: c }}>{gviR}</td>
                        <td style={TD}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, background: "var(--line-lt)", borderRadius: 3, height: 6, overflow: "hidden" }}>
                              <div style={{ height: 6, borderRadius: 3, background: c, width: Math.min(100, gviR/8)+"%" }} />
                            </div>
                            <span style={{ fontFamily: MONO, fontSize: 11, minWidth: 36, color: "var(--ink3)" }}>{hrs}h</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionExplorer({ theme, onAskAI }) {
  const dash = useDash();
  const { data: staticData } = useJsonData("explorer");
  const data = useLiveSectionData("explorer", dash?.liveDashboard, staticData);
  const [subView, setSubView] = useState("users");
  const [userSort, setUserSort] = useState("created");
  const [treeRoot, setTreeRoot] = useState("channel");
  const [treeChild, setTreeChild] = useState("user");
  const [treeMetric, setTreeMetric] = useState("cr");
  const [insightsOpen, setInsightsOpen] = useState({});
  const USERS = data?.users || [];
  const LANGUAGES = data?.languages || [];
  const toggleInsights = (key) =>
    setInsightsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  const unusual = USERS.filter((u) => u.created > 400 && u.published === 0).map(
    (u) => u.user,
  );

  const sortedUsers = [...USERS].sort((a, b) => b[userSort] - a[userSort]);
  const topPublishers = USERS.filter((u) => u.published > 0)
    .sort((a, b) => b.published - a.published)
    .slice(0, 6);
  const channelHeatmapData = (data?.platformHeatmap || []).map((row) => ({
    channel: row.channel,
    platforms: (data?.platformNames || []).reduce((acc, platform, idx) => {
      acc[platform] = row.values[idx];
      return acc;
    }, {}),
  }));
  const dataQualityRows = data?.dataQualityRows || [];
  const TICK_OPT = {
    color: theme === "light" ? "#000000" : "#ffffff",
    font: { size: 10, family: "var(--font-mono)" },
  };
  const GRID_OPT = { color: "var(--chart-grid)" };
  const TT_OPT = {
    backgroundColor:
      theme === "dark" ? "rgba(20,16,10,0.92)" : "rgba(255,252,248,0.96)",
    titleColor: "var(--ink)",
    bodyColor: "var(--ink3)",
    padding: 8,
    cornerRadius: 4,
    borderColor: "var(--line)",
    borderWidth: 1,
  };

  const userBarRef = useChartJs(
    "explorer-userbar",
    {
      type: "bar",
      data: {
        labels: USERS.slice(0, 12).map((u) => u.user.split(" ")[0]),
        datasets: [
          {
            label: "Created",
            data: USERS.slice(0, 12).map((u) => u.created),
            backgroundColor: "rgba(232,38,90,0.55)",
            borderColor: "#e8265a",
            borderWidth: 1,
          },
          {
            label: "Published",
            data: USERS.slice(0, 12).map((u) => u.published),
            backgroundColor: "rgba(48,176,96,0.65)",
            borderColor: "#30b060",
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
          x: { ticks: TICK_OPT, grid: GRID_OPT },
          y: {
            ticks: { ...TICK_OPT, font: { size: 10 } },
            grid: GRID_OPT,
          },
        },
      },
    },
    [theme, USERS],
  );

  const paretoRef = useChartJs(
    "explorer-pareto",
    {
      type: "bar",
      data: (() => {
        const sorted = [...USERS].sort((a, b) => b.created - a.created);
        const total = sorted.reduce((s, u) => s + u.created, 0);
        let cum = 0;
        const cumPct = sorted.map((u) => {
          cum += u.created;
          return +((cum / total) * 100).toFixed(1);
        });
        return {
          labels: sorted.slice(0, 12).map((u, i) => u.user.split(" ")[0]),
          datasets: [
            {
              type: "bar",
              label: "Created",
              data: sorted.slice(0, 12).map((u) => u.created),
              backgroundColor: "rgba(232,38,90,0.55)",
              borderColor: "#e8265a",
              borderWidth: 1,
              yAxisID: "y",
            },
            {
              type: "line",
              label: "Cumulative %",
              data: cumPct.slice(0, 12),
              borderColor: "#e03030",
              borderWidth: 2,
              pointRadius: 3,
              yAxisID: "y2",
              fill: false,
              tension: 0.3,
            },
          ],
        };
      })(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: TT_OPT },
        scales: {
          x: { ticks: { ...TICK_OPT, maxRotation: 45 }, grid: GRID_OPT },
          y: { ticks: TICK_OPT, grid: GRID_OPT },
          y2: {
            position: "right",
            min: 0,
            max: 100,
            ticks: { ...TICK_OPT, callback: (v) => v + "%" },
            grid: { display: false },
          },
        },
      },
    },
    [theme, USERS],
  );

  if (!data) return null;

  const SIGNALS = {
    users: {
      a: <>Top <span className="sig-val">{unusual.length > 0 ? unusual.length : 3} users</span> account for <span className="sig-val">61%</span> of total watch time — <span className="sig-warn">{unusual.length} flagged</span> with high creation and zero publications.</>,
      b: <>Quality score sitting at <span className="sig-pos">78 / 100</span>, up from last period — sort by any metric to drill down.</>,
    },
    channels: {
      a: <><span className="sig-val">18</span> channels tracked across <span className="sig-val">4</span> platforms — heatmap reveals <span className="sig-warn">3 underperforming</span> channels with low coverage.</>,
      b: <>Ch-A leads across all platform metrics — <span className="sig-warn">6 channels</span> have zero publications this period.</>,
    },
    advanced_kpi: {
      a: <>Full KPI reference framework — <span className="sig-val">24 metrics</span> across 4 operational tiers with definitions and formulas.</>,
      b: <>This view is for advanced analysis — use the hierarchy to trace metric dependencies upstream.</>,
    },
  };

  const sig = SIGNALS[subView] || SIGNALS.users;

  return (
    <div className="fade-up">
      <div className="sub-tabs">
        {data.subTabs.map(([k, l]) => (
          <div
            key={k}
            className={`sub-tab${subView === k ? " active" : ""}${k === "advanced_kpi" ? " premium" : ""}`}
            onClick={() => setSubView(k)}
          >
            {l}
          </div>
        ))}
      </div>

      {subView === "users" && (
        <div className="stack">
          <div className="filter-panel">
            <div className="filter-group">
              <div className="filter-group-label">Sort by</div>
              <div className="dim-row">
                {data.userSortOptions.map(([k, l]) => (
                  <button
                    key={k}
                    className={`dim-opt${userSort === k ? " active" : ""}`}
                    onClick={() => setUserSort(k)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="g-6-4">
            <div className="card" style={{ padding: 0 }}>
              <div className="card-head">
                <span className="card-lbl">User Performance Matrix</span>
                <GraphActionButtons
                  insightsOpen={!!insightsOpen.userMatrix}
                  onToggleInsights={() => toggleInsights("userMatrix")}
                  onAskAI={() =>
                    onAskAI &&
                    onAskAI("User Performance Matrix", {
                      sortBy: userSort,
                      users: sortedUsers,
                    })
                  }
                />
              </div>
              <GraphFlip
                flipped={!!insightsOpen.userMatrix}
                minHeight={380}
                front={<table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Uploaded</th>
                    <th>Created</th>
                    <th>Published</th>
                    <th>Pub Rate</th>
                    <th>Hrs</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map((u) => {
                    const rate = ((u.published / u.uploaded) * 100).toFixed(1);
                    const isA = u.created > 400 && u.published === 0;
                    return (
                      <tr key={u.user} className={isA ? "anomaly" : ""}>
                        <td
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                          }}
                        >
                          {isA && (
                            <span
                              className="pdot pdot-a"
                              style={{ marginRight: 5 }}
                            />
                          )}
                          {u.user}
                        </td>
                        <td
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10.5,
                          }}
                        >
                          {u.uploaded}
                        </td>
                        <td
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10.5,
                            color: "var(--pri)",
                          }}
                        >
                          {u.created}
                        </td>
                        <td
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10.5,
                            color:
                              u.published === 0
                                ? "var(--red-lt)"
                                : "var(--green-lt)",
                          }}
                        >
                          {u.published}
                        </td>
                        <td>
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 9.5,
                              color:
                                parseFloat(rate) > 3
                                  ? "var(--green-lt)"
                                  : parseFloat(rate) > 0
                                    ? "var(--warn)"
                                    : "var(--red-lt)",
                            }}
                          >
                            {rate}%
                          </span>
                        </td>
                        <td
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 9.5,
                            color: "var(--ink3)",
                          }}
                        >
                          {u.uploadedH.toFixed(0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>}
                back={<GraphInsights title="User Performance Matrix" />}
              />
            </div>
            <div className="stack">
              <div className="card" style={{ padding: "13px 15px" }}>
                <div
                  style={{
                    fontSize: 8,
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--ink3)",
                    marginBottom: 8,
                  }}
                >
                  TOP PUBLISHERS
                </div>
                <div style={{ marginBottom: 8, display: "flex", justifyContent: "flex-end" }}>
                  <GraphActionButtons
                    insightsOpen={!!insightsOpen.topPublishers}
                    onToggleInsights={() => toggleInsights("topPublishers")}
                    onAskAI={() =>
                      onAskAI &&
                      onAskAI("Top Publishers", {
                        users: topPublishers,
                      })
                    }
                  />
                </div>
                <GraphFlip
                  flipped={!!insightsOpen.topPublishers}
                  minHeight={180}
                  front={<>{topPublishers.map((u) => (
                    <BarRow
                      key={u.user}
                      label={u.user}
                      value={u.published}
                      max={Math.max(...USERS.map((x) => x.published))}
                      fillClass="bf-gold"
                    />
                  ))}</>}
                  back={<GraphInsights title="Top Publishers" />}
                />
              </div>
              <div className="card" style={{ padding: "13px 15px" }}>
                <div
                  style={{
                    fontSize: 8,
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                   color: "var(--warn)",
                   marginBottom: 8,
                 }}
               >
                 HIGH VOLUME · ZERO PUBLISH
                </div>
                <div style={{ marginBottom: 8, display: "flex", justifyContent: "flex-end" }}>
                  <GraphActionButtons
                    insightsOpen={!!insightsOpen.zeroPublishUsers}
                    onToggleInsights={() => toggleInsights("zeroPublishUsers")}
                    onAskAI={() =>
                      onAskAI &&
                      onAskAI("High Volume Zero Publish Users", {
                        users: unusual,
                      })
                    }
                  />
                </div>
                <GraphFlip
                  flipped={!!insightsOpen.zeroPublishUsers}
                  minHeight={180}
                  front={<>{unusual.map((u) => (
                  <div
                    key={u}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "5px 0",
                      borderBottom: "1px solid var(--line-lt)",
                      fontSize: 11,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--ink3)",
                        fontSize: 10,
                      }}
                    >
                      {u}
                    </span>
                    <span
                      className="badge badge-amber"
                      style={{ fontSize: 7.5 }}
                    >
                      flagged
                    </span>
                  </div>
                ))}</>}
                  back={<GraphInsights title="High Volume Zero Publish Users" />}
                />
              </div>
            </div>
          </div>
          <div className="g2">
            <div className="card" style={{ padding: "16px 18px" }}>
              <div
                style={{
                  fontSize: 8,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--ink3)",
                  marginBottom: 12,
                }}
              >
                TOP 12 USERS — CREATED VS PUBLISHED
              </div>
              <div style={{ marginBottom: 10, display: "flex", justifyContent: "flex-end" }}>
                <GraphActionButtons
                  insightsOpen={!!insightsOpen.top12Users}
                  onToggleInsights={() => toggleInsights("top12Users")}
                  onAskAI={() =>
                    onAskAI &&
                    onAskAI("Top 12 Users Created vs Published", {
                      users: USERS.slice(0, 12).map((u) => ({
                        user: u.user,
                        created: u.created,
                        published: u.published,
                      })),
                    })
                  }
                />
              </div>
              <div className="legend" style={{ marginBottom: 10 }}>
                {[
                  ["Created", "#e8625a"],
                  ["Published", "#30b060"],
                ].map(([l, c]) => (
                  <div key={l} className="leg-item">
                    <div className="leg-dot" style={{ background: c }} />
                    {l}
                  </div>
                ))}
              </div>
              <GraphFlip
                flipped={!!insightsOpen.top12Users}
                minHeight={320}
                front={
                  <div className="cjs-wrap" style={{ height: 320 }}>
                    <canvas ref={userBarRef} />
                  </div>
                }
                back={<GraphInsights title="Top 12 Users Created vs Published" />}
              />
            </div>
            <div className="card" style={{ padding: "16px 18px" }}>
              <div
                style={{
                  fontSize: 8,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--ink3)",
                  marginBottom: 12,
                }}
              >
                USER CONCENTRATION — PARETO
              </div>
              <div style={{ marginBottom: 10, display: "flex", justifyContent: "flex-end" }}>
                <GraphActionButtons
                  insightsOpen={!!insightsOpen.pareto}
                  onToggleInsights={() => toggleInsights("pareto")}
                  onAskAI={() =>
                    onAskAI &&
                    onAskAI("User Concentration Pareto", {
                      users: [...USERS]
                        .sort((a, b) => b.created - a.created)
                        .map((u) => ({
                          user: u.user,
                          created: u.created,
                        })),
                    })
                  }
                />
              </div>
              <div
                style={{
                  fontSize: 9,
                  fontFamily: "var(--font-mono)",
                  color: "var(--ink4)",
                  marginBottom: 10,
                }}
              >
                Bar = created volume · Line = cumulative %
              </div>
              <GraphFlip
                flipped={!!insightsOpen.pareto}
                minHeight={320}
                front={
                  <div className="cjs-wrap" style={{ height: 320 }}>
                    <canvas ref={paretoRef} />
                  </div>
                }
                back={<GraphInsights title="User Concentration Pareto" />}
              />
            </div>
          </div>
        </div>
      )}

      {subView === "channels" && (
        <div className="stack">
          <div className="card" style={{ padding: "16px 18px" }}>
            <div
              style={{
                fontSize: 8,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--ink3)",
                marginBottom: 12,
              }}
              >
                USER EFFICIENCY — UPLOADS vs CREATED (size = published)
              </div>
            <div style={{ marginBottom: 10, display: "flex", justifyContent: "flex-end" }}>
              <GraphActionButtons
                insightsOpen={!!insightsOpen.scatter}
                onToggleInsights={() => toggleInsights("scatter")}
                onAskAI={() =>
                  onAskAI &&
                  onAskAI("User Efficiency Scatter", {
                    users: USERS.map((u) => ({
                      user: u.user,
                      uploaded: u.uploaded,
                      created: u.created,
                      published: u.published,
                    })),
                  })
                }
              />
            </div>
            <div
              style={{
                fontSize: 9,
                fontFamily: "var(--font-mono)",
                color: "var(--ink4)",
                marginBottom: 10,
              }}
            >
               Color: <span style={{ color: "var(--pri)" }}>●</span> &gt;10 pub{" "}
               <span style={{ color: "var(--warn)" }}>●</span> 1–10{" "}
              <span style={{ color: "var(--red-lt)" }}>●</span> 0 pub
            </div>
            <GraphFlip
              flipped={!!insightsOpen.scatter}
              minHeight={240}
              front={
                <ScatterChart
                  data={USERS}
                  height={220}
                  xKey="uploaded"
                  yKey="created"
                  rKey="published"
                  xLabel="Uploads"
                  yLabel="Created"
                  theme={theme}
                />
              }
              back={<GraphInsights title="User Efficiency Scatter" />}
            />
          </div>
          <div className="card" style={{ padding: "16px 18px" }}>
            <div
              style={{
                fontSize: 8,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--ink3)",
                marginBottom: 12,
              }}
              >
                PLATFORM × CHANNEL HEATMAP
              </div>
            <div style={{ marginBottom: 12, display: "flex", justifyContent: "flex-end" }}>
              <GraphActionButtons
                insightsOpen={!!insightsOpen.channelHeatmap}
                onToggleInsights={() => toggleInsights("channelHeatmap")}
                onAskAI={() =>
                  onAskAI &&
                  onAskAI("Platform × Channel Heatmap", {
                    data: channelHeatmapData,
                  })
                }
              />
            </div>
            <GraphFlip
              flipped={!!insightsOpen.channelHeatmap}
              minHeight={260}
              front={
                <ChannelPlatformHeatmap
                  platforms={data.platformNames}
                  rows={data.platformHeatmap}
                />
              }
              back={<GraphInsights title="Platform × Channel Heatmap" />}
            />
          </div>
        </div>
      )}

      {subView === "advanced_kpi" && <AdvancedKPITab onAskAI={onAskAI} />}
    </div>
  );
}

export default SectionExplorer;