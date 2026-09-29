// Landing page — corporate front door for the OCSM portal.
//
// Sections: sticky navigation → hero (with QR card + live response count) →
// stats strip → why it matters → how it works → survey types → what we
// measure → VERA → footer. Everything is reachable from the nav; the survey
// CTAs deep-link to /survey/page1 with the chosen type and language, exactly
// as the /client page does. The public VERA widget is mounted here.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Dropdown, Select, FloatButton, Grid } from "antd";
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
  LoginOutlined,
} from "@ant-design/icons";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import { getFeedbackCount } from "../../services/api";
import EMBLogo from "../../assets/emblogo.svg";
import BPLogo from "../../assets/bplogo.svg";
import VeraChat from "../../components/Vera/VeraChat";
import VeraFlameIcon from "../../components/Vera/VeraFlameIcon";
import "./landing.css";

const DIM_ICONS = [ClockCircleOutlined, FileDoneOutlined, ToolOutlined, GlobalOutlined, ProfileOutlined, LockOutlined, TeamOutlined, StarOutlined];

export default function Landing({ toggleColorScheme }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const [language, setLanguage] = useState(i18n.language?.startsWith("fil") ? "fil" : "en");
  const [responses, setResponses] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const year = new Date().getFullYear();

  const clientUrl = useMemo(() => {
    const base = import.meta.env.VITE_APP_URL || window.location.origin;
    const basePath = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
    return `${base.replace(/\/+$/, "")}${basePath}/client`;
  }, []);

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

  const startSurvey = (type) => navigate(`/survey/page1?lang=${language}&type=${type}`);
  const changeLanguage = (value) => {
    setLanguage(value);
    i18n.changeLanguage(value);
  };
  const scrollTo = (id) => {
    setNavOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const openVera = () => window.dispatchEvent(new CustomEvent("vera:open"));

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
  ];

  const whyItems = t("landing.why.items", { returnObjects: true });
  const howSteps = t("landing.how.steps", { returnObjects: true });
  const dims = t("landing.measure.dims", { returnObjects: true });
  const whyIcons = [LineChartOutlined, SafetyCertificateOutlined, ToolOutlined];
  const stepIcons = [UserOutlined, FileDoneOutlined, StarOutlined];

  return (
    <div className="lp">
      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <header className={`lp-nav${scrolled ? " lp-nav-scrolled" : ""}`}>
        <div className="lp-container lp-nav-inner">
          <a className="lp-brand" href="#overview" onClick={(e) => { e.preventDefault(); scrollTo("overview"); }}>
            <img src={EMBLogo} alt="EMB Region III" className="lp-brand-logo" />
            <span className="lp-brand-text">
              <span className="lp-brand-name">EMBR3 OCSM</span>
              <span className="lp-brand-sub">{t("landing.footer.tagline")}</span>
            </span>
          </a>

          <nav className="lp-nav-links" aria-label="Primary">
            {navLinks.map(([id, label]) => (
              <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); scrollTo(id); }}>{label}</a>
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
            <Button icon={<LoginOutlined />} className="lp-nav-staff" onClick={() => navigate("/admin")}>
              {t("landing.nav.staff")}
            </Button>
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
              <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); scrollTo(id); }}>{label}</a>
            ))}
            <div className="lp-nav-mobile-actions">
              <Select value={language} onChange={changeLanguage} options={languageOptions} className="lp-lang-select" />
              <Button block icon={<LoginOutlined />} onClick={() => navigate("/admin")}>{t("landing.nav.staff")}</Button>
              <Button block type="primary" icon={<GlobalOutlined />} onClick={() => startSurvey("external")}>{t("landing.types.external.cta")}</Button>
              <Button block icon={<TeamOutlined />} onClick={() => startSurvey("internal")}>{t("landing.types.internal.cta")}</Button>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section id="overview" className="lp-hero">
          <div className="lp-hero-bg" aria-hidden="true" />
          <div className="lp-container lp-hero-grid">
            <div className="lp-hero-copy">
              <div className="lp-agency-line">
                <img src={BPLogo} alt="" className="lp-agency-seal" aria-hidden="true" />
                <span>{t("agencyTitle")} · {t("department")} · {t("bureau")}</span>
              </div>
              <span className="lp-eyebrow">{t("landing.eyebrow")}</span>
              <h1 className="lp-title">{t("landing.title")}</h1>
              <p className="lp-lead">{t("landing.lead")}</p>

              <div className="lp-hero-cta">
                <Dropdown menu={surveyMenu} trigger={["click"]}>
                  <Button type="primary" size="large" icon={<ArrowRightOutlined />} className="lp-btn-primary">
                    {t("takeSurvey")}
                  </Button>
                </Dropdown>
                <Button size="large" className="lp-btn-ghost" onClick={() => scrollTo("how")}>
                  {t("landing.ctaHow")}
                </Button>
              </div>

              <ul className="lp-pills" aria-label="Highlights">
                <li><ClockCircleOutlined /> {t("landing.pills.time")}</li>
                <li><LockOutlined /> {t("landing.pills.anon")}</li>
                <li><TranslationOutlined /> {t("landing.pills.lang")}</li>
                <li><SafetyCertificateOutlined /> {t("landing.pills.arta")}</li>
              </ul>
            </div>

            <aside className="lp-hero-card" aria-label={t("landing.qrTitle")}>
              <div className="lp-qr-wrap">
                <QRCodeSVG value={clientUrl} size={screens.md ? 176 : 148} level="H" bgColor="#ffffff" fgColor="#0b4f6c" />
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
        </section>

        {/* ── Stats strip ──────────────────────────────────────────────── */}
        <section className="lp-stats" aria-label="Key figures">
          <div className="lp-container lp-stats-grid">
            <div className="lp-stat">
              <span className="lp-stat-value">{responses === null ? "—" : responses.toLocaleString()}</span>
              <span className="lp-stat-label">{t("landing.stats.responses")}</span>
            </div>
            <div className="lp-stat">
              <span className="lp-stat-value">9</span>
              <span className="lp-stat-label">{t("landing.stats.dimensions")}</span>
            </div>
            <div className="lp-stat">
              <span className="lp-stat-value">2</span>
              <span className="lp-stat-label">{t("landing.stats.types")}</span>
            </div>
            <div className="lp-stat">
              <span className="lp-stat-value">2</span>
              <span className="lp-stat-label">{t("landing.stats.languages")}</span>
            </div>
          </div>
        </section>

        {/* ── Why it matters ───────────────────────────────────────────── */}
        <section className="lp-section">
          <div className="lp-container">
            <span className="lp-eyebrow">{t("landing.why.eyebrow")}</span>
            <h2 className="lp-h2">{t("landing.why.title")}</h2>
            <div className="lp-grid-3">
              {(Array.isArray(whyItems) ? whyItems : []).map((item, i) => {
                const Icon = whyIcons[i] || LineChartOutlined;
                return (
                  <article className="lp-card" key={item.t}>
                    <span className="lp-card-icon"><Icon /></span>
                    <h3>{item.t}</h3>
                    <p>{item.d}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <section id="how" className="lp-section lp-section-alt">
          <div className="lp-container">
            <span className="lp-eyebrow">{t("landing.how.eyebrow")}</span>
            <h2 className="lp-h2">{t("landing.how.title")}</h2>
            <ol className="lp-steps">
              {(Array.isArray(howSteps) ? howSteps : []).map((step, i) => {
                const Icon = stepIcons[i] || StarOutlined;
                return (
                  <li className="lp-step" key={step.t}>
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

        {/* ── Survey types ─────────────────────────────────────────────── */}
        <section id="types" className="lp-section">
          <div className="lp-container">
            <span className="lp-eyebrow">{t("landing.types.eyebrow")}</span>
            <h2 className="lp-h2">{t("landing.types.title")}</h2>
            <div className="lp-grid-2">
              <article className="lp-type-card lp-type-external">
                <span className="lp-type-icon"><GlobalOutlined /></span>
                <h3>{t("landing.types.external.t")}</h3>
                <p>{t("landing.types.external.d")}</p>
                <Button type="primary" size="large" icon={<ArrowRightOutlined />} onClick={() => startSurvey("external")}>
                  {t("landing.types.external.cta")}
                </Button>
              </article>
              <article className="lp-type-card lp-type-internal">
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

        {/* ── What we measure ──────────────────────────────────────────── */}
        <section id="measure" className="lp-section lp-section-alt">
          <div className="lp-container">
            <span className="lp-eyebrow">{t("landing.measure.eyebrow")}</span>
            <h2 className="lp-h2">{t("landing.measure.title")}</h2>
            <p className="lp-section-lead">{t("landing.measure.lead")}</p>
            <div className="lp-dims">
              {(Array.isArray(dims) ? dims : []).map(([name, desc], i) => {
                const Icon = DIM_ICONS[i] || StarOutlined;
                return (
                  <div className="lp-dim" key={name}>
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

        {/* ── VERA ─────────────────────────────────────────────────────── */}
        <section id="vera" className="lp-section">
          <div className="lp-container lp-vera">
            <div className="lp-vera-visual" aria-hidden="true">
              <span className="lp-vera-orb"><VeraFlameIcon size={72} hero /></span>
            </div>
            <div className="lp-vera-copy">
              <span className="lp-eyebrow">{t("landing.vera.eyebrow")}</span>
              <h2 className="lp-h2">{t("landing.vera.title")}</h2>
              <p className="lp-section-lead">{t("landing.vera.lead")}</p>
              <Button size="large" className="lp-btn-vera" onClick={openVera}>
                <VeraFlameIcon size={18} /> {t("landing.vera.cta")}
              </Button>
              <div className="lp-vera-note"><LockOutlined /> {t("landing.vera.note")}</div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-grid">
          <div className="lp-footer-brand">
            <div className="lp-footer-logos">
              <img src={EMBLogo} alt="EMB" />
              <img src={BPLogo} alt="Bagong Pilipinas" />
            </div>
            <div className="lp-footer-agency">
              <span>{t("agencyTitle")}</span>
              <span>{t("department")}</span>
              <strong>{t("bureau")}</strong>
              <span>{t("address1")}, {t("address2")}</span>
            </div>
          </div>
          <div className="lp-footer-col">
            <h4>{t("landing.footer.links")}</h4>
            <a href={clientUrl}>{t("landing.footer.clientPage")}</a>
            <a href="#how" onClick={(e) => { e.preventDefault(); scrollTo("how"); }}>{t("landing.nav.how")}</a>
            <a href="#types" onClick={(e) => { e.preventDefault(); scrollTo("types"); }}>{t("landing.nav.types")}</a>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate("/admin"); }}>{t("landing.footer.staffPortal")}</a>
          </div>
          <div className="lp-footer-col">
            <h4>{t("landing.footer.privacy")}</h4>
            <p>{t("landing.footer.privacyNote")}</p>
            <h4>{t("landing.footer.contact")}</h4>
            <a href="mailto:embr3.ocsm@gmail.com">embr3.ocsm@gmail.com</a>
          </div>
        </div>
        <div className="lp-container lp-footer-bottom">
          <span>{t("csmTitle")}</span>
          <span>{t("allRightsReserved", { year })}</span>
        </div>
      </footer>

      <FloatButton
        icon={<BulbOutlined />}
        onClick={toggleColorScheme}
        tooltip={<div>{t("toggleColor")}</div>}
        style={{ right: 20, bottom: 20 }}
      />

      {/* Public VERA — help library only, no data */}
      <VeraChat realm="public" isMobile={!screens.md} />
    </div>
  );
}
