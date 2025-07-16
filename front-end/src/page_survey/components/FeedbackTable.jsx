import React, { useEffect } from "react";
import { Form, Typography, Select, Space } from "antd";

const { Title, Text } = Typography;

function FeedbackTable({ questions }) {
  const form = Form.useFormInstance();

  const q7 = questions.find((q) => q.questionCode === "Q7");
  const q8 = questions.find((q) => q.questionCode === "Q8");
  const q9 = questions.find((q) => q.questionCode === "Q9");

  const cc1Answer = Form.useWatch(`answer_${q7?._id}`, { form });
  const cc2Answer = Form.useWatch(`answer_${q8?._id}`, { form });

  const isQ8Skipped = cc1Answer?.toLowerCase().includes("no");
  const isQ9Skipped =
    cc1Answer?.toLowerCase().includes("no") ||
    cc2Answer?.toLowerCase().includes("no");

  // Clear Q8 when skipped
  useEffect(() => {
    if (isQ8Skipped && q8) {
      form.setFieldsValue({ [`answer_${q8._id}`]: undefined });
    }
  }, [isQ8Skipped, q8?._id, form]);

  // Clear Q9 when skipped
  useEffect(() => {
    if (isQ9Skipped && q9) {
      form.setFieldsValue({ [`answer_${q9._id}`]: undefined });
    }
  }, [isQ9Skipped, q9?._id, form]);

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Title level={5}>Citizens Charter</Title>

      {questions.map((q) => {
        const formItemName = `answer_${q._id}`;
        let isDisabled = false;

        if (q.questionCode === "Q8") isDisabled = isQ8Skipped;
        if (q.questionCode === "Q9") isDisabled = isQ9Skipped;

        return (
          <div
            key={q._id}
            style={{
              opacity: isDisabled ? 0.5 : 1,
              pointerEvents: isDisabled ? "none" : "auto",
            }}
          >
            <Form.Item
              name={formItemName}
              label={
                <Text
                  style={{
                    fontSize: "20px",
                    color: isDisabled ? "#888" : undefined,
                  }}
                >
                  {q.questionText}
                </Text>
              }
              rules={
                isDisabled
                  ? [] // No validation if disabled
                  : [{ required: true, message: "Please select an answer." }]
              }
            >
              <Select
                placeholder="Select an option"
                disabled={isDisabled}
                style={{ fontSize: "14px", height: "45px" }}
              >
                {q.options.map((opt) => (
                  <Select.Option key={opt} value={opt}>
                    {opt}
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
