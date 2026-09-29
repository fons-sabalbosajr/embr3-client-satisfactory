import React from "react";
import {
  Modal,
  Descriptions,
  Table,
  Typography,
  Tabs,
  Tag,
  Row,
  Col,
  Card,
  Divider,
  Space,
  Statistic,
} from "antd";
import {
  UserOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  classifyCcAnswer,
  classifySqdAnswer,
  normalizeSqdAnswer,
  isCcQuestion,
  isSqdQuestion,
  tallySentiment,
  SENTIMENT,
} from "../../../utils/responseClassifier";
import "./modalstyles.css";

const { Title, Text } = Typography;

const SENTIMENT_TAG = {
  [SENTIMENT.POSITIVE]: "success",
  [SENTIMENT.NEUTRAL]: "warning",
  [SENTIMENT.NEGATIVE]: "error",
  [SENTIMENT.NA]: "default",
};

function SentimentTiles({ tally }) {
  const tiles = [
    { key: "positive", title: "Positive", icon: <CheckCircleOutlined />, color: "#389e0d", cls: "stat-positive" },
    { key: "neutral", title: "Neutral", icon: <MinusCircleOutlined />, color: "#fa8c16", cls: "stat-neutral" },
    { key: "negative", title: "Negative", icon: <CloseCircleOutlined />, color: "#cf1322", cls: "stat-negative" },
    { key: "na", title: "N/A", icon: <StopOutlined />, color: "#8c8c8c", cls: "stat-na" },
  ];
  return (
    <Row gutter={[12, 12]}>
      {tiles.map((t) => (
        <Col xs={12} sm={6} key={t.key}>
          <Card size="small" className={`view-modal-stat-card ${t.cls}`}>
            <Statistic
              title={t.title}
              value={tally[t.key]}
              suffix={<span className="view-modal-stat-of">/ {tally.total}</span>}
              prefix={t.icon}
              valueStyle={{ color: t.color }}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
}

function MeasurementViewModal({ visible, onClose, record }) {
  if (!record) return null;

  const labeled = record.answersLabeled || {};

  // Infer survey type
  const surveyType =
    record.surveyType ||
    (labeled["Customer Type"] === "Government" &&
    (labeled["Agency Name"] === "EMB Region III" || labeled["Employee Name"])
      ? "internal"
      : "external");

  // ── Primary Info ──
  const customerType = labeled["Customer Type"] || "—";
  const primaryItems = [
    { label: "Region", value: labeled["Region"] },
    { label: "Agency", value: labeled["Agency"] },
    { label: "Customer Type", value: customerType },
  ];

  if (customerType === "Citizen") {
    primaryItems.push(
      { label: "Age", value: labeled["Age"] },
      { label: "Gender", value: labeled["Gender"] }
    );
  }
  if (customerType === "Business") {
    primaryItems.push({ label: "Company Name", value: labeled["Company Name"] });
  }
  if (customerType === "Government") {
    primaryItems.push(
      { label: "Agency Name", value: labeled["Agency Name"] },
      { label: "Employee Name", value: labeled["Employee Name"] }
    );
  }
  if (labeled["Assisted Personnel"]) {
    primaryItems.push({ label: "Assisted Personnel", value: labeled["Assisted Personnel"] });
  }

  // Service Availed
  const serviceAvailed = labeled["Service Availed"];
  const services = Array.isArray(serviceAvailed)
    ? serviceAvailed
    : serviceAvailed
    ? [serviceAvailed]
    : [];

  // ── Citizens Charter ──
  const citizensCharterData = Object.entries(labeled)
    .filter(([q]) => isCcQuestion(q))
    .map(([question, answer], index) => ({
      key: `CC${index + 1}`,
      code: `CC${index + 1}`,
      question,
      answer,
      sentiment: classifyCcAnswer(answer),
    }));

  const answerText = (text) => (Array.isArray(text) ? text.join(", ") : text);

  const citizenColumns = [
    { title: "Code", dataIndex: "code", key: "code", width: 64 },
    { title: "Question", dataIndex: "question", key: "question" },
    {
      title: "Response",
      key: "answer",
      width: 220,
      render: (_, row) => (
        <Tag color={SENTIMENT_TAG[row.sentiment] || "default"} className="view-modal-answer-tag">
          {answerText(row.answer) || "—"}
        </Tag>
      ),
    },
  ];

  // ── SQD ──
  const sqdMap = [
    { keyword: "responsiveness", label: "Responsiveness" },
    { keyword: "reliability", label: "Reliability" },
    { keyword: "access", label: "Access & Facilities" },
    { keyword: "communication", label: "Communication" },
    { keyword: "costs", label: "Costs" },
    { keyword: "integrity", label: "Integrity" },
    { keyword: "assurance", label: "Assurance" },
    { keyword: "outcome", label: "Outcome" },
  ];

  const sqdData = [];
  let sqdCounter = 0;

  Object.entries(labeled).forEach(([question, answer]) => {
    if (!isSqdQuestion(question)) return;
    const match = sqdMap.find(({ keyword }) => question.toLowerCase().includes(keyword));
    const cleanedQuestion = question.replace(/\s*\([^)]*\)\s*$/, "").trim();
    sqdData.push({
      key: `SQD${sqdCounter}`,
      code: `SQD${sqdCounter}`,
      category: match ? match.label : "Overall Satisfaction",
      question: cleanedQuestion,
      answer,
      normalized: normalizeSqdAnswer(answer),
      sentiment: classifySqdAnswer(answer),
    });
    sqdCounter++;
  });

  const ratingColor = (label) => {
    if (label === "Strongly Agree") return "blue";
    if (label === "Agree") return "green";
    if (label === "Neither Agree nor Disagree") return "orange";
    if (label === "Disagree") return "red";
    if (label === "Strongly Disagree") return "volcano";
    return "default";
  };

  const sqdColumns = [
    { title: "Code", dataIndex: "code", key: "code", width: 64 },
    { title: "Category", dataIndex: "category", key: "category", width: 150, responsive: ["sm"] },
    { title: "Question", dataIndex: "question", key: "question" },
    {
      title: "Rating",
      key: "answer",
      width: 190,
      render: (_, row) => (
        <Tag color={ratingColor(row.normalized)} className="view-modal-answer-tag">
          {row.normalized || answerText(row.answer) || "—"}
        </Tag>
      ),
    },
  ];

  // ── Summary Counts ──
  // Counted from the same classifier the Dashboard uses, so a fully positive
  // response can never show a negative count here.
  const ccTally = tallySentiment(citizensCharterData.map((d) => d.answer), classifyCcAnswer);
  const sqdTally = tallySentiment(sqdData.map((d) => d.answer), classifySqdAnswer);

  // ── Remarks ──
  const remarks = Object.entries(labeled).find(
    ([q]) =>
      q.toLowerCase().includes("remarks") ||
      q.toLowerCase().includes("suggestion")
  )?.[1];

  // ── Tabs ──
  const tabsItems = [
    {
      key: "summary",
      label: "Summary",
      children: (
        <div className="view-modal-summary">
          <Row gutter={[16, 20]}>
            <Col span={24}>
              <Title level={5} style={{ marginBottom: 12 }}>
                Citizen's Charter
              </Title>
              <SentimentTiles tally={ccTally} />
            </Col>
            <Col span={24}>
              <Title level={5} style={{ marginBottom: 12 }}>
                Service Quality Dimensions (SQD)
              </Title>
              <SentimentTiles tally={sqdTally} />
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: "response",
      label: "Detailed Response",
      children: (
        <div className="view-modal-response">
          {citizensCharterData.length > 0 && (
            <>
              <Title level={5}>Citizen's Charter</Title>
              <Table
                dataSource={citizensCharterData}
                columns={citizenColumns}
                pagination={false}
                size="small"
                className="view-modal-table"
                scroll={{ x: 520 }}
              />
              <Divider style={{ margin: "16px 0" }} />
            </>
          )}
          <Title level={5}>Service Quality Dimensions (SQD)</Title>
          <Table
            dataSource={sqdData}
            columns={sqdColumns}
            pagination={false}
            size="small"
            className="view-modal-table"
            scroll={{ x: 520 }}
          />
        </div>
      ),
    },
    {
      key: "remarks",
      label: "Remarks",
      children: (
        <div className="view-modal-remarks">
          {remarks ? (
            <>
              <Title level={5}>Remarks / Suggestions</Title>
              <Card size="small" className="view-modal-remarks-card">
                <Text>{remarks}</Text>
              </Card>
            </>
          ) : (
            <Text type="secondary" italic>
              No remarks or suggestions provided.
            </Text>
          )}
        </div>
      ),
    },
  ];

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width="min(960px, calc(100vw - 24px))"
      centered
      className="view-modal-root"
      title={
        <div className="view-modal-header">
          <Space align="center" wrap>
            <FileTextOutlined style={{ fontSize: 18 }} />
            <span>Survey Response Details</span>
            <Tag color={surveyType === "internal" ? "blue" : "green"}>
              {surveyType === "internal" ? "Internal" : "External"}
            </Tag>
          </Space>
          {record.submittedAt && (
            <Text
              type="secondary"
              style={{ fontSize: 12, fontWeight: 400 }}
            >
              Submitted:{" "}
              {dayjs(record.submittedAt).format("MMM D, YYYY h:mm A")}
            </Text>
          )}
        </div>
      }
    >
      {/* Client Information Card */}
      <Card
        size="small"
        className="view-modal-info-card"
        title={
          <Space>
            <UserOutlined />
            <span>Client Information</span>
          </Space>
        }
      >
        <Descriptions
          size="small"
          column={{ xs: 1, sm: 2, md: 3 }}
          bordered
          className="view-modal-descriptions"
        >
          {primaryItems.map(({ label, value }) => (
            <Descriptions.Item key={label} label={label}>
              {value || <Text type="secondary">—</Text>}
            </Descriptions.Item>
          ))}
        </Descriptions>

        {services.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Text
              strong
              style={{ fontSize: 12, display: "block", marginBottom: 6 }}
            >
              Service Availed
            </Text>
            <Space wrap size={[4, 4]}>
              {services.map((s) => (
                <Tag key={s} color="processing" className="view-modal-answer-tag">
                  {s}
                </Tag>
              ))}
            </Space>
          </div>
        )}
      </Card>

      {/* Tabs */}
      <Tabs
        defaultActiveKey="summary"
        items={tabsItems}
        style={{ marginTop: 16 }}
        className="view-modal-tabs"
      />
    </Modal>
  );
}

export default MeasurementViewModal;
