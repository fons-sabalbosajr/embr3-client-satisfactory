// Dashboard VERA card — rotating tips & reminders for OCSM admins under the
// VERA visual identity, plus an "Ask VERA" action that opens the already
// mounted VeraChat via the `vera:open` event (no duplicate chat instance).
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Typography, Button, Tooltip, Tag } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import VeraFlameIcon from "./VeraFlameIcon";
import "./VeraCard.css";

const { Text } = Typography;

const CATEGORY_COLORS = { Insight: "cyan", Reports: "blue", Data: "green", Scoring: "gold", Setup: "purple" };

// Concise, non-sensitive guidance about the OCSM workflow and ARTA scoring.
const VERA_TIPS = [
  { cat: "Insight", text: "Ask me “which dimension is weakest?” — I rank SQD1–SQD8 from the live data.", ask: "Which SQD dimension is the weakest right now?" },
  { cat: "Scoring", text: "SQD score = (Strongly Agree + Agree) ÷ answers excluding N/A. ARTA target: 80%, Very Satisfactory at 90%.", ask: "How is the SQD score computed?" },
  { cat: "Insight", text: "Responses with a Disagree rating are flagged in my snapshot — review their remarks first.", ask: "Summarise the negative remarks" },
  { cat: "Data", text: "Click a Dashboard question tile to list every response behind that figure." },
  { cat: "Reports", text: "Generate Report’s Excel export now includes a Responses sheet with Service Availed." },
  { cat: "Data", text: "Measurement Data → Export downloads only the rows you filtered." },
  { cat: "Scoring", text: "CC1 measures awareness of the Citizen’s Charter; CC2 and CC3 are skipped when a client is unaware.", ask: "How many clients are aware of the Citizen's Charter?" },
  { cat: "Insight", text: "Ask “how are we doing this month?” for a headline, key figures and one suggested action.", ask: "How are we doing this month?" },
  { cat: "Setup", text: "Settings → VERA Assistant sets my provider, tone, starter questions and daily limits." },
  { cat: "Reports", text: "Use the same date range in Generate Report each quarter to compare like with like." },
  { cat: "Data", text: "Prefer editing a wrong response over deleting it so period counts stay intact." },
  { cat: "Insight", text: "Ask “what are the most availed services?” to see the top eight with counts.", ask: "What are the most availed services?" },
];

const ROTATE_MS = 8000;
const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

function VeraCard() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const pausedRef = useRef(false);
  const reduced = prefersReducedMotion();

  const advance = useCallback((dir = 1) => {
    if (reduced) {
      setIndex((i) => (i + dir + VERA_TIPS.length) % VERA_TIPS.length);
      return;
    }
    setVisible(false);
    window.setTimeout(() => {
      setIndex((i) => (i + dir + VERA_TIPS.length) % VERA_TIPS.length);
      setVisible(true);
    }, 240);
  }, [reduced]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (pausedRef.current || document.hidden) return;
      advance(1);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [advance]);

  const pause = () => { pausedRef.current = true; };
  const resume = () => { pausedRef.current = false; };
  const tip = VERA_TIPS[index];
  const openVera = () => window.dispatchEvent(new CustomEvent("vera:open", { detail: tip.ask ? { ask: tip.ask } : {} }));

  return (
    <div
      role="region"
      aria-label="VERA tips and reminders"
      className="vera-card"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
    >
      <span className="vera-card-icon"><VeraFlameIcon size={24} /></span>

      <div className="vera-card-body">
        <div className="vera-card-head">
          <Text strong className="vera-card-title">VERA Insights &amp; Tips</Text>
          <Tag color={CATEGORY_COLORS[tip.cat] || "default"} className="vera-card-tag">{tip.cat}</Tag>
        </div>
        <Tooltip title={tip.text}>
          <Text
            aria-live="polite"
            className="vera-card-text"
            style={{ opacity: reduced ? 1 : visible ? 1 : 0, transition: reduced ? "none" : "opacity 0.22s ease" }}
          >
            {tip.text}
          </Text>
        </Tooltip>
      </div>

      <span className="vera-card-actions">
        <span style={{ display: "flex" }}>
          <Button type="text" size="small" aria-label="Previous tip" icon={<LeftOutlined style={{ fontSize: 10 }} />} onClick={() => advance(-1)} />
          <Button type="text" size="small" aria-label="Next tip" icon={<RightOutlined style={{ fontSize: 10 }} />} onClick={() => advance(1)} />
        </span>
        <Button size="small" type="primary" onClick={openVera} className="vera-card-ask">
          {tip.ask ? "Ask VERA" : "Open VERA"}
        </Button>
      </span>
    </div>
  );
}

export default memo(VeraCard);
