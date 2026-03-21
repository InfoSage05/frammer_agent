// @ts-nocheck
"use client";

const INTRO_KEY = 'frammer-intro-seen-v19';
import useScrollSpy from '@/hooks/useScrollSpy';
import HighlightEscListener from '@/hooks/useHighlightEscListener';
import useJsonData from '@/hooks/useJsonData';
import useLiveMetrics from '@/hooks/useLiveMetrics';

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import ResizableSidebar from "./ui/ResizableSidebar";
import IntroAnimation from "./ui/IntroAnimation";
import SectionClient from "./sections/section-client";
import ToastZone, { useToasts } from "./ui/Toasts";
import SectionExecutive from "./sections/section-executive-command-center";
import SectionTrends from "./sections/section-trends-usage";
import SectionLiftLab from "./sections/section-lift-lab";
import SectionMultiDim from "./sections/section-multi-dim-explorer";
import SectionFunnel from "./sections/section-funnel-flow";
import SectionExplorer from "./sections/section-deep-explorer";
import CommandPalette from "./ui/CommandPalette";
import ContextBar from "./ui/ContextBar";
import InsightChips from "./ui/InsightChips";
import RightPanel from "./ui/RightPanel";
import SectionShell from "./ui/SectionShell";
import RoleSwitcher from "./ui/RoleSwitcher";
import HowToUseModal from "./ui/HowToUseModal";
import { DashContext, AppUICtx } from '@/lib/contexts';
import { M, ANOMALIES, STORY_PRESETS, SAVED_VIEWS, pageTitles } from '@/lib/constants';

