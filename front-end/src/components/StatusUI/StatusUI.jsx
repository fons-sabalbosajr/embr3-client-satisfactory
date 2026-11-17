// Shared loading and error UI for every page (public and admin).
//
//   <PageLoader message="Loading the survey…" />        full-screen, branded
//   <SectionLoader message="Loading…" />                inside a card / route
//   <SkeletonBlock rows={4} />                           placeholder content
//   <ErrorState error={err} onRetry={fn} />             inline error panel
//   <ErrorState variant="notFound" fullPage />          404, maintenance, …
//   <OfflineBanner />                                   sticky "you're offline"
//   describeError(err) -> { variant, title, message, detail, status }
//
// Palette: ARTA blue #0038a8 · red #ce1126 · yellow #fcd116.
// Theme follows body[data-mantine-color-scheme] (public pages) and
// body[data-theme] (admin), whichever is set.

import { useEffect, useState } from "react";
import {
  ReloadOutlined,
  HomeOutlined,
  WifiOutlined,
  WarningOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import EMBLogo from "../../assets/emblogo.svg";
import BPLogo from "../../assets/bplogo.svg";
import { VARIANTS, describeError } from "./describeError";
import "./statusui.css";

// ── Loading ───────────────────────────────────────────────────────────────
function useSlow(ms) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return slow;
}

/** Full-screen branded loader. After `slowAfter` ms it explains the wait. */
export function PageLoader({ message = "Loading…", slowAfter = 6000 }) {
  const slow = useSlow(slowAfter);
  return (
    <div className="sui-page" role="status" aria-live="polite" aria-busy="true">
      <div className="sui-page-ribbon" aria-hidden="true" />
      <div className="sui-loader-card">
        <span className="sui-logos">
          <img src={EMBLogo} alt="" />
          <img src={BPLogo} alt="" />
        </span>
        <div className="sui-loader-agency">Environmental Management Bureau Region III</div>
        <div className="sui-progress" aria-hidden="true"><span /></div>
        <div className="sui-loader-msg">{message}</div>
        {slow && (
          <div className="sui-loader-slow">
            Still working — the server can take a few seconds on a slow connection.
          </div>
        )}
      </div>
    </div>
  );
}

/** Loader for a route, card or panel. */
export function SectionLoader({ message = "Loading…", minHeight = 260, slowAfter = 6000 }) {
  const slow = useSlow(slowAfter);
  return (
    <div className="sui-section" style={{ minHeight }} role="status" aria-live="polite" aria-busy="true">
      <span className="sui-spinner" aria-hidden="true">
        <span /><span /><span />
      </span>
      <div className="sui-section-msg">{message}</div>
      {slow && <div className="sui-loader-slow">This is taking longer than usual…</div>}
    </div>
  );
}

/** Shimmering placeholder lines, for content whose shape is known. */
export function SkeletonBlock({ rows = 3, title = true, avatar = false }) {
  return (
    <div className="sui-skeleton" aria-hidden="true">
      {avatar && <span className="sui-sk sui-sk-avatar" />}
      <div className="sui-sk-lines">
        {title && <span className="sui-sk sui-sk-title" />}
        {Array.from({ length: rows }).map((_, i) => (
          <span key={i} className="sui-sk sui-sk-line" style={{ width: `${92 - ((i * 17) % 40)}%` }} />
        ))}
      </div>
    </div>
  );
}

// ── Errors ────────────────────────────────────────────────────────────────
/**
 * Error panel. Pass an `error` (any thrown value) or a `variant`; `title` and
 * `message` override the defaults. `onRetry` shows a Try again button,
 * `homeHref` a way out. `fullPage` centres it on the branded background.
 */
export function ErrorState({
  error,
  variant,
  title,
  message,
  onRetry,
  retryLabel = "Try again",
  homeHref,
  homeLabel = "Go to home page",
  extra,
  fullPage = false,
  compact = false,
}) {
  const info = error ? describeError(error, variant || "generic") : { ...(VARIANTS[variant] || VARIANTS.generic), variant };
  const Icon = info.icon || ExclamationCircleOutlined;
  const [showDetail, setShowDetail] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const detail = info.detail;

  const handleRetry = async () => {
    if (!onRetry || retrying) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  const panel = (
    <div className={`sui-error sui-tone-${info.tone || "error"}${compact ? " sui-error-compact" : ""}`} role="alert">
      <span className="sui-error-icon" aria-hidden="true"><Icon /></span>
      <div className="sui-error-body">
        <h2 className="sui-error-title">{title || info.title}</h2>
        <p className="sui-error-msg">{message || info.message}</p>
        {(onRetry || homeHref || extra) && (
          <div className="sui-error-actions">
            {onRetry && (
              <button type="button" className="sui-btn sui-btn-primary" onClick={handleRetry} disabled={retrying}>
                <ReloadOutlined spin={retrying} /> {retrying ? "Trying…" : retryLabel}
              </button>
            )}
            {homeHref && (
              <a className="sui-btn sui-btn-ghost" href={homeHref}>
                <HomeOutlined /> {homeLabel}
              </a>
            )}
            {extra}
          </div>
        )}
        {detail && (
          <div className="sui-error-detail">
            <button
              type="button"
              className="sui-detail-toggle"
              aria-expanded={showDetail}
              onClick={() => setShowDetail((v) => !v)}
            >
              <DownOutlined rotate={showDetail ? 180 : 0} /> Technical details
            </button>
            {showDetail && <code className="sui-detail-code">{detail}</code>}
          </div>
        )}
      </div>
    </div>
  );

  if (!fullPage) return panel;
  return (
    <div className="sui-page">
      <div className="sui-page-ribbon" aria-hidden="true" />
      <div className="sui-page-inner">
        <span className="sui-logos sui-logos-sm">
          <img src={EMBLogo} alt="Environmental Management Bureau Region III" />
          <img src={BPLogo} alt="Bagong Pilipinas" />
        </span>
        {panel}
      </div>
    </div>
  );
}

/** Sticky banner while the browser reports no connection. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(typeof navigator !== "undefined" && navigator.onLine === false);
  const [backOnline, setBackOnline] = useState(false);
  useEffect(() => {
    let t;
    const down = () => { setOffline(true); setBackOnline(false); };
    const up = () => {
      setOffline(false);
      setBackOnline(true);
      clearTimeout(t);
      t = setTimeout(() => setBackOnline(false), 3000);
    };
    window.addEventListener("offline", down);
    window.addEventListener("online", up);
    return () => {
      window.removeEventListener("offline", down);
      window.removeEventListener("online", up);
      clearTimeout(t);
    };
  }, []);
  if (!offline && !backOnline) return null;
  return (
    <div className={`sui-offline${backOnline ? " sui-offline-ok" : ""}`} role="status" aria-live="polite">
      <WifiOutlined />
      {backOnline ? "You're back online." : "You're offline. Changes can't be saved until your connection returns."}
    </div>
  );
}
