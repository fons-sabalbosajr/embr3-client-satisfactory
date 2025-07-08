import React from "react";
import { Button, Title, Text, Stack, Container } from "@mantine/core";
import { useNavigate, useLocation } from "react-router-dom";
import EMBLogo from "../../assets/emblogo.svg";
import BPLogo from "../../assets/bplogo.svg";
import "./menu.css";

function Menu() {
  const navigate = useNavigate();
  const location = useLocation();

  // 🔍 Extract query param from URL
  const params = new URLSearchParams(location.search);
  const showAdmin = params.get("admin") === "true";


  return (
    <div className="menu-container">
      <div className="menu-background-circles">
        <div className="circle circle1" />
        <div className="circle circle2" />
        <div className="circle circle3" />
        <div className="circle circle4" />
        <div className="circle circle5" />
      </div>

      <header className="agency-header">
        <div className="agency-header-inner">
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
          Online Client Satisfactory Survey
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
              onClick={() => navigate("/admin")}
            >
              Admin
            </Button>
          )}
          <Button
            size="md"
            radius="xl"
            className="survey-button"
            onClick={() => navigate("/client")}
          >
            Client
          </Button>
        </Stack>
      </Container>
    </div>
  );
}

export default Menu;
