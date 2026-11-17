// Landing page — public front door for the OCSM portal.
//
// Sections: sticky navigation → hero (QR card + live response count) → ARTA
// compliance band → stats strip → why it matters → how it works → survey types
// → what we measure → VERA showcase → call to action → footer with the agency
// contact details.
//
// The palette follows the Anti-Red Tape Authority mark (blue / red / yellow).
// The survey CTAs deep-link to /survey/page1 with the chosen type and language,
// exactly as the /client page does. There is no staff sign-in on this page.
//
// VERA is presented here as a showcase only: the assistant itself is admin-only
// and no chat widget (or anonymous API) is mounted on the public page.
//
// Motion is CSS-driven. Scroll reveals are gated behind the `lp-anim` class, so
// content stays visible when IntersectionObserver is unavailable or the visitor
// prefers reduced motion.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, ConfigProvider, Dropdown, Select, FloatButton, Grid } from "antd";
import {
  ArrowRightOutlined,
  BulbOutlined,
  TeamOutlined,
  GlobalOutlined,
  MenuOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  LockOutlined,
  TranslationOutlined,
  SafetyCertificateOutlined,
  LineChartOutlined,
  FileDoneOutlined,
  ToolOutlined,
  UserOutlined,
  ProfileOutlined,
  StarOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
  FacebookOutlined,
  BarChartOutlined,
  RiseOutlined,
  MessageOutlined,
  ReadOutlined,
  ThunderboltOutlined,
  ArrowUpOutlined,
} from "@ant-design/icons";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import { getFeedbackCount } from "../../services/api";
import { PUBLIC_CLIENT_URL } from "../../utils/basePath";
import EMBLogo from "../../assets/emblogo.svg";
import BPLogo from "../../assets/bplogo.svg";
import ARTALogo from "../../assets/artalogo.svg";
import VeraFlameIcon from "../../components/Vera/VeraFlameIcon";
import "./landing.css";

const DIM_ICONS = [ClockCircleOutlined, FileDoneOutlined, ToolOutlined, GlobalOutlined, ProfileOutlined, LockOutlined, TeamOutlined, StarOutlined];
const WHY_ICONS = [LineChartOutlined, SafetyCertificateOutlined, ToolOutlined];
const STEP_ICONS = [UserOutlined, FileDoneOutlined, StarOutlined];
const VERA_ICONS = [ThunderboltOutlined, BarChartOutlined, RiseOutlined, MessageOutlined, ReadOutlined, LockOutlined];

// Agency contact details (same official channels shown on the survey page).
const CONTACT = {
  phoneLabel: "(045) 963-3623",
  phoneHref: "tel:0459633623",
  email: "embr3.ocsm@gmail.com",
  websiteLabel: "r3.emb.gov.ph",
  websiteHref: "https://r3.emb.gov.ph",
  facebookLabel: "EMB3Official",
  facebookHref: "https://facebook.com/EMB3Official",
};

const VERA_GRID_CELLS = 24;

const motionAllowed = () =>
  typeof window !== "undefined" &&
  "IntersectionObserver" in window &&
  !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const asList = (value) => (Array.isArray(value) ? value : []);

