// @ts-nocheck
"use client";

import { useState, useEffect, useRef } from 'react';
import { useDash } from '@/lib/contexts';
import { ANOMALIES, SAVED_VIEWS, STORY_PRESETS, M } from '@/lib/constants';

const TABS = [
  { id: 'explain', icon: '◈', label: 'Explain' },
  { id: 'compare', icon: '⇔', label: 'Compare' },
  { id: 'copilot', icon: '⊹', label: 'Copilot' },
];

export default function RightPanel({ open, activeTab, setActiveTab, onClose, attachedData, onRemoveData }: any) {
  const dash = useDash();

  return (
    <div className={`rp-shell${open ? ' open' : ''}`}>
      <div className="rp-tabs">
        {TABS.map(t => (
          <div
            key={t.id}
            className={`rp-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            <span className="rp-tab-icon">{t.icon}</span>
            <span className="rp-tab-label">{t.label}</span>
          </div>
        ))}
        <button className="rp-close" onClick={onClose}>✕</button>
      </div>

      <div className="rp-body">
        {activeTab === 'explain' && <ExplainTab dash={dash} />}
        {activeTab === 'compare' && <CompareTab dash={dash} />}
        {activeTab === 'copilot' && <CopilotTab dash={dash} attachedData={attachedData} onRemoveData={onRemoveData} />}
      </div>
    </div>
  );
}

function ExplainTab({ dash }: any) {
  const sel = dash?.selectedCtx || {};
  const hasSelection = sel.channel || sel.month || sel.language || sel.user;

  if (!hasSelection) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">◈</div>
        <div className="empty-state-text">Select a data point to see detailed explanation</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
          <button className="explain-action" onClick={() => dash?.selectCtx?.({ month: "Feb'26" })}>Feb 2026</button>
          <button className="explain-action" onClick={() => dash?.selectCtx?.({ channel: 'D' })}>Ch-D</button>
          <button className="explain-action" onClick={() => dash?.selectCtx?.({ language: 'English' })}>English</button>
        </div>
      </div>
    );
  }

  const entity = sel.channel ? `Channel ${sel.channel}` : sel.month || sel.language || sel.user || '';

  return (
    <>
      <div className="explain-card">
        <div className="explain-entity">{entity}</div>
        <div className="explain-delta">Primary metric: {M.publishRate}% publish rate platform average</div>
        <div className="explain-row"><span className="explain-lbl">Uploaded</span><span className="explain-val">{M.uploaded.toLocaleString()}</span></div>
        <div className="explain-row"><span className="explain-lbl">Created</span><span className="explain-val">{M.created.toLocaleString()}</span></div>
        <div className="explain-row"><span className="explain-lbl">Published</span><span className="explain-val">{M.published}</span></div>
        <div className="explain-row"><span className="explain-lbl">AI Multiplier</span><span className="explain-val">{M.multiplier}×</span></div>
        <div className="explain-actions">
          <button className="explain-action" onClick={() => dash?.startInvestigation?.('pub_gap')}>⚑ Investigate</button>
          <button className="explain-action" onClick={() => dash?.pinFinding?.({ id: entity, label: entity })}>📌 Pin</button>
        </div>
      </div>
    </>
  );
}

function EvidenceTab({ dash }: any) {
  return (
    <>
      <div className="rp-section-lbl">Anomalies</div>
      {ANOMALIES.map(a => (
        <div key={a.id} className="ev-item" onClick={() => dash?.startInvestigation?.(a.id)}>
          <div className="ev-item-label">{a.type === 'crit' ? '⚑ CRITICAL' : '⚠ WARNING'}</div>
          <div className="ev-item-val">{a.title}</div>
          <div className="ev-item-sub">{a.detail}</div>
        </div>
      ))}

      {dash?.pinnedFindings?.length > 0 && (
        <>
          <div className="rp-section-lbl">Pinned Findings</div>
          {dash.pinnedFindings.map((p: any) => (
            <div key={p.id} className="pin-item">
              📌 {p.label}
              <span className="pin-item-x" onClick={() => dash?.unpinFinding?.(p.id)}>✕</span>
            </div>
          ))}
        </>
      )}
    </>
  );
}

function CompareTab({ dash }: any) {
  const cs = dash?.compareState;

  if (!cs) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⇔</div>
        <div className="empty-state-text">Start a comparison to see side-by-side analysis</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10, width: '100%' }}>
          <button className="explain-action" onClick={() => dash?.openCompare?.('channel', 'A', 'channel', 'D')}>⇔ Ch-A vs Ch-D</button>
          <button className="explain-action" onClick={() => dash?.openCompare?.('language', 'English', 'language', 'Hindi')}>⇔ English vs Hindi</button>
          <button className="explain-action" onClick={() => dash?.openCompare?.('period', 'H1', 'period', 'H2')}>⇔ H1 vs H2</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rp-section-lbl">Comparison</div>
      <div className="explain-card">
        <div className="explain-entity">{cs.a} vs {cs.b}</div>
        <div className="explain-delta">Type: {cs.typeA}</div>
        <div className="explain-actions">
          <button className="explain-action" onClick={() => dash?.closeCompare?.()}>Close comparison</button>
        </div>
      </div>
    </>
  );
}

function ViewsTab({ dash }: any) {
  return (
    <>
      <div className="rp-section-lbl">Saved Views</div>
      {SAVED_VIEWS.map(v => (
        <div
          key={v.id}
          className="sv-item"
          onClick={() => {
            dash?.scrollToSection?.(v.section);
            if (v.anomaly) dash?.startInvestigation?.(v.anomaly);
            if (v.panelTab) dash?.openPanel?.(v.panelTab);
          }}
        >
          <div className="sv-icon">{v.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sv-name">{v.name}</div>
            <div className="sv-desc">{v.desc}</div>
          </div>
          <span className="sv-arrow">›</span>
        </div>
      ))}

      <div className="rp-section-lbl" style={{ marginTop: 20 }}>Story Presets</div>
      {STORY_PRESETS.map(s => (
        <div key={s.id} className="sv-item" onClick={() => dash?.startStory?.(s.id)}>
          <div className="sv-icon">▶</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sv-name">{s.title}</div>
            <div className="sv-desc">{s.narrative.slice(0, 60)}...</div>
          </div>
          <span className="sv-arrow">›</span>
        </div>
      ))}
    </>
  );
}

function CopilotTab({ dash, attachedData, onRemoveData }: any) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'I can help you explore the dashboard data. What would you like to know?' },
  ]);
  const [input, setInput] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  const sel = dash?.selectedCtx || {};
  const hasContext = sel.channel || sel.month || sel.language || sel.user;
  const sources = Array.isArray(attachedData) ? attachedData : [];

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');

    // Build context from attached graph data
    let graphContext = '';
    if (sources.length > 0) {
      graphContext = sources.map(s =>
        `\n[Source: ${s.name}] ${JSON.stringify(s.data).substring(0, 600)}`
      ).join('');
    }

    // Simple response matching — uses attached data context when available
    let response = "I'll analyze the data for you. The platform processed 15,119 AI outputs from 4,453 uploads with a 2.5% publish rate.";
    const q = userMsg.toLowerCase();

    if (sources.length > 0) {
      const sourceNames = sources.map(s => s.name).join(', ');
      // Context-aware responses based on attached graphs
      if (q.includes('publish') || q.includes('rate')) {
        response = `Based on the attached data (${sourceNames}): The publish rate is ${M.publishRate}%. Only ${M.published} of ${M.created.toLocaleString()} created items were published — a ${M.unpubRate}% gap.`;
      } else if (q.includes('channel')) {
        response = `Based on the attached data (${sourceNames}): ${M.activeChannels} channels are active. Ch-${M.topCh} leads with ${M.topChPub} publishes (${M.topChRate}% rate). 12 of 18 channels have zero published output.`;
      } else if (q.includes('quality') || q.includes('team')) {
        response = `Based on the attached data (${sourceNames}): 99.3% of records have unknown team attribution. 68% of published items have NULL platform data. ~15.5% of created outputs appear to be QA/test artifacts.`;
      } else if (q.includes('trend') || q.includes('spike') || q.includes('month')) {
        response = `Based on the attached data (${sourceNames}): ${M.peakMonth} saw an anomalous spike of ${M.peakCreated.toLocaleString()} outputs. ${M.zeroPubMonths} months had zero publishes (Mar, Jul, Sep 2025).`;
      } else {
        response = `I'm analyzing the attached data from: ${sourceNames}. The dataset shows ${M.uploaded.toLocaleString()} uploads producing ${M.created.toLocaleString()} AI outputs with only ${M.published} published (${M.publishRate}% rate).`;
      }
    } else {
      if (q.includes('publish') || q.includes('rate')) {
        response = `The publish rate is ${M.publishRate}%. Only ${M.published} of ${M.created.toLocaleString()} created items were published.`;
      } else if (q.includes('channel')) {
        response = `There are ${M.activeChannels} active channels. Ch-${M.topCh} leads with ${M.topChPub} publishes (${M.topChRate}% rate).`;
      } else if (q.includes('quality') || q.includes('team')) {
        response = '99.3% of records have unknown team attribution. 68% of published items have NULL platform data.';
      } else if (q.includes('trend') || q.includes('spike')) {
        response = `${M.peakMonth} saw an anomalous spike: ${M.peakCreated.toLocaleString()} outputs created. ${M.zeroPubMonths} months had zero publishes.`;
      }
    }

    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', text: response }]);
    }, 400);
  };

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', margin: '-16px', overflow: 'hidden' }}>
      {/* Context capsule — selected filters */}
      {hasContext && (
        <div className="cop-ctx-capsule">
          <span className="cop-ctx-label">Context</span>
          {sel.channel && <span>Ch-{sel.channel}</span>}
          {sel.month && <span>{sel.month}</span>}
          {sel.language && <span>{sel.language}</span>}
          {sel.user && <span>{sel.user}</span>}
        </div>
      )}

      <div className="rp-chat-body" ref={chatRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.role === 'user' ? 'user' : ''}`}>
            {msg.role === 'assistant' && <div className="chat-mav">F</div>}
            <div className="chat-bbl">{msg.text}</div>
          </div>
        ))}

        {messages.length <= 1 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
            <button className="chat-qp" onClick={() => { setInput('What is the publish rate?'); }}>Publish rate?</button>
            <button className="chat-qp" onClick={() => { setInput('Show channel breakdown'); }}>Channel breakdown</button>
            <button className="chat-qp" onClick={() => { setInput('What are the data quality issues?'); }}>Data quality</button>
          </div>
        )}
      </div>

      {/* Attached graph sources — above textbox */}
      {sources.length > 0 && (
        <div style={{
          padding: '6px 14px 0', borderTop: '1px solid var(--line-lt)',
          display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0,
          background: 'var(--bg2)',
        }}>
          {sources.map((source: any) => (
            <div key={source.name} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 6px 3px 8px', background: 'var(--pri-dim)',
              border: '1px solid rgba(255,71,87,0.18)', borderRadius: 20,
              fontSize: 10, color: 'var(--ink2)',
            }}>
              <span style={{ fontSize: 10, opacity: 0.6 }}>◈</span>
              <span style={{
                overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)', fontWeight: 500,
                maxWidth: 140,
              }}>
                {source.name}
              </span>
              <button
                onClick={() => onRemoveData?.(source.name)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--ink4)', fontSize: 12, lineHeight: 1,
                  padding: 0, flexShrink: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%', width: 16, height: 16,
                  transition: 'all 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--dan-lt)'; e.currentTarget.style.background = 'rgba(255,71,87,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink4)'; e.currentTarget.style.background = 'none'; }}
                title={`Remove ${source.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rp-chat-foot">
        <input
          className="chat-inp"
          placeholder={sources.length > 0 ? `Ask about ${sources[sources.length - 1].name}...` : "Ask about the data..."}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button className="chat-send" onClick={handleSend}>↑</button>
      </div>
    </div>
  );
}
