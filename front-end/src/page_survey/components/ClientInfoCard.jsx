// src/page-survey/components/ClientInfoCard.jsx
import React, { useEffect, useState } from "react";
import { Form, Input, Radio, Select, Space, Row, Col, Typography } from "antd";
import { getQuestions } from "../../services/api";
import "./styles.css";

function ClientInfoCard({ formItemName, form, options }) {
  const { customerTypeOptions, genderOptions, region, agency, serviceOptions } =
    options;
  const { Text } = Typography;

  const dynamicInputStyle = {
    marginTop: 8,
    width: 300,
    marginLeft: 36,
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Form.Item
        name={`${formItemName}_customerType`}
        label="Client Type"
        rules={[{ required: true, message: "Select client type" }]}
      >
        <Radio.Group>
          <Space direction="vertical">
            {customerTypeOptions.map((type) => (
              <div key={type}>
                <Radio value={type}>{type}</Radio>

                {form.getFieldValue(`${formItemName}_customerType`) ===
                  "Business" &&
                  type === "Business" && (
                    <Form.Item
                      name={`${formItemName}_companyName`}
                      noStyle
                      rules={[
                        { required: true, message: "Enter company name" },
                      ]}
                    >
                      <Input
                        placeholder="Company Name"
                        style={dynamicInputStyle}
                      />
                    </Form.Item>
                  )}

                {form.getFieldValue(`${formItemName}_customerType`) ===
                  "Government" &&
                  type === "Government" && (
                    <Form.Item
                      name={`${formItemName}_agencyName`}
                      noStyle
                      rules={[{ required: true, message: "Enter agency" }]}
                    >
                      <Input placeholder="Agency" style={dynamicInputStyle} />
                    </Form.Item>
                  )}
              </div>
            ))}
          </Space>
        </Radio.Group>
      </Form.Item>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item name={`${formItemName}_age`} label="Age">
            <Input type="number" placeholder="Enter age" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            name={`${formItemName}_gender`}
            label="Gender"
            rules={[{ required: true, message: "Select gender" }]}
          >
            <Select placeholder="Select gender">
              {genderOptions.map((g) => (
                <Select.Option key={g} value={g}>
                  {g}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16} align="middle">
        <Col xs={24} sm={8}>
          <Form.Item
            name={`${formItemName}_region`}
            label="Region"
            initialValue={region}
          >
            <Input disabled />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item
            name={`${formItemName}_agency`}
            label="Agency"
            initialValue={agency}
          >
            <Input disabled />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <div style={{ paddingTop: 25 }}>
            <Text type="secondary" style={{ fontSize: "12px", color: "gray" }}>
              Region and agency are pre-filled automatically.
            </Text>
          </div>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={24}>
          <Form.Item
            name={`${formItemName}_serviceAvailed`}
            label="Service Availed"
            rules={[{ required: true, message: "Select service" }]}
          >
            <Select
    placeholder="Select service(s)"
    mode="multiple" // ✅ Enables multiple selection
    allowClear
  >
    {serviceOptions.map((service) => (
      <Select.Option key={service} value={service}>
        {service}
      </Select.Option>
    ))}
  </Select>
          </Form.Item>
        </Col>
      </Row>
    </Space>
  );
}

export default ClientInfoCard;
