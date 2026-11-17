// VERA — Virtual Environmental Response Assistant (floating admin chat).
//
// The look is the EMBR3 ESWMP / UCDS VERA design: a launcher pill inside a
// border beam, the animated dotted flame whose state follows what VERA is doing
// (burning at rest, listening while you type, thinking / searching / working
// while an answer is on its way), and a palette derived from the admin's own
// accent colour in light or dark. When VERA has something to say unprompted (a
// contextual nudge) she says it in the introduction card: her flame ignites,
// the message types itself out, then she settles. See VeraChat.css.
//
// VERA is admin-only. Answers are grounded in live survey insights and written
// as short analyst briefs. Assistant replies are rendered as PLAIN TEXT (a
// small safe Markdown subset, never HTML). A trimmed transcript is kept in
// sessionStorage, encrypted — an admin transcript can quote client remarks.
//
// Open it from anywhere:   window.dispatchEvent(new CustomEvent("vera:open", { detail: { ask } }))
// Raise a nudge:           window.dispatchEvent(new CustomEvent("vera:nudge", { detail: { id, text, cta } }))

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  ArrowUpOutlined, CloseOutlined, MinusOutlined, DeleteOutlined,
  BarChartOutlined, WarningOutlined, ReloadOutlined, InfoCircleOutlined,
  ExpandAltOutlined, ShrinkOutlined, CopyOutlined, CheckOutlined, ArrowRightOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { theme as antdTheme } from "antd";
import { BorderBeam } from "border-beam";
import "@fontsource/bricolage-grotesque/400.css";
import "@fontsource/bricolage-grotesque/500.css";
import "@fontsource/bricolage-grotesque/700.css";
import * as api from "../../services/api";
import { VeraFlame } from "./VeraMark";
import { setEncryptedSessionItem, getDecryptedSessionItem } from "../../utils/encryptedStorage";
import "./VeraChat.css";

const STORAGE_KEY = "vera_chat_admin";
const MAX_STORED = 30;
const MAX_INPUT = 1000;
const HISTORY_TURNS = 8;
const NUDGE_TTL_MS = 11000;
const REQUEST_TIMEOUT_MS = 40000;
const DEFAULT_FULL_NAME = "Virtual Environmental Response Assistant";

// Contextual nudges keyed by admin page — guidance only, never data.
const CONTEXT_NUDGES = {
  dashboard: "Want the story behind these numbers? Ask me which dimension needs attention.",
  "measurement-data": "Looking for a pattern in the responses? Ask me to summarise the latest remarks.",
  "generate-report": "Preparing the ARTA report? I can explain how each score is computed.",
  "extract-data": "I can tell you the most availed services before you export.",
  "vera-settings": "This is where you set my provider, tone and starter questions.",
};

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

