// AdminPage.jsx
import React, { useEffect, useState, useMemo, Suspense } from "react";
import { Modal, Spin } from "antd";
import {
  Layout,
  Avatar,
  Dropdown,
  Typography,
  theme,
  Menu,
  ConfigProvider,
  Switch,
  Space,
  Button,
  Tag,
} from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  BulbOutlined,
  BulbFilled,
  CaretRightFilled,
  CaretLeftFilled,
  MailOutlined,
  NotificationOutlined,
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
import AdminMenu from "../../components/AdminMenu/AdminMenu";
import * as api from "../../services/api";
import "./adminpage.css";

const { Header, Sider, Content, Footer } = Layout;
const { Title, Text } = Typography;
const { defaultAlgorithm, darkAlgorithm } = theme;

function AdminPage() {
  const timerRef = React.useRef();
  // Auto-logout after 5 minutes of inactivity

  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [userName, setUserName] = useState("Admin");
  const [currentUser, setCurrentUser] = useState(null);
  const [announcementModal, setAnnouncementModal] = useState(false);
  const [modalAnnouncements, setModalAnnouncements] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = getDecryptedItem("darkMode") ?? localStorage.getItem("darkMode");
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [themePrefs, setThemePrefs] = useState({
    siderBg: "#0C2340",
    headerBg: "#0C2340",
    colorPrimary: "#1677ff",
  });

  // --- Color utils: normalize and compute contrasting text ---
  const isValidHex = (v) => typeof v === "string" && /^#([0-9A-Fa-f]{3}){1,2}$/.test(v.trim());
  const normalizeHex = (v, fallback) => (isValidHex(v) ? v : fallback);
  const hexToRgb = (hex) => {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const bigint = parseInt(full, 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
  };
  const luminance = (hex) => {
    const { r, g, b } = hexToRgb(hex);
    const srgb = [r, g, b].map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  };
  const contrastText = (bgHex) => (luminance(bgHex) > 0.5 ? "#1A1A1A" : "#EAEAEA");
  const shadeHex = (hex, amount = 0.1) => {
    // amount: -1 to 1 (negative = darken, positive = lighten)
    try {
      const { r, g, b } = hexToRgb(hex);
      const tint = (v) => {
        const nv = Math.round(amount >= 0 ? v + (255 - v) * amount : v * (1 + amount));
        return Math.max(0, Math.min(255, nv));
      };
      const nr = tint(r), ng = tint(g), nb = tint(b);
      const toHex = (v) => v.toString(16).padStart(2, '0');
      return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
    } catch {
      return hex;
    }
  };

  useEffect(() => {
    let warningTimeout;
    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningTimeout) clearTimeout(warningTimeout);
      timerRef.current = setTimeout(() => {
        Modal.warning({
          title: "Auto Logout Warning",
          content:
            "The current user seems idle; the system will automatically log you out and redirect you to the login page.",
          okText: "OK",
          onOk: () => {
            clearAllStorage();
            try {
              const { origin } = window.location;
              const basePath = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
              window.location.href = `${origin}${basePath}/admin`;
            } catch {
              window.location.reload();
            }
          },
        });
        // Fallback: force redirect after 10s if modal not confirmed
        warningTimeout = setTimeout(() => {
          clearAllStorage();
          try {
            const { origin } = window.location;
            const basePath = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
            window.location.href = `${origin}${basePath}/admin`;
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

  // Auto-collapse sidebar on iPad-width screens (<=1080px)
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1080px)");
    const handleResize = (e) => setCollapsed(e.matches);
    handleResize(mediaQuery);
    mediaQuery.addEventListener("change", handleResize);
    return () => mediaQuery.removeEventListener("change", handleResize);
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
            try { window.dispatchEvent(new Event("auth:changed")); } catch {}
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
              clearAllStorage();
              try { window.dispatchEvent(new Event("auth:changed")); } catch {}
              navigate("/admin");
              return;
            }
          }
          // Also try to fetch full profile in background for permissions
          try {
            const me = await api.getMe();
            setCurrentUser(me?.data?.user || null);
          } catch (bgErr) {
            // If the token is expired/invalid (401), redirect to login
            if (bgErr?.response?.status === 401) {
              navigate("/admin");
              return;
            }
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
          const merged = { ...cached, ...prefs };
          setThemePrefs((prev) => ({
            siderBg: isValidHex(merged.siderBg) ? merged.siderBg : prev.siderBg,
            headerBg: isValidHex(merged.headerBg) ? merged.headerBg : prev.headerBg,
            colorPrimary: isValidHex(merged.colorPrimary) ? merged.colorPrimary : prev.colorPrimary,
          }));
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
        try { window.dispatchEvent(new Event("auth:changed")); } catch {}
        navigate("/admin");
      }
    };
    ensureAuthenticated();
  }, [navigate]);

  // Listen for live theme updates from DeveloperSettings
  useEffect(() => {
    const onThemeUpdated = (e) => {
      const d = e?.detail || {};
      setThemePrefs((prev) => ({
        siderBg: isValidHex(d.siderBg) ? d.siderBg : prev.siderBg,
        headerBg: isValidHex(d.headerBg) ? d.headerBg : prev.headerBg,
        colorPrimary: isValidHex(d.colorPrimary) ? d.colorPrimary : prev.colorPrimary,
      }));
    };
    window.addEventListener("theme:updated", onThemeUpdated);
    // Also check cached prefs on mount
    try {
      const dec = getDecryptedItem("themePrefsCache");
      const cached = dec ? JSON.parse(dec) : null;
      if (cached) onThemeUpdated({ detail: cached });
    } catch {}
    return () => window.removeEventListener("theme:updated", onThemeUpdated);
  }, []);

  // Fetch popup-mode announcements on mount
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await api.getAnnouncements({ active: 'true' });
        const items = Array.isArray(res.data?.data) ? res.data.data : [];
        const now = Date.now();
        const popups = items.filter((a) => {
          if (a.status !== 'active') return false;
          if (a.displayMode !== 'modal' && a.displayMode !== 'both') return false;
          return true;
        });
        if (popups.length > 0) {
          // Only show once per session using sessionStorage
          const shownKey = 'annPopupShown';
          if (!sessionStorage.getItem(shownKey)) {
            setModalAnnouncements(popups);
            setAnnouncementModal(true);
            sessionStorage.setItem(shownKey, '1');
          }
        }
      } catch {}
    };
    fetchAnnouncements();
  }, []);

  // Effect for saving dark mode preference
  useEffect(() => {
    setEncryptedItem("darkMode", JSON.stringify(isDarkMode));
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
    "/admin/settings/data-config": "data-configuration",
    "/admin/settings/account": "account-settings",
    "/admin/settings/developer": "developer-settings",
    "/admin/settings/backup": "backup-data",
  };

  // Map Ant Design menu item keys back to full URL paths for navigation
  const keyToPathMap = {
    dashboard: "/admin/dashboard",
    "measurement-data": "/admin/measurement",
    "generate-report": "/admin/reports/generate-report",
    "extract-data": "/admin/reports/extract",
    announcements: "/admin/announcements",
    "data-configuration": "/admin/settings/data-config",
    "account-settings": "/admin/settings/account",
    "developer-settings": "/admin/settings/developer",
    "backup-data": "/admin/settings/backup",
  };

  // Derive the selected key based on the current URL path
  const selectedKey = pathToKeyMap[location.pathname] || "dashboard";

  const handleMenuClick = ({ key }) => {
    const path = keyToPathMap[key];
    if (path) {
      navigate(path);
    }
  };

  const userMenuItems = [
    {
      key: "feature",
      icon: <BulbOutlined />,
      label: "Suggest a Feature",
      onClick: handleSuggestFeature,
    },
    {
      key: "contact",
      icon: <MailOutlined />,
      label: "Contact Us",
      onClick: handleContactUs,
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      onClick: handleLogout,
    },
  ];

  const currentTheme = useMemo(
    () => ({
      algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm,
      token: {
        colorPrimary: normalizeHex(themePrefs.colorPrimary, "#1677ff"),
        borderRadius: 6,
        colorBgBase: isDarkMode ? "#141414" : "#F5F5F5",
        // Keep content/base text tied to darkMode only to avoid white text on white content in light mode
        colorTextBase: isDarkMode ? "#EAEAEA" : "#1A1A1A",
        colorBgContainer: isDarkMode ? "#1d1d1d" : "#ffffff", // Keep this
        fontFamily: "'Inter', 'Plus Jakarta Sans', 'Poppins', sans-serif",
      },
      components: {
        Layout: {
          siderBg: normalizeHex(themePrefs.siderBg, isDarkMode ? "#0C2340" : "#ffffff"),
          headerBg: normalizeHex(themePrefs.headerBg, isDarkMode ? "#0C2340" : "#ffffff"),
        },
        Menu: (() => {
          const sb = normalizeHex(themePrefs.siderBg, isDarkMode ? "#001529" : "#ffffff");
          const text = contrastText(sb);
          const selectedBg = luminance(sb) > 0.5 ? shadeHex(sb, -0.06) : shadeHex(sb, 0.12);
          return {
            itemColor: text,
            itemHoverColor: text,
            itemSelectedColor: text,
            itemActiveBg: selectedBg,
            itemSelectedBg: selectedBg,
            popupBg: sb,
          };
        })(),
      },
    }),
    [isDarkMode, themePrefs]
  );

  const {
    token: { colorBgContainer, borderRadius },
  } = theme.useToken();

  // console.log("Is Dark Mode:", isDarkMode);
  // console.log("Actual colorBgContainer value:", colorBgContainer);

  return (
    <ConfigProvider theme={currentTheme}>
      <Layout style={{ minHeight: "100vh" }}>
        <Sider
          theme={(luminance(normalizeHex(themePrefs.siderBg, isDarkMode ? "#0C2340" : "#ffffff")) > 0.5) ? "light" : "dark"}
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          trigger={null} // We'll use a custom trigger in the Header
          width={220}
          style={{
            overflow: "auto",
            height: "100vh",
            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
            background: currentTheme.components.Layout.siderBg,
            color: contrastText(currentTheme.components.Layout.siderBg),
          }}
        >
          <div className="admin-logo-container">
            <img src={EMBLogo} alt="EMB Logo" className="admin-logo" />
            {!collapsed && (
              <div className="admin-title-wrapper">
                <Title
                  level={5}
                  style={{
                    margin: 0,
                    color: contrastText(currentTheme.components.Layout.siderBg),
                    lineHeight: "1",
                    whiteSpace: "nowrap",
                  }}
                >
                  EMBR3 OCSM
                </Title>
                <Text
                  style={{
                    color: contrastText(currentTheme.components.Layout.siderBg),
                    fontSize: "10px",
                    lineHeight: ".5",
                    whiteSpace: "nowrap",
                  }}
                >
                  Online Client Satisfaction <br /> Measurement
                </Text>
              </div>
            )}
          </div>
          {/* Pass selectedKey as a prop */}
          <AdminMenu
            selectedKey={selectedKey}
            onMenuClick={handleMenuClick}
            menuTheme={
              luminance(normalizeHex(themePrefs.siderBg, isDarkMode ? "#0C2340" : "#ffffff")) > 0.5
                ? "light"
                : "dark"
            }
          />
        </Sider>
        <Layout
          style={{
            marginLeft: collapsed ? 80 : 220,
            transition: "margin-left 0.2s",
          }}
        >
          <Header
            className="admin-header-bar"
            style={{
              position: "sticky", // ✅ this keeps it visible while scrolling
              top: 0,
              zIndex: 1000, // ensures it stays above content
              padding: "0 24px",
              background: currentTheme.components.Layout.headerBg,
              color: contrastText(currentTheme.components.Layout.headerBg),
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: 56,
              lineHeight: "56px",
            }}
          >
            <Button
              type="primary"
              icon={collapsed ? <CaretRightFilled /> : <CaretLeftFilled />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: "14px",
                width: 25,
                height: 25,
                borderRadius: "50%",
                right: 35,
              }}
            />
            <Space align="center" size="middle">
              <Dropdown menu={{ items: userMenuItems }} trigger={["click"]}>
                <Avatar
                  style={{ backgroundColor: "#4B8D73", cursor: "pointer" }}
                  icon={<UserOutlined />}
                />
              </Dropdown>

              <Text style={{ color: contrastText(currentTheme.components.Layout.headerBg) }}>
                {userName}
              </Text>
              <Switch
                checked={isDarkMode}
                onChange={setIsDarkMode}
                checkedChildren={<BulbFilled />}
                unCheckedChildren={<BulbOutlined />}
              />
            </Space>
          </Header>
          <Content
            style={{
              margin: "12px 16px",
              background: isDarkMode ? "#1d1d1d" : "#ffffff",
              borderRadius: borderRadius,
              overflow: "auto",
            }}
          >
            <div
              style={{
                padding: 12,
                borderRadius: borderRadius,
                minHeight: "calc(100vh - 136px)",
                transition: "box-shadow 0.3s ease-in-out",
              }}
            >
              <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px 0' }}><Spin size="large" /></div>}>
                <Outlet />
              </Suspense>
            </div>
          </Content>
          <Footer
            style={{
              textAlign: "center",
              background: "transparent",
              padding: "8px 0 16px 0",
              fontSize: "12px",
              color: isDarkMode ? "#666" : "#999",
            }}
          >
            EMB Region III — Online Client Satisfaction Measurement ©{" "}
            {new Date().getFullYear()}
          </Footer>
        </Layout>
      </Layout>

      {/* Announcement Popup Modal */}
      <Modal
        title={
          <Space>
            <NotificationOutlined style={{ color: '#1677ff' }} />
            <span>Announcements</span>
          </Space>
        }
        open={announcementModal}
        onCancel={() => setAnnouncementModal(false)}
        footer={
          <Button type="primary" onClick={() => setAnnouncementModal(false)}>
            Got it
          </Button>
        }
        width={560}
      >
        {modalAnnouncements.map((ann, idx) => (
          <div
            key={ann._id}
            style={{
              padding: '14px 16px',
              borderLeft: '4px solid #1677ff',
              borderRadius: 8,
              background: 'rgba(22, 119, 255, 0.04)',
              marginBottom: idx < modalAnnouncements.length - 1 ? 12 : 0,
            }}
          >
            <Typography.Text strong style={{ fontSize: 15 }}>{ann.title}</Typography.Text>
            <div
              style={{ marginTop: 8, fontSize: 13, lineHeight: 1.7 }}
              dangerouslySetInnerHTML={{ __html: ann.message }}
            />
            {ann.startDate && (
              <Typography.Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
                {new Date(ann.startDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Typography.Text>
            )}
          </div>
        ))}
      </Modal>
    </ConfigProvider>
  );
}

export default AdminPage;
