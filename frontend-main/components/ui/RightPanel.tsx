// @ts-nocheck
"use client";

import { useState, useEffect, useRef } from 'react';
import { useDash } from '@/lib/contexts';
import { ANOMALIES, SAVED_VIEWS, STORY_PRESETS, M } from '@/lib/constants';
import { sendChatMessage } from '@/lib/api';

const TABS = [
  { id: 'explain', icon: '◈', label: 'Explain' },
  { id: 'compare', icon: '⇔', label: 'Compare' },
  { id: 'copilot', icon: '⊹', label: 'Copilot' },
];

export default function RightPanel({ open, activeTab, setActiveTab, onClose, attachedData, onRemoveData, chatSessionId, onChatSessionId }: any) {
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
        {activeTab === 'copilot' && <CopilotTab dash={dash} attachedData={attachedData} onRemoveData={onRemoveData} sessionId={chatSessionId} onSessionId={onChatSessionId} />}
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

function CopilotTab({ dash, attachedData, onRemoveData, sessionId: externalSessionId, onSessionId }: any) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hi! I'm your AI Data Analyst. I can help explore your data, answer questions, and generate chart or table insights.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionIdLocal] = useState<string | null>(externalSessionId || null);
  const [ragMode, setRagMode] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Sync external session ID
  useEffect(() => {
    if (externalSessionId && externalSessionId !== sessionId) {
      setSessionIdLocal(externalSessionId);
    }
  }, [externalSessionId]);

  const setSessionId = (id: string | null) => {
    setSessionIdLocal(id);
    if (onSessionId) onSessionId(id);
  };

  const sel = dash?.selectedCtx || {};
  const hasContext = sel.channel || sel.month || sel.language || sel.user;
  const sources = Array.isArray(attachedData) ? attachedData : [];

  const QUICK_PROMPTS = [
    'What is the overall publish rate?',
    'Which channels have the highest volume?',
    'Show me monthly trends',
  ];

  const resetMessages = () => {
    setMessages([
      {
        role: 'assistant',
        text: "Chat cleared. Ask me anything about the dashboard data.",
      },
    ]);
    setSessionId(null);
  };

  const handleSend = async (txt?: string) => {
    const userMsg = (txt ?? input).trim();
    if (!userMsg || loading) return;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    // Build context message with attached sources
    let fullMessage = userMsg;
    if (sources.length > 0) {
      const ctx = sources.map((s: any) => `[Attached: ${s.name}] ${JSON.stringify(s.data).substring(0, 800)}`).join('\n');
      fullMessage = `${ctx}\n\nQuestion: ${userMsg}`;
    }

    try {
      if (ragMode) {
        const ragRes = await fetch('http://localhost:8000/ask-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: userMsg,
            session_id: sessionId,
            use_thinking_model: false,
          }),
        });
        if (!ragRes.ok) throw new Error('RAG request failed');
        const ragData = await ragRes.json();
        setSessionId(ragData.session_id);
        const datasets = Array.isArray(ragData.datasets_referenced)
          ? ragData.datasets_referenced.join(', ')
          : 'None';
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            text: `RAG response (context: ${ragData.context_size ?? 0}, datasets: ${datasets})\n\n${ragData.answer || ''}`,
          },
        ]);
      } else {
        // Use the API function for chat
        const chatData = await sendChatMessage(fullMessage, sessionId);
        setSessionId(chatData.session_id);
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            text: chatData.response || 'No response returned.',
            artifacts: chatData.artifacts || [],
          },
        ]);
      }
    } catch (e: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: `Sorry, I couldn't process your request. ${e?.message ? `Error: ${e.message}` : 'Please make sure the backend server is running on port 8000.'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
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
            <div className="chat-bbl">
              {msg.text}
              {Array.isArray(msg.artifacts) && msg.artifacts.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 10, opacity: 0.8 }}>
                  {msg.artifacts.map((a: any, idx: number) => (
                    <div key={idx} style={{ marginTop: 4 }}>
                      • {a.type || 'artifact'} {a.title ? `- ${a.title}` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-msg">
            <div className="chat-mav">F</div>
            <div className="chat-bbl" style={{ opacity: 0.8 }}>
              Analyzing...
            </div>
          </div>
        )}

        {messages.length <= 1 && !loading && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
            {QUICK_PROMPTS.map((p) => (
              <button key={p} className="chat-qp" onClick={() => handleSend(p)}>
                {p}
              </button>
            ))}
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
        <button
          className="chat-qp"
          style={{ marginRight: 6 }}
          onClick={() => setRagMode(v => !v)}
          title="Toggle RAG mode"
        >
          {ragMode ? 'RAG ON' : 'RAG OFF'}
        </button>
        <button
          className="chat-qp"
          style={{ marginRight: 6 }}
          onClick={resetMessages}
          title="Clear chat"
        >
          Clear
        </button>
        <input
          className="chat-inp"
          placeholder={sources.length > 0 ? `Ask about ${sources[sources.length - 1].name}...` : "Ask about the data..."}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button className="chat-send" onClick={() => handleSend()} disabled={loading}>↑</button>
      </div>
    </div>
  );
}
