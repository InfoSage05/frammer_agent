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
              {ALL_SECTIONS.map((s) => {
                const isClient = s.k === "client";
                return (
                  <div
                    key={s.k}
                    className={`nav-item${activeSection === s.k ? " active" : ""}`}
                    onClick={() => scrollToSection(s.k)}
                    data-client-nav={isClient ? "true" : undefined}
                    title={isClient ? "Explicit access only — not in scroll flow" : undefined}
                  >
                    <span className="nav-icon">{s.icon}</span>
                    <span className="nav-label">
                      {pageTitles[s.k] || s.label}
                      {isClient && (
                        <span style={{ marginLeft: 5, fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--ink4)", letterSpacing: "0.08em" }}>
                          PRIVATE
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}

              <div style={{ margin: "16px 0 8px" }}>
                <div className="nav-grp">WORKSPACE</div>
                <div className={`nav-item${panelOpen && panelTab === 'explain' ? ' active' : ''}`} onClick={() => openPanel('explain')}>
                  <span className="nav-icon">◈</span>
                  <span className="nav-label">Explain</span>
                </div>
                <div className={`nav-item${panelOpen && panelTab === 'compare' ? ' active' : ''}`} onClick={() => openPanel('compare')}>
                  <span className="nav-icon">⇔</span>
                  <span className="nav-label">Compare</span>
                </div>
                <div className={`nav-item${panelOpen && panelTab === 'copilot' ? ' active' : ''}`} onClick={() => openPanel('copilot')}>
                  <span className="nav-icon">⊹</span>
                  <span className="nav-label">Copilot</span>
                </div>
              </div>

              <div style={{ margin: "4px 0 0" }}>
                <div className="nav-grp">{shellData?.sidebar?.period?.label || "Period"}</div>
                <div className="sb-period">
                  {shellData?.sidebar?.period?.value}
                  <br />
                  <span className="pr">{shellData?.sidebar?.period?.sub}</span>
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
                <div className="topbar-left">
                  {breadcrumb.length > 1 && (
                    <div className="breadcrumb">
                      {breadcrumb.map((item, i) => (
                        <span key={i}>
                          {i > 0 && <span className="breadcrumb-sep">›</span>}
                          <span className={`breadcrumb-item${i === breadcrumb.length - 1 ? ' active' : ''}`}>{item}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Centered section name */}
                <div className="topbar-center">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" className="topbar-section-grid">
                    <rect x="0" y="0" width="6" height="6" rx="1.5"/>
                    <rect x="8" y="0" width="6" height="6" rx="1.5"/>
                    <rect x="0" y="8" width="6" height="6" rx="1.5"/>
                    <rect x="8" y="8" width="6" height="6" rx="1.5"/>
                  </svg>
                  <span className="topbar-section-name">
                    {clientOpen ? 'Client' : (pageTitles[activeSection] || 'Overview')}
                  </span>
                </div>

                <div className="topbar-right">
                  {clientOpen && (
                    <button className="ctrl-btn" onClick={backFromClient} style={{ fontSize: 9.5 }}>
                      ← Back to Explorer
                    </button>
                  )}
                  <div className="cmd-trigger" onClick={() => setCmdOpen(true)}>
                    <span className="cmd-trigger-icon">⌕</span>
                    <span className="cmd-trigger-text">Search</span>
                    <span className="cmd-trigger-kbd">⌘K</span>
                  </div>
                  <button
                    onClick={() => setHowToUseOpen(true)}
                    title="How to use this dashboard"
                    style={{
                      background: "var(--bg3)", border: "1px solid var(--line)", borderRadius: "50%",
                      width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", color: "var(--ink3)", fontSize: 11, fontFamily: "var(--font-mono)",
                      flexShrink: 0, transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--pri)"; e.currentTarget.style.color = "var(--pri)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--ink3)"; }}
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

              {/* Context Bar */}
              <ContextBar />

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
                    <SectionClient onClose={backFromClient} />
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
