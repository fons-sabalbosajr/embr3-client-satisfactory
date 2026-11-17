// AdminPage.jsx
import React, { useEffect, useState, useMemo, Suspense } from "react";
import { Modal } from "antd";
import { Layout, Dropdown, theme, ConfigProvider, Grid, Tooltip } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  BulbOutlined,
  MailOutlined,
  MenuOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SunOutlined,
  MoonOutlined,
  DownOutlined,
  CodeOutlined,
  LockOutlined,
  BgColorsOutlined,
  ToolOutlined,
} from "@ant-design/icons";

import { getCachedConfig } from "../../utils/config";
import {
  getDecryptedItem,
  setEncryptedItem,
  removeOpaqueItem,
  clearAllStorage,
} from "../../utils/encryptedStorage";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import EMBLogo from "../../assets/emblogo.svg";
import BPLogo from "../../assets/bplogo.svg";
import AdminMenu from "../../components/AdminMenu/AdminMenu";
import VeraChat from "../../components/Vera/VeraChat";
import { SectionLoader } from "../../components/StatusUI/StatusUI";
import ErrorBoundary from "../../components/StatusUI/ErrorBoundary";
import { appUrl } from "../../utils/basePath";
import * as api from "../../services/api";
import { isDeveloperSession, isDeveloperUser, getSessionUser } from "../../utils/session";
import { versionLabel, buildDetails } from "../../utils/appVersion";
import { PAGE_META } from "../../components/AdminMenu/menuItems";
import { buildAdminTheme, normalizePrefs } from "./adminTheme";
import { formatEndsAt } from "../../utils/maintenance";
import "./adminpage.css";

const { Header, Sider, Content, Footer } = Layout;
const { defaultAlgorithm, darkAlgorithm } = theme;

