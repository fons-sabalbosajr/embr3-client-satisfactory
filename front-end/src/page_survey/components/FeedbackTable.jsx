import React, { useEffect } from "react";
import { Form, Typography, Select, Space } from "antd";
import { useTranslation } from "react-i18next";
import "./stylesfeedbacktable.css";
import i18n from "../../i18n";

const { Title, Text } = Typography;

function FeedbackTable({ questions, language }) {
  const form = Form.useFormInstance();
  const { t, i18n } = useTranslation();

  const q7 = questions.find((q) => q.questionCode === "Q7");
  const q8 = questions.find((q) => q.questionCode === "Q8");
  const q9 = questions.find((q) => q.questionCode === "Q9");

  const cc1Answer = Form.useWatch(`answer_${q7?._id}`, { form });
  const cc2Answer = Form.useWatch(`answer_${q8?._id}`, { form });

  const isQ8Skipped = cc1Answer?.toLowerCase().includes("no");
  const isQ9Skipped =
    cc1Answer?.toLowerCase().includes("no") ||
    cc2Answer?.toLowerCase().includes("no");

  useEffect(() => {
    if (isQ8Skipped && q8) {
      form.setFieldsValue({ [`answer_${q8._id}`]: undefined });
    }
  }, [isQ8Skipped, q8?._id, form]);

  useEffect(() => {
    if (isQ9Skipped && q9) {
      form.setFieldsValue({ [`answer_${q9._id}`]: undefined });
    }
  }, [isQ9Skipped, q9?._id, form]);

  useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language).then(() => {
        // Trigger rerender by updating a dummy state
        form.setFieldsValue({ _langRerenderHack: Date.now() });
      });
    }
  }, [language]);

  return (
    <Space direction="vertical" className="feedback-table-wrapper">
      <Title level={5}>{t("citizensCharterTitle", "Citizens Charter")}</Title>

      {questions.map((q) => {
        const formItemName = `answer_${q._id}`;
        let isDisabled = false;

        if (q.questionCode === "Q8") isDisabled = isQ8Skipped;
        if (q.questionCode === "Q9") isDisabled = isQ9Skipped;

        const itemClass = isDisabled
          ? "feedback-form-item disabled"
          : "feedback-form-item";

        const labelClass = isDisabled
          ? "feedback-label disabled"
          : "feedback-label";

        const questionText = t(`questions.${q.questionCode}.text`, {
          defaultValue: q.questionText,
        });

        const questionOptions = t(`questions.${q.questionCode}.options`, {
          returnObjects: true,
          defaultValue: q.options,
        });

        return (
          <div key={q._id} className={itemClass}>
            <Form.Item
              name={formItemName}
              label={
                <Text className={labelClass} style={{ fontSize: 18 }}>
                  {questionText}
                </Text>
              }
              rules={
                isDisabled
                  ? []
                  : [{ required: true, message: t("selectRequired") }]
              }
            >
              <Select
                placeholder={t("selectAnswerPlaceholder")}
                disabled={isDisabled}
                className="feedback-select"
              >
                {q.options.map((option, idx) => (
                  <Select.Option key={idx} value={option}>
                    {questionOptions[idx] || option}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>
        );
      })}
    </Space>
  );
}

export default FeedbackTable;
