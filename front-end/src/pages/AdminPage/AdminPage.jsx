// AdminPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Modal } from "antd";
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
} from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  BulbOutlined,
  BulbFilled,
  CaretRightFilled,
  CaretLeftFilled,
  MailOutlined,
} from "@ant-design/icons";
import CryptoJS from "crypto-js";
import { getCachedConfig } from "../../utils/config";
import {
  getOpaqueItem,
  setOpaqueItem,
  removeOpaqueItem,
} from "../../utils/encryptedStorage";
import { getDecryptedItem } from "../../utils/encryptedStorage";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import EMBLogo from "../../assets/emblogo.svg";
import AdminMenu from "../../components/AdminMenu/AdminMenu";
import "./adminpage.css";

const { Header, Sider, Content, Footer } = Layout;
const { Title, Text } = Typography;
const { defaultAlgorithm, darkAlgorithm } = theme;

const { secretKey = "" } = getCachedConfig();

function AdminPage() {
  const timerRef = React.useRef();
  // Auto-logout after 5 minutes of inactivity

  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [userName, setUserName] = useState("Admin");
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode =
      getOpaqueItem("darkMode") ?? localStorage.getItem("darkMode");
    return savedMode ? JSON.parse(savedMode) : false;
  });

  useEffect(() => {
    let warningTimeout;
    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningTimeout) clearTimeout(warningTimeout);
      timerRef.current = setTimeout(() => {
        Modal.warning({
          title: "Auto Logout Warning",
          content: "The current user seems idle; the system will automatically log you out and redirect you to the login page.",
          okText: "OK",
          onOk: () => {
            removeOpaqueItem("user");
            removeOpaqueItem("token");
            removeOpaqueItem("darkMode");
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            localStorage.removeItem("darkMode");
            window.location.href = "http://10.14.77.107:5174/admin";
          },
        });
        // Fallback: force redirect after 10s if modal not confirmed
        warningTimeout = setTimeout(() => {
          removeOpaqueItem("user");
          removeOpaqueItem("token");
          removeOpaqueItem("darkMode");
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          localStorage.removeItem("darkMode");
          window.location.href = "http://10.14.77.107:5174/admin";
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
  // Effect for handling user authentication check
  useEffect(() => {
    try {
      const decryptedDataString = getDecryptedItem("user");
      if (!decryptedDataString) {
        // Not an exceptional error - user simply not signed in or data cleared
        console.info("No decrypted user data found; redirecting to login.");
        removeOpaqueItem("user");
        removeOpaqueItem("token");
        removeOpaqueItem("darkMode");
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("darkMode");
        navigate("/admin");
        return;
      }

      const decryptedData = JSON.parse(decryptedDataString);
      if (
        !decryptedData ||
        typeof decryptedData !== "object" ||
        !decryptedData.fullname
      ) {
        console.warn("Decrypted user data missing expected fields; clearing and redirecting.");
        removeOpaqueItem("user");
        removeOpaqueItem("token");
        removeOpaqueItem("darkMode");
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("darkMode");
        navigate("/admin");
        return;
      }

      setUserName(decryptedData.fullname || "Admin");
    } catch (e) {
      // Keep this lightweight; likely parsing error or corrupt data.
      console.warn("Decryption/parsing issue for stored user; clearing storage and redirecting.", e?.message || e);
      removeOpaqueItem("user");
      removeOpaqueItem("token");
      removeOpaqueItem("darkMode");
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("darkMode");
      navigate("/admin");
    }
  }, [navigate]);

  // Effect for saving dark mode preference
  useEffect(() => {
    setOpaqueItem("darkMode", JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const handleLogout = () => {
    // Remove obfuscated keys
    removeOpaqueItem("user");
    removeOpaqueItem("token");
    removeOpaqueItem("darkMode");
    // Clear all localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    // Optionally, overwrite any remaining keys with dummy values for extra obfuscation
    Object.keys(localStorage).forEach((key) => {
      try {
        localStorage.setItem(key, "[hidden]");
      } catch {}
    });
    navigate("/admin");
    window.location.reload();
  };

  const handleSuggestFeature = () => {
    console.log("Suggest a Feature clicked");
  };

  const handleContactUs = () => {
    console.log("Contact Us clicked");
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
        colorPrimary: "#1677ff",
        borderRadius: 8,
        colorBgBase: isDarkMode ? "#141414" : "#F5F5F5",
        colorTextBase: isDarkMode ? "#EAEAEA" : "#1A1A1A",
        colorBgContainer: isDarkMode ? "#1d1d1d" : "#ffffff", // Keep this
      },
      components: {
        Layout: {
          siderBg: isDarkMode ? "#001529" : "#ffffff",
          headerBg: isDarkMode ? "#001529" : "#ffffff",
          // Try setting the content background directly here as well
          // This targets the Ant Design Content component itself
          // Note: The specific token might be 'contentBg' or 'colorBgLayout'
          // based on your Ant Design version or how their tokens are structured.
          // For simplicity, let's try to override Antd's Content component directly.
          // Or we can rely on colorBgLayout token if it exists.
        },
      },
    }),
    [isDarkMode]
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
                    color: currentTheme.token.colorTextBase,
                    lineHeight: "1",
                    whiteSpace: "nowrap",
                  }}
                >
                  EMBR3 OCSM
                </Title>
                <Text
                  style={{
                    color: currentTheme.token.colorTextBase,
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
          <AdminMenu selectedKey={selectedKey} onMenuClick={handleMenuClick} />
        </Sider>
        <Layout
          style={{
            marginLeft: collapsed ? 80 : 220,
            transition: "margin-left 0.2s",
          }}
        >
          <Header
            style={{
              position: "sticky", // ✅ this keeps it visible while scrolling
              top: 0,
              zIndex: 1000, // ensures it stays above content
              padding: "0 24px",
              background: currentTheme.components.Layout.headerBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
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

              <Text style={{ color: currentTheme.token.colorTextBase }}>
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
              margin: "10px 10px 12px 10px",
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
              <Outlet />
            </div>
          </Content>
          <Footer
            style={{
              textAlign: "center",
              background: "transparent",
              padding: "5px 0 20px 0",
            }}
          >
            EMB R3 Online Client Satisfaction Measurement ©
            {new Date().getFullYear()}
          </Footer>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}

export default AdminPage;
