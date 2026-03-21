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
   Advanced KPI — PES · GVI · VVS static data
───────────────────────────────────────────────────────────── */
const VVS_NICHES = ['Gaming','Fitness','Food','Education','Music','Travel','Tech','Beauty','Comedy','Sports'];
const VVS_MEDIANS = { Short:{Pr:0.28,A:0.018,R:0.048}, Medium:{Pr:0.22,A:0.015,R:0.038} };
const VVS_GROUP_R2 = {
  Short: [.41,.48,.52,.44,.39,.46,.43,.50,.38,.42,.46,.51,.49,.45,.41,.44,.47,.48,.40,.45,.50,.54,.53,.47,.43,.45,.48,.51,.58,.46],
  Medium:[.38,.44,.47,.41,.36,.34,.40,.43,.35,.39,.42,.47,.51,.44,.45,.36,.43,.46,.38,.41,.46,.62,.54,.47,.44,.43,.49,.48,.55,.44],
};
const VVS_WEIGHTS = {
  Short:{
    Nano: { Gaming:{a:.195,b:.182,g:.623,r2:.41,n:398},Fitness:{a:.148,b:.167,g:.685,r2:.48,n:434},Food:{a:.149,b:.188,g:.663,r2:.52,n:267},Education:{a:.162,b:.171,g:.667,r2:.44,n:156},Music:{a:.138,b:.171,g:.691,r2:.39,n:274},Travel:{a:.201,b:.158,g:.641,r2:.46,n:281},Tech:{a:.172,b:.169,g:.659,r2:.43,n:310},Beauty:{a:.155,b:.174,g:.671,r2:.50,n:250},Comedy:{a:.158,b:.179,g:.663,r2:.38,n:110},Sports:{a:.163,b:.175,g:.662,r2:.42,n:440} },
    Mid:  { Gaming:{a:.182,b:.175,g:.643,r2:.46,n:127},Fitness:{a:.141,b:.169,g:.690,r2:.51,n:355},Food:{a:.155,b:.176,g:.669,r2:.49,n:131},Education:{a:.165,b:.172,g:.663,r2:.45,n:124},Music:{a:.144,b:.171,g:.685,r2:.41,n:200},Travel:{a:.191,b:.161,g:.648,r2:.44,n:98}, Tech:{a:.168,b:.172,g:.660,r2:.47,n:157},Beauty:{a:.158,b:.173,g:.669,r2:.48,n:180},Comedy:{a:.161,b:.177,g:.662,r2:.40,n:197},Sports:{a:.157,b:.170,g:.673,r2:.45,n:238} },
    Macro:{ Gaming:{a:.178,b:.174,g:.648,r2:.50,n:233},Fitness:{a:.136,b:.166,g:.698,r2:.54,n:223},Food:{a:.151,b:.180,g:.669,r2:.53,n:272},Education:{a:.160,b:.170,g:.670,r2:.47,n:165},Music:{a:.140,b:.169,g:.691,r2:.43,n:258},Travel:{a:.188,b:.158,g:.654,r2:.45,n:176},Tech:{a:.164,b:.170,g:.666,r2:.48,n:212},Beauty:{a:.152,b:.172,g:.676,r2:.51,n:229},Comedy:{a:.125,b:.082,g:.794,r2:.58,n:604},Sports:{a:.152,b:.168,g:.680,r2:.46,n:373} },
  },
  Medium:{
    Nano: { Gaming:{a:.211,b:.165,g:.624,r2:.38,n:170},Fitness:{a:.168,b:.158,g:.674,r2:.44,n:111},Food:{a:.178,b:.172,g:.650,r2:.47,n:271},Education:{a:.189,b:.164,g:.647,r2:.41,n:61}, Music:{a:.155,b:.162,g:.683,r2:.36,n:209},Travel:{a:.377,b:.138,g:.485,r2:.34,n:65}, Tech:{a:.192,b:.165,g:.643,r2:.40,n:104},Beauty:{a:.174,b:.166,g:.660,r2:.43,n:90}, Comedy:{a:.195,b:.168,g:.637,r2:.35,n:35}, Sports:{a:.186,b:.162,g:.652,r2:.39,n:63}  },
    Mid:  { Gaming:{a:.198,b:.162,g:.640,r2:.42,n:86}, Fitness:{a:.156,b:.155,g:.689,r2:.47,n:91}, Food:{a:.165,b:.168,g:.667,r2:.51,n:159},Education:{a:.177,b:.161,g:.662,r2:.44,n:103},Music:{a:.144,b:.142,g:.714,r2:.45,n:163},Travel:{a:.312,b:.142,g:.546,r2:.36,n:27}, Tech:{a:.144,b:.142,g:.713,r2:.43,n:96}, Beauty:{a:.172,b:.163,g:.665,r2:.46,n:93}, Comedy:{a:.185,b:.164,g:.651,r2:.38,n:47}, Sports:{a:.179,b:.158,g:.663,r2:.41,n:93}  },
    Macro:{ Gaming:{a:.192,b:.161,g:.647,r2:.46,n:170},Fitness:{a:.067,b:.096,g:.837,r2:.62,n:87}, Food:{a:.161,b:.166,g:.673,r2:.54,n:449},Education:{a:.172,b:.159,g:.669,r2:.47,n:137},Music:{a:.138,b:.139,g:.723,r2:.44,n:191},Travel:{a:.202,b:.154,g:.644,r2:.43,n:153},Tech:{a:.151,b:.146,g:.703,r2:.49,n:263},Beauty:{a:.165,b:.159,g:.676,r2:.48,n:147},Comedy:{a:.179,b:.082,g:.739,r2:.55,n:565},Sports:{a:.170,b:.154,g:.676,r2:.44,n:103} },
  },
};