export default function App(props: any) {
  const { data: shellData } = useJsonData("app-shell");
  const { initialSection } = props || {};
  const pagedMode = typeof initialSection === 'string' && initialSection.length > 0;
  const pagedSection = pagedMode ? initialSection : null;

  const [theme, setTheme] = useState("dark");
  const [toasts, addToast, removeToast] = useToasts();
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const contentRef = useRef(null);

  // v19 state
  const [cmdOpen, setCmdOpen] = useState(false);
  const [globalFilters, setGlobalFilters] = useState({});
  const [selectedCtx, setSelectedCtx] = useState({});
  const [investigationMode, setInvestigationMode] = useState(null);
  const [investFilters, setInvestFilters] = useState({});
  const [compareState, setCompareState] = useState(null);
  const [storyMode, setStoryMode] = useState(null);
  const [showBenchmark, setShowBenchmark] = useState(false);
  const [insightMode, setInsightMode] = useState(false);
  const [pinnedFindings, setPinnedFindings] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState('explain');
  const [activeGraphData, setActiveGraphData] = useState([]);
  const [role, setRole] = useState('analyst');
  const [howToUseOpen, setHowToUseOpen] = useState(false);

  // Live metrics from backend (includes raw dashboard with chart_data for sections)
  const { metrics: liveM, isLive, dashboard: liveDashboard } = useLiveMetrics();

  // Chat session (shared between RightPanel copilot and ChatWidget, persisted)
  const [chatSessionId, setChatSessionId] = useState(() => {
    try {
      const stored = typeof window !== "undefined" && localStorage.getItem("frammer_chat");
      if (stored) { const p = JSON.parse(stored); return p.sessionId || null; }
    } catch {}
    return null;
  });

  // Highlight mode
  const [highlightSection, setHighlightSection] = useState(null);

  const handleHighlight = useCallback((sectionId) => {
    setHighlightSection(sectionId);
    if (pagedMode) {
      if (sectionId === 'client') {
        setClientOpen(true);
        setActiveSection('client');
      } else {
        setClientOpen(false);
        setActiveSection(sectionId);
      }
      return;
    }
    requestAnimationFrame(() => {
      const el = contentRef.current?.querySelector(`[data-section="${sectionId}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [pagedMode]);

  const exitHighlight = useCallback(() => { setHighlightSection(null); }, []);

  // Intro: localStorage instead of sessionStorage
  const [showIntro, setShowIntro] = useState(() => !localStorage.getItem(INTRO_KEY));

  const ALL_SECTIONS = shellData?.sidebar?.sections || [];
  const SCROLL_SECTIONS = ALL_SECTIONS.filter((section) => !section.gated);
  const scrollSectionIds = pagedSection ? [pagedSection] : SCROLL_SECTIONS.map((s) => s.k);

  const [clientOpen, setClientOpen] = useState(pagedSection === 'client');
  const [activeSection, setActiveSection] = useScrollSpy(
    scrollSectionIds,
    contentRef,
    clientOpen,
    !pagedMode,
  );

  // Keep paged mode state in sync when route changes (avoid relying on scroll-spy init only).
  useEffect(() => {
    if (!pagedMode) return;
    setClientOpen(pagedSection === 'client');
    if (pagedSection) setActiveSection(pagedSection);
  }, [pagedMode, pagedSection, setActiveSection]);

  // In paged (single-section) mode, keep the view anchored to the top when switching sections.
  useEffect(() => {
    if (!pagedMode) return;
    if (!contentRef.current) return;
    contentRef.current.scrollTop = 0;
  }, [pagedMode, activeSection, clientOpen]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      // ⌘K — command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(v => !v);
      }
      // ⌘⌥C — open Copilot
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key === 'c') {
        e.preventDefault();
        openPanel('copilot');
      }
      // [ and ] — cycle sections
      if (e.key === '[' && !e.metaKey && !cmdOpen) {
        e.preventDefault();
        const sections = ALL_SECTIONS.map(s => s.k);
        const idx = sections.indexOf(activeSection);
        if (idx > 0) scrollToSection(sections[idx - 1]);
      }
      if (e.key === ']' && !e.metaKey && !cmdOpen) {
        e.preventDefault();
        const sections = ALL_SECTIONS.map(s => s.k);
        const idx = sections.indexOf(activeSection);
        if (idx < sections.length - 1) scrollToSection(sections[idx + 1]);
      }
      // Escape — close overlays in priority order
      if (e.key === 'Escape') {
        if (cmdOpen) { setCmdOpen(false); return; }
        if (highlightSection) { exitHighlight(); return; }
        if (panelOpen) { setPanelOpen(false); return; }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cmdOpen, activeSection, highlightSection, panelOpen]);

  // ── Callbacks ──
  const selectCtx = useCallback((ctx) => {
    setSelectedCtx(prev => ({ ...prev, ...ctx }));
  }, []);

  const startInvestigation = useCallback((anomalyId) => {
    const anomaly = ANOMALIES.find(a => a.id === anomalyId);
    if (!anomaly) return;
    setInvestigationMode(anomalyId);
    setSelectedCtx(prev => ({ ...prev, anomaly: anomalyId }));
    setInvestFilters(anomaly.filters || {});
    const target = anomaly.section || 'executive';
    setActiveSection(target);
    setClientOpen(false);
    if (!pagedMode) {
      requestAnimationFrame(() => {
        const el = contentRef.current?.querySelector(`[data-section="${target}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    addToast(`Investigating: ${anomaly.title}`, 'crit', 'Investigation');
  }, [addToast, pagedMode]);

  const exitInvestigation = useCallback(() => {
    setInvestigationMode(null);
    setInvestFilters({});
    setSelectedCtx(prev => { const n = { ...prev }; delete n.anomaly; return n; });
  }, []);

  const startStory = useCallback((storyId) => {
    const s = STORY_PRESETS.find(x => x.id === storyId);
    if (!s) return;
    setStoryMode(storyId);
    if (s.section === 'client') {
      setClientOpen(true);
      setActiveSection('client');
      if (pagedMode) return;
      // In non-paged mode, scroll the relevant section into view.
    } else {
      setClientOpen(false);
      setActiveSection(s.section);
      if (!pagedMode) {
        requestAnimationFrame(() => {
          const el = contentRef.current?.querySelector(`[data-section="${s.section}"]`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    }
  }, [pagedMode]);

  const exitStory = useCallback(() => { setStoryMode(null); }, []);

  const openCompare = useCallback((typeA, a, typeB, b) => {
    setCompareState({ typeA, a, typeB, b });
    setPanelTab('compare');
    setPanelOpen(true);
  }, []);

  const closeCompare = useCallback(() => { setCompareState(null); }, []);

  const clearAllFilters = useCallback(() => {
    setGlobalFilters({});
    setSelectedCtx({});
    setInvestFilters({});
    setInvestigationMode(null);
    setStoryMode(null);
    setCompareState(null);
    setInsightMode(false);
  }, []);

  const removeChip = useCallback((key, source) => {
    if (source === 'filter' || source === 'both') setGlobalFilters(prev => { const n = { ...prev }; delete n[key]; return n; });
    if (source === 'ctx' || source === 'both') setSelectedCtx(prev => { const n = { ...prev }; delete n[key]; return n; });
  }, []);

  const pinFinding = useCallback((finding) => {
    setPinnedFindings(prev => { if (prev.find(p => p.id === finding.id)) return prev; return [...prev, finding]; });
    addToast(`Pinned: ${finding.label}`, 'info', 'Evidence');
  }, [addToast]);

  const unpinFinding = useCallback((id) => { setPinnedFindings(prev => prev.filter(p => p.id !== id)); }, []);

  const openPanel = useCallback((tab) => {
    setPanelTab(tab || 'explain');
    setPanelOpen(true);
  }, []);

  const handleAskAI = useCallback((graphName, graphData) => {
    if (graphName) {
      setActiveGraphData(prev => {
        const filtered = prev.filter(item => item.name !== graphName);
        return [...filtered, { name: graphName, data: graphData }];
      });
    }
    setPanelTab('copilot');
    setPanelOpen(true);
  }, []);

  const removeGraphData = useCallback((graphName) => {
    setActiveGraphData(prev => prev.filter(item => item.name !== graphName));
  }, []);

  const scrollToSection = useCallback((id) => {
    if (pagedMode) {
      if (id === 'client') {
        setClientOpen(true);
        setActiveSection('client');
      } else {
        setClientOpen(false);
        setActiveSection(id);
      }
      return;
    }

    if (id === 'client') {
      setClientOpen(true);
      setActiveSection('client');
      return;
    }

    if (clientOpen) setClientOpen(false);
    setActiveSection(id);
    const sEl = contentRef.current?.querySelector(`[data-section="${id}"]`);
    if (sEl) sEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [clientOpen, pagedMode, setActiveSection]);

  const goToClient = useCallback(() => {
    setClientOpen(true);
    setActiveSection('client');
  }, [setActiveSection]);

  const backFromClient = useCallback(() => {
    setClientOpen(false);
    setActiveSection('explorer');
    if (pagedMode) return;
    requestAnimationFrame(() => {
      const el = contentRef.current?.querySelector('[data-section="explorer"]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [pagedMode, setActiveSection]);

  const renderPagedSection = useCallback(() => {
    if (!activeSection) return null;
    if (activeSection === 'client') return null;
    if (activeSection === 'executive') {
      return (
        <SectionShell
          id="executive"
          title="Executive Overview"
          icon="◈"
          summary={`${(isLive ? liveM.created : M.created).toLocaleString()} AI frames · ${isLive ? liveM.publishRate : M.publishRate}% pub rate · ${isLive ? liveM.activeChannels : M.activeChannels} channels`}
          defaultExpanded={true}
        >
          <SectionExecutive addToast={addToast} theme={theme} onAskAI={handleAskAI} />
        </SectionShell>
      );
    }

    if (activeSection === 'trends') {
      return (
        <SectionShell
          id="trends"
          title="Performance Trends"
          icon="⌇"
          summary="12-month upload vs publish trajectory"
          badge="YoY +23%"
          defaultExpanded={true}
        >
          <SectionTrends theme={theme} onAskAI={handleAskAI} />
        </SectionShell>
      );
    }

    if (activeSection === 'lift') {
      return (
        <SectionShell
          id="lift"
          title="Lift & Forecast Lab"
          icon="⇡"
          summary="Upload CSV or run demo for lift + causal forecast"
          defaultExpanded={true}
        >
          <SectionLiftLab theme={theme} onAskAI={handleAskAI} />
        </SectionShell>
      );
    }

    if (activeSection === 'multidim') {
      return (
        <SectionShell
          id="multidim"
          title="Multi-Dimensional Analysis"
          icon="⬡"
          summary="Channel × content type breakdown"
          defaultExpanded={true}
        >
          <SectionMultiDim theme={theme} onAskAI={handleAskAI} />
        </SectionShell>
      );
    }

    if (activeSection === 'funnel') {
      return (
        <SectionShell
          id="funnel"
          title="Content Funnel"
          icon="▽"
          summary="Upload → Create → Publish conversion"
          defaultExpanded={true}
        >
          <SectionFunnel theme={theme} onAskAI={handleAskAI} />
        </SectionShell>
      );
    }

    if (activeSection === 'explorer') {
      return (
        <SectionShell
          id="explorer"
          title="Explorer"
          icon="⊞"
          summary="Filterable channel × content data table"
          defaultExpanded={true}
        >
          <SectionExplorer theme={theme} onAskAI={handleAskAI} />
        </SectionShell>
      );
    }

    return null;
  }, [activeSection, theme, addToast, handleAskAI]);

  // ── Memos ──
  const activeChips = useMemo(() => {
    const chips = [];
    if (selectedCtx.channel) chips.push({ label: `Ch-${selectedCtx.channel}`, key: 'channel', source: 'ctx' });
    if (selectedCtx.month) chips.push({ label: selectedCtx.month, key: 'month', source: 'ctx' });
    if (selectedCtx.language) chips.push({ label: selectedCtx.language, key: 'language', source: 'ctx' });
    if (selectedCtx.user) chips.push({ label: selectedCtx.user, key: 'user', source: 'ctx' });
    if (globalFilters.inputType) chips.push({ label: globalFilters.inputType, key: 'inputType', source: 'filter' });
    return chips;
  }, [selectedCtx, globalFilters]);

  const filteredData = useMemo(() => {
    // Compute filtered slices based on selectedCtx, globalFilters, investFilters
    const isFiltered = Object.keys(selectedCtx).length > 0 || Object.keys(globalFilters).length > 0 || Object.keys(investFilters).length > 0;
    return { isFiltered, activeFilter: { ...selectedCtx, ...globalFilters, ...investFilters } };
  }, [selectedCtx, globalFilters, investFilters]);

  const breadcrumb = useMemo(() => {
    const parts = [pageTitles[activeSection] || 'Overview'];
    if (selectedCtx.channel) parts.push(`Ch-${selectedCtx.channel}`);
    if (selectedCtx.month) parts.push(selectedCtx.month);
    if (selectedCtx.language) parts.push(selectedCtx.language);
    if (selectedCtx.user) parts.push(selectedCtx.user);
    return parts;
  }, [activeSection, selectedCtx]);

  const dashCtx = useMemo(() => ({
    selectCtx, selectedCtx, startInvestigation, exitInvestigation,
    openCompare, closeCompare, filteredData, pinFinding, unpinFinding,
    openPanel, investigationMode, storyMode, compareState,
    activeChips, removeChip, clearAllFilters, exitStory, startStory,
    insightMode, setInsightMode, showBenchmark, setShowBenchmark,
    pinnedFindings, scrollToSection, addToast,
    liveDashboard, isLive,
  }), [
    selectCtx, selectedCtx, startInvestigation, exitInvestigation,
    openCompare, closeCompare, filteredData, pinFinding, unpinFinding,
    openPanel, investigationMode, storyMode, compareState,
    activeChips, removeChip, clearAllFilters, exitStory, startStory,
    insightMode, showBenchmark, pinnedFindings, scrollToSection, addToast,
    liveDashboard, isLive,
  ]);

  const appUICtx = useMemo(() => ({
    panelOpen, setPanelOpen, panelTab, setPanelTab, openPanel,
  }), [panelOpen, panelTab, openPanel]);

  // Command palette action handler
  const handleCmdAction = useCallback((action) => {
    if (!action) return;
    switch (action.type) {
      case 'nav': scrollToSection(action.target); break;
      case 'panel': openPanel(action.tab); break;
      case 'investigate': startInvestigation(action.id); openPanel('evidence'); break;
      case 'compare': openCompare(action.typeA, action.a, action.typeB, action.b); break;
      case 'clear': clearAllFilters(); break;
      case 'theme': setTheme(t => t === 'dark' ? 'light' : 'dark'); break;
      case 'insights': setInsightMode(v => !v); break;
    }
  }, [scrollToSection, openPanel, startInvestigation, openCompare, clearAllFilters]);

  return (
    <DashContext.Provider value={dashCtx}>
      <AppUICtx.Provider value={appUICtx}>
        <>
          {showIntro && (
            <IntroAnimation
              onDone={() => {
                localStorage.setItem(INTRO_KEY, "1");
                setShowIntro(false);
              }}
            />
          )}

          <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} onAction={handleCmdAction} />
          <HowToUseModal open={howToUseOpen} onClose={() => setHowToUseOpen(false)} />

          <div
            className="shell"
            style={{
              opacity: showIntro ? 0 : 1,
              transition: "opacity 0.5s ease 0.15s",
              transform: showIntro ? "scale(0.995)" : "scale(1)",
              transitionProperty: "opacity,transform",
            }}
          >
            {/* ── SIDEBAR ── */}
            <ResizableSidebar collapsed={sideCollapsed} setCollapsed={setSideCollapsed}>
              <div className="sidebar-logo">
                {sideCollapsed ? (
                  <button
                    className="logo-f-btn"
                    onClick={() => setSideCollapsed(false)}
                    title="Expand sidebar"
                    aria-label="Expand sidebar"
                  >
                    F
                  </button>
                ) : (
                  <div className="logo-lockup">
                    <span className="logo-wordmark">FRAMMER <em>AI</em></span>
                    <div className="logo-live-dot" />
                  </div>
                )}
              </div>

              <div className="nav-grp">SECTIONS</div>
              {ALL_SECTIONS.filter(s => s.k !== "client").map((s) => (
                <div
                  key={s.k}
                  className={`nav-item${activeSection === s.k ? " active" : ""}`}
                  onClick={() => scrollToSection(s.k)}
                >
                  <span className="nav-icon">{s.icon}</span>
                  <span className="nav-label">{pageTitles[s.k] || s.label}</span>
                </div>
              ))}

              <div style={{ margin: "16px 0 8px" }}>
                <div className="nav-grp">TOOLS</div>
                <div
                  className="nav-item"
                  onClick={() => { window.location.href = '/analyze'; }}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="nav-icon">⬆</span>
                  <span className="nav-label">Upload &amp; Analyze</span>
                </div>
              </div>

              <div style={{ margin: "16px 0 8px" }}>
                <div className="nav-grp">WORKSPACE</div>
                <div className={`nav-item${panelOpen && panelTab === 'copilot' ? ' active' : ''}`} onClick={() => openPanel('copilot')}>
                  <span className="nav-icon">⊹</span>
                  <span className="nav-label">Copilot</span>
                </div>
              </div>
              <div className="sb-stats">
                <div className="nav-grp" style={{ paddingTop: 12 }}>
                  Platform
                </div>
                {(shellData?.sidebar?.platformKpis || []).map((s) => (
                  <div key={s.l} className="sb-row">
                    <span className="sb-lbl">{s.l}</span>
                    <span className="sb-val" style={{ color: s.c }}>{s.v}</span>
                  </div>
                ))}
              </div>
              <div className="sb-foot">
                v19 · <span style={{ color: 'var(--suc)', opacity: 0.9 }}>● live</span>
              </div>
            </ResizableSidebar>

            {/* ── MAIN ── */}
            <div className="main" style={{ marginRight: panelOpen ? 'var(--panel-w)' : 0, transition: 'margin-right 0.24s var(--ease-out)' }}>
              {/* Topbar */}
              <div className="topbar">
                {/* Left — period chip */}
                <div className="topbar-left">
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "5px 12px",
                    background: "rgba(255,255,255,0.03)",
                    border: "0.5px solid rgba(255,255,255,0.08)",
                    borderRadius: 5,
                    flexShrink: 0,
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(48,209,88,0.7)", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontFamily: "var(--font-sans)", fontWeight: 500, color: "rgba(255,255,255,0.60)", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
                      {shellData?.sidebar?.period?.value || "Mar 2025 → Feb 2026"}
                    </span>
                    <span style={{ width: 1, height: 12, background: "rgba(255,255,255,0.10)", flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontFamily: "var(--font-sans)", color: "rgba(255,255,255,0.28)", whiteSpace: "nowrap" }}>
                      {shellData?.sidebar?.period?.sub || "12 months"}
                    </span>
                  </div>
                  {breadcrumb.length > 1 && (
                    <div className="breadcrumb" style={{ marginLeft: 4 }}>
                      {breadcrumb.map((item, i) => (
                        <span key={i}>
                          {i > 0 && <span className="breadcrumb-sep">›</span>}
                          <span className={`breadcrumb-item${i === breadcrumb.length - 1 ? ' active' : ''}`}>{item}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right — actions */}
                <div className="topbar-right">
                  {clientOpen ? (
                    <button className="ctrl-btn" onClick={backFromClient} style={{ fontSize: 11 }}>← Back</button>
                  ) : (
                    <button
                      onClick={goToClient}
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "0.5px solid rgba(255,255,255,0.10)",
                        borderRadius: 5,
                        padding: "5px 13px",
                        fontSize: 11,
                        fontFamily: "var(--font-sans)",
                        fontWeight: 500,
                        letterSpacing: "0.05em",
                        color: "rgba(255,255,255,0.45)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexShrink: 0,
                        transition: "all 0.15s",
                        textTransform: "uppercase",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(232,67,45,0.40)"; e.currentTarget.style.color = "rgba(232,100,80,1)"; e.currentTarget.style.background = "rgba(232,67,45,0.08)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; e.currentTarget.style.color = "rgba(255,255,255,0.45)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                    >
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(232,100,80,0.70)", flexShrink: 0 }} />
                      Client
                    </button>
                  )}

                  {/* Divider */}
                  <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />

                  <div className="cmd-trigger" onClick={() => setCmdOpen(true)}>
                    <span className="cmd-trigger-icon">⌕</span>
                    <span className="cmd-trigger-text">Search</span>
                    <span className="cmd-trigger-kbd">⌘K</span>
                  </div>

                  <button
                    onClick={() => openPanel('copilot')}
                    title="Open AI Copilot"
                    style={{
                      background: panelOpen && panelTab === 'copilot' ? "rgba(232,67,45,0.10)" : "rgba(255,255,255,0.03)",
                      border: `0.5px solid ${panelOpen && panelTab === 'copilot' ? "rgba(232,67,45,0.35)" : "rgba(255,255,255,0.09)"}`,
                      borderRadius: 5,
                      padding: "5px 12px",
                      fontSize: 11,
                      fontFamily: "var(--font-sans)",
                      fontWeight: 500,
                      color: panelOpen && panelTab === 'copilot' ? "rgba(232,100,80,1)" : "rgba(255,255,255,0.40)",
                      cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 5,
                      flexShrink: 0,
                      transition: "all 0.15s",
                      letterSpacing: "0.04em",
                    }}
                    onMouseEnter={e => { if (!(panelOpen && panelTab === 'copilot')) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; e.currentTarget.style.color = "rgba(255,255,255,0.70)"; } }}
                    onMouseLeave={e => { if (!(panelOpen && panelTab === 'copilot')) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; e.currentTarget.style.color = "rgba(255,255,255,0.40)"; } }}
                  >
                    <span style={{ fontSize: 12 }}>⊹</span>
                    Copilot
                  </button>

                  <button
                    onClick={() => setHowToUseOpen(true)}
                    title="How to use"
                    style={{
                      background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.09)", borderRadius: 5,
                      width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", color: "rgba(255,255,255,0.35)", fontSize: 13,
                      flexShrink: 0, transition: "all 0.15s", fontFamily: "var(--font-sans)",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.20)"; e.currentTarget.style.color = "rgba(255,255,255,0.70)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}
                  >
                    ?
                  </button>

                  <div
                    className={`theme-toggle${theme === "light" ? " light" : ""}`}
                    onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                    title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                  />
                </div>
              </div>

              {/* Insight Chips */}
              <InsightChips />

              {/* Main scrollable sections with progressive disclosure */}
              {!clientOpen && (
                <div className="content" ref={contentRef} style={{ padding: '20px 24px' }}>
                  {pagedMode ? (
                    renderPagedSection()
                  ) : (
                    <>
                      <SectionShell
                        id="executive" title="Executive Overview" icon="◈"
                        summary={`${(isLive ? liveM.created : M.created).toLocaleString()} AI frames · ${isLive ? liveM.publishRate : M.publishRate}% pub rate · ${isLive ? liveM.activeChannels : M.activeChannels} channels`}
                        defaultExpanded={true}
                      >
                        <SectionExecutive addToast={addToast} theme={theme} onAskAI={handleAskAI} />
                      </SectionShell>

                      <SectionShell
                        id="trends" title="Performance Trends" icon="⌇"
                        summary="12-month upload vs publish trajectory"
                        badge="YoY +23%"
                      >
                        <SectionTrends theme={theme} onAskAI={handleAskAI} />
                      </SectionShell>

                        <SectionShell
                          id="lift" title="Lift & Forecast Lab" icon="⇡"
                          summary="Upload CSV or run demo for lift + causal forecast"
                          badge="Demo"
                        >
                          <SectionLiftLab theme={theme} onAskAI={handleAskAI} />
                        </SectionShell>

                      <SectionShell
                        id="multidim" title="Multi-Dimensional Analysis" icon="⬡"
                        summary="Channel × content type breakdown"
                      >
                        <SectionMultiDim theme={theme} onAskAI={handleAskAI} />
                      </SectionShell>

                      <SectionShell
                        id="funnel" title="Content Funnel" icon="▽"
                        summary="Upload → Create → Publish conversion"
                      >
                        <SectionFunnel theme={theme} onAskAI={handleAskAI} />
                      </SectionShell>

                      <SectionShell
                        id="explorer" title="Explorer" icon="⊞"
                        summary="Filterable channel × content data table"
                      >
                        <SectionExplorer theme={theme} onAskAI={handleAskAI} />
                      </SectionShell>
                    </>
                  )}
                </div>
              )}

              {/* Client panel */}
              {clientOpen && (
                <div className="content" style={{ flex: 1, overflowY: "auto" }}>
                  <div className="section-block fade-up" style={{ paddingBottom: 80 }}>
                    <SectionClient onClose={backFromClient} onAskAI={handleAskAI} />
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel */}
            <RightPanel
              open={panelOpen}
              activeTab={panelTab}
              setActiveTab={setPanelTab}
              onClose={() => setPanelOpen(false)}
              attachedData={activeGraphData}
              onRemoveData={removeGraphData}
              chatSessionId={chatSessionId}
              onChatSessionId={setChatSessionId}
            />

            <ToastZone toasts={toasts} remove={removeToast} />

            {/* Highlight overlay */}
            {highlightSection && (
              <>
                <div
                  style={{
                    position: "fixed", inset: 0, zIndex: 7000,
                    background: "rgba(0,0,0,0.4)", pointerEvents: "all",
                  }}
                  onClick={exitHighlight}
                />
                <div
                  style={{
                    position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
                    background: "var(--bg2)", border: "1px solid rgba(255,71,87,0.28)",
                    borderRadius: 6, padding: "8px 20px", fontFamily: "var(--font-mono)",
                    fontSize: 10, color: "var(--pri-lt)", zIndex: 7020, pointerEvents: "none",
                    letterSpacing: "0.08em", boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Click anywhere to exit spotlight · ESC
                </div>
                <HighlightEscListener onEscape={exitHighlight} />
              </>
            )}
          </div>
        </>
      </AppUICtx.Provider>
    </DashContext.Provider>
  );
}
