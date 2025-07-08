import {
  Container,
  Button,
  Text,
  Title,
  Stack,
  ActionIcon,
  Grid,
} from "@mantine/core";
import { Sun, MoonStars, ArrowRight } from "tabler-icons-react";
import { useEffect, useState } from "react";
import { getFeedbacks } from "../../services/api";
import EMBLogo from "../../assets/emblogo.svg";
import BPLogo from "../../assets/bplogo.svg";
import Survey from "../../assets/surveyman.png";
import "./home.css";

function Home({ toggleColorScheme, colorScheme }) {
  const [feedbacks, setFeedbacks] = useState([]);

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

  return (
    <div className="home-container">
      <div className="home-background-circles">
        <div className="circle circle1" />
        <div className="circle circle2" />
        <div className="circle circle3" />
        <div className="circle circle4" />
        <div className="circle circle5" />
      </div>
      <header className="agency-header">
        <div className="agency-header-inner">
          <div className="hero-logos">
            <img src={EMBLogo} alt="EMB Logo" className="logo-svg-emb" />
            <img src={BPLogo} alt="BP Logo" className="logo-svg-bp" />
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

      {/* ================= MAIN HERO SECTION ================= */}
      <Container size="lg">
        <Grid gutter="xl" align="center">
          <Grid.Col xs={12} md={6}>
            <img
              src={Survey}
              alt="Survey Graphic"
              style={{
                width: "100%",
                maxWidth: "500px",
                margin: "0 auto",
                display: "block",
                marginTop: "-70px",
              }}
            />
          </Grid.Col>

          <Grid.Col xs={12} md={6}>
            <Stack spacing="xs" align="center">
              <Title order={1} className="main-title">
                CLIENT SATISFACTION SURVEY
              </Title>
              <Text size="lg" c="dimmed" className="survey-text">
                We want your feedback!
              </Text>
              <Button size="md" radius="xl" className="survey-button">
                Take the Survey{" "}
                <ArrowRight size={18} style={{ marginLeft: "8px" }} />
              </Button>
            </Stack>
          </Grid.Col>
        </Grid>
      </Container>

      {/* Theme Toggle Floating Button */}
      <ActionIcon
        className="floating-theme-toggle"
        variant="filled"
        color={colorScheme === "dark" ? "yellow" : "blue"}
        onClick={toggleColorScheme}
        title="Toggle color scheme"
        size="lg"
      >
        {colorScheme === "dark" ? <Sun size={20} /> : <MoonStars size={20} />}
      </ActionIcon>
    </div>
  );
}

export default Home;
