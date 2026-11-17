import React from "react";
import { Card, Form, Typography, Row, Col, Input } from "antd";
import angry from "../../assets/angry.gif";
import disagree from "../../assets/disagree.gif";
import neutral from "../../assets/neutral.gif";
import agree from "../../assets/agree.gif";
import superagree from "../../assets/superagree.gif";
import notapplicable from "../../assets/na.svg";
import "./stylessqdtable.css";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

// Registers a rating with the form without rendering a control. The value is
// normalised to "" so the input stays controlled from the first render —
// passing `undefined` first and a rating later made React warn about an
// uncontrolled input becoming controlled.
const HiddenValue = ({ value }) => <input type="hidden" value={value ?? ""} readOnly />;

function SQDTable({
  group = [],
  form,
  extraQuestion = null,
  onAnswerChange,
  startIndex = 1,
}) {
  const { t } = useTranslation(); // ✅ FIX: hook inside component
  // Both hooks must run before any early return, otherwise the hook order
  // changes between renders and React tears the component down.
  const formValues = Form.useWatch([], form);

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
              <span className="sqd-question-text" id={`sqd-q-${question._id}`}>
                {`${questionNumber}. ${t(
                  `questions.${question.questionCode}.text`,
                  {
                    defaultValue: question.questionText,
                  }
                )}`}
              </span>

              <Form.Item name={fieldName} noStyle>
                <HiddenValue />
              </Form.Item>

              <div
                className="rating-group"
                role="group"
                aria-labelledby={`sqd-q-${question._id}`}
              >
                {ratingOptions.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    className={`rating-box ${
                      selected === opt.value ? "selected" : ""
                    }`}
                    aria-pressed={selected === opt.value}
                    onClick={() => handleRatingClick(fieldName, opt.value)}
                  >
                    <img src={opt.icon} alt="" className="rating-icon" />
                    <span className="rating-label">{opt.label}</span>
                  </button>
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
              <Input.TextArea
                className="sqd-textarea"
                autoSize={{ minRows: 3, maxRows: 8 }}
                maxLength={1000}
                showCount
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
