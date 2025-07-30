import React from "react";
import { Card, Form, Typography, Row, Col } from "antd";
import angry from "../../assets/angry.gif";
import disagree from "../../assets/disagree.gif";
import neutral from "../../assets/neutral.gif";
import agree from "../../assets/agree.gif";
import superagree from "../../assets/superagree.gif";
import notapplicable from "../../assets/na.svg";
import "./stylessqdtable.css";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

function SQDTable({
  group = [],
  form,
  extraQuestion = null,
  onAnswerChange,
  startIndex = 1,
}) {
  const { t } = useTranslation(); // ✅ FIX: hook inside component

  const ratingOptions = [
    {
      value: "Strongly Disagree",
      label: t("rating.stronglyDisagree"),
      icon: angry,
    },
    { value: "Disagree", label: t("rating.disagree"), icon: disagree },
    { value: "Satisfactory", label: t("rating.satisfactory"), icon: neutral },
    { value: "Agree", label: t("rating.agree"), icon: agree },
    {
      value: "Strongly Agree",
      label: t("rating.stronglyAgree"),
      icon: superagree,
    },
    {
      value: "Not Applicable",
      label: t("rating.notApplicable"), // 👈 new translation key
      icon: notapplicable, // optional: use a generic icon or `null`
    },
  ];

  if (!Array.isArray(group) || group.length === 0) return null;

  const formValues = Form.useWatch([], form);

  const handleRatingClick = (fieldName, value) => {
    form.setFieldValue(fieldName, value);
    if (onAnswerChange) onAnswerChange(fieldName, value);
  };

  return (
    <Card className="sqd-card">
      {group.map((question, index) => {
        const fieldName = `answer_${question._id}`;
        const selected = formValues?.[fieldName];
        const questionNumber = startIndex + index;

        return (
          <Row key={question._id} className="sqd-question-row">
            <Col span={24}>
              <span className="sqd-question-text">
                {`${questionNumber}. ${t(
                  `questions.${question.questionCode}.text`,
                  {
                    defaultValue: question.questionText,
                  }
                )}`}
              </span>

              <Form.Item name={fieldName} noStyle>
                <input type="hidden" />
              </Form.Item>

              <div className="rating-group">
                {ratingOptions.map((opt) => (
                  <div
                    key={opt.value}
                    className={`rating-box ${
                      selected === opt.value ? "selected" : ""
                    }`}
                    onClick={() => handleRatingClick(fieldName, opt.value)}
                  >
                    <img
                      src={opt.icon}
                      alt={opt.label}
                      className="rating-icon"
                    />
                    <div className="rating-label">{opt.label}</div>
                  </div>
                ))}
              </div>
            </Col>
          </Row>
        );
      })}

      {extraQuestion && (
        <Row className="sqd-extra-row">
          <Col span={24}>
            <Text strong className="sqd-question-text">
              {t(`questions.${extraQuestion.questionCode}.text`, {
                defaultValue: extraQuestion.questionText,
              })}
            </Text>
            <Form.Item
              name={`answer_${extraQuestion._id}`}
              rules={[{ required: false }]}
              className="sqd-textarea-item"
            >
              <textarea
                className="sqd-textarea"
                rows={4}
                placeholder={t(
                  "questions.Q19.placeholder",
                  "Any improvements or suggestions..."
                )}
                onChange={(e) =>
                  onAnswerChange?.(
                    `answer_${extraQuestion._id}`,
                    e.target.value
                  )
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
