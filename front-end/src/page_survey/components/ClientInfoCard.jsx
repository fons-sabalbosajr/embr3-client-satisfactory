// src/page-survey/components/ClientInfoCard.jsx
import React, { useEffect } from "react";
import { Form, Input, Radio, Select, Space, Row, Col, Typography } from "antd";
import socket from "../../utils/socket";
import "./stylesclientinfocard.css";
import { useTranslation } from "react-i18next";
import { isEqual } from "lodash";

function ClientInfoCard({ formItemName, form, options, language }) {
  const { genderOptions, region, agency, serviceOptions } = options;
  const { Text } = Typography;
  const { t } = useTranslation();

  const customerTypeOptions = [
    { value: "Citizen", label: t("clientTypeCitizen") },
    { value: "Business", label: t("clientTypeBusiness") },
    { value: "Government", label: t("clientTypeGovernment") },
  ];

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
        label={t("clientTypeLabel")}
        rules={[{ required: true, message: t("selectClientType") }]}
      >
        <Radio.Group>
          <Space direction="vertical" className="client-info-card-radio-space">
            {customerTypeOptions.map(({ value, label }) => (
              <div key={value}>
                <Radio value={value}>{label}</Radio>

                {form.getFieldValue(`${formItemName}_customerType`) === "Business" &&
                  value === "Business" && (
                    <Form.Item
                      name={`${formItemName}_companyName`}
                      noStyle
                      rules={[
                        { required: true, message: t("enterCompanyName") },
                      ]}
                    >
                      <Input
                        placeholder={t("companyNamePlaceholder")}
                        className="client-info-card-dynamic-input"
                      />
                    </Form.Item>
                  )}

                {form.getFieldValue(`${formItemName}_customerType`) === "Government" &&
                  value === "Government" && (
                    <Form.Item
                      name={`${formItemName}_agencyName`}
                      noStyle
                      rules={[
                        { required: true, message: t("enterAgencyName") },
                      ]}
                    >
                      <Input
                        placeholder={t("agencyPlaceholder")}
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
          <Form.Item name={`${formItemName}_age`} label={t("ageLabel")}>
            <Input type="number" placeholder={t("agePlaceholder")} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            name={`${formItemName}_gender`}
            label={t("genderLabel")}
            rules={[{ required: true, message: t("selectGender") }]}
          >
            <Select placeholder={t("selectGender")}>
              {genderOptions.map((g) => (
                <Select.Option key={g} value={g}>
                  {t(`gender.${g}`)}
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
            label={t("regionLabel")}
          >
            <Input disabled />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item
            name={`${formItemName}_agency`}
            label={t("agencyLabel")}
          >
            <Input disabled />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <div className="client-info-card-note">
            <span className="client-info-card-note-text">
              {t("regionAgencyNote")}
            </span>
          </div>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={24}>
          <Form.Item
            name={`${formItemName}_serviceAvailed`}
            label={t("serviceAvailedLabel")}
            rules={[{ required: true, message: t("selectService") }]}
          >
            <Select
              placeholder={t("selectServicePlaceholder")}
              mode="multiple"
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
