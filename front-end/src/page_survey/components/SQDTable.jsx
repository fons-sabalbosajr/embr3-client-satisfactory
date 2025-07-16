import React from "react";
import { Card, Form, Typography, Row, Col } from "antd";
import angry from "../../assets/angry.gif";
import disagree from "../../assets/disagree.gif";
import neutral from "../../assets/neutral.gif";
import agree from "../../assets/agree.gif";
import superagree from "../../assets/superagree.gif";

const { Text } = Typography;

const ratingOptions = [
  { value: "Strongly Disagree", label: "Strongly Disagree", icon: angry },
  { value: "Disagree", label: "Disagree", icon: disagree },
  { value: "Satisfactory", label: "Satisfactory", icon: neutral },
  { value: "Agree", label: "Agree", icon: agree },
  { value: "Strongly Agree", label: "Strongly Agree", icon: superagree },
];

function SQDTable({ group = [], form, extraQuestion = null, onAnswerChange }) {
  if (!Array.isArray(group) || group.length === 0) return null;

  const formValues = Form.useWatch([], form);

  const handleRatingClick = (fieldName, value) => {
    form.setFieldValue(fieldName, value);

    // Sync to answers state
    if (onAnswerChange) {
      onAnswerChange(fieldName, value);
    }
  };

  return (
    <Card>
      {group.map((question) => {
        const fieldName = `answer_${question._id}`;
        const selected = formValues?.[fieldName];

        return (
          <Row key={question._id} style={{ marginBottom: 32 }}>
            <Col span={24}>
              <Text strong style={{ fontSize: "20px" }}>
                {question.questionText}
              </Text>

              <Form.Item name={fieldName} noStyle>
                <input type="hidden" />
              </Form.Item>

              <div className="rating-group">
                {ratingOptions.map((opt) => (
                  <div
                    key={opt.value}
                    className={`rating-box ${selected === opt.value ? "selected" : ""}`}
                    onClick={() => handleRatingClick(fieldName, opt.value)}
                  >
                    <img src={opt.icon} alt={opt.label} className="rating-icon" />
                    <div className="rating-label">{opt.label}</div>
                  </div>
                ))}
              </div>
            </Col>
          </Row>
        );
      })}

      {extraQuestion && (
        <Row style={{ marginTop: 32 }}>
          <Col span={24}>
            <Text strong style={{ fontSize: "20px" }}>
              {extraQuestion.questionText}
            </Text>
            <Form.Item
              name={`answer_${extraQuestion._id}`}
              rules={[{ required: false }]}
              style={{ marginTop: 12 }}
            >
              <textarea
                rows={4}
                placeholder="Any improvements or suggestions..."
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #d9d9d9",
                  resize: "vertical",
                  fontSize: "20px",
                }}
                onChange={(e) =>
                  onAnswerChange?.(`answer_${extraQuestion._id}`, e.target.value)
                }
              />
            </Form.Item>
          </Col>
        </Row>
      )}
    </Card>
  );
}

export default SQDTable;