function newId() {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const timeLabel = (at) =>
  at ? new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";

const INPUT_MAX_HEIGHT = 140;

/**
 * VERA's answer, rendered as TEXT — never HTML — so a reply can never inject
 * markup. A small safe subset of Markdown is honoured: **bold**, `code`,
 * numbered and bulleted lists, paragraphs.
 */
function AnswerText({ children }) {
  const blocks = String(children || "").split(/\n{2,}/);
  const inline = (line, key) => (
    <span key={key}>
      {String(line)
        .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
        .map((part, i) => {
          if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
          if (/^`[^`]+`$/.test(part)) return <code key={i} className="vera-code">{part.slice(1, -1)}</code>;
          return <span key={i}>{part}</span>;
        })}
    </span>
  );
  return (
    <div className="vera-answer">
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter((l) => l.trim());
        const isList = lines.length > 0 && lines.every((l) => /^\s*(\d+[.)]|[-•*])\s+/.test(l));
        if (isList) {
          const ListTag = /^\s*\d+[.)]/.test(lines[0]) ? "ol" : "ul";
          return (
            <ListTag key={bi} className="vera-answer__list">
              {lines.map((l, li) => (
                <li key={li}>{inline(l.replace(/^\s*(\d+[.)]|[-•*])\s+/, ""), li)}</li>
              ))}
            </ListTag>
          );
        }
        return (
          <p key={bi} className="vera-answer__p">
            {lines.map((l, li) => (
              <span key={li}>
                {inline(l, li)}
                {li < lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export default function VeraChat({
  activeMenu = "",
  isMobile = false,
  theme = "light", // the admin's mode — the palette and the flame follow it
}) {
  // The palette is derived from the admin's own accent (VeraChat.css), so VERA
  // matches whichever primary colour is chosen in Account Settings.
  const accent = antdTheme.useToken().token.colorPrimary;
  const mode = theme === "dark" ? "dark" : "light";

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  // Wide reading mode for long briefs (desktop only); remembered per browser.
  const [wide, setWide] = useState(() => {
    try { return localStorage.getItem("vera_wide") === "1"; } catch { return false; }
  });
  const [copiedId, setCopiedId] = useState(null);
  const [input, setInput] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [thinkStage, setThinkStage] = useState(0);
  const [status, setStatus] = useState({
    mode: "fallback", starterQuestions: [], greeting: "", name: "VERA", fullName: DEFAULT_FULL_NAME, enabled: true,
  });
  const [statusError, setStatusError] = useState(false);
  const [nudge, setNudge] = useState(null); // { id, text, cta }
  const [typed, setTyped] = useState(0);
  const [introFlame, setIntroFlame] = useState("igniting");

  const launcherRef = useRef(null);
  const nudgeTimerRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const abortReasonRef = useRef(null); // "user" | "timeout" | null
  const lastUserTextRef = useRef("");
  const loadedStatus = useRef(false);
  const pendingAskRef = useRef("");

  const name = status.name || "VERA";
  const fullName = status.fullName || DEFAULT_FULL_NAME;

  // Rotating "thinking" wording while a request is in flight.
  const thinkingMessages = useMemo(
    () => [`${name} is thinking…`, `${name} is reading the latest survey data…`, `${name} is preparing the brief…`],
    [name],
  );
  useEffect(() => {
    if (!typing) { setThinkStage(0); return undefined; }
    const id = setInterval(() => setThinkStage((s) => (s + 1) % thinkingMessages.length), 2200);
    return () => clearInterval(id);
  }, [typing, thinkingMessages.length]);

  // Restore trimmed history once.
  useEffect(() => {
    try {
      const raw = getDecryptedSessionItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) setMessages(parsed.slice(-MAX_STORED));
    } catch { /* ignore */ }
  }, []);

  // Persist trimmed history.
  useEffect(() => {
    try {
      setEncryptedSessionItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED)));
    } catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing, open, minimized]);

  // Open the single chat instance from anywhere (e.g. the dashboard card).
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

  // A nudge shows once per id per browser session, never while the chat is
  // open, and dismisses itself so it stays non-intrusive.
  const showNudge = useCallback((id, text, cta) => {
    if (!id || !text) return;
    const key = `vera_nudge_${id}`;
    try { if (sessionStorage.getItem(key)) return; } catch { /* ignore */ }
    try { sessionStorage.setItem(key, "1"); } catch { /* ignore */ }
    setNudge({ id, text, cta });
    const still = reducedMotion();
    setTyped(still ? String(text).length : 0);
    setIntroFlame(still ? "burning" : "igniting");
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    nudgeTimerRef.current = setTimeout(() => setNudge(null), NUDGE_TTL_MS);
  }, []);

  const dismissNudge = useCallback(() => {
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    setNudge(null);
  }, []);

  useEffect(() => {
    const onNudge = (e) => {
      const d = e?.detail || {};
      showNudge(d.id, d.text, d.cta);
    };
    window.addEventListener("vera:nudge", onNudge);
    return () => window.removeEventListener("vera:nudge", onNudge);
  }, [showNudge]);

  useEffect(() => {
    if (open || !activeMenu) return undefined;
    const text = CONTEXT_NUDGES[activeMenu];
    if (!text) return undefined;
    const t = setTimeout(() => showNudge(`ctx_${activeMenu}`, text, true), 1400);
    return () => clearTimeout(t);
  }, [activeMenu, open, showNudge]);

  useEffect(() => { if (open) dismissNudge(); }, [open, dismissNudge]);
  useEffect(() => () => { if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current); }, []);

  // The nudge card speaks: her flame ignites, the message types itself out,
  // then the flame settles to burning.
  const nudgeText = nudge?.text || "";
  useEffect(() => {
    if (!nudge || reducedMotion()) return undefined;
    const lit = setTimeout(() => setIntroFlame("working"), 1200);
    const tick = setInterval(() => setTyped((n) => (n >= nudgeText.length ? n : n + 2)), 28);
    return () => { clearTimeout(lit); clearInterval(tick); };
  }, [nudge, nudgeText.length]);
  const speaking = Boolean(nudge) && typed < nudgeText.length;
  useEffect(() => {
    if (!nudge || speaking) return undefined;
    const t = setTimeout(() => setIntroFlame("burning"), 600);
    return () => clearTimeout(t);
  }, [nudge, speaking]);

  // Lazy-load status (greeting + starters + mode) on first open; retryable.
  const loadStatus = useCallback(() => {
    setStatusError(false);
    api.getVeraStatus()
      .then((res) => setStatus((s) => ({ ...s, ...(res.data || {}) })))
      .catch(() => setStatusError(true));
  }, []);
  useEffect(() => {
    if (!open || loadedStatus.current) return;
    loadedStatus.current = true;
    loadStatus();
  }, [open, loadStatus]);

  useEffect(() => {
    if (open && !minimized) {
      const t = setTimeout(() => inputRef.current?.focus?.(), 120);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open, minimized]);

  // The request, shared by send() and retryLast(). Always clears the thinking
  // state, so it can never hang.
  const runRequest = useCallback(async (text) => {
    setTyping(true);
    abortReasonRef.current = null;
    const history = messages
      .filter((m) => (m.role === "user" || m.role === "assistant") && m.source !== "error")
      .slice(-HISTORY_TURNS)
      .map((m) => ({ role: m.role, content: m.content }));

    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => { abortReasonRef.current = "timeout"; controller.abort(); }, REQUEST_TIMEOUT_MS);

    try {
      const res = await api.veraChat({ message: text, history, page: activeMenu }, { signal: controller.signal });
      const data = res.data || {};
      if (data.ok && data.answer) {
        setMessages((prev) => [...prev, { id: newId(), at: Date.now(), role: "assistant", content: data.answer, source: data.source, degraded: !!data.degraded }]);
      } else {
        setMessages((prev) => [...prev, {
          id: newId(), at: Date.now(), role: "assistant",
          content: data.message || "Sorry, I couldn't answer that right now. Please try again.",
          source: "error", retry: data.code !== "disabled",
        }]);
      }
    } catch (err) {
      const canceled = err?.code === "ERR_CANCELED" || err?.name === "CanceledError";
      const byUser = abortReasonRef.current === "user";
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      const serverMsg = err?.response?.data?.message;
      setMessages((prev) => [...prev, {
        id: newId(), at: Date.now(), role: "assistant",
        content: byUser
          ? "Request cancelled. Ask me anything whenever you're ready."
          : canceled
            ? "That request took too long and was stopped. You can retry."
            : offline
              ? "You appear to be offline. Check your connection, then retry."
              : serverMsg || "I'm having trouble reaching the assistant service. You can retry in a moment.",
        source: "error", retry: !byUser,
      }]);
    } finally {
      clearTimeout(timeout);
      abortRef.current = null;
      abortReasonRef.current = null;
      setTyping(false);
    }
  }, [messages, activeMenu]);

  const send = useCallback((raw) => {
    const text = String(raw ?? "").trim().slice(0, MAX_INPUT);
    if (!text || typing) return; // duplicate/concurrent submit guard
    lastUserTextRef.current = text;
    setMessages((prev) => [...prev, { id: newId(), at: Date.now(), role: "user", content: text }]);
    setInput("");
    runRequest(text);
  }, [typing, runRequest]);

  // Send a question seeded by `vera:open` once the chat is open and idle.
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

  // Quick action: the live snapshot, straight from the insights endpoint.
  const showInsights = useCallback(async () => {
    if (typing) return;
    setTyping(true);
    try {
      const res = await api.getVeraInsights();
      const brief = res?.data?.brief;
      setMessages((prev) => [...prev, { id: newId(), at: Date.now(), role: "assistant", content: brief || "No survey data is available yet.", source: "insights" }]);
    } catch {
      setMessages((prev) => [...prev, { id: newId(), at: Date.now(), role: "assistant", content: "I couldn't load the live snapshot right now.", source: "error" }]);
    } finally {
      setTyping(false);
    }
  }, [typing]);

  const clearChat = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  const closeWindow = useCallback(() => {
    setOpen(false);
    setMinimized(false);
    if (abortRef.current) abortRef.current.abort();
    requestAnimationFrame(() => launcherRef.current?.focus?.());
  }, []);

  const onKeyDownShell = useCallback((e) => {
    if (e.key === "Escape") closeWindow();
  }, [closeWindow]);

  const toggleWide = useCallback(() => {
    setWide((w) => {
      try { localStorage.setItem("vera_wide", w ? "0" : "1"); } catch { /* ignore */ }
      return !w;
    });
  }, []);

  // Copy an answer as plain text (Markdown markers stripped) for reports.
  const copyAnswer = useCallback(async (m) => {
    const text = String(m.content || "").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      ta.remove();
    }
    setCopiedId(m.id);
    setTimeout(() => setCopiedId((id) => (id === m.id ? null : id)), 1600);
  }, []);

  // The composer grows with its content up to INPUT_MAX_HEIGHT, then scrolls.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, INPUT_MAX_HEIGHT)}px`;
  }, [input, open, minimized]);

  const starters = useMemo(
    () => (Array.isArray(status.starterQuestions) ? status.starterQuestions : []),
    [status.starterQuestions],
  );
  const showGreeting = messages.length === 0;
  const disabled = status.enabled === false;
  const modelOn = status.mode === "model";

  // One state for every flame on screen.
  const flameState = typing
    ? ["thinking", "searching", "working"][thinkStage % 3]
    : inputFocused && input.trim()
      ? "listening"
      : "burning";

  const statusLabel = typing
    ? "Answering…"
    : disabled
      ? "Offline — turned off in settings"
      : statusError
        ? "Status unavailable"
        : modelOn
          ? "Online · Live insights"
          : "Online · Live figures";
  const statusDot = typing ? "busy" : disabled || statusError ? "off" : modelOn ? "online" : "lite";

  return (
    // data-theme scopes the palette in VeraChat.css and is the [data-theme] the
    // canvases fall back to; --v-app-accent is the admin's primary colour.
    <div className="vera-root" data-theme={mode} style={{ "--v-app-accent": accent }}>
      {!open && nudge && (
        <div className="vera-intro" role="status">
          <div className="vera-intro__head">
            <span className={`vera-intro__mark${speaking ? " is-speaking" : ""}`}>
              <VeraFlame size={44} state={introFlame} theme={mode} label="" />
            </span>
            <div className="vera-intro__who">
              <span className="vera-intro__name">{name}</span>
              <span className="vera-intro__role">{fullName}</span>
            </div>
            <button type="button" className="vera-icon-btn vera-intro__close" aria-label="Dismiss" title="Dismiss" onClick={dismissNudge}>
              ×
            </button>
          </div>
          <span className="vera-sr-only">{nudgeText}</span>
          <p className="vera-intro__text" aria-hidden="true">
            {nudgeText.slice(0, typed)}
            {speaking ? <span className="vera-intro__caret" /> : null}
          </p>
          {nudge.cta && (
            <div className="vera-intro__actions">
              <button
                type="button"
                className="vera-intro__primary"
                onClick={() => { dismissNudge(); setOpen(true); setMinimized(false); }}
              >
                Yes, show me
              </button>
              <button type="button" className="vera-intro__secondary" onClick={dismissNudge}>
                Maybe later
              </button>
            </div>
          )}
        </div>
      )}

      {!open && (
        // As in EMBR3 ESWMP: the beam's box (border-beam) is what sits fixed in
        // the corner; the pill inside it takes the beam's shape.
        <BorderBeam
          className={`vera-launcher-dock${nudge ? " is-nudging" : ""}`}
          size="sm"
          colorVariant="ocean"
          theme={mode}
          duration={2.6}
          strength={nudge ? 1 : 0.85}
        >
          <button
            type="button"
            ref={launcherRef}
            className="vera-launcher"
            aria-label={`Open ${name}, the ${fullName}`}
            onClick={() => { setOpen(true); setMinimized(false); }}
          >
            <VeraFlame size={isMobile ? 40 : 36} state="burning" theme={mode} glow={false} label="" />
            <span className="vera-launcher__text">
              <span className="vera-launcher__label">Ask {name}</span>
              <span className="vera-launcher__sub">Your survey insights assistant</span>
            </span>
          </button>
        </BorderBeam>
      )}

      {open && (
        <section
          className={[
            "vera-window",
            minimized ? "vera-window--min" : "",
            wide && !isMobile ? "vera-window--wide" : "",
            isMobile ? "vera-window--mobile" : "",
          ].filter(Boolean).join(" ")}
          role="dialog"
          aria-label={`${name} assistant chat`}
          onKeyDown={onKeyDownShell}
        >
          <header className="vera-header">
            <div className="vera-header__id">
              <span className="vera-header__mark">
                <VeraFlame size={38} state={flameState} theme={mode} label="" />
              </span>
              <div className="vera-header__text">
                <div className="vera-header__name" title={fullName}>{name}</div>
                <div className="vera-header__sub">
                  <span className={`vera-status-dot vera-status-dot--${statusDot}`} />
                  <span className="vera-header__status">{statusLabel}</span>
                </div>
              </div>
            </div>
            <div className="vera-header__actions">
              {messages.length > 0 && !minimized && (
                <button type="button" className="vera-icon-btn" aria-label="Clear conversation" title="Clear conversation" onClick={clearChat} disabled={typing}>
                  <DeleteOutlined />
                </button>
              )}
              {!isMobile && !minimized && (
                <button
                  type="button"
                  className="vera-icon-btn"
                  aria-label={wide ? "Use compact window" : "Widen window"}
                  title={wide ? "Compact" : "Widen"}
                  aria-pressed={wide}
                  onClick={toggleWide}
                >
                  {wide ? <ShrinkOutlined /> : <ExpandAltOutlined />}
                </button>
              )}
              <button
                type="button"
                className="vera-icon-btn"
                aria-label={minimized ? "Expand chat" : "Minimise chat"}
                title={minimized ? "Expand" : "Minimise"}
                onClick={() => setMinimized((m) => !m)}
              >
                <MinusOutlined />
              </button>
              <button type="button" className="vera-icon-btn" aria-label="Close chat" title="Close" onClick={closeWindow}>
                <CloseOutlined />
              </button>
            </div>
          </header>

          {!minimized && (
            <>
              <div className="vera-messages" ref={scrollRef} aria-live="polite">
                {statusError && (
                  <div className="vera-banner" role="alert">
                    <WarningOutlined />
                    <span>I couldn't load my settings. You can still ask — or retry.</span>
                    <button type="button" className="vera-banner__btn" onClick={loadStatus}>
                      <ReloadOutlined /> Retry
                    </button>
                  </div>
                )}
                {disabled && (
                  <div className="vera-banner vera-banner--muted" role="status">
                    <InfoCircleOutlined />
                    <span>{name} is turned off. An administrator can enable it in Settings → VERA Assistant.</span>
                  </div>
                )}

                {showGreeting && (
                  <div className="vera-welcome">
                    <span className="vera-welcome__mark">
                      <VeraFlame size={isMobile ? 46 : 54} state={flameState} theme={mode} label="" />
                    </span>
                    <h3 className="vera-welcome__title">Hi, I'm {name}</h3>
                    <p className="vera-welcome__role">{status.tagline || fullName}</p>
                    <div className="vera-welcome__greeting">
                      <AnswerText>
                        {status.greeting ||
                          `Ask me about satisfaction scores, Citizen's Charter awareness, services availed, trends or client remarks — I answer from the live survey data.`}
                      </AnswerText>
                    </div>
                    {!disabled && (
                      <div className="vera-starters" role="list" aria-label="Suggested questions">
                        {starters.map((q) => (
                          <button key={q} type="button" role="listitem" className="vera-starter" onClick={() => send(q)} disabled={typing}>
                            <span className="vera-starter__text">{q}</span>
                            <ArrowRightOutlined className="vera-starter__go" />
                          </button>
                        ))}
                        <button type="button" role="listitem" className="vera-starter vera-starter--snapshot" onClick={showInsights} disabled={typing}>
                          <BarChartOutlined className="vera-starter__icon" />
                          <span className="vera-starter__text">Show the live snapshot</span>
                          <ArrowRightOutlined className="vera-starter__go" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {messages.map((m) => {
                  const isUser = m.role === "user";
                  return (
                    <div key={m.id} className={`vera-msg vera-msg--${isUser ? "user" : "assistant"}`}>
                      {!isUser && (
                        <div className="vera-msg__who">
                          <span className="vera-msg__dot" aria-hidden="true" />
                          <span className="vera-msg__name">{name}</span>
                          {m.source === "insights" && <span className="vera-msg__tag"><BarChartOutlined /> Live snapshot</span>}
                          {m.at ? <span className="vera-msg__time">{timeLabel(m.at)}</span> : null}
                        </div>
                      )}
                      <div
                        className={[
                          "vera-bubble",
                          m.source === "error" ? "vera-bubble--error" : "",
                          m.source === "insights" ? "vera-bubble--insights" : "",
                        ].filter(Boolean).join(" ")}
                      >
                        {isUser ? (
                          <span>{m.content}</span>
                        ) : (
                          <>
                            {m.source === "error" && <WarningOutlined className="vera-bubble__warn" />}
                            <AnswerText>{m.content}</AnswerText>
                            {m.degraded && (
                              <div className="vera-bubble__note">
                                <InfoCircleOutlined /> Answered from live figures — the model service was unavailable.
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      {isUser ? (
                        m.at ? <div className="vera-msg__time vera-msg__time--user">{timeLabel(m.at)}</div> : null
                      ) : (
                        <div className="vera-msg__actions">
                          {m.retry && !typing && (
                            <button type="button" className="vera-msg__action vera-msg__action--retry" onClick={retryLast}>
                              <ReloadOutlined /> Retry
                            </button>
                          )}
                          {m.source !== "error" && (
                            <button
                              type="button"
                              className="vera-msg__action"
                              onClick={() => copyAnswer(m)}
                              aria-label={copiedId === m.id ? "Copied" : "Copy answer"}
                            >
                              {copiedId === m.id ? <><CheckOutlined /> Copied</> : <><CopyOutlined /> Copy</>}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {typing && (
                  <div className="vera-msg vera-msg--assistant">
                    <div className="vera-thinking" aria-live="assertive">
                      <VeraFlame size={28} state={flameState} theme={mode} label="" className="vera-thinking__mark" />
                      <span className="vera-thinking__text">{thinkingMessages[thinkStage]}</span>
                      <button type="button" className="vera-cancel-btn" onClick={cancelRequest} aria-label="Cancel request">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <form className="vera-composer" onSubmit={(e) => { e.preventDefault(); send(input); }}>
                <div className={`vera-composer__box${disabled ? " is-disabled" : ""}`}>
                  <textarea
                    ref={inputRef}
                    className="vera-input"
                    value={input}
                    maxLength={MAX_INPUT}
                    rows={1}
                    placeholder={disabled ? `${name} is turned off` : `Ask ${name} about the survey results…`}
                    aria-label={`Message to ${name}`}
                    disabled={disabled}
                    onChange={(e) => setInput(e.target.value)}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send(input);
                      }
                    }}
                  />
                  <div className="vera-composer__bar">
                    {!showGreeting && (
                      <button type="button" className="vera-chip-btn" onClick={showInsights} disabled={typing || disabled}>
                        <BarChartOutlined /> Live snapshot
                      </button>
                    )}
                    <span className="vera-composer__hint" aria-live="polite" title="Enter to send · Shift+Enter for a new line">
                      {input.length > MAX_INPUT - 200 ? `${input.length}/${MAX_INPUT}` : isMobile ? "" : "Enter ↵ to send"}
                    </span>
                    <button type="submit" className="vera-send-btn" aria-label="Send message" disabled={!input.trim() || typing || disabled}>
                      <ArrowUpOutlined />
                    </button>
                  </div>
                </div>
                <p className="vera-disclaimer">
                  <SafetyCertificateOutlined />
                  <span>{name} reports aggregates from the survey database. Verify individual responses in Measurement Data.</span>
                </p>
              </form>
            </>
          )}
        </section>
      )}
    </div>
  );
}