function AdminPage({ maintenance = {} }) {
  const timerRef = React.useRef();
  // Auto-logout after 5 minutes of inactivity (not for Developer accounts)

  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [userName, setUserName] = useState("Admin");
  const [currentUser, setCurrentUser] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = getDecryptedItem("darkMode") ?? localStorage.getItem("darkMode");
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  // Per-user colours from My Account → Appearance; null = ARTA default.
  const [themePrefs, setThemePrefs] = useState(() => normalizePrefs({}));

  useEffect(() => {
    let warningTimeout;
    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningTimeout) clearTimeout(warningTimeout);
      // Developer accounts are exempt from the inactivity auto-logout.
      if (isDeveloperSession()) return;
      timerRef.current = setTimeout(() => {
        // Re-check when it fires: on first load the profile may not have been
        // cached yet when the timer was armed.
        if (isDeveloperSession()) return;
        Modal.warning({
          title: "Auto Logout Warning",
          content:
            "The current user seems idle; the system will automatically log you out and redirect you to the login page.",
          okText: "OK",
          onOk: () => {
            clearAllStorage();
            try {
              window.location.href = appUrl("/admin");
            } catch {
              window.location.reload();
            }
          },
        });
        // Fallback: force redirect after 10s if modal not confirmed
        warningTimeout = setTimeout(() => {
          clearAllStorage();
          try {
            window.location.href = appUrl("/admin");
          } catch {
            window.location.reload();
          }
        }, 10000);
      }, 300000);
    };
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("mousedown", resetTimer);
    window.addEventListener("touchstart", resetTimer);
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningTimeout) clearTimeout(warningTimeout);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("mousedown", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
    };
  }, []);

  // Developer keep-alive. The login token lasts 1 h and the server only renews
  // it on a request made in its last 15 minutes (X-Refreshed-Token), so an
  // idle developer tab would still be signed out on its next click after an
  // hour. A light /auth/me call every 10 minutes keeps it renewed while the
  // tab is open. Other accounts keep the normal inactivity logout.
  useEffect(() => {
    const ping = () => {
      if (!isDeveloperSession()) return;
      api.getMe().catch(() => { /* a 401 is handled by the API interceptor */ });
    };
    const id = setInterval(ping, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  // Effect for handling user authentication check (tolerant to brief storage race)
  useEffect(() => {
    const ensureAuthenticated = async () => {
      try {
        const decryptedDataString = getDecryptedItem("user");

        if (!decryptedDataString) {
          // If token exists, try to hydrate from server instead of immediately redirecting
          try {
            const me = await api.getMe();
            const user = me?.data?.user;
            if (user && typeof user === 'object') {
              setUserName(user.fullname || "Admin");
              setCurrentUser(user);
              // Cache user for faster subsequent reads
              setEncryptedItem("user", JSON.stringify(user));
            } else {
              throw new Error('Profile missing');
            }
          } catch (err) {
            // If we can't hydrate, clear and redirect to login
            clearAllStorage();
            navigate("/admin");
            return;
          }
        } else {
          // We have locally cached user; parse and use it
          try {
            const decryptedData = JSON.parse(decryptedDataString);
            setUserName(decryptedData.fullname || "Admin");
          } catch {
            // If parse fails, attempt to re-hydrate from server
            try {
              const me = await api.getMe();
              const user = me?.data?.user;
              setUserName(user?.fullname || "Admin");
              setCurrentUser(user || null);
              if (user) setEncryptedItem("user", JSON.stringify(user));
            } catch {
              navigate("/admin");
              return;
            }
          }
          // Also fetch the full profile in the background so permission or
          // position changes made by a developer apply without signing out.
          try {
            const me = await api.getMe();
            const fresh = me?.data?.user || null;
            setCurrentUser(fresh);
            if (fresh) {
              setUserName(fresh.fullname || "Admin");
              setEncryptedItem("user", JSON.stringify({ ...JSON.parse(decryptedDataString || "{}"), ...fresh, _id: fresh.id || fresh._id }));
            }
          } catch {
            setCurrentUser(null);
          }
        }

        // Fetch theme preferences
        try {
          const res = await api.getPreferences();
          const prefs = res?.data?.preferences || {};
          // Merge with local cache so missing server keys don't drop custom colors
          let cached = {};
          try {
            const dec = getDecryptedItem("themePrefsCache");
            cached = dec ? JSON.parse(dec) : {};
          } catch {}
          // The server copy wins; the local cache only fills keys the server
          // has never stored.
          setThemePrefs(normalizePrefs({ ...cached, ...prefs }));
        } catch {
          // ignore missing prefs
        }
      } catch (e) {
        // Keep this lightweight; likely parsing error or corrupt data.
        console.warn(
          "Issue hydrating authenticated user; clearing storage and redirecting.",
          e?.message || e
        );
        clearAllStorage();
        navigate("/admin");
      }
    };
    ensureAuthenticated();
  }, [navigate]);

  // Live theme updates from My Account → Appearance. The event carries the
  // full set, so a cleared colour (null) returns to the default.
  useEffect(() => {
    const onThemeUpdated = (e) => setThemePrefs(normalizePrefs(e?.detail || {}));
    const onMode = (e) => setIsDarkMode(e?.detail === "dark");
    window.addEventListener("theme:updated", onThemeUpdated);
    window.addEventListener("theme:mode", onMode);
    // Also check cached prefs on mount
    try {
      const dec = getDecryptedItem("themePrefsCache");
      const cached = dec ? JSON.parse(dec) : null;
      if (cached) onThemeUpdated({ detail: cached });
    } catch {}
    return () => {
      window.removeEventListener("theme:updated", onThemeUpdated);
      window.removeEventListener("theme:mode", onMode);
    };
  }, []);

  // Effect for saving dark mode preference
  useEffect(() => {
    setEncryptedItem("darkMode", JSON.stringify(isDarkMode));
    // Expose theme to plain CSS (modals/portals render at document.body level)
    document.body.setAttribute("data-theme", isDarkMode ? "dark" : "light");
    // Let My Account → Appearance show the current mode.
    window.dispatchEvent(new CustomEvent("theme:mode-changed", { detail: isDarkMode ? "dark" : "light" }));
  }, [isDarkMode]);

  const handleLogout = () => {
    clearAllStorage();
    navigate("/admin");
    window.location.reload();
  };

  const handleSuggestFeature = () => {
    window.open("mailto:embr3.ocsm@gmail.com?subject=Feature%20Suggestion%20-%20EMBR3%20OCSM", "_blank");
  };

  const handleContactUs = () => {
    window.open("mailto:embr3.ocsm@gmail.com?subject=Support%20Request%20-%20EMBR3%20OCSM", "_blank");
  };

  const location = useLocation();

  // Map full URL paths to the Ant Design menu item keys
  const pathToKeyMap = {
    "/admin/dashboard": "dashboard",
    "/admin/measurement": "measurement-data",
    "/admin/reports/generate-report": "generate-report",
    "/admin/reports/extract": "extract-data",
    "/admin/announcements": "announcements",
    "/admin/logs": "app-logs",
    "/admin/settings/data-config": "data-configuration",
    "/admin/settings/account": "account-settings",
    "/admin/settings/developer": "developer-settings",
    "/admin/settings/backup": "backup-data",
    "/admin/settings/vera": "vera-settings",
  };

  // Map Ant Design menu item keys back to full URL paths for navigation
  const keyToPathMap = {
    dashboard: "/admin/dashboard",
    "measurement-data": "/admin/measurement",
    "generate-report": "/admin/reports/generate-report",
    "extract-data": "/admin/reports/extract",
    announcements: "/admin/announcements",
    "app-logs": "/admin/logs",
    "data-configuration": "/admin/settings/data-config",
    "account-settings": "/admin/settings/account",
    "developer-settings": "/admin/settings/developer",
    "backup-data": "/admin/settings/backup",
    "vera-settings": "/admin/settings/vera",
  };

  // Derive the selected key based on the current URL path
  const selectedKey = pathToKeyMap[location.pathname] || "dashboard";

  const handleMenuClick = ({ key }) => {
    const path = keyToPathMap[key];
    if (path) {
      navigate(path);
    }
    if (isMobile) setCollapsed(true);
  };

  // The cached profile is enough to decide the menu; the server enforces it.
  const sessionUser = currentUser || getSessionUser();
  const isDeveloper = isDeveloperUser(sessionUser);
  const roleLabel = isDeveloper
    ? "Developer"
    : sessionUser?.permissions?.canManageUsers || sessionUser?.privilege === "admin"
      ? "Administrator"
      : "Staff";
  const initials = String(userName || "A")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  const userMenuItems = [
    {
      key: "who",
      type: "group",
      label: (
        <div className="admin-user-menu-head">
          <strong>{userName}</strong>
          <span>{roleLabel}</span>
        </div>
      ),
    },
    { type: "divider" },
    {
      key: "account",
      icon: <UserOutlined />,
      label: "My Account",
      onClick: () => navigate("/admin/settings/account"),
    },
    {
      key: "appearance",
      icon: <BgColorsOutlined />,
      label: "Appearance",
      onClick: () => navigate("/admin/settings/account#appearance"),
    },
    { type: "divider" },
    { key: "feature", icon: <BulbOutlined />, label: "Suggest a Feature", onClick: handleSuggestFeature },
    { key: "contact", icon: <MailOutlined />, label: "Contact Us", onClick: handleContactUs },
    { type: "divider" },
    { key: "logout", icon: <LogoutOutlined />, label: "Log out", danger: true, onClick: handleLogout },
  ];

  const built = useMemo(
    () => buildAdminTheme({ dark: isDarkMode, prefs: themePrefs }),
    [isDarkMode, themePrefs]
  );
  const currentTheme = useMemo(
    () => ({ ...built.antd, algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm }),
    [built, isDarkMode]
  );

  // Dialogs, drawers and dropdowns render outside .admin-shell (portals), so
  // the theme variables are also published on <html> for them.
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(built.vars).forEach(([k, v]) => root.style.setProperty(k, v));
    return () => Object.keys(built.vars).forEach((k) => root.style.removeProperty(k));
  }, [built]);

  const screens = Grid.useBreakpoint();
  // Phones/small tablets: the sidebar becomes an overlay drawer (collapsed to
  // zero width) so the content keeps the full viewport width.
  const isMobile = screens.md === false;
  useEffect(() => {
    if (isMobile) setCollapsed(true);
  }, [isMobile]);
  // Tablets (md but not lg): start with the icon-only sidebar so tables and
  // charts get the width. The user can still expand it from the header.
  const isTablet = screens.md === true && screens.lg === false;
  useEffect(() => {
    if (isTablet) setCollapsed(true);
  }, [isTablet]);

  const SIDER_WIDTH = 248;
  const SIDER_COLLAPSED = 76;
  const page = PAGE_META[selectedKey] || PAGE_META.dashboard;
  const railOnly = collapsed && !isMobile;

  return (
    <ConfigProvider theme={currentTheme}>
      <Layout
        className={`admin-shell${isDarkMode ? " admin-shell--dark" : ""}`}
        style={{ minHeight: "100vh", ...built.vars }}
      >
        <Sider
          className="admin-sider"
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          trigger={null}
          width={SIDER_WIDTH}
          collapsedWidth={isMobile ? 0 : SIDER_COLLAPSED}
          style={{
            height: "100vh",
            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: isMobile ? 1200 : 10,
            boxShadow: isMobile && !collapsed ? "0 0 32px rgba(0,0,0,0.35)" : undefined,
          }}
        >
          <div className="admin-sider-inner">
            <div className={`admin-brand${railOnly ? " admin-brand--rail" : ""}`}>
              <span className="admin-brand-logos">
                <img src={EMBLogo} alt="Environmental Management Bureau Region III" />
                {!railOnly && <img src={BPLogo} alt="Bagong Pilipinas" />}
              </span>
              {!railOnly && (
                <span className="admin-brand-text">
                  <span className="admin-brand-name">EMBR3 OCSM</span>
                  <span className="admin-brand-sub">Online Client Satisfaction<br />Measurement</span>
                </span>
              )}
            </div>
            <div className="admin-sider-ribbon" aria-hidden="true" />

            <nav className="admin-sider-menu" aria-label="Admin navigation">
              <AdminMenu
                selectedKey={selectedKey}
                onMenuClick={handleMenuClick}
                collapsed={railOnly}
                isDeveloper={isDeveloper}
              />
            </nav>

            <div className={`admin-sider-foot${railOnly ? " admin-sider-foot--rail" : ""}`}>
              {isDeveloper && !railOnly && (
                <span className="admin-dev-badge">
                  <CodeOutlined /> Developer access
                </span>
              )}
              <Tooltip title={buildDetails()} placement={railOnly ? "right" : "top"}>
                <span className="admin-version" tabIndex={0} aria-label={buildDetails()}>
                  {railOnly ? versionLabel() : <>EMBR3 OCSM <strong>{versionLabel()}</strong></>}
                </span>
              </Tooltip>
            </div>
          </div>
        </Sider>
        {isMobile && !collapsed && (
          <div className="admin-sider-backdrop" onClick={() => setCollapsed(true)} aria-hidden="true" />
        )}
        <Layout
          className="admin-main"
          style={{
            marginLeft: isMobile ? 0 : collapsed ? SIDER_COLLAPSED : SIDER_WIDTH,
            transition: "margin-left 0.2s",
            minWidth: 0,
          }}
        >
          <Header className="admin-header" style={{ padding: isMobile ? "0 12px" : "0 24px" }}>
            <div className="admin-header-left">
              <button
                type="button"
                className="admin-icon-btn"
                aria-label={collapsed ? "Open navigation" : "Close navigation"}
                aria-expanded={!collapsed}
                onClick={() => setCollapsed(!collapsed)}
              >
                {isMobile ? <MenuOutlined /> : collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              </button>
              <div className="admin-page-title">
                <span className="admin-page-section">
                  {page.section === "Developer" && <LockOutlined />} {page.section}
                </span>
                <h1 className="admin-page-name">{page.title}</h1>
              </div>
            </div>

            <div className="admin-header-right">
              <Tooltip title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}>
                <button
                  type="button"
                  className="admin-icon-btn admin-theme-btn"
                  aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                  aria-pressed={isDarkMode}
                  onClick={() => setIsDarkMode((d) => !d)}
                >
                  {isDarkMode ? <SunOutlined /> : <MoonOutlined />}
                </button>
              </Tooltip>
              <span className="admin-header-sep" aria-hidden="true" />
              <Dropdown menu={{ items: userMenuItems }} trigger={["click"]} placement="bottomRight">
                <button type="button" className="admin-user-chip" aria-label={`Account menu for ${userName}`}>
                  <span className="admin-avatar" aria-hidden="true">{initials || <UserOutlined />}</span>
                  {!isMobile && (
                    <span className="admin-user-text">
                      <span className="admin-user-name">{userName}</span>
                      <span className={`admin-user-role${isDeveloper ? " is-dev" : ""}`}>{roleLabel}</span>
                    </span>
                  )}
                  <DownOutlined className="admin-user-caret" />
                </button>
              </Dropdown>
            </div>
            <div className="admin-header-ribbon" aria-hidden="true" />
          </Header>

          {maintenance.enabled && (
            <div className="admin-maint-banner" role="status">
              <ToolOutlined />
              <span>
                <strong>Maintenance mode is on.</strong> Only developer accounts can use the system
                {maintenance.endsAt ? ` — expected back by ${formatEndsAt(maintenance.endsAt)}` : ""}.
              </span>
              {isDeveloper && selectedKey !== "developer-settings" && (
                <button type="button" onClick={() => navigate("/admin/settings/developer?tab=maintenance")}>
                  Manage
                </button>
              )}
            </div>
          )}
          <Content className="admin-content">
            <div className="admin-page">
              {/* A crash in one page shows a recoverable panel instead of a blank
                  admin; moving to another page clears it. */}
              <ErrorBoundary resetKey={location.pathname} homeHref={appUrl("/admin/dashboard")}>
                <Suspense fallback={<SectionLoader message="Loading page…" minHeight={360} />}>
                  <Outlet />
                </Suspense>
              </ErrorBoundary>
            </div>
          </Content>
          <Footer className="admin-footer">
            Environmental Management Bureau Region III · Online Client Satisfaction Measurement · ©{" "}
            {new Date().getFullYear()}
          </Footer>
        </Layout>
        {/* VERA — single admin-realm chat instance, page-aware via selectedKey */}
        <VeraChat activeMenu={selectedKey} isMobile={isMobile} theme={isDarkMode ? "dark" : "light"} />
      </Layout>
    </ConfigProvider>
  );
}

export default AdminPage;