// Counts up to `value` once it is known. Falls back to the plain number when
// motion is off.
function CountUp({ value, animate }) {
  const [shown, setShown] = useState(animate ? 0 : value);

  useEffect(() => {
    if (!animate) {
      setShown(value);
      return undefined;
    }
    let frame;
    const start = performance.now();
    const duration = 1400;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(value * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, animate]);

  return <>{shown.toLocaleString()}</>;
}

// The two agency marks, always side by side.
function AgencyLogos({ className = "" }) {
  return (
    <span className={`lp-logos ${className}`}>
      <img src={EMBLogo} alt="Environmental Management Bureau Region III" />
      <img src={BPLogo} alt="Bagong Pilipinas" />
    </span>
  );
}

export default function Landing({ toggleColorScheme, colorScheme }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const rootRef = useRef(null);
  const [animate] = useState(motionAllowed);
  const [language, setLanguage] = useState(i18n.language?.startsWith("fil") ? "fil" : "en");
  const [responses, setResponses] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const year = new Date().getFullYear();
  const dark = colorScheme === "dark";

  const clientUrl = PUBLIC_CLIENT_URL;

  useEffect(() => {
    getFeedbackCount()
      .then((res) => setResponses(res.data.count || 0))
      .catch(() => setResponses(null));
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [navOpen]);

  // Scroll reveal: mark each [data-reveal] element once it enters the viewport.
  useEffect(() => {
    const root = rootRef.current;
    if (!animate || !root) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    root.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [animate]);

  const startSurvey = (type) => navigate(`/survey/page1?lang=${language}&type=${type}`);
  const changeLanguage = (value) => {
    setLanguage(value);
    i18n.changeLanguage(value);
  };
  const scrollTo = (id) => {
    setNavOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: animate ? "smooth" : "auto", block: "start" });
  };
  const anchor = (id) => ({
    href: `#${id}`,
    onClick: (e) => { e.preventDefault(); scrollTo(id); },
  });
  const delay = (ms) => ({ "--d": `${ms}ms` });

  const surveyMenu = {
    items: [
      { key: "external", icon: <GlobalOutlined />, label: t("surveyType.external", "External Survey") },
      { key: "internal", icon: <TeamOutlined />, label: t("surveyType.internal", "Internal Survey") },
    ],
    onClick: ({ key }) => startSurvey(key),
  };

  const languageOptions = [
    { value: "en", label: <span className="lp-lang-option"><span aria-hidden="true">🇬🇧</span> English</span> },
    { value: "fil", label: <span className="lp-lang-option"><span aria-hidden="true">🇵🇭</span> Filipino</span> },
  ];

  const navLinks = [
    ["overview", t("landing.nav.overview")],
    ["how", t("landing.nav.how")],
    ["types", t("landing.nav.types")],
    ["measure", t("landing.nav.measure")],
    ["vera", t("landing.nav.vera")],
    ["contact", t("landing.nav.contact")],
  ];

  const whyItems = asList(t("landing.why.items", { returnObjects: true }));
  const howSteps = asList(t("landing.how.steps", { returnObjects: true }));
  const dims = asList(t("landing.measure.dims", { returnObjects: true }));
  const veraFeatures = asList(t("landing.vera.features", { returnObjects: true }));
  const address = `${t("address1")}, ${t("address2")}`;

  return (
    <ConfigProvider theme={{ token: { colorPrimary: dark ? "#4f7dff" : "#0038a8" } }}>
      <div className={`lp${animate ? " lp-anim" : ""}`} ref={rootRef}>
        <div className="lp-ribbon" aria-hidden="true" />

        {/* ── Navigation ───────────────────────────────────────────────── */}
        <header className={`lp-nav${scrolled ? " lp-nav-scrolled" : ""}`}>
          <div className="lp-container lp-nav-inner">
            <a className="lp-brand" {...anchor("overview")}>
              <AgencyLogos className="lp-brand-logos" />
              <span className="lp-brand-text">
                <span className="lp-brand-name">EMBR3 OCSM</span>
                <span className="lp-brand-sub">{t("landing.footer.tagline")}</span>
              </span>
            </a>

            <nav className="lp-nav-links" aria-label="Primary">
              {navLinks.map(([id, label]) => (
                <a key={id} {...anchor(id)}>{label}</a>
              ))}
            </nav>

            <div className="lp-nav-actions">
              <Select
                value={language}
                onChange={changeLanguage}
                options={languageOptions}
                className="lp-lang-select"
                size="middle"
                aria-label={t("selectLanguage")}
              />
              <Dropdown menu={surveyMenu} trigger={["click"]} placement="bottomRight">
                <Button type="primary" className="lp-nav-cta" icon={<ArrowRightOutlined />}>
                  {t("takeSurvey")}
                </Button>
              </Dropdown>
              <button
                type="button"
                className="lp-nav-burger"
                aria-label={navOpen ? "Close menu" : "Open menu"}
                aria-expanded={navOpen}
                onClick={() => setNavOpen((o) => !o)}
              >
                {navOpen ? <CloseOutlined /> : <MenuOutlined />}
              </button>
            </div>
          </div>

          {navOpen && (
            <div className="lp-nav-mobile" role="dialog" aria-label="Menu">
              {navLinks.map(([id, label]) => (
                <a key={id} {...anchor(id)}>{label}</a>
              ))}
              <div className="lp-nav-mobile-actions">
                <Select value={language} onChange={changeLanguage} options={languageOptions} className="lp-lang-select" />
                <Button block type="primary" icon={<GlobalOutlined />} onClick={() => startSurvey("external")}>{t("landing.types.external.cta")}</Button>
                <Button block icon={<TeamOutlined />} onClick={() => startSurvey("internal")}>{t("landing.types.internal.cta")}</Button>
              </div>
            </div>
          )}
        </header>

        <main>
          {/* ── Hero ───────────────────────────────────────────────────── */}
          <section id="overview" className="lp-hero">
            <div className="lp-hero-bg" aria-hidden="true">
              <span className="lp-blob lp-blob-blue" />
              <span className="lp-blob lp-blob-yellow" />
              <span className="lp-blob lp-blob-red" />
            </div>
            <div className="lp-container lp-hero-grid">
              <div className="lp-hero-copy">
                <div className="lp-agency-line lp-enter" style={delay(0)}>
                  <AgencyLogos className="lp-agency-logos" />
                  <span className="lp-agency-text">
                    <span>{t("agencyTitle")}</span>
                    <span>{t("department")}</span>
                    <strong>{t("bureau")}</strong>
                  </span>
                </div>
                <span className="lp-eyebrow lp-enter" style={delay(90)}>{t("landing.eyebrow")}</span>
                <h1 className="lp-title lp-enter" style={delay(160)}>{t("landing.title")}</h1>
                <p className="lp-lead lp-enter" style={delay(240)}>{t("landing.lead")}</p>

                <div className="lp-hero-cta lp-enter" style={delay(320)}>
                  <Dropdown menu={surveyMenu} trigger={["click"]}>
                    <Button type="primary" size="large" icon={<ArrowRightOutlined />} className="lp-btn-primary">
                      {t("takeSurvey")}
                    </Button>
                  </Dropdown>
                  <Button size="large" className="lp-btn-ghost" onClick={() => scrollTo("how")}>
                    {t("landing.ctaHow")}
                  </Button>
                </div>

                <ul className="lp-pills lp-enter" style={delay(400)} aria-label="Highlights">
                  <li><ClockCircleOutlined /> {t("landing.pills.time")}</li>
                  <li><LockOutlined /> {t("landing.pills.anon")}</li>
                  <li><TranslationOutlined /> {t("landing.pills.lang")}</li>
                  <li><SafetyCertificateOutlined /> {t("landing.pills.arta")}</li>
                </ul>
              </div>

              <div className="lp-hero-side lp-enter" style={delay(300)}>
                <aside className="lp-hero-card" aria-label={t("landing.qrTitle")}>
                  <div className="lp-qr-wrap">
                    <QRCodeSVG value={clientUrl} size={screens.md ? 176 : 148} level="H" bgColor="#ffffff" fgColor="#0038a8" />
                  </div>
                  <div className="lp-qr-title">{t("landing.qrTitle")}</div>
                  <div className="lp-qr-hint">{t("landing.qrHint")}</div>
                  <a className="lp-qr-link" href={clientUrl}>{clientUrl.replace(/^https?:\/\//, "")}</a>
                  {responses !== null && (
                    <div className="lp-live">
                      <span className="lp-live-dot" />
                      {t("responsesRecorded", { count: responses, defaultValue: "{{count}} responses recorded" })}
                    </div>
                  )}
                </aside>
              </div>
            </div>
          </section>

          {/* ── ARTA compliance band ───────────────────────────────────── */}
          <section className="lp-arta" aria-label={t("landing.arta.title")}>
            <div className="lp-container">
              <div className="lp-arta-card" data-reveal>
                <span className="lp-arta-logo">
                  <img src={ARTALogo} alt="Anti-Red Tape Authority" />
                </span>
                <div className="lp-arta-copy">
                  <span className="lp-eyebrow">{t("landing.arta.eyebrow")}</span>
                  <h2>{t("landing.arta.title")}</h2>
                  <p>{t("landing.arta.text")}</p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Stats strip ────────────────────────────────────────────── */}
          <section className="lp-stats" aria-label="Key figures">
            <div className="lp-container lp-stats-grid">
              <div className="lp-stat" data-reveal style={delay(0)}>
                <span className="lp-stat-value">
                  {responses === null ? "—" : <CountUp value={responses} animate={animate} />}
                </span>
                <span className="lp-stat-label">{t("landing.stats.responses")}</span>
              </div>
              <div className="lp-stat" data-reveal style={delay(80)}>
                <span className="lp-stat-value">9</span>
                <span className="lp-stat-label">{t("landing.stats.dimensions")}</span>
              </div>
              <div className="lp-stat" data-reveal style={delay(160)}>
                <span className="lp-stat-value">2</span>
                <span className="lp-stat-label">{t("landing.stats.types")}</span>
              </div>
              <div className="lp-stat" data-reveal style={delay(240)}>
                <span className="lp-stat-value">2</span>
                <span className="lp-stat-label">{t("landing.stats.languages")}</span>
              </div>
            </div>
          </section>

          {/* ── Why it matters ─────────────────────────────────────────── */}
          <section className="lp-section">
            <div className="lp-container">
              <div data-reveal>
                <span className="lp-eyebrow">{t("landing.why.eyebrow")}</span>
                <h2 className="lp-h2">{t("landing.why.title")}</h2>
              </div>
              <div className="lp-grid-3">
                {whyItems.map((item, i) => {
                  const Icon = WHY_ICONS[i] || LineChartOutlined;
                  return (
                    <article className="lp-card" key={i} data-reveal style={delay(i * 110)}>
                      <span className="lp-card-icon"><Icon /></span>
                      <h3>{item.t}</h3>
                      <p>{item.d}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ── How it works ───────────────────────────────────────────── */}
          <section id="how" className="lp-section lp-section-alt">
            <div className="lp-container">
              <div data-reveal>
                <span className="lp-eyebrow">{t("landing.how.eyebrow")}</span>
                <h2 className="lp-h2">{t("landing.how.title")}</h2>
              </div>
              <ol className="lp-steps">
                {howSteps.map((step, i) => {
                  const Icon = STEP_ICONS[i] || StarOutlined;
                  return (
                    <li className="lp-step" key={i} data-reveal style={delay(i * 130)}>
                      <span className="lp-step-num">{i + 1}</span>
                      <span className="lp-step-icon"><Icon /></span>
                      <h3>{step.t}</h3>
                      <p>{step.d}</p>
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>

          {/* ── Survey types ───────────────────────────────────────────── */}
          <section id="types" className="lp-section">
            <div className="lp-container">
              <div data-reveal>
                <span className="lp-eyebrow">{t("landing.types.eyebrow")}</span>
                <h2 className="lp-h2">{t("landing.types.title")}</h2>
              </div>
              <div className="lp-grid-2">
                <article className="lp-type-card lp-type-external" data-reveal="left">
                  <span className="lp-type-icon"><GlobalOutlined /></span>
                  <h3>{t("landing.types.external.t")}</h3>
                  <p>{t("landing.types.external.d")}</p>
                  <Button type="primary" size="large" icon={<ArrowRightOutlined />} onClick={() => startSurvey("external")}>
                    {t("landing.types.external.cta")}
                  </Button>
                </article>
                <article className="lp-type-card lp-type-internal" data-reveal="right">
                  <span className="lp-type-icon"><TeamOutlined /></span>
                  <h3>{t("landing.types.internal.t")}</h3>
                  <p>{t("landing.types.internal.d")}</p>
                  <Button size="large" icon={<ArrowRightOutlined />} onClick={() => startSurvey("internal")}>
                    {t("landing.types.internal.cta")}
                  </Button>
                </article>
              </div>
            </div>
          </section>

          {/* ── What we measure ────────────────────────────────────────── */}
          <section id="measure" className="lp-section lp-section-alt">
            <div className="lp-container">
              <div data-reveal>
                <span className="lp-eyebrow">{t("landing.measure.eyebrow")}</span>
                <h2 className="lp-h2">{t("landing.measure.title")}</h2>
                <p className="lp-section-lead">{t("landing.measure.lead")}</p>
              </div>
              <div className="lp-dims">
                {dims.map(([name, desc], i) => {
                  const Icon = DIM_ICONS[i] || StarOutlined;
                  return (
                    <div className="lp-dim" key={i} data-reveal="zoom" style={delay((i % 4) * 80)}>
                      <span className="lp-dim-code">SQD{i + 1}</span>
                      <span className="lp-dim-icon"><Icon /></span>
                      <div>
                        <div className="lp-dim-name">{name}</div>
                        <div className="lp-dim-desc">{desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ── VERA showcase (dark AI identity in both themes) ────────── */}
          <section id="vera" className="lp-vera-section">
            <div className="lp-vera-bg" aria-hidden="true">
              <div className="lp-vera-grid">
                {Array.from({ length: VERA_GRID_CELLS }).map((_, i) => (
                  <span className="lp-vera-grid-cell" key={i} style={{ animationDelay: `${((i * 7) % VERA_GRID_CELLS) * 140}ms` }} />
                ))}
              </div>
              <span className="lp-vera-orb lp-vera-orb-1" />
              <span className="lp-vera-orb lp-vera-orb-2" />
            </div>

            <div className="lp-container lp-vera-inner">
              <div className="lp-vera-intro" data-reveal="left">
                <div className="lp-vera-avatar-wrap">
                  <span className="lp-vera-ring" aria-hidden="true" />
                  <span className="lp-vera-ring lp-vera-ring-2" aria-hidden="true" />
                  <span className="lp-vera-avatar-orb"><VeraFlameIcon size={64} anime theme="dark" title="VERA" /></span>
                </div>
                <span className="lp-vera-tag">{t("landing.vera.eyebrow")}</span>
                <h2>
                  {t("landing.vera.title")}{" "}
                  <span className="lp-vera-gradient">{t("landing.vera.accent")}</span>
                </h2>
                <p className="lp-vera-lead">{t("landing.vera.lead")}</p>
                <p className="lp-vera-desc">{t("landing.vera.desc")}</p>
                <div className="lp-vera-note"><LockOutlined /> {t("landing.vera.note")}</div>
              </div>

              <div className="lp-vera-features">
                {veraFeatures.map((f, i) => {
                  const Icon = VERA_ICONS[i] || ThunderboltOutlined;
                  return (
                    <div className="lp-vera-feature" key={i} data-reveal style={delay(120 + i * 90)}>
                      <span className="lp-vera-feature-icon"><Icon /></span>
                      <div className="lp-vera-feature-body">
                        <h3>{f.t}</h3>
                        <p>{f.d}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ── Call to action ─────────────────────────────────────────── */}
          <section className="lp-cta">
            <div className="lp-container">
              <div className="lp-cta-inner" data-reveal="zoom">
                <div>
                  <h2>{t("landing.cta.title")}</h2>
                  <p>{t("landing.cta.lead")}</p>
                </div>
                <div className="lp-cta-actions">
                  <Dropdown menu={surveyMenu} trigger={["click"]}>
                    <Button size="large" icon={<ArrowRightOutlined />} className="lp-btn-yellow">
                      {t("takeSurvey")}
                    </Button>
                  </Dropdown>
                  <Button size="large" ghost className="lp-btn-outline-light" href={clientUrl}>
                    {t("landing.cta.client")}
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer id="contact" className="lp-footer">
          <div className="lp-container lp-footer-grid">
            <div className="lp-footer-brand">
              <AgencyLogos className="lp-footer-logos" />
              <div className="lp-footer-agency">
                <span>{t("agencyTitle")}</span>
                <span>{t("department")}</span>
                <strong>{t("bureau")}</strong>
                <span className="lp-footer-tagline">{t("csmTitle")}</span>
              </div>
            </div>

            <div className="lp-footer-col">
              <h4>{t("landing.footer.links")}</h4>
              <a href={clientUrl}>{t("landing.footer.clientPage")}</a>
              <a {...anchor("how")}>{t("landing.nav.how")}</a>
              <a {...anchor("types")}>{t("landing.nav.types")}</a>
              <a {...anchor("measure")}>{t("landing.nav.measure")}</a>
              <a {...anchor("vera")}>{t("landing.nav.vera")}</a>
            </div>

            <div className="lp-footer-col">
              <h4>{t("landing.footer.contact")}</h4>
              <ul className="lp-contact-list">
                <li>
                  <EnvironmentOutlined aria-hidden="true" />
                  <span><span className="lp-sr">{t("landing.footer.address")}: </span>{address}</span>
                </li>
                <li>
                  <PhoneOutlined aria-hidden="true" />
                  <a href={CONTACT.phoneHref}><span className="lp-sr">{t("landing.footer.phone")}: </span>{CONTACT.phoneLabel}</a>
                </li>
                <li>
                  <MailOutlined aria-hidden="true" />
                  <a href={`mailto:${CONTACT.email}`}><span className="lp-sr">{t("landing.footer.email")}: </span>{CONTACT.email}</a>
                </li>
                <li>
                  <GlobalOutlined aria-hidden="true" />
                  <a href={CONTACT.websiteHref} target="_blank" rel="noopener noreferrer"><span className="lp-sr">{t("landing.footer.website")}: </span>{CONTACT.websiteLabel}</a>
                </li>
                <li>
                  <FacebookOutlined aria-hidden="true" />
                  <a href={CONTACT.facebookHref} target="_blank" rel="noopener noreferrer"><span className="lp-sr">{t("landing.footer.facebook")}: </span>{CONTACT.facebookLabel}</a>
                </li>
              </ul>
            </div>

            <div className="lp-footer-col">
              <h4>{t("landing.footer.compliance")}</h4>
              <span className="lp-footer-arta">
                <img src={ARTALogo} alt="Anti-Red Tape Authority" />
              </span>
              <p>{t("landing.footer.privacyNote")}</p>
            </div>
          </div>
          <div className="lp-container lp-footer-bottom">
            <span>{t("csmTitle")}</span>
            <span>{t("allRightsReserved", { year })}</span>
          </div>
        </footer>

        {/* Back to top — appears once the visitor has scrolled past the hero,
            stacked above the theme toggle. */}
        <FloatButton.BackTop
          className="lp-back-top"
          icon={<ArrowUpOutlined />}
          type="primary"
          visibilityHeight={480}
          duration={animate ? 450 : 0}
          tooltip={<div>{t("backToTop", "Back to top")}</div>}
          aria-label={t("backToTop", "Back to top")}
          style={{ right: 20, bottom: 76 }}
        />
        <FloatButton
          icon={<BulbOutlined />}
          onClick={toggleColorScheme}
          tooltip={<div>{t("toggleColor")}</div>}
          style={{ right: 20, bottom: 20 }}
        />
      </div>
    </ConfigProvider>
  );
}
