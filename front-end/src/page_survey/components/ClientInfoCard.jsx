// src/page-survey/components/ClientInfoCard.jsx
import React, { useEffect } from "react";
import { Form, Input, Radio, Select, Space, Row, Col, Typography } from "antd";
import socket from "../../utils/socket";
import "./stylesclientinfocard.css";
import { isEqual } from "lodash";

function ClientInfoCard({ formItemName, form, options }) {
  const { customerTypeOptions, genderOptions, region, agency, serviceOptions } = options;
  const { Text } = Typography;

  useEffect(() => {
    const lastPayloadRef = { current: null };

    const interval = setInterval(() => {
      const values = form.getFieldsValue();
      const clientType = values[`${formItemName}_customerType`];
      const companyName = values[`${formItemName}_companyName`] || "";
      const agencyVal = values[`${formItemName}_agency`] || "";
      const regionVal = values[`${formItemName}_region`] || "";

      if (!clientType) return;

      const payload = {
        clientType,
        companyName,
        agency: agencyVal,
        region: regionVal,
        startedAt: new Date().toISOString(),
      };

      if (!isEqual(payload, lastPayloadRef.current)) {
        lastPayloadRef.current = payload;
        socket.emit("feedback-incoming", payload);
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      socket.emit("feedback-leave");
    };
  }, [form, formItemName]);

  return (
    <Space direction="vertical" className="client-info-card-space">
      <Form.Item
        name={`${formItemName}_customerType`}
        label="Client Type"
        rules={[{ required: true, message: "Select client type" }]}
      >
        <Radio.Group>
          <Space direction="vertical" className="client-info-card-radio-space">
            {customerTypeOptions.map((type) => (
              <div key={type}>
                <Radio value={type}>{type}</Radio>

                {form.getFieldValue(`${formItemName}_customerType`) === "Business" &&
                  type === "Business" && (
                    <Form.Item
                      name={`${formItemName}_companyName`}
                      noStyle
                      rules={[{ required: true, message: "Enter company name" }]}
                    >
                      <Input
                        placeholder="Company Name"
                        className="client-info-card-dynamic-input"
                      />
                    </Form.Item>
                  )}

                {form.getFieldValue(`${formItemName}_customerType`) === "Government" &&
                  type === "Government" && (
                    <Form.Item
                      name={`${formItemName}_agencyName`}
                      noStyle
                      rules={[{ required: true, message: "Enter agency" }]}
                    >
                      <Input
                        placeholder="Agency"
                        className="client-info-card-dynamic-input"
                      />
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
          <div className="client-info-card-note">
            <span className="client-info-card-note-text">
              Region and agency are pre-filled automatically.
            </span>
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
            <Select placeholder="Select service(s)" mode="multiple" allowClear>
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
