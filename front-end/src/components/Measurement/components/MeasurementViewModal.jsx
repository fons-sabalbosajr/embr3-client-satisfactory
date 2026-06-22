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
} from "@ant-design/icons";
import dayjs from "dayjs";
import "./modalstyles.css";

const { Title, Text } = Typography;

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
  const sqdKeywords = [
    "responsiveness", "reliability", "access", "communication",
    "costs", "integrity", "assurance", "outcome",
  ];

  const citizensCharterData = Object.entries(labeled)
    .filter(([q]) => q.toLowerCase().includes("citizen"))
    .map(([question, answer], index) => ({
      key: `CC${index + 1}`,
      code: `CC${index + 1}`,
      question,
      answer,
    }));

  const citizenColumns = [
    { title: "Code", dataIndex: "code", key: "code", width: 70 },
    { title: "Question", dataIndex: "question", key: "question" },
    {
      title: "Response",
      dataIndex: "answer",
      key: "answer",
      width: 140,
      render: (text) => {
        const lower = String(text || "").toLowerCase();
        if (lower === "yes") return <Tag color="success">Yes</Tag>;
        if (lower === "no") return <Tag color="error">No</Tag>;
        return <Tag>{Array.isArray(text) ? text.join(", ") : text}</Tag>;
      },
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

  const sqd0Entry = Object.entries(labeled).find(
    ([q]) =>
      q.trim().toLowerCase() ===
      "i am satisfied with the service that i availed."
  );
  if (sqd0Entry) {
    sqdData.push({
      key: "SQD0",
      code: "SQD0",
      category: "Overall Satisfaction",
      question: sqd0Entry[0],
      answer: sqd0Entry[1],
    });
    sqdCounter = 1;
  }

  Object.entries(labeled).forEach(([question, answer]) => {
    const match = sqdMap.find(({ keyword }) =>
      question.toLowerCase().includes(keyword)
    );
    if (match) {
      const regex = new RegExp(`\\s*\\(${match.label}\\)\\s*$`, "i");
      const cleanedQuestion = question.replace(regex, "").trim();
      sqdData.push({
        key: `SQD${sqdCounter}`,
        code: `SQD${sqdCounter}`,
        category: match.label,
        question: cleanedQuestion,
        answer,
      });
      sqdCounter++;
    }
  });

  const ratingColor = (text) => {
    const lower = String(text || "").toLowerCase();
    if (lower === "strongly agree") return "blue";
    if (lower === "agree") return "green";
    if (lower === "satisfactory" || lower === "neither agree nor disagree")
      return "orange";
    if (lower === "disagree") return "red";
    if (lower === "strongly disagree") return "volcano";
    return "default";
  };

  const sqdColumns = [
    { title: "Code", dataIndex: "code", key: "code", width: 70 },
    { title: "Category", dataIndex: "category", key: "category", width: 140 },
    { title: "Question", dataIndex: "question", key: "question" },
    {
      title: "Rating",
      dataIndex: "answer",
      key: "answer",
      width: 150,
      render: (text) => (
        <Tag color={ratingColor(text)}>
          {Array.isArray(text) ? text.join(", ") : text}
        </Tag>
      ),
    },
  ];

  // ── Summary Counts ──
  const ccPositive = citizensCharterData.filter(({ answer }) =>
    ["yes", "agree"].some((k) =>
      String(answer || "").toLowerCase().includes(k)
    )
  ).length;
  const ccNegative = citizensCharterData.length - ccPositive;

  const sqdPositive = sqdData.filter(({ answer }) =>
    ["strongly agree", "agree"].includes(String(answer || "").toLowerCase())
  ).length;
  const sqdNeutral = sqdData.filter(({ answer }) => {
    const a = String(answer || "").toLowerCase();
    return a === "satisfactory" || a === "neither agree nor disagree";
  }).length;
  const sqdNegative = sqdData.filter(({ answer }) =>
    ["disagree", "strongly disagree"].includes(
      String(answer || "").toLowerCase()
    )
  ).length;

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
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Title level={5} style={{ marginBottom: 12 }}>
                Citizen's Charter
              </Title>
              <Row gutter={16}>
                <Col xs={12} sm={8}>
                  <Card
                    size="small"
                    className="view-modal-stat-card stat-positive"
                  >
                    <Statistic
                      title="Positive"
                      value={ccPositive}
                      prefix={<CheckCircleOutlined />}
                      valueStyle={{ color: "#389e0d" }}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={8}>
                  <Card
                    size="small"
                    className="view-modal-stat-card stat-negative"
                  >
                    <Statistic
                      title="Negative"
                      value={ccNegative}
                      prefix={<CloseCircleOutlined />}
                      valueStyle={{ color: "#cf1322" }}
                    />
                  </Card>
                </Col>
              </Row>
            </Col>
            <Col span={24}>
              <Title level={5} style={{ marginBottom: 12 }}>
                Service Quality Dimensions (SQD)
              </Title>
              <Row gutter={16}>
                <Col xs={8}>
                  <Card
                    size="small"
                    className="view-modal-stat-card stat-positive"
                  >
                    <Statistic
                      title="Positive"
                      value={sqdPositive}
                      prefix={<CheckCircleOutlined />}
                      valueStyle={{ color: "#389e0d" }}
                    />
                  </Card>
                </Col>
                <Col xs={8}>
                  <Card
                    size="small"
                    className="view-modal-stat-card stat-neutral"
                  >
                    <Statistic
                      title="Neutral"
                      value={sqdNeutral}
                      prefix={<MinusCircleOutlined />}
                      valueStyle={{ color: "#fa8c16" }}
                    />
                  </Card>
                </Col>
                <Col xs={8}>
                  <Card
                    size="small"
                    className="view-modal-stat-card stat-negative"
                  >
                    <Statistic
                      title="Negative"
                      value={sqdNegative}
                      prefix={<CloseCircleOutlined />}
                      valueStyle={{ color: "#cf1322" }}
                    />
                  </Card>
                </Col>
              </Row>
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
              <Card size="small" style={{ background: "#fafafa" }}>
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
      width={960}
      className="view-modal-root"
      title={
        <div className="view-modal-header">
          <Space align="center">
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
                <Tag key={s} color="processing">
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
