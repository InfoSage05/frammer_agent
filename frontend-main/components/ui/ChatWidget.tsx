// @ts-nocheck
import { useCallback, useState, useRef, useEffect } from "react";
import useJsonData from "@/hooks/useJsonData";
import { sendChatMessage } from "@/lib/api";

const STORAGE_KEY = "frammer_chat";

// Load persisted chat from localStorage
function loadPersistedChat() {
  try {
    const raw = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        msgs: parsed.msgs || null,
        sessionId: parsed.sessionId || null,
      };
    }
  } catch {}
  return { msgs: null, sessionId: null };
}

function persistChat(msgs, sessionId) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ msgs, sessionId }));
  } catch {}
}

// Persistent chat state stored outside component so it survives open/close
const persisted = loadPersistedChat();
const chatState = {
  msgs: persisted.msgs,
  input: "",
  pos: null,
  width: 345,
  sessionId: persisted.sessionId,
};

// Answer → section mapping for "Show on dashboard"
function detectTarget(text) {
  const t = text.toLowerCase();
  // Check for explicit JSON tag first
  const m = text.match(/\{"target":"(\w+)"\}/);
  if (m) return m[1];
  // Heuristic mapping
  if (
    t.includes("publish rate") ||
    t.includes("utilization gap") ||
    t.includes("funnel") ||
    t.includes("drop")
  )
    return "funnel";
  if (
    t.includes("feb 2026") ||
    t.includes("trajectory") ||
    t.includes("monthly") ||
    t.includes("trend") ||
    t.includes("spike")
  )
    return "trends";
  if (
    t.includes("channel") ||
    t.includes("ch-d") ||
    t.includes("ch-a") ||
    t.includes("ch-e") ||
    t.includes("ch-f")
  )
    return "funnel";
  if (
    t.includes("user") ||
    t.includes("chandan") ||
    t.includes("kpi") ||
    t.includes("quality") ||
    t.includes("team")
  )
    return "explorer";
  if (
    t.includes("upload") ||
    t.includes("create") ||
    t.includes("output") ||
    t.includes("process") ||
    t.includes("15,119") ||
    t.includes("4,453")
  )
    return "executive";
  if (
    t.includes("language") ||
    t.includes("english") ||
    t.includes("hindi") ||
    t.includes("input type")
  )
    return "multidim";
  return null;
}

function ChatWidget({ onClose, fabPos, onHighlight, attachedData, onRemoveData, sessionId: externalSessionId, onSessionId }) {
  const { data } = useJsonData("chat-widget");
  const CHAT_W = 345,
    CHAT_H = 490;
  const initPos = (() => {
    if (chatState.pos) return chatState.pos;
    const fp = fabPos || {
      x: window.innerWidth - 80,
      y: window.innerHeight - 88,
    };
    const FAB = 52;
    let x = fp.x - CHAT_W + FAB,
      y = fp.y - CHAT_H;
    if (y < 8) y = fp.y + FAB + 8;
    x = Math.max(8, Math.min(window.innerWidth - CHAT_W - 8, x));
    y = Math.max(8, Math.min(window.innerHeight - CHAT_H - 8, y));
    return { x, y };
  })();

  const initialMessages = data?.initialMessages || [];
  const [msgs, setMsgsRaw] = useState(chatState.msgs || initialMessages);
  const [input, setInputRaw] = useState(chatState.input || "");
  const [loading, setLoading] = useState(false);
  const [pos, setPosRaw] = useState(initPos);
  const [width, setWidthRaw] = useState(chatState.width || CHAT_W);
  const [dragging, setDragging] = useState(false);
  const [sessionId, setSessionIdLocal] = useState(externalSessionId || chatState.sessionId);
  const bodyRef = useRef(null);

  // Restore sessionId from persistence on mount
  useEffect(() => {
    if (chatState.sessionId && !sessionId && onSessionId) {
      onSessionId(chatState.sessionId);
    }
  }, []);

  const setSessionId = (id) => {
    chatState.sessionId = id;
    setSessionIdLocal(id);
    if (onSessionId) onSessionId(id);
    persistChat(chatState.msgs, id);
  };

  // Sync state to persistent store + localStorage
  const setMsgs = (v) => {
    const next = typeof v === "function" ? v(msgs) : v;
    chatState.msgs = next;
    setMsgsRaw(next);
    persistChat(next, chatState.sessionId);
  };
  const setInput = (v) => {
    chatState.input = v;
    setInputRaw(v);
  };
  const setPos = (v) => {
    const next = typeof v === "function" ? v(pos) : v;
    chatState.pos = next;
    setPosRaw(next);
  };
  const setWidth = (v) => {
    chatState.width = v;
    setWidthRaw(v);
  };

  const startDrag = useCallback(
    (e) => {
      if (e.target.closest(".chat-resize-handle")) return;
      const sx = e.clientX - pos.x,
        sy = e.clientY - pos.y;
      setDragging(true);
      const onMove = (ev) =>
        setPos({
          x: Math.max(0, Math.min(window.innerWidth - width, ev.clientX - sx)),
          y: Math.max(0, Math.min(window.innerHeight - 60, ev.clientY - sy)),
        });
      const onUp = () => {
        setDragging(false);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [pos, width],
  );

  const startResize = useCallback(
    (e) => {
      e.stopPropagation();
      e.preventDefault();
      const startX = e.clientX,
        startW = width,
        rightEdge = pos.x + startW;
      const onMove = (ev) => {
        const delta = startX - ev.clientX;
        const newW = Math.max(260, Math.min(520, startW + delta));
        setWidth(newW);
        setPos((p) => ({
          ...p,
          x: Math.max(0, Math.min(window.innerWidth - newW, rightEdge - newW)),
        }));
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [width, pos.x],
  );

  useEffect(() => {
    if (bodyRef.current)
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [msgs]);

  useEffect(() => {
    if (!chatState.msgs && initialMessages.length) {
      setMsgsRaw(initialMessages);
      chatState.msgs = initialMessages;
    }
  }, [initialMessages]);

  const sendMsg = async (txt) => {
    const q = txt || input.trim();
    if (!q || loading) return;
    setInput("");
    const t = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setMsgs((m) => [...m, { role: "user", text: q, time: t }]);
    setLoading(true);

    // Build message with attached context
    let fullMessage = q;
    const attachedSources = Array.isArray(attachedData)
      ? attachedData
      : attachedData
        ? [attachedData]
        : [];
    if (attachedSources.length) {
      const ctx = attachedSources
        .map((source) => `[Attached: ${source.name}] ${JSON.stringify(source.data).substring(0, 800)}`)
        .join("\n");
      fullMessage = `${ctx}\n\nQuestion: ${q}`;
    }

    try {
      const res = await sendChatMessage(fullMessage, sessionId);
      if (res.session_id) {
        setSessionId(res.session_id);
      }
      const target = detectTarget(res.response);
      setMsgs((m) => [
        ...m,
        {
          role: "ai",
          text: res.response,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          target,
          suggestions: res.suggestions,
          artifacts: res.artifacts,
        },
      ]);
    } catch (e) {
      const fb = data?.fallbacks || {};
      const key = Object.keys(fb).find((k) => q.toLowerCase().includes(k));
      const resp = fb[key] || fb.default || { text: "Backend unavailable. Make sure the server is running on localhost:8000.", target: null };
      setMsgs((m) => [
        ...m,
        {
          role: "ai",
          text: resp.text,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          target: resp.target,
        },
      ]);
    }
    setLoading(false);
  };

  const resetChat = () => {
    chatState.msgs = initialMessages;
    chatState.sessionId = null;
    setMsgsRaw(initialMessages);
    setInput("");
    persistChat(initialMessages, null);
    if (onSessionId) onSessionId(null);
  };

  const lastAiMsg = [...msgs]
    .reverse()
    .find((m) => m.role === "ai" && m.target);

  return (
    <div
      className={`chat-widget${dragging ? " dragging" : ""}`}
      style={{ left: pos.x, top: pos.y, width, height: CHAT_H }}
    >
      <div className="chat-resize-handle" onMouseDown={startResize} />
      <div className="chat-hdr" onMouseDown={startDrag}>
        <div className="chat-av">F</div>
        <div className="chat-hdr-info">
          <div className="chat-name text-5xl">Frammer Copilot</div>
          <div className="chat-status">
            <span className="chat-sdot" />
            <span>Persistent · drag · resize left edge</span>
          </div>
        </div>
        <div className="chat-ctrls">
          <button
            className="chat-cbtn"
            onClick={resetChat}
            title="New conversation"
            style={{ fontSize: 10 }}
          >
            ↺
          </button>
          <button
            className="chat-cbtn"
            onClick={onClose}
            title="Close (state preserved)"
          >
            ×
          </button>
        </div>
      </div>
      <div className="chat-body" ref={bodyRef}>
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`chat-msg${m.role === "user" ? " user" : ""}`}
          >
            {m.role === "ai" && <div className="chat-mav">F</div>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="chat-bbl">{m.text}</div>
              <div className="chat-time">{m.time}</div>
              {m.role === "ai" && m.target && (
                <button
                  onClick={() => {
                    onHighlight(m.target);
                    onClose();
                  }}
                  style={{
                    marginTop: 5,
                    fontSize: 9,
                    fontFamily: "var(--font-mono)",
                    background: "var(--glow)",
                    border: "1px solid rgba(212,149,42,0.3)",
                    color: "var(--gold-lt)",
                    borderRadius: 3,
                    padding: "3px 9px",
                    cursor: "pointer",
                    letterSpacing: "0.05em",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  ◎ Show on dashboard
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-msg">
            <div className="chat-mav">F</div>
            <div
              className="chat-bbl"
              style={{ color: "var(--ink4)", fontStyle: "italic" }}
            >
              Analysing data…
            </div>
          </div>
        )}
      </div>
      <div className="chat-qps">
        {(data?.quickPrompts || []).map((p, i) => (
          <button key={i} className="chat-qp" onClick={() => sendMsg(p)}>
            {p}
          </button>
        ))}
      </div>
      {Array.isArray(attachedData) && attachedData.length > 0 && (
        <div
          style={{
            padding: "8px 12px",
            borderTop: "1px solid var(--line)",
            background: "var(--bg2)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
            fontSize: 11,
            fontFamily: "var(--font-mono)",
          }}
        >
          <span style={{ color: "var(--gold)" }}>Sources:</span>
          {attachedData.map((source) => (
            <span
              key={source.name}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 8px",
                borderRadius: 999,
                border: "1px solid var(--line)",
                background: "var(--sankey-bg)",
                color: "var(--ink2)",
                maxWidth: "100%",
              }}
            >
              <span
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {source.name}
              </span>
              <button
                onClick={() => onRemoveData(source.name)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--ink4)",
                  cursor: "pointer",
                  fontSize: 14,
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="chat-foot">
        <input
          className="chat-inp"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMsg()}
          placeholder="Ask about the data…"
        />
        <button className="chat-send" onClick={() => sendMsg()}>
          ↑
        </button>
      </div>
    </div>
  );
}

export default ChatWidget;
