// src/page-survey/components/ClientInfoCard.jsx
import React, { useEffect, useMemo } from "react";
import { Form, Input, Radio, Select, Space, Row, Col, Typography } from "antd";
import socket from "../../utils/socket";
import "./stylesclientinfocard.css";
import { useTranslation } from "react-i18next";
import { isEqual } from "lodash";
import { getDecryptedItem, setEncryptedItem } from "../../utils/encryptedStorage";
import { getServiceCategories } from "../../services/api";

function ClientInfoCard({ formItemName, form, options, isInternalSurvey = false }) {
  let { genderOptions, serviceOptions } = options;
  // Ensure 'RatherNotSay' is always present
  if (!genderOptions.includes('RatherNotSay')) {
    genderOptions = [...genderOptions, 'RatherNotSay'];
  }
  // Ensure 'LGBTQ++' is always present
  if (!genderOptions.includes('LGBTQ++')) {
    genderOptions = [...genderOptions.filter(g => g !== 'RatherNotSay'), 'LGBTQ++', 'RatherNotSay'];
  }
  const { Text } = Typography;
  const { t } = useTranslation();

  // For internal survey, auto-set to Government
  useEffect(() => {
    if (isInternalSurvey) {
      form.setFieldsValue({
        [`${formItemName}_customerType`]: "Government",
        [`${formItemName}_agencyName`]: "EMB Region III",
      });
    }
  }, [isInternalSurvey, form, formItemName]);

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

  const customerType = form.getFieldValue(`${formItemName}_customerType`);

  // Fetch service category mappings from the server
  const [svcCatMap, setSvcCatMap] = React.useState({ internal: new Set(), external: new Set() });
  useEffect(() => {
    let cancelled = false;
    getServiceCategories()
      .then((res) => {
        if (cancelled) return;
        const list = res.data?.data || [];
        const toKey = (s) => String(s || '').trim().toLowerCase();
        const intSet = new Set(list.filter((x) => x.type === 'internal').map((x) => toKey(x.name)));
        const extSet = new Set(list.filter((x) => x.type === 'external').map((x) => toKey(x.name)));
        setSvcCatMap({ internal: intSet, external: extSet });
      })
      .catch(() => { /* non-fatal */ });
    return () => { cancelled = true; };
  }, []);

  // Group and filter service options based on survey type (internal/external)
  const groupedServiceOptions = useMemo(() => {
    const toKey = (s) => String(s || '').trim().toLowerCase();
    const toOptions = (list) => (list || []).map((s) => ({ label: s, value: s }));

    const internal = [];
    const external = [];
    const other = [];
    (serviceOptions || []).forEach((opt) => {
      const k = toKey(opt);
      if (svcCatMap.internal.has(k)) internal.push(opt);
      else if (svcCatMap.external.has(k)) external.push(opt);
      else other.push(opt);
    });

    // Filter by survey type
    if (isInternalSurvey) {
      // Internal survey → show only internal services
      if (internal.length) return toOptions(internal);
      // Fallback: if no categories are mapped yet, show all
      return toOptions(serviceOptions || []);
    }
    // External survey → show only external services
    if (external.length) return toOptions(external);
    // Fallback
    return toOptions(serviceOptions || []);
  }, [serviceOptions, svcCatMap, isInternalSurvey]);

  // Prefill and persist assisted personnel name across sessions
  useEffect(() => {
    try {
      const saved = getDecryptedItem("assistPersonnelName");
      const fieldKey = `${formItemName}_assistPersonnel`;
      const current = form.getFieldValue(fieldKey);
      if (saved && !current) {
        form.setFieldsValue({ [fieldKey]: saved });
      }
    } catch {
      // ignore
    }
  }, [form, formItemName]);

  return (
    <Space direction="vertical" className="client-info-card-space">
      {isInternalSurvey && (
        <div className="client-info-card-internal-badge">
          <Text strong style={{ color: "#0284c7" }}>
            {t("internalSurveyBadge", "Internal Survey — EMB Region III Employee")}
          </Text>
        </div>
      )}

      <Form.Item
        name={`${formItemName}_customerType`}
        label={t("clientTypeLabel")}
        rules={[{ required: true, message: t("selectClientType") }]}
      >
        <Radio.Group disabled={isInternalSurvey}>
          <Space direction="vertical" className="client-info-card-radio-space">
            {customerTypeOptions.map(({ value, label }) => (
              <div key={value}>
                <Radio value={value}>{label}</Radio>
                {customerType === "Business" && value === "Business" && !isInternalSurvey && (
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
                {customerType === "Government" && value === "Government" && (
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
                      disabled={isInternalSurvey}
                    />
                  </Form.Item>
                )}
              </div>
            ))}
          </Space>
        </Radio.Group>
      </Form.Item>

      {isInternalSurvey && (
        <Form.Item
          name={`${formItemName}_employeeName`}
          label={t("employeeName.label", "Employee Name (Optional)")}
          rules={[{ required: false }]}
        >
          <Input placeholder={t("employeeName.placeholder", "Enter your name (optional)")} />
        </Form.Item>
      )}

      {(customerType === "Citizen" || !customerType) && (
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
              <Select placeholder={t("selectGender")} popupClassName="survey-select-dropdown"> 
                {genderOptions.map((g) => (
                  <Select.Option key={g} value={g}>
                    {t(`gender.${g}`)}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      )}

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
        <Col xs={24} sm={12}>
          <Form.Item
            name={`${formItemName}_assistPersonnel`}
            label={t('assistPersonnel.label') || 'Assisted Personnel Name'}
            rules={[{ required: false }]}
          >
            <Input
              placeholder={t('assistPersonnel.placeholder') || 'Enter name of personnel who assisted you'}
              onChange={(e) => {
                try {
                  setEncryptedItem("assistPersonnelName", e.target.value || "");
                } catch {
                  // ignore
                }
              }}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            name={`${formItemName}_serviceAvailed`}
            label={t("serviceAvailedLabel")}
            rules={[{ required: true, message: t("selectService") }]}
          >
            <Select
              placeholder={t("selectServicePlaceholder")}
              mode="multiple"
              allowClear
              options={groupedServiceOptions}
              showSearch
              optionFilterProp="label"
              popupClassName="survey-select-dropdown"
            />
          </Form.Item>
        </Col>
      </Row>
    </Space>
  );
}

export default ClientInfoCard;
