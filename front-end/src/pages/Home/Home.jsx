import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FloatButton, Row, Col, Typography, Button } from "antd";
import { BulbOutlined, ArrowRightOutlined } from "@ant-design/icons";

import { getFeedbacks } from "../../services/api";
import EMBLogo from "../../assets/emblogo.svg";
import BPLogo from "../../assets/bplogo.svg";
import Survey from "../../assets/surveyman.png";
import "./home.css";
import { useTranslation } from "react-i18next";

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
        <header className="agency-header">
          <div className="agency-header-inner">
            <div className="agency-header-top">
              <div className="agency-header-logos">
                <img src={EMBLogo} alt="EMB Logo" className="logo-svg-emb" />
                <img src={BPLogo} alt="BP Logo" className="logo-svg-bp" />
              </div>
            </div>

            <div className="agency-header-text">
              <span className="republic-text">Republic of the Philippines</span>
              <span className="department-text">
                Department of Environment and Natural Resources
              </span>
              <span className="bureau-text">
                ENVIRONMENTAL MANAGEMENT BUREAU REGION III
              </span>
              <span className="address-text">
                Masinop Corner Matalino St., Diosdado Macapagal Government
                Center, Maimpis, City of San Fernando, Pampanga
              </span>
            </div>
          </div>
        </header>
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
