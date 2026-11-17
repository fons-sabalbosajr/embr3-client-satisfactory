// Shared frame for the staff sign-in pages (login / sign-up / forgot password,
// reset password, email verification). Same look as the client survey: the
// agency header with the ARTA mark, the ARTA-tinted background and a white card
// with a blue top edge.

import { ConfigProvider, FloatButton, theme as antdTheme } from "antd";
import { BulbOutlined, BulbFilled, ArrowLeftOutlined } from "@ant-design/icons";
import AgencyHeader from "../AgencyHeader/AgencyHeader";
import { appUrl } from "../../utils/basePath";
import "./authlayout.css";

export default function AuthLayout({
  icon,
  eyebrow = "EMBR3 OCSM · Staff portal",
  title,
  subtitle,
  children,
  footer,
  colorScheme,
  toggleColorScheme,
  width = 460,
}) {
  const dark = colorScheme === "dark";
  // antd needs its dark algorithm too: with only a primary colour set, alerts,
  // the password eye, validation text and the theme button stayed light-mode
  // on the dark card. The tokens match the card surface (authlayout.css).
  const themeConfig = {
    algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: dark ? "#4f7dff" : "#0038a8",
      borderRadius: 10,
      ...(dark ? { colorBgElevated: "#16254a", colorBgContainer: "#0d1833", colorBorder: "#33466f" } : {}),
    },
    components: { Form: { itemMarginBottom: 18 } },
  };

  return (
    <ConfigProvider theme={themeConfig}>
      <div className="auth-page">
        <AgencyHeader />

        <main className="auth-main">
          <section className="auth-card" style={{ maxWidth: width }} aria-labelledby="auth-title">
            <div className="auth-card-head">
              {icon && <span className="auth-card-icon" aria-hidden="true">{icon}</span>}
              <div className="auth-card-heading">
                <span className="auth-eyebrow">{eyebrow}</span>
                <h1 id="auth-title" className="auth-title">{title}</h1>
                {subtitle && <p className="auth-subtitle">{subtitle}</p>}
              </div>
            </div>
            <div className="auth-card-body">{children}</div>
            {footer && <div className="auth-card-foot">{footer}</div>}
          </section>

          <a className="auth-back" href={appUrl("/")}>
            <ArrowLeftOutlined /> Back to the public site
          </a>
        </main>

        <footer className="auth-footer">
          © {new Date().getFullYear()} Environmental Management Bureau Region III · Online Client Satisfaction Measurement
        </footer>

        {toggleColorScheme && (
          <FloatButton
            className="auth-theme-btn"
            icon={dark ? <BulbFilled /> : <BulbOutlined />}
            onClick={toggleColorScheme}
            tooltip={<div>{dark ? "Switch to light theme" : "Switch to dark theme"}</div>}
            aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
            style={{ right: 20, bottom: 20 }}
          />
        )}
      </div>
    </ConfigProvider>
  );
}
