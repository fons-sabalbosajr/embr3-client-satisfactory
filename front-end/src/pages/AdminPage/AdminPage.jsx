// AdminPage.jsx
import React, { useEffect, useState, useMemo } from "react";
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
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import EMBLogo from "../../assets/emblogo.svg";
import AdminMenu from "../../components/AdminMenu/AdminMenu";
import "./adminpage.css";

const { Header, Sider, Content, Footer } = Layout;
const { Title, Text } = Typography;
const { defaultAlgorithm, darkAlgorithm } = theme;

const secretKey =
  import.meta.env.VITE_SECRET_KEY || "default-secret-key-for-dev";

function AdminPage() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [userName, setUserName] = useState("Admin");
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem("darkMode");
    return savedMode ? JSON.parse(savedMode) : false;
  });

  // Effect for handling user authentication check
  useEffect(() => {
    const encryptedUser = localStorage.getItem("user");
    if (encryptedUser) {
      try {
        const bytes = CryptoJS.AES.decrypt(encryptedUser, secretKey);
        const decryptedDataString = bytes.toString(CryptoJS.enc.Utf8);
        if (!decryptedDataString) {
          throw new Error("Decryption resulted in empty string.");
        }
        const decryptedData = JSON.parse(decryptedDataString);
        setUserName(decryptedData.fullname || "Admin");
      } catch (e) {
        console.error("Decryption failed:", e);
        // Clear corrupted data and redirect
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("darkMode"); // Ensure dark mode is also cleared
        navigate("/admin-auth");
      }
    } else {
      // No user data, redirect to login
      navigate("/admin-auth");
    }
  }, [navigate]);

  // Effect for saving dark mode preference
  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("darkMode"); // Clear dark mode on logout
    navigate("/admin-auth");
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
    "/admin/reports/generate-report": "generate-report", // <-- Corrected path to match mainApp.jsx
    "/admin/reports/extract": "extract-data",
    "/admin/announcements": "announcements",
    "/admin/settings/data-config": "data-configuration",
    "/admin/settings/account": "account-settings",
    "/admin/settings/backup": "backup-data",
  };

  // Map Ant Design menu item keys back to full URL paths for navigation
  const keyToPathMap = {
    dashboard: "/admin/dashboard",
    "measurement-data": "/admin/measurement",
    "generate-report": "/admin/reports/generate-report", // <-- Corrected path to match mainApp.jsx
    "extract-data": "/admin/reports/extract",
    announcements: "/admin/announcements",
    "data-configuration": "/admin/settings/data-config",
    "account-settings": "/admin/settings/account",
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

  const userMenu = (
    <Menu>
      <Menu.Item
        key="feature"
        icon={<BulbOutlined />}
        onClick={handleSuggestFeature}
      >
        Suggest a Feature
      </Menu.Item>
      <Menu.Item
        key="contact"
        icon={<MailOutlined />}
        onClick={handleContactUs}
      >
        Contact Us
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        Logout
      </Menu.Item>
    </Menu>
  );

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
              <Dropdown overlay={userMenu} trigger={["click"]}>
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
              margin: "10px 10px 12px 10px", // Adjusted margins
              overflow: "initial",
              background: isDarkMode ? "#1d1d1d" : "#ffffff",
              borderRadius: borderRadius,
            }}
          >
            <div
              style={{
                padding: 12,
                borderRadius: borderRadius,
                minHeight: "calc(100vh - 136px)", // Adjusted for accuracy
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