/* ─────────────────────────────────────────────────────────────
   Advanced KPI — Platform Efficiency Score & Geo Value Index
───────────────────────────────────────────────────────────── */
function AdvancedKPITab({ onAskAI }) {
  const [kpiTab, setKpiTab] = useState("pes");
  const [pesCpw, setPesCpw] = useState(3.15);
  const [pesAvg, setPesAvg] = useState(3.15);
  const [gviCpw, setGviCpw] = useState(2.0);
  const [gviBudget, setGviBudget] = useState(1000);

  // VVS state
  const [vvsSize, setVvsSize] = useState("Mid");
  const [vvsNiche, setVvsNiche] = useState("Gaming");
  const [vvsFmt, setVvsFmt] = useState("Short");
  const [vvsPr, setVvsPr] = useState(30);
  const [vvsA, setVvsA] = useState(20);
  const [vvsR, setVvsR] = useState(50);
  const [vvsNicheView, setVvsNicheView] = useState("Short");

  const MARKET_AVG = 3.15;
  const GEO_AVG = 2.0;
  const MONO = "var(--font-mono)";
  const SANS = "var(--font-sans)";

  // PES
  const pes = pesAvg / pesCpw;
  const pesWph = 1 / pesCpw;
  const pesSave = Math.max(0, (pesAvg - pesCpw) * 100 / pesAvg);
  const pesC = pes >= 1.5 ? "#3EC98A" : pes < 0.8 ? "#ff4757" : "#ffb340";
  const pesVerd = pes >= 2
    ? { k: "good", t: `Excellent — PES ${pes.toFixed(2)}. Buying at ${((1/pes)*100).toFixed(0)}% of market rate. Strong ROI.` }
    : pes >= 1.2
    ? { k: "good", t: `Good — PES ${pes.toFixed(2)}. Slightly below market rate. Solid efficiency.` }
    : pes >= 0.85
    ? { k: "mid",  t: `Average — PES ${pes.toFixed(2)}. Near market average. No significant advantage.` }
    : { k: "bad",  t: `Premium — PES ${pes.toFixed(2)}. Paying ${((1/pes - 1)*100).toFixed(0)}% above market. Justify with audience quality.` };

  // GVI
  const gvi = (GEO_AVG / gviCpw) * 100;
  const gviHours = gviBudget / gviCpw;
  const gviImpr = (gviBudget / gviCpw) * 60 * 3 / 1000;
  const gviC = gvi >= 200 ? "#3EC98A" : gvi < 70 ? "#ff4757" : "#ffb340";
  const gviVerd = gvi >= 300
    ? { k: "good", t: `High-reach — GVI ${Math.round(gvi)}. Your $${gviBudget.toLocaleString()} buys ${Math.round(gviHours).toLocaleString()} watch hours, ${(gvi/100).toFixed(1)}× the global average.` }
    : gvi >= 150
    ? { k: "good", t: `Good value — GVI ${Math.round(gvi)}. Above-average reach for your budget.` }
    : gvi >= 70
    ? { k: "mid",  t: `Near global average — GVI ${Math.round(gvi)}. Typical cost for this market.` }
    : { k: "bad",  t: `Premium market — GVI ${Math.round(gvi)}. Low reach per dollar. Audience quality must justify the spend.` };

  const VC = {
    good: { bg: "rgba(62,201,138,.08)", border: "rgba(62,201,138,.28)", color: "#3EC98A" },
    mid:  { bg: "rgba(255,179,64,.08)", border: "rgba(255,179,64,.28)", color: "#ffb340" },
    bad:  { bg: "rgba(255,71,87,.08)",  border: "rgba(255,71,87,.28)",  color: "#ff4757" },
  };

  // VVS computed
  const vvsW = (VVS_WEIGHTS[vvsFmt]?.[vvsSize]?.[vvsNiche]) || { a: 0.17, b: 0.17, g: 0.66 };
  const vvsMed = VVS_MEDIANS[vvsFmt] || VVS_MEDIANS.Short;
  const vvsScore = Math.pow(vvsPr / 100, vvsW.a) * Math.pow(vvsA / 100, vvsW.b) * Math.pow(vvsR / 100, vvsW.g);
  const vvsMedianScore = Math.pow(vvsMed.Pr, vvsW.a) * Math.pow(vvsMed.A, vvsW.b) * Math.pow(vvsMed.R, vvsW.g);
  const vvsNorm = Math.min(100, Math.round((vvsScore / vvsMedianScore) * 50));
  const vvsConfScore = (() => {
    const r2 = vvsW.r2 || 0.45;
    const n = vvsW.n || 100;
    const nScore = Math.min(1, n / 200);
    const signalScore = ((vvsPr > 1 ? 0.4 : 0) + (vvsA > 1 ? 0.35 : 0) + (vvsR > 5 ? 0.25 : 0));
    return Math.round((r2 * 0.45 + nScore * 0.30 + signalScore * 0.25) * 100);
  })();
  const vvsC = vvsNorm >= 70 ? "#8B5CF6" : vvsNorm >= 40 ? "#ffb340" : "#ff4757";
  const vvsConfC = vvsConfScore >= 70 ? "#3EC98A" : vvsConfScore >= 45 ? "#ffb340" : "#ff4757";
  const vvsConfLabel = vvsConfScore >= 70 ? "HIGH CONFIDENCE" : vvsConfScore >= 45 ? "MODERATE" : "LOW CONFIDENCE";

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

  /* ── Sub-components ── */
  const FormulaBox = ({ label, text, accent }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 16, background: "rgba(255,255,255,.03)", border: "0.5px solid rgba(255,255,255,0.07)", borderLeft: `3px solid ${accent || "rgba(255,255,255,0.15)"}`, borderRadius: "0 8px 8px 0", padding: "13px 18px", marginBottom: 10 }}>
      <span style={{ fontFamily: MONO, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.12em", color: accent ? `${accent}cc` : "rgba(255,255,255,0.42)", fontWeight: 700, minWidth: 72, flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 13, color: "rgba(255,255,255,0.78)", fontWeight: 500, lineHeight: 1.5 }}>{text}</span>
    </div>
  );

  const ExCard = ({ title, body, result, note, accent }) => (
    <div style={{ background: "rgba(255,255,255,.03)", border: `1px solid rgba(255,255,255,0.07)`, borderTop: `2px solid ${accent || "rgba(255,255,255,0.12)"}`, borderRadius: 12, padding: "20px 22px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, borderRadius: "50%", background: accent, filter: "blur(40px)", opacity: 0.07, pointerEvents: "none" }} />
      <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em", color: "rgba(255,255,255,0.45)", marginBottom: 12 }}>{title}</div>
      <div style={{ fontFamily: SANS, fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, marginBottom: 14 }} dangerouslySetInnerHTML={{ __html: body }} />
      <div style={{ fontFamily: MONO, fontSize: 16, marginBottom: 10, lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: result }} />
      <div style={{ fontFamily: SANS, fontSize: 13, color: "rgba(255,255,255,0.42)", lineHeight: 1.6 }}>{note}</div>
    </div>
  );

  const GaugeRow = ({ items }) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 18 }}>
      {items.map((g, i) => (
        <div key={i} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "16px 18px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)", width: 60, height: 60, borderRadius: "50%", background: g.color, filter: "blur(24px)", opacity: 0.12 }} />
          <div style={{ fontFamily: MONO, fontSize: 40, lineHeight: 1, marginBottom: 8, color: g.color, fontWeight: 700, transition: "color .3s", letterSpacing: "-0.02em" }}>{g.val}</div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2, margin: "0 0 10px", overflow: "hidden" }}>
            <div style={{ height: 4, borderRadius: 2, background: g.color, width: Math.min(100, g.barW) + "%", transition: "width .4s ease, background .3s", opacity: 0.85 }} />
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{g.label}</div>
        </div>
      ))}
    </div>
  );

  const SimSlider = ({ label, min, max, step, val, set, fmt, accent }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14, padding: "10px 14px", background: "rgba(255,255,255,0.025)", borderRadius: 8, border: "0.5px solid rgba(255,255,255,0.06)" }}>
      <label style={{ fontFamily: MONO, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.55)", minWidth: 160 }}>{label}</label>
      <input type="range" min={min} max={max} step={step} value={val}
        onChange={e => set(+e.target.value)}
        style={{ flex: 1, height: 4, accentColor: accent, cursor: "pointer" }} />
      <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: accent, minWidth: 68, textAlign: "right" }}>{fmt(val)}</span>
    </div>
  );

  const SectionLabel = ({ text }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <div style={{ width: 2, height: 14, borderRadius: 1, background: "rgba(255,255,255,0.20)" }} />
      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>{text}</span>
    </div>
  );

  const TH = { fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", padding: "10px 14px", color: "rgba(255,255,255,0.45)", borderBottom: "1px solid rgba(255,255,255,0.07)", textAlign: "left", background: "rgba(255,255,255,0.02)" };
  const TD = { padding: "11px 14px", borderBottom: "0.5px solid rgba(255,255,255,0.05)", fontFamily: SANS, fontSize: 14, color: "rgba(255,255,255,0.75)" };

  /* ── Tab config ── */
  const TABS = [
    { k: "pes", label: "Platform Efficiency Score", accent: "#3B8BD4", grad: "linear-gradient(90deg,#3B8BD4,#1D9E75)" },
    { k: "gvi", label: "Geo Value Index",            accent: "#EF9F27", grad: "linear-gradient(90deg,#EF9F27,#E24B4A)" },
    { k: "vvs", label: "Viral Velocity Score",       accent: "#8B5CF6", grad: "linear-gradient(90deg,#8B5CF6,#3B8BD4)" },
  ];

  return (
    <div className="stack">
      {/* ── Tab strip ── */}
      <div style={{ display: "flex", gap: 6, padding: "4px", background: "rgba(255,255,255,0.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)", width: "fit-content" }}>
        {TABS.map(({ k, label, accent }) => (
          <button key={k} onClick={() => setKpiTab(k)} style={{
            padding: "9px 22px",
            fontFamily: MONO, fontSize: 12, fontWeight: 700,
            letterSpacing: "0.08em", textTransform: "uppercase",
            borderRadius: 7, border: "1px solid",
            cursor: "pointer",
            background: kpiTab === k ? `${accent}18` : "transparent",
            borderColor: kpiTab === k ? `${accent}55` : "transparent",
            color: kpiTab === k ? accent : "rgba(255,255,255,0.38)",
            transition: "all 0.18s ease",
          }}>{label}</button>
        ))}
      </div>

      {/* ── Active KPI Panel ── */}
      {TABS.map(({ k, accent, grad }) => kpiTab !== k ? null : (
        <div key={k} className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
          {/* Top gradient bar */}
          <div style={{ height: 3, background: grad }} />

          <div style={{ padding: "28px 32px" }}>

            {/* ════════════════════ PES / GVI shared layout ════════════════════ */}
            {k !== "vvs" && <>
              {/* ── HEADER ── */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: accent, marginBottom: 8, opacity: 0.85 }}>
                    {k === "pes" ? "Dataset 1 · Platform × Topic Ad Cost" : "Dataset 2 · YouTube Continent × Topic Ad Cost"}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 32, fontWeight: 700, color: "rgba(255,255,255,0.92)", marginBottom: 10, letterSpacing: "-0.01em", lineHeight: 1.1 }}>
                    {k === "pes" ? "Platform Efficiency Score" : "Geo Value Index"}
                  </div>
                  <div style={{ fontFamily: SANS, fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, maxWidth: 580 }}>
                    {k === "pes"
                      ? "How much watch-time bang do you get per dollar, relative to the market average? A score above 1.0 means you're buying cheaper than the norm."
                      : <>Not all cheap markets are equal — this index scores each region by dividing reach per dollar by its market cost tier, revealing where you get high volume <em>and</em> value.</>}
                  </div>
                </div>
                <GraphActionButtons insightsOpen={false} onToggleInsights={() => {}} onAskAI={() => onAskAI && onAskAI(k === "pes" ? "Platform Efficiency Score" : "Geo Value Index", {})} />
              </div>

              {/* ── FORMULA BOXES ── */}
              {k === "pes" ? <>
                <FormulaBox accent={accent} label="Formula"   text="PES = Avg CPW (all platforms) ÷ CPW (chosen platform & topic)" />
                <FormulaBox accent={accent} label="Interpret" text="PES > 1.0 → cheaper than average  |  PES = 1.0 → at par  |  PES < 1.0 → paying a premium" />
              </> : <>
                <FormulaBox accent={accent} label="Formula"   text="GVI = (Global avg CPW ÷ Local CPW) × 100" />
                <FormulaBox accent={accent} label="Interpret" text="GVI 100 = at global avg  |  GVI > 100 → above-average reach per $  |  GVI < 100 → premium market" />
              </>}

              {/* ── EXAMPLE CARDS ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24, marginBottom: 28 }}>
                {k === "pes" ? <>
                  <ExCard accent="#3EC98A" title="Example A — Budget campaign"
                    body="Running a <strong>Vlogging</strong> ad on <strong>YouTube Shorts</strong>.<br/>CPW = $0.80 &nbsp;·&nbsp; Market avg = $3.15"
                    result={`<span style="color:#3EC98A">PES = 3.15 ÷ 0.80 = <span style="font-size:32px;font-weight:700">3.94</span></span>`}
                    note="Nearly 4× more efficient than average. Every $1 buys 4 hours of watch time vs 1 hour elsewhere." />
                  <ExCard accent="#ff4757" title="Example B — Premium campaign"
                    body="Running a <strong>Finance</strong> ad on <strong>LinkedIn</strong>.<br/>CPW = $12.00 &nbsp;·&nbsp; Market avg = $3.15"
                    result={`<span style="color:#ff6b7a">PES = 3.15 ÷ 12.00 = <span style="font-size:32px;font-weight:700">0.26</span></span>`}
                    note="Only 26% as efficient as average. You're paying 4× more per watch hour than the norm." />
                </> : <>
                  <ExCard accent="#3EC98A" title="Example A — Reach campaign"
                    body="Running a <strong>Tech_AI</strong> ad in <strong>South Asia</strong>.<br/>Local CPW = $0.36 &nbsp;·&nbsp; Global avg = $2.00"
                    result={`<span style="color:#3EC98A">GVI = (2.00 ÷ 0.36) × 100 = <span style="font-size:32px;font-weight:700">556</span></span>`}
                    note="$100 buys 278 hours of Tech AI watch time here vs just 50 hours globally. Massive reach multiplier." />
                  <ExCard accent="#ff4757" title="Example B — Quality campaign"
                    body="Running a <strong>Finance</strong> ad in <strong>Oceania</strong>.<br/>Local CPW = $7.68 &nbsp;·&nbsp; Global avg = $2.00"
                    result={`<span style="color:#ff6b7a">GVI = (2.00 ÷ 7.68) × 100 = <span style="font-size:32px;font-weight:700">26</span></span>`}
                    note="$100 buys only 13 watch hours vs 50 globally. You're paying for audience quality, not volume." />
                </>}
              </div>

              {/* ── SIMULATOR ── */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "22px 24px", marginBottom: 28 }}>
                <SectionLabel text={`Try it — ${k === "pes" ? "PES" : "GVI"} Simulator`} />
                {k === "pes" ? <>
                  <SimSlider label="Your CPW ($)"       min={0.8}  max={12}    step={0.1}  val={pesCpw}    set={setPesCpw}    fmt={v => "$"+v.toFixed(2)}      accent={accent} />
                  <SimSlider label="Market avg CPW ($)" min={1}    max={6}     step={0.05} val={pesAvg}    set={setPesAvg}    fmt={v => "$"+v.toFixed(2)}      accent={accent} />
                  <GaugeRow items={[
                    { label: "Platform Efficiency Score", val: pes.toFixed(2),           color: pesC, barW: pes/5*100 },
                    { label: "Watch hours per $1 spent",  val: pesWph.toFixed(1)+"h",    color: "#1D9E75", barW: pesWph/4*100 },
                    { label: "Savings per $100 vs avg",   val: "$"+pesSave.toFixed(0),   color: "#ffb340", barW: pesSave },
                  ]} />
                  <div style={{ marginTop: 14, borderRadius: 8, padding: "12px 18px", fontFamily: SANS, fontSize: 14, lineHeight: 1.65, background: VC[pesVerd.k].bg, color: VC[pesVerd.k].color, border: `1px solid ${VC[pesVerd.k].border}`, transition: "background .3s, color .3s" }}>
                    {pesVerd.t}
                  </div>
                </> : <>
                  <SimSlider label="Local CPW ($)" min={0.12} max={7.68}  step={0.01}  val={gviCpw}    set={setGviCpw}    fmt={v => "$"+v.toFixed(2)}      accent={accent} />
                  <SimSlider label="Budget ($)"    min={100}  max={10000} step={100}   val={gviBudget} set={setGviBudget} fmt={v => "$"+v.toLocaleString()} accent={accent} />
                  <GaugeRow items={[
                    { label: "Geo Value Index",    val: Math.round(gvi),  color: gviC, barW: gvi/8 },
                    { label: "Watch hours bought", val: gviHours >= 1000 ? (gviHours/1000).toFixed(1)+"K" : Math.round(gviHours)+"h", color: "#3B8BD4", barW: gviHours/gviBudget*10 },
                    { label: "Est. impressions",   val: gviImpr >= 1000 ? (gviImpr/1000).toFixed(1)+"M" : Math.round(gviImpr)+"K",    color: "#1D9E75", barW: gviImpr/1000*20 },
                  ]} />
                  <div style={{ marginTop: 14, borderRadius: 8, padding: "12px 18px", fontFamily: SANS, fontSize: 14, lineHeight: 1.65, background: VC[gviVerd.k].bg, color: VC[gviVerd.k].color, border: `1px solid ${VC[gviVerd.k].border}`, transition: "background .3s, color .3s" }}>
                    {gviVerd.t}
                  </div>
                </>}
              </div>

              {/* ── RANKING TABLE ── */}
              <SectionLabel text={k === "pes" ? "PES Ranking — all platforms, Finance topic" : "GVI Ranking — all continents, Finance topic"} />
              <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {(k === "pes" ? ["Platform","CPW","PES","Efficiency"] : ["Continent","CPW","GVI","Watch hrs per $100"]).map((h, i, arr) => (
                        <th key={h} style={{ ...TH, width: i === arr.length-1 ? (k==="pes"?130:180) : "auto" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {k === "pes"
                      ? pesPlatforms.map(r => {
                          const p = (MARKET_AVG / r.cpw).toFixed(2);
                          const c = +p >= 1 ? "#3EC98A" : "#ff4757";
                          return (
                            <tr key={r.p} style={{ transition: "background .15s" }}
                              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                              <td style={{ ...TD, fontFamily: SANS, fontWeight: 500 }}>{r.p}</td>
                              <td style={{ ...TD, fontFamily: MONO, color: "rgba(255,255,255,0.50)" }}>${r.cpw.toFixed(2)}</td>
                              <td style={{ ...TD, fontFamily: MONO, fontWeight: 700, color: c, fontSize: 16 }}>{p}</td>
                              <td style={TD}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 3, height: 6, overflow: "hidden" }}>
                                    <div style={{ height: 6, borderRadius: 3, background: c, width: Math.min(100,(+p/5)*100)+"%", opacity: 0.80 }} />
                                  </div>
                                  <span style={{ fontFamily: MONO, fontSize: 12, color: c, minWidth: 32, fontWeight: 600 }}>{(+p*100/5).toFixed(0)}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      : gviConts.map(r => {
                          const gviR = Math.round((GEO_AVG / r.cpw) * 100);
                          const hrs = (100 / r.cpw).toFixed(1);
                          const c = gviR >= 100 ? "#3EC98A" : "#ff4757";
                          return (
                            <tr key={r.c} style={{ transition: "background .15s" }}
                              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                              <td style={{ ...TD, fontFamily: SANS, fontWeight: 500 }}>{r.c}</td>
                              <td style={{ ...TD, fontFamily: MONO, color: "rgba(255,255,255,0.50)" }}>${r.cpw.toFixed(2)}</td>
                              <td style={{ ...TD, fontFamily: MONO, fontWeight: 700, color: c, fontSize: 16 }}>{gviR}</td>
                              <td style={TD}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 3, height: 6, overflow: "hidden" }}>
                                    <div style={{ height: 6, borderRadius: 3, background: c, width: Math.min(100, gviR/8)+"%", opacity: 0.80 }} />
                                  </div>
                                  <span style={{ fontFamily: MONO, fontSize: 12, color: "rgba(255,255,255,0.50)", minWidth: 36, fontWeight: 500 }}>{hrs}h</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    }
                  </tbody>
                </table>
              </div>
            </>}

            {/* ════════════════════ VVS layout ════════════════════ */}
            {k === "vvs" && <>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: accent, marginBottom: 8, opacity: 0.85 }}>
                    Dataset 3 · 60 Niche × Account-Size Combinations · Power-Law Model
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 32, fontWeight: 700, color: "rgba(255,255,255,0.92)", marginBottom: 10, letterSpacing: "-0.01em", lineHeight: 1.1 }}>
                    Viral Velocity Score
                  </div>
                  <div style={{ fontFamily: SANS, fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, maxWidth: 580 }}>
                    Predicts a video's viral probability using a power-law model fitted separately for each niche × account-size group. Weights were derived from 60 regression fits across Short and Medium formats.
                  </div>
                </div>
                <GraphActionButtons insightsOpen={false} onToggleInsights={() => {}} onAskAI={() => onAskAI && onAskAI("Viral Velocity Score", {})} />
              </div>

              {/* Formula + Interpret */}
              <FormulaBox accent={accent} label="Formula"   text="VVS = Pr^α × A^β × R^γ   (power-law, group-fitted weights)" />
              <FormulaBox accent={accent} label="Weights"   text={`α=${vvsW.a?.toFixed(3)} (prompt rate)  ·  β=${vvsW.b?.toFixed(3)} (avg views)  ·  γ=${vvsW.g?.toFixed(3)} (retention)`} />
              <FormulaBox accent={accent} label="Interpret" text="VVS ≥ 70 → High viral potential  |  40–69 → Moderate  |  < 40 → Low signal" />

              {/* Context selectors */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 22, marginBottom: 22 }}>
                {[
                  { label: "Account Size", val: vvsSize, set: setVvsSize, opts: ["Nano","Mid","Macro"] },
                  { label: "Niche", val: vvsNiche, set: setVvsNiche, opts: VVS_NICHES },
                  { label: "Format", val: vvsFmt, set: setVvsFmt, opts: ["Short","Medium"] },
                ].map(({ label, val, set, opts }) => (
                  <div key={label} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", color: "rgba(255,255,255,0.38)", marginBottom: 10 }}>{label}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {opts.map(o => (
                        <button key={o} onClick={() => set(o)} style={{
                          padding: "5px 11px", borderRadius: 6, border: "1px solid",
                          fontFamily: MONO, fontSize: 11, fontWeight: 600, cursor: "pointer",
                          background: val === o ? `${accent}18` : "transparent",
                          borderColor: val === o ? `${accent}55` : "rgba(255,255,255,0.10)",
                          color: val === o ? accent : "rgba(255,255,255,0.45)",
                          transition: "all .15s",
                        }}>{o}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Simulator */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "22px 24px", marginBottom: 24 }}>
                <SectionLabel text="Try it — VVS Simulator" />
                <SimSlider label="Prompt Rate Pr (%)"      min={0}  max={100} step={1} val={vvsPr} set={setVvsPr} fmt={v => v+"%"}  accent={accent} />
                <SimSlider label="Avg Views A (×1000)"     min={0}  max={200} step={1} val={vvsA}  set={setVvsA}  fmt={v => v+"K"}  accent={accent} />
                <SimSlider label="Retention Rate R (%)"    min={0}  max={100} step={1} val={vvsR}  set={setVvsR}  fmt={v => v+"%"}  accent={accent} />
                <GaugeRow items={[
                  { label: "Viral Velocity Score", val: vvsNorm,                  color: vvsC,     barW: vvsNorm },
                  { label: "Model R² for group",   val: (vvsW.r2||0.45).toFixed(2), color: "#3B8BD4", barW: (vvsW.r2||0.45)*100 },
                  { label: "Confidence",            val: vvsConfScore+"%",         color: vvsConfC, barW: vvsConfScore },
                ]} />
                <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, borderRadius: 8, padding: "12px 18px", background: `rgba(139,92,246,0.08)`, border: `1px solid rgba(139,92,246,0.22)` }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: vvsConfC, letterSpacing: "0.10em", padding: "3px 10px", background: `${vvsConfC}18`, borderRadius: 5, border: `1px solid ${vvsConfC}44` }}>{vvsConfLabel}</span>
                  <span style={{ fontFamily: SANS, fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                    {vvsNorm >= 70
                      ? `Strong viral signal. ${vvsNiche} ${vvsSize} accounts at these metrics exceed the median by ${Math.round(vvsNorm/50*100-100)}%.`
                      : vvsNorm >= 40
                      ? `Moderate signal. Video shows some viral markers but falls below the top-quartile threshold.`
                      : `Weak signal. Lift Prompt Rate or Retention to push the score above 70.`}
                  </span>
                </div>
              </div>

              {/* Niche grid — R² heatmap */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <SectionLabel text="R² Fit Quality by Niche × Account Size" />
                  <div style={{ display: "flex", gap: 5 }}>
                    {["Short","Medium"].map(f => (
                      <button key={f} onClick={() => setVvsNicheView(f)} style={{
                        padding: "5px 14px", borderRadius: 6, border: "1px solid",
                        fontFamily: MONO, fontSize: 11, fontWeight: 600, cursor: "pointer",
                        background: vvsNicheView === f ? `${accent}18` : "transparent",
                        borderColor: vvsNicheView === f ? `${accent}55` : "rgba(255,255,255,0.10)",
                        color: vvsNicheView === f ? accent : "rgba(255,255,255,0.40)",
                        transition: "all .15s",
                      }}>{f}</button>
                    ))}
                  </div>
                </div>
                <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={TH}>Niche</th>
                        {["Nano","Mid","Macro"].map(s => <th key={s} style={TH}>{s}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {VVS_NICHES.map(niche => (
                        <tr key={niche}
                          style={{ transition: "background .15s", background: (niche === vvsNiche && vvsFmt === vvsNicheView) ? "rgba(139,92,246,0.07)" : "transparent" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.025)"}
                          onMouseLeave={e => e.currentTarget.style.background = (niche === vvsNiche && vvsFmt === vvsNicheView) ? "rgba(139,92,246,0.07)" : "transparent"}>
                          <td style={{ ...TD, fontFamily: SANS, fontWeight: 500 }}>{niche}</td>
                          {["Nano","Mid","Macro"].map(size => {
                            const w = VVS_WEIGHTS[vvsNicheView]?.[size]?.[niche];
                            const r2 = w?.r2 || 0;
                            const r2c = r2 >= 0.5 ? "#3EC98A" : r2 >= 0.4 ? "#ffb340" : "#ff4757";
                            return (
                              <td key={size} style={{ ...TD, fontFamily: MONO, fontSize: 13 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 3, height: 5, overflow: "hidden" }}>
                                    <div style={{ height: 5, borderRadius: 3, background: r2c, width: (r2*100)+"%", opacity: 0.85 }} />
                                  </div>
                                  <span style={{ color: r2c, fontWeight: 600, minWidth: 34 }}>{r2.toFixed(2)}</span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Model info cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <ExCard accent={accent} title="Model Architecture"
                  body="Power-law regression: <strong>VVS = Pr^α × A^β × R^γ</strong><br/>Fitted independently per niche × size group. Log-transformed inputs, OLS on residuals."
                  result={`<span style="color:#8B5CF6">60 group fits &nbsp;·&nbsp; <span style="font-size:28px;font-weight:700">3,450+</span> obs total</span>`}
                  note="Each group uses its own α, β, γ weights to capture niche-specific engagement dynamics." />
                <ExCard accent="#3B8BD4" title="Confidence Composite"
                  body="Score = 0.45 × R² + 0.30 × sample_norm + 0.25 × signal_quality<br/>Signal checks: Pr > 1%, A > 1K views, R > 5%"
                  result={`<span style="color:#3B8BD4">Current group R² = <span style="font-size:28px;font-weight:700">${(vvsW.r2||0.45).toFixed(2)}</span></span>`}
                  note={`${vvsW.n || '—'} observations in the ${vvsNiche} × ${vvsSize} (${vvsFmt}) group.`} />
              </div>
            </>}

          </div>
        </div>
      ))}
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
                    const rateN = parseFloat(rate);
                    const isA = u.created > 400 && u.published === 0;
                    const rateColor = rateN > 3 ? "var(--green-lt)" : rateN > 0 ? "var(--warn)" : "var(--red-lt)";
                    const maxUploaded = Math.max(...sortedUsers.map(x => x.uploaded));
                    return (
                      <tr key={u.user} className={isA ? "anomaly" : ""}>
                        <td style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>
                          {isA && <span className="pdot pdot-a" style={{ marginRight: 6 }} />}
                          {u.user}
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 500 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {u.uploaded}
                            <div style={{ width: 28, height: 3, background: "var(--line-lt)", borderRadius: 2, overflow: "hidden" }}>
                              <div style={{ height: "100%", borderRadius: 2, background: "rgba(255,255,255,0.30)", width: `${(u.uploaded / maxUploaded) * 100}%` }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 500, color: "#ff6b7a" }}>
                          {u.created}
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 500, color: u.published === 0 ? "var(--red-lt)" : "var(--green-lt)" }}>
                          {u.published}
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: rateColor }}>
                              {rate}%
                            </span>
                            <div style={{ width: 48, height: 3, background: "var(--line-lt)", borderRadius: 2, overflow: "hidden" }}>
                              <div style={{ height: "100%", borderRadius: 2, background: rateColor, width: `${Math.min(rateN * 10, 100)}%`, opacity: 0.75 }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--ink3)", fontWeight: 500 }}>
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
              <div className="card" style={{ padding: "14px 16px" }}>
                <div
                  style={{
                    fontSize: 10.5,
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.55)",
                    fontWeight: 600,
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
              <div className="card" style={{ padding: "14px 16px" }}>
                <div
                  style={{
                    fontSize: 10.5,
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--warn)",
                    fontWeight: 600,
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
                        fontFamily: "var(--font-ui)",
                        color: "var(--ink2)",
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      {u}
                    </span>
                    <span
                      className="badge badge-amber"
                      style={{ fontSize: 10, padding: "3px 9px" }}
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
                  fontSize: 10.5,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.52)",
                  fontWeight: 600,
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
                  fontSize: 10.5,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.52)",
                  fontWeight: 600,
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
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  color: "rgba(255,255,255,0.42)",
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