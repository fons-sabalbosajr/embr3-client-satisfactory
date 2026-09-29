// VERA — Virtual Evaluation & Response Assistant (floating chat widget).
//
// Two mounts share this component:
//   • realm="admin"  — inside the admin layout. Answers are grounded in live
//     survey insights and written as short analyst briefs.
//   • realm="public" — on the landing page. Help-library answers about the
//     survey only; no data, no account help, tokenless endpoints.
//
// Self-contained: manages its own open/minimise state, conversation and API
// calls. Assistant replies are rendered as PLAIN TEXT (no HTML injection).
// A trimmed transcript is kept in sessionStorage, encrypted through the app's
// storage helpers — an admin transcript can quote client remarks.

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  SendOutlined, CloseOutlined, MinusOutlined, DeleteOutlined,
  MessageOutlined, BarChartOutlined, WarningOutlined, ReloadOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import * as api from "../../services/api";
import VeraFlameIcon from "./VeraFlameIcon";
import { setEncryptedSessionItem, getDecryptedSessionItem } from "../../utils/encryptedStorage";
import "./VeraChat.css";

const MAX_STORED = 30;
const MAX_INPUT = 1000;
const HISTORY_TURNS = 8;
const NUDGE_TTL_MS = 11000;

// Contextual nudges keyed by admin page — guidance only, never data.
const CONTEXT_NUDGES = {
  dashboard: "Want the story behind these numbers? Ask me which dimension needs attention.",
  "measurement-data": "Looking for a pattern in the responses? Ask me to summarise the latest remarks.",
  "generate-report": "Preparing the ARTA report? I can explain how each score is computed.",
  "extract-data": "I can tell you the most availed services before you export.",
  "vera-settings": "This is where you set my provider, tone and starter questions.",
};

function newId() {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

export default function VeraChat({ realm = "admin", activeMenu = "", isMobile = false }) {
  const isPublic = realm === "public";
  const storageKey = `vera_chat_${realm}`;

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [thinkStage, setThinkStage] = useState(0);
  const [status, setStatus] = useState({ mode: "fallback", starterQuestions: [], greeting: "", name: "VERA", fullName: "Virtual Evaluation & Response Assistant", enabled: true });
  const [nudge, setNudge] = useState(null);

  const nudgeTimerRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const abortReasonRef = useRef(null);
  const lastUserTextRef = useRef("");
  const loadedStatus = useRef(false);
  const pendingAskRef = useRef("");

  const name = status.name || "VERA";

  const thinkingMessages = useMemo(
    () => [
      `${name} is thinking…`,
      isPublic ? `${name} is checking the survey guide…` : `${name} is reading the latest survey data…`,
      `${name} is preparing the brief…`,
    ],
    [name, isPublic],
  );
  useEffect(() => {
    if (!typing) { setThinkStage(0); return undefined; }
    const id = setInterval(() => setThinkStage((s) => (s + 1) % thinkingMessages.length), 2200);
    return () => clearInterval(id);
  }, [typing, thinkingMessages.length]);

  // Restore trimmed history once.
  useEffect(() => {
    try {
      const raw = getDecryptedSessionItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) setMessages(parsed.slice(-MAX_STORED));
    } catch { /* ignore */ }
  }, [storageKey]);

  // Persist trimmed history.
  useEffect(() => {
    try {
      setEncryptedSessionItem(storageKey, JSON.stringify(messages.slice(-MAX_STORED)));
    } catch { /* ignore */ }
  }, [messages, storageKey]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing, open, minimized]);

  // Open the single chat instance from anywhere (dashboard card, landing hero).
  useEffect(() => {
    const onOpen = (event) => {
      setOpen(true);
      setMinimized(false);
      const ask = String(event?.detail?.ask || "").trim();
      if (ask) pendingAskRef.current = ask;
    };
    window.addEventListener("vera:open", onOpen);
    return () => window.removeEventListener("vera:open", onOpen);
  }, []);

  const showNudge = useCallback((id, text, cta) => {
    if (!id || !text) return;
    const key = `vera_nudge_${id}`;
    try { if (sessionStorage.getItem(key)) return; } catch { /* ignore */ }
    try { sessionStorage.setItem(key, "1"); } catch { /* ignore */ }
    setNudge({ id, text, cta });
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    nudgeTimerRef.current = setTimeout(() => setNudge(null), NUDGE_TTL_MS);
  }, []);

  const dismissNudge = useCallback(() => {
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    setNudge(null);
  }, []);

  useEffect(() => {
    if (open || !activeMenu || isPublic) return undefined;
    const text = CONTEXT_NUDGES[activeMenu];
    if (!text) return undefined;
    const t = setTimeout(() => showNudge(`ctx_${activeMenu}`, text, true), 1400);
    return () => clearTimeout(t);
  }, [activeMenu, open, isPublic, showNudge]);

  useEffect(() => { if (open) dismissNudge(); }, [open, dismissNudge]);
  useEffect(() => () => { if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current); }, []);

  // Lazy-load status (greeting + starters + mode) on first open.
  useEffect(() => {
    if (!open || loadedStatus.current) return;
    loadedStatus.current = true;
    const req = isPublic ? api.getVeraPublicStatus() : api.getVeraStatus();
    req.then((res) => setStatus((s) => ({ ...s, ...(res.data || {}) }))).catch(() => {});
  }, [open, isPublic]);

  useEffect(() => {
    if (open && !minimized) {
      const t = setTimeout(() => inputRef.current?.focus?.(), 120);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open, minimized]);

  const runRequest = useCallback(async (text) => {
    setTyping(true);
    abortReasonRef.current = null;
    const history = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .filter((m) => m.source !== "error")
      .slice(-HISTORY_TURNS)
      .map((m) => ({ role: m.role, content: m.content }));

    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => { abortReasonRef.current = "timeout"; controller.abort(); }, 40000);

    try {
      const payload = { message: text, history, page: activeMenu };
      const res = isPublic
        ? await api.veraPublicChat(payload, { signal: controller.signal })
        : await api.veraChat(payload, { signal: controller.signal });
      const data = res.data || {};
      if (data.ok && data.answer) {
        setMessages((prev) => [...prev, { id: newId(), role: "assistant", content: data.answer, source: data.source, degraded: !!data.degraded }]);
      } else {
        setMessages((prev) => [...prev, {
          id: newId(), role: "assistant",
          content: data.message || "Sorry, I couldn't answer that right now. Please try again.",
          source: "error", retry: data.code !== "disabled",
        }]);
      }
    } catch (err) {
      const canceled = err?.code === "ERR_CANCELED" || err?.name === "CanceledError";
      const byUser = abortReasonRef.current === "user";
      const serverMsg = err?.response?.data?.message;
      setMessages((prev) => [...prev, {
        id: newId(), role: "assistant",
        content: byUser
          ? "Request cancelled. Ask me anything whenever you're ready."
          : canceled
            ? "That request took too long and was stopped. You can retry."
            : serverMsg || "I'm having trouble reaching the assistant service. You can retry in a moment.",
        source: "error", retry: !byUser,
      }]);
    } finally {
      clearTimeout(timeout);
      abortRef.current = null;
      abortReasonRef.current = null;
      setTyping(false);
    }
  }, [messages, activeMenu, isPublic]);

  const send = useCallback((raw) => {
    const text = String(raw ?? "").trim().slice(0, MAX_INPUT);
    if (!text || typing) return;
    lastUserTextRef.current = text;
    setMessages((prev) => [...prev, { id: newId(), role: "user", content: text }]);
    setInput("");
    runRequest(text);
  }, [typing, runRequest]);

  useEffect(() => {
    if (!open || minimized || typing) return;
    const ask = pendingAskRef.current;
    if (!ask) return;
    pendingAskRef.current = "";
    send(ask);
  }, [open, minimized, typing, send]);

  const retryLast = useCallback(() => {
    if (typing) return;
    const text = lastUserTextRef.current;
    if (!text) return;
    setMessages((prev) => (prev.length && prev[prev.length - 1].source === "error" ? prev.slice(0, -1) : prev));
    runRequest(text);
  }, [typing, runRequest]);

  const cancelRequest = useCallback(() => {
    if (abortRef.current) { abortReasonRef.current = "user"; abortRef.current.abort(); }
  }, []);

  // Admin quick action: the live snapshot, straight from the insights endpoint.
  const showInsights = useCallback(async () => {
    if (typing || isPublic) return;
    setTyping(true);
    try {
      const res = await api.getVeraInsights();
      const brief = res?.data?.brief;
      setMessages((prev) => [...prev, { id: newId(), role: "assistant", content: brief || "No survey data is available yet.", source: "insights" }]);
    } catch {
      setMessages((prev) => [...prev, { id: newId(), role: "assistant", content: "I couldn't load the live snapshot right now.", source: "error" }]);
    } finally {
      setTyping(false);
    }
  }, [typing, isPublic]);

  const clearChat = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    try { sessionStorage.removeItem(storageKey); } catch { /* ignore */ }
  }, [storageKey]);

  const closeWindow = useCallback(() => {
    setOpen(false);
    setMinimized(false);
    if (abortRef.current) abortRef.current.abort();
  }, []);

  const onKeyDownShell = useCallback((e) => {
    if (e.key === "Escape") closeWindow();
  }, [closeWindow]);

  const starters = useMemo(
    () => (Array.isArray(status.starterQuestions) ? status.starterQuestions : []),
    [status.starterQuestions],
  );
  const showGreeting = messages.length === 0;
  const disabled = status.enabled === false;

  return (
    <div className={`vera-root${isPublic ? " vera-root-public" : ""}`}>
      {!open && (
        <>
          {nudge && (
            <div className={`vera-nudge${reducedMotion() ? "" : " vera-nudge-anim"}`} role="status">
              <button type="button" className="vera-nudge-close" aria-label="Dismiss" onClick={dismissNudge}>×</button>
              <span className="vera-nudge-icon"><VeraFlameIcon size={18} /></span>
              <div className="vera-nudge-body">
                <p className="vera-nudge-text">{nudge.text}</p>
                {nudge.cta && (
                  <button type="button" className="vera-nudge-cta" onClick={() => { dismissNudge(); setOpen(true); setMinimized(false); }}>
                    Yes, show me
                  </button>
                )}
              </div>
            </div>
          )}
          <button
            type="button"
            className="vera-launcher"
            aria-label={`Open ${name}, the ${status.fullName || "Virtual Evaluation & Response Assistant"}`}
            onClick={() => { setOpen(true); setMinimized(false); }}
          >
            <span className="vera-launcher-icon"><VeraFlameIcon size={24} /></span>
            <span className="vera-launcher-label">Ask {name}</span>
          </button>
        </>
      )}

      {open && (
        <section
          className={`vera-window${minimized ? " vera-window-min" : ""}${isMobile ? " vera-window-mobile" : ""}`}
          role="dialog"
          aria-label={`${name} assistant chat`}
          onKeyDown={onKeyDownShell}
        >
          <header className="vera-header">
            <div className="vera-header-id">
              <span className="vera-header-icon"><VeraFlameIcon size={22} /></span>
              <div className="vera-header-text">
                <div className="vera-header-name">{name}</div>
                <div className="vera-header-sub">
                  <span className={`vera-status-dot ${disabled ? "off" : status.mode === "model" ? "online" : "lite"}`} />
                  {disabled ? "Offline" : status.mode === "model" ? (isPublic ? "Online" : "Online · Live insights") : (isPublic ? "Online · Survey guide" : "Online · Live figures")}
                </div>
              </div>
            </div>
            <div className="vera-header-actions">
              <button type="button" className="vera-icon-btn" aria-label={minimized ? "Expand chat" : "Minimise chat"} onClick={() => setMinimized((m) => !m)}>
                <MinusOutlined />
              </button>
              <button type="button" className="vera-icon-btn" aria-label="Close chat" onClick={closeWindow}>
                <CloseOutlined />
              </button>
            </div>
          </header>

          {!minimized && (
            <>
              <div className="vera-full-name">{status.fullName || "Virtual Evaluation & Response Assistant"}</div>

              <div className="vera-messages" ref={scrollRef} aria-live="polite">
                {showGreeting && (
                  <div className="vera-msg vera-msg-assistant">
                    <div className="vera-bubble">
                      {status.greeting ||
                        (isPublic
                          ? "Hello! I can explain what this survey is for, how long it takes, and how your answers are protected."
                          : "Hi! I'm VERA, your Virtual Evaluation & Response Assistant. Ask me about satisfaction scores, Citizen's Charter awareness, services availed, trends or client remarks — I answer from the live survey data.")}
                    </div>
                  </div>
                )}

                {messages.map((m) => (
                  <div key={m.id} className={`vera-msg ${m.role === "user" ? "vera-msg-user" : "vera-msg-assistant"}`}>
                    <div className={`vera-bubble${m.source === "error" ? " vera-bubble-error" : ""}${m.source === "insights" ? " vera-bubble-insights" : ""}`}>
                      {m.source === "error" && <WarningOutlined className="vera-bubble-warn" />}
                      {m.content}
                      {m.degraded && (
                        <div className="vera-bubble-note"><InfoCircleOutlined /> Answered from live figures — the model service was unavailable.</div>
                      )}
                      {m.retry && !typing && (
                        <button type="button" className="vera-retry-btn" onClick={retryLast}>
                          <ReloadOutlined /> Retry
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {typing && (
                  <div className="vera-msg vera-msg-assistant">
                    <div className="vera-bubble vera-thinking" aria-live="assertive">
                      <span className="vera-thinking-flame"><VeraFlameIcon size={16} /></span>
                      <span className="vera-thinking-text">{thinkingMessages[thinkStage]}</span>
                      <span className="vera-typing" aria-hidden><span /><span /><span /></span>
                      <button type="button" className="vera-cancel-btn" onClick={cancelRequest} aria-label="Cancel request">Cancel</button>
                    </div>
                  </div>
                )}

                {showGreeting && starters.length > 0 && (
                  <div className="vera-starters">
                    <div className="vera-starters-label">Try asking:</div>
                    {starters.map((q) => (
                      <button key={q} type="button" className="vera-starter-chip" onClick={() => send(q)}>{q}</button>
                    ))}
                  </div>
                )}
              </div>

              <div className="vera-quick-actions">
                {!isPublic && (
                  <button type="button" className="vera-quick-btn" onClick={showInsights} disabled={typing}>
                    <BarChartOutlined /> Live snapshot
                  </button>
                )}
                {messages.length > 0 && (
                  <button type="button" className="vera-quick-btn vera-quick-clear" onClick={clearChat}>
                    <DeleteOutlined /> Clear
                  </button>
                )}
              </div>

              <form className="vera-input-row" onSubmit={(e) => { e.preventDefault(); send(input); }}>
                <textarea
                  ref={inputRef}
                  className="vera-input"
                  value={input}
                  maxLength={MAX_INPUT}
                  rows={1}
                  placeholder={isPublic ? `Ask ${name} about the survey…` : `Ask ${name} about the survey results…`}
                  aria-label={`Message to ${name}`}
                  disabled={disabled}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                />
                <button type="submit" className="vera-send-btn" aria-label="Send message" disabled={!input.trim() || typing || disabled}>
                  <SendOutlined />
                </button>
              </form>

              <div className="vera-disclaimer">
                <MessageOutlined />
                {isPublic
                  ? `${name} explains the survey; it does not collect personal information.`
                  : `${name} reports aggregates from the survey database. Verify individual responses in Measurement Data.`}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
