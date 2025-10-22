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

  // Business rules (multi-language aware):
  // - If CC1 (Q7) equals the localized "I do not know what a Citizen's Charter is" -> disable CC2 (Q8) and CC3 (Q9)
  // - If CC2 (Q8) equals the localized "Not Applicable" -> disable CC3 (Q9)
  const cc1Str = (cc1Answer || "").toString();
  const cc2Str = (cc2Answer || "").toString();

  // Pull localized option lists (fallback to provided options)
  const q7LocalizedOptions = i18n.t(`questions.Q7.options`, {
    returnObjects: true,
    defaultValue: q7?.options || [],
  });
  const q8LocalizedOptions = i18n.t(`questions.Q8.options`, {
    returnObjects: true,
    defaultValue: q8?.options || [],
  });

  // Known patterns across languages
  const DONT_KNOW_PATTERNS = [
    /i\s+do\s+not\s+know\s+what\s+a\s+citizen'?s\s+charter\s+is\.?/i, // EN exact
    /don\s*'?t\s*know/i, // EN contraction
    /hindi\s+ko\s+alam/i, // FIL
  ];
  const NA_PATTERNS = [
    /not\s*applicable/i, // EN
    /\(\s*N\/?A\s*\)/i, // (N/A)
    /hindi\s+naa+angkop/i, // FIL with multi 'a'
  ];

  const cc1IsDontKnow =
    (Array.isArray(q7LocalizedOptions) &&
      q7LocalizedOptions.some((opt) =>
        DONT_KNOW_PATTERNS.some((rx) => rx.test(String(opt)))
      ) &&
      DONT_KNOW_PATTERNS.some((rx) => rx.test(cc1Str))) ||
    DONT_KNOW_PATTERNS.some((rx) => rx.test(cc1Str));

  const cc2IsNotApplicable =
    (Array.isArray(q8LocalizedOptions) &&
      q8LocalizedOptions.some((opt) =>
        NA_PATTERNS.some((rx) => rx.test(String(opt)))
      ) &&
      NA_PATTERNS.some((rx) => rx.test(cc2Str))) ||
    NA_PATTERNS.some((rx) => rx.test(cc2Str));

  const isQ8Skipped = cc1IsDontKnow;
  const isQ9Skipped = cc1IsDontKnow || cc2IsNotApplicable;

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
                  {questionOptions.map((option, idx) => (
                    <Select.Option key={idx} value={option}>
                      {option}
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
