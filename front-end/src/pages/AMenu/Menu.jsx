import { useEffect } from "react";
import { Button, Title, Text, Stack, Container } from "@mantine/core";
import { useNavigate, useLocation } from "react-router-dom";
import EMBLogo from "../../assets/emblogo.svg";
import BPLogo from "../../assets/bplogo.svg";
import CryptoJS from "crypto-js";
import "./menu.css";
// Add these imports for theme toggle
import { FloatButton } from "antd";
import { BulbOutlined } from "@ant-design/icons";

const secretKey = import.meta.env.VITE_MENU_SECRET_KEY;

function encrypt(value) {
  return CryptoJS.AES.encrypt(value, secretKey).toString();
}

function decrypt(cipherText) {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    return null;
  }
}

// Accept toggleColorScheme as prop
function Menu({ toggleColorScheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const showAdmin = params.get("admin-auth") === "true";

  const encryptedFlag = sessionStorage.getItem("menuFlag");
  const visited = encryptedFlag ? decrypt(encryptedFlag) === "visited" : false;

  useEffect(() => {
    if (visited && !showAdmin) {
      navigate("/client", { replace: true });
    }
  }, [visited, showAdmin, navigate]);

  if (visited && !showAdmin) return null;

  return (
    <div className="menu-container">
      <div className="menu-background-circles">
        <div className="circle circle1" />
        <div className="circle circle2" />
        <div className="circle circle3" />
        <div className="circle circle4" />
        <div className="circle circle5" />
      </div>

      <div className="menu-foreground">
        <header className="agency-header-menu">
          <div className="agency-header-inner-menu">
            <div className="hero-logos">
              <img src={EMBLogo} alt="EMB Logo" className="logo-svg-emb-menu" />
              <img src={BPLogo} alt="BP Logo" className="logo-svg-bp-menu" />
            </div>
            <Title order={2} className="agency-name">
              <span className="agency-name-text">
                Republic of the Philippines
              </span>
              <span className="agency-name-text">
                DEPARTMENT OF ENVIRONMENT AND NATURAL RESOURCES
              </span>
              <span className="agency-name-text-emb">
                ENVIRONMENTAL MANAGEMENT BUREAU III
              </span>
              <span className="agency-name-text-address">
                Masinop Corner, Matalino St., Diosdado Macapagal Government
                Center,
              </span>
              <span className="agency-name-text-address">
                Maimpis, City of San Fernando, Pampanga
              </span>
            </Title>
          </div>
        </header>

        <Container size="xs" className="menu-content">
          <Title order={1} className="main-title">
            Online Client Satisfactory Measurement
          </Title>
          <Text size="lg" className="survey-text">
            Select your portal below
          </Text>
          <Stack spacing="md" mt="lg">
            {showAdmin && (
              <Button
                size="md"
                radius="xl"
                className="survey-button-admin"
                onClick={() => navigate("/admin-auth")}
              >
                Admin
              </Button>
            )}
            <Button
              size="md"
              radius="xl"
              className="survey-button"
              onClick={() => {
                const encrypted = encrypt("visited");
                sessionStorage.setItem("menuFlag", encrypted);
                navigate("/client", { replace: true });
              }}
            >
              Client
            </Button>
          </Stack>
        </Container>
      </div>
      {/* Theme Toggle Button */}
      <FloatButton
        icon={<BulbOutlined />}
        onClick={toggleColorScheme}
        tooltip={<div>Toggle Theme</div>}
        style={{ right: 20, bottom: 20 }}
      />
    </div>
  );
}

export default Menu;