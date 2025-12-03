import React from "react";
import {
  Modal,
  Descriptions,
  Table,
  Typography,
  Tabs,
  Tag,
  Input,
  Row,
  Col,
  Card,
} from "antd";
import "./modalstyles.css";

const { Title } = Typography;

function MeasurementViewModal({ visible, onClose, record }) {
  if (!record) return null;

  const primaryInfoFields = [
    "Agency",
    "Region",
    "Customer Type",
    "Age",
    "Gender",
    "Company Name",
  ];

  const primaryInfo = primaryInfoFields.map((field) => ({
    label: field,
    value: record.answersLabeled?.[field] || "",
  }));

  const sqdKeywords = [
    "responsiveness",
    "reliability",
    "access",
    "communication",
    "costs",
    "integrity",
    "assurance",
    "outcome",
  ];

  const citizensCharterData = Object.entries(record.answersLabeled || {})
    .filter(([q]) => q.toLowerCase().includes("citizen"))
    .map(([question, answer], index) => ({
      key: `CC${index + 1}`,
      code: `CC${index + 1}`,
      question,
      answer,
    }));

  const citizenColumns = [
    {
      title: "Question Code",
      dataIndex: "code",
      key: "code",
      width: "10%",
    },
    {
      title: "Question Description",
      dataIndex: "question",
      key: "question",
      width: "55%",
    },
    {
      title: "Response",
      dataIndex: "answer",
      key: "answer",
      width: "35%",
        render: (text) => {
          let color = "default";
          const lower = String(text || "").toLowerCase();
          if (lower === "yes") color = "green";
          else if (lower === "no") color = "red";
          return <Tag color={color}>{Array.isArray(text) ? text.join(", ") : text}</Tag>;
        },
    },
  ];

  const sqdMap = [
    { keyword: "responsiveness", label: "Responsiveness" },
    { keyword: "reliability", label: "Reliability" },
    { keyword: "access", label: "Access and Facilities" },
    { keyword: "communication", label: "Communication" },
    { keyword: "costs", label: "Costs" },
    { keyword: "integrity", label: "Integrity" },
    { keyword: "assurance", label: "Assurance" },
    { keyword: "outcome", label: "Outcome" },
  ];

  const sqdData = [];
  let sqdCounter = 0;

  const sqd0Entry = Object.entries(record.answersLabeled || {}).find(
    ([q]) =>
      q.trim().toLowerCase() ===
      "i am satisfied with the service that i availed."
  );
  if (sqd0Entry) {
    const [question, answer] = sqd0Entry;
    sqdData.push({ key: `SQD0`, code: `SQD0`, category: "", question, answer });
    sqdCounter = 1;
  }

  Object.entries(record.answersLabeled || {}).forEach(([question, answer]) => {
    const match = sqdMap.find(({ keyword }) => question.toLowerCase().includes(keyword));
    if (match) {
      const regex = new RegExp(`\\s*\\(${match.label}\\)\\s*$`, "i");
      const cleanedQuestion = question.replace(regex, "").trim();
      sqdData.push({ key: `SQD${sqdCounter}`, code: `SQD${sqdCounter}`, category: match.label, question: cleanedQuestion, answer });
      sqdCounter++;
    }
  });

  const sqdColumns = [
    { title: "Question Code", dataIndex: "code", key: "code", width: "10%" },
    { title: "Category", dataIndex: "category", key: "category", width: "20%" },
    { title: "Question Description", dataIndex: "question", key: "question", width: "45%" },
    {
      title: "Response",
      dataIndex: "answer",
      key: "answer",
      width: "25%",
      render: (text) => {
        const lower = String(text || "").toLowerCase();
        let color = "default";
        if (["agree"].includes(lower)) color = "green";
        else if (["strongly agree"].includes(lower)) color = "blue";
        else if (["satisfactory"].includes(lower)) color = "orange";
        else if (["disagree"].includes(lower)) color = "red";
        else if (lower === "strongly disagree") color = "maroon";
        return <Tag color={color}>{Array.isArray(text) ? text.join(", ") : text}</Tag>;
      },
    },
  ];

  const remarks = Object.entries(record.answersLabeled || {}).find(
    ([q]) => q.toLowerCase().includes("remarks") || q.toLowerCase().includes("suggestion")
  )?.[1];

  const tabsItems = [
    {
      key: "1",
      label: "Summary Response",
      children: (
        <>
          <Title level={5}>Citizen’s Charter Summary</Title>
          <Row gutter={16}>
            <Col span={6}>
              <Card title="Positive" variant="plain" size="small">
                <Title level={3} style={{ margin: 0, color: "#389e0d" }}>
                  {Object.entries(record.answersLabeled || {}).filter(([q, a]) => q.toLowerCase().includes("citizen") && ["yes", "agree"].some((k) => String(a || "").toLowerCase().includes(k))).length}
                </Title>
              </Card>
            </Col>
            <Col span={6}>
              <Card title="Negative" variant="plain" size="small">
                <Title level={3} style={{ margin: 0, color: "#cf1322" }}>
                  {Object.entries(record.answersLabeled || {}).filter(([q, a]) => q.toLowerCase().includes("citizen") && !["yes", "agree"].some((k) => a.toLowerCase().includes(k))).length}
                </Title>
              </Card>
            </Col>
          </Row>

          <Title level={5} style={{ marginTop: 24 }}>Service Quality Dimensions (SQD) Summary</Title>
          <Row gutter={16}>
            <Col span={6}>
              <Card title="Positive" variant="plain" size="small">
                <Title level={3} style={{ margin: 0, color: "#389e0d" }}>
                  {Object.entries(record.answersLabeled || {}).filter(([q, a]) => sqdKeywords.some((k) => q.toLowerCase().includes(k)) && ["strongly agree", "agree"].includes(a.toLowerCase())).length}
                </Title>
              </Card>
            </Col>
            <Col span={6}>
              <Card title="Neither Agree nor Disagree" variant="plain" size="small">
                <Title level={3} style={{ margin: 0, color: "#fa8c16" }}>
                  {Object.entries(record.answersLabeled || {}).filter(([q, a]) => {
                    const al = String(a || "").toLowerCase();
                    return sqdKeywords.some((k) => q.toLowerCase().includes(k)) && (al === 'satisfactory' || al === 'neither agree nor disagree');
                  }).length}
                </Title>
              </Card>
            </Col>
            <Col span={6}>
              <Card title="Negative" variant="plain" size="small">
                <Title level={3} style={{ margin: 0, color: "#cf1322" }}>
                  {Object.entries(record.answersLabeled || {}).filter(([q, a]) => sqdKeywords.some((k) => q.toLowerCase().includes(k)) && ["disagree", "strongly disagree"].includes(String(a || "").toLowerCase())).length}
                </Title>
              </Card>
            </Col>
          </Row>
        </>
      ),
    },
    {
      key: "2",
      label: "Client Response",
      children: (
        <>
          <Title level={5}>Citizen’s Charter</Title>
          <div className="client-response-table">
            <Table dataSource={citizensCharterData} columns={citizenColumns} pagination={false} size="small" style={{ marginBottom: 24 }} />
          </div>

          <Title level={5}>Service Quality Dimensions (SQD)</Title>
          <div className="client-response-table">
            <Table dataSource={sqdData} columns={sqdColumns} pagination={false} size="small" style={{ marginBottom: 24 }} />
          </div>
        </>
      ),
    },
    {
      key: "3",
      label: "Remarks / Suggestions",
      children: (
        <>
          {remarks && (
            <>
              <Title level={5}>Remarks / Suggestions</Title>
              <Input.TextArea value={remarks} readOnly autoSize={{ minRows: 3 }} style={{ fontSize: "12px" }} />
            </>
          )}
        </>
      ),
    },
  ];

  return (
    <Modal open={visible} onCancel={onClose} onOk={onClose} width={900} title="Client Feedback Details">
      <Title level={5}>Primary Info</Title>
      <Descriptions bordered size="small" column={2}>
        {primaryInfo.map(({ label, value }) => (
          <Descriptions.Item key={label} label={label}>
            {value}
          </Descriptions.Item>
        ))}
      </Descriptions>

      <Tabs defaultActiveKey="1" style={{ marginTop: 24 }} items={tabsItems} />
    </Modal>
  );
}

export default MeasurementViewModal;
