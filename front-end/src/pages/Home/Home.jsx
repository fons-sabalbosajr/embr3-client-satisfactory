import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FloatButton, Row, Col, Typography, Button, Select, Dropdown, Modal } from "antd";
import { BulbOutlined, ArrowRightOutlined, InfoCircleOutlined, TeamOutlined, GlobalOutlined } from "@ant-design/icons";
import {
  IconDeviceMobile,
  IconLock,
  IconSparkles,
  IconBolt,
  IconChecklist,
} from "@tabler/icons-react";
import { QRCodeSVG } from "qrcode.react";

import { getFeedbackCount } from "../../services/api";
import EMBLogo from "../../assets/emblogo.svg";
import BPLogo from "../../assets/bplogo.svg";
import Survey from "../../assets/surveyman.png";
import { getOpaqueItem } from "../../utils/encryptedStorage";
import "./home.css";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";

const { Text } = Typography;

function Home({ toggleColorScheme }) {
  const year = new Date().getFullYear();

  useEffect(() => {
    // Hide language key for non-authenticated users
    const isAuthenticated = !!(getOpaqueItem("token") || localStorage.getItem("token"));
    if (!isAuthenticated) {
      localStorage.removeItem("i18nextLng");
    }
  }, []);
  const [feedbacks, setFeedbacks] = useState([]);
  const [language, setLanguage] = useState("en");
  const navigate = useNavigate();
  const { t } = useTranslation();

  const clientUrl = (() => {
    const base = import.meta.env.VITE_APP_URL || window.location.origin;
    const basePath = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
    return `${base.replace(/\/+$/, "")}${basePath}/client`;
  })();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getFeedbackCount();
        // Create a dummy array with the right length so feedbacks.length works
        setFeedbacks(new Array(res.data.count || 0));
      } catch (err) {
        console.error("API ERROR:", err.message);
      }
    };
    fetchData();
  }, []);

  const handleTakeSurvey = (type) => {
    navigate(`/survey/page1?lang=${language}&type=${type}`);
  };

  const showSurveyInfo = () => {
    Modal.info({
      title: t("surveyTypeInfo.title", "Survey Types"),
      width: 520,
      content: (
        <div style={{ marginTop: 12 }}>
          <p><strong><TeamOutlined /> {t("surveyTypeInfo.internalTitle", "Internal Survey")}</strong></p>
          <p style={{ marginLeft: 24, color: "#555" }}>
            {t("surveyTypeInfo.internalDesc", "For EMB Region III employees. The client type is automatically set to \"Government\" and an optional field for the employee name is shown.")}
          </p>
          <p style={{ marginTop: 16 }}><strong><GlobalOutlined /> {t("surveyTypeInfo.externalTitle", "External Survey")}</strong></p>
          <p style={{ marginLeft: 24, color: "#555" }}>
            {t("surveyTypeInfo.externalDesc", "For citizens, businesses, and other government agencies transacting with EMB Region III.")}
          </p>
        </div>
      ),
      okText: t("agencyPrompt.close", "Close"),
    });
  };

  const surveyMenuItems = [
    {
      key: "internal",
      icon: <TeamOutlined />,
      label: t("surveyType.internal", "Internal Survey"),
    },
    {
      key: "external",
      icon: <GlobalOutlined />,
      label: t("surveyType.external", "External Survey"),
    },
    { type: "divider" },
    {
      key: "info",
      icon: <InfoCircleOutlined />,
      label: t("surveyType.info", "What's the difference?"),
    },
  ];

  const languageOptions = [
    {
      value: "en",
      label: (
        <span className="lang-option">
          <span className="lang-flag" aria-hidden="true">
            🇬🇧
          </span>
          <span className="lang-label">English</span>
        </span>
      ),
    },
    {
      value: "fil",
      label: (
        <span className="lang-option">
          <span className="lang-flag" aria-hidden="true">
            🇵🇭
          </span>
          <span className="lang-label">Filipino</span>
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="client-home-container">
        {/* Background Circles */}
        <div className="client-home-background-circles">
          <div className="client-circle client-circle1" />
          <div className="client-circle client-circle2" />
          <div className="client-circle client-circle3" />
          <div className="client-circle client-circle4" />
          <div className="client-circle client-circle5" />
        </div>

        {/* ✅ Agency Header */}
        <header className="agency-header-home">
          <div className="agency-header-inner-home">
            <img src={EMBLogo} alt="EMB Logo" className="logo-svg-emb" />

            <div className="agency-header-text">
              <span className="republic-text">{t("agencyTitle")}</span>
              <span className="department-text">{t("department")}</span>
              <span className="bureau-text">{t("bureau")}</span>
              <span className="address-text">
                {t("address1")}, {t("address2")}
              </span>
            </div>

            <img src={BPLogo} alt="BP Logo" className="logo-svg-bp" />
          </div>
        </header>

        {/* Hero Section */}
        <Row
          align="middle"
          justify="center"
          className="hero-section"
          style={{ minHeight: "calc(100vh - var(--client-header-space))" }}
        >
          <Col xs={24} md={24} className="hero-left">
            <div className="hero-left-inner">
              <div className="hero-card">
                <div className="hero-slogan-row">
                  <div className="hero-big-slogan">{t("heroBigSlogan")}</div>

                  {/* QR Code – desktop only */}
                  <div className="hero-qr-section">
                    <div className="hero-qr-wrapper">
                      <QRCodeSVG
                        value={clientUrl}
                        size={130}
                        level="H"
                        bgColor="#ffffff"
                        fgColor="#0b4f6c"
                        className="hero-qr-code"
                      />
                    </div>
                    <span className="hero-qr-label">
                      {t("scanQr", "Scan to open on your device")}
                    </span>
                  </div>
                </div>

                <div className="hero-kicker">
                  <IconSparkles size={18} />
                  <span>{t("heroKicker")}</span>
                </div>

                <div className="hero-card-grid">
                  <div className="hero-card-content">
                    <Text className="hero-slogan">{t("heroSlogan")}</Text>

                    <Text size="md" mb="md" className="hero-subtitle">
                      {t("subtitle")}
                    </Text>

                    <div className="hero-pills" aria-label="Highlights">
                      <span className="hero-pill">
                        <IconBolt size={16} />
                        {t("heroPillFast")}
                      </span>
                      <span className="hero-pill">
                        <IconLock size={16} />
                        {t("heroPillConfidential")}
                      </span>
                      <span className="hero-pill">
                        <IconDeviceMobile size={16} />
                        {t("heroPillMobile")}
                      </span>
                    </div>

                    <div className="hero-cta-row">
                      <Dropdown
                        menu={{
                          items: surveyMenuItems,
                          onClick: ({ key }) => {
                            if (key === "info") {
                              showSurveyInfo();
                            } else {
                              handleTakeSurvey(key);
                            }
                          },
                        }}
                        trigger={["click"]}
                      >
                        <Button
                          type="primary"
                          icon={<ArrowRightOutlined />}
                          className="hero-button"
                          size="large"
                        >
                          {t("takeSurvey")}
                        </Button>
                      </Dropdown>

                      <div className="language-select-wrapper">
                        <Select
                          value={language}
                          onChange={(value) => {
                            setLanguage(value);
                            i18n.changeLanguage(value);
                          }}
                          options={languageOptions}
                          className="hero-language-select"
                          popupClassName="hero-language-dropdown"
                          optionLabelProp="label"
                          placeholder={t("selectLanguage")}
                        />
                      </div>
                    </div>

                    {!!feedbacks?.length && (
                      <Text className="hero-social-proof">
                        <IconChecklist size={16} />
                        {t("responsesRecorded", { count: feedbacks.length, defaultValue: "{{count}} responses recorded" })}
                      </Text>
                    )}

                  </div>

                  <div className="hero-card-visual" aria-hidden="true">
                    <div className="hero-visual-blob" />
                    <img
                      src={Survey}
                      alt=""
                      className="hero-image hero-image-in-card"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </div>

                {/* Footer inside card */}
                <footer className="client-cover-footer" aria-label="Cover footer">
                  <div className="client-cover-footer-inner">
                    <span className="client-cover-footer-title">{t("csmTitle")}</span>
                    <span className="client-cover-footer-meta">{t("allRightsReserved", { year })}</span>
                  </div>
                </footer>
              </div>
            </div>
          </Col>
        </Row>
      </div>

      {/* Theme Toggle Button */}
      <FloatButton
        icon={<BulbOutlined />}
        onClick={toggleColorScheme}
        tooltip={<div>{t("toggleColor")}</div>}
        style={{ right: 20, bottom: 20 }}
      />
    </>
  );
}

export default Home;
