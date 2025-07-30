import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FloatButton, Row, Col, Typography, Button, Select } from "antd";
import { BulbOutlined, ArrowRightOutlined } from "@ant-design/icons";

import { getFeedbacks } from "../../services/api";
import EMBLogo from "../../assets/emblogo.svg";
import BPLogo from "../../assets/bplogo.svg";
import Survey from "../../assets/surveyman.png";
import "./home.css";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";

const { Title, Text } = Typography;

function Home({ toggleColorScheme }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [language, setLanguage] = useState("en");
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getFeedbacks();
        setFeedbacks(res.data);
      } catch (err) {
        console.error("API ERROR:", err.message);
      }
    };
    fetchData();
  }, []);

  const handleTakeSurveyClick = () => {
    navigate(`/survey/page1?lang=${language}`);
  };

  return (
    <>
      <div className="home-container">
        {/* Background Circles */}
        <div className="home-background-circles">
          <div className="circle circle1" />
          <div className="circle circle2" />
          <div className="circle circle3" />
          <div className="circle circle4" />
          <div className="circle circle5" />
        </div>

        {/* ✅ Agency Header */}
        <header className="agency-header-home">
          <div className="agency-header-inner-home">
            <div className="agency-header-top">
              <div className="agency-header-logos">
                <img src={EMBLogo} alt="EMB Logo" className="logo-svg-emb" />
                <img src={BPLogo} alt="BP Logo" className="logo-svg-bp" />
              </div>
            </div>

            <div className="agency-header-text">
              <span className="republic-text">{t("agencyTitle")}</span>
              <span className="department-text">{t("department")}</span>
              <span className="bureau-text">{t("bureau")}</span>
              <span className="address-text">
                {t("address1")}, {t("address2")}
              </span>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <Row
          gutter={[32, 32]}
          align="middle"
          className="hero-section"
          style={{ minHeight: "calc(100vh - 200px)" }}
        >
          <Col xs={24} md={12} className="hero-left">
            <div className="hero-left-inner">
              <Title level={1} className="hero-title">
                {t("csmTitle")}
              </Title>
              <Text
                size="sm"
                mb="md"
                className="hero-subtitle"
                style={{ maxWidth: 600 }}
              >
                {t("subtitle")}
              </Text>

              <Button
                type="primary"
                icon={<ArrowRightOutlined />}
                onClick={handleTakeSurveyClick}
                className="hero-button"
              >
                {t("takeSurvey")}
              </Button>

              <div className="language-select-wrapper">
                <Select
                  value={language}
                  onChange={(value) => {
                    setLanguage(value);
                    i18n.changeLanguage(value);
                  }}
                  options={[
                    { value: "en", label: "🇬🇧 English" },
                    { value: "fil", label: "🇵🇭 Filipino" },
                  ]}
                  style={{ marginTop: 20, width: 180 }}
                  placeholder={t("selectLanguage")}
                />
              </div>
            </div>
          </Col>

          <Col xs={24} md={12} className="hero-image-wrapper">
            <img src={Survey} alt="Survey Graphic" className="hero-image" />
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
