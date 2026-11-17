// src/page-survey/components/ClientInfoCard.jsx
import React, { useEffect, useMemo } from "react";
import { AutoComplete, Form, Input, Radio, Select, Row, Col, Typography } from "antd";
import {
  UserOutlined,
  ShopOutlined,
  BankOutlined,
  ExperimentOutlined,
} from "@ant-design/icons";
import socket from "../../utils/socket";
import "./stylesclientinfocard.css";
import { useTranslation } from "react-i18next";
import { isEqual } from "lodash";
import { getDecryptedItem, setEncryptedItem } from "../../utils/encryptedStorage";
import { getAssistPersonnel, getServiceCategories } from "../../services/api";
import {
  ANALYSIS_RESULT_TYPE_FIELD,
  ANALYSIS_CONTROL_NUMBER_FIELD,
  includesAnalysisService,
} from "../constants/surveyMeta";

const { Text } = Typography;

function ClientInfoCard({ formItemName, form, options, isInternalSurvey = false }) {
  let { genderOptions, serviceOptions } = options;
  // Ensure 'LGBTQ++' and 'RatherNotSay' are always present, in that order.
  genderOptions = [
    ...genderOptions.filter((g) => g !== "LGBTQ++" && g !== "RatherNotSay"),
    "LGBTQ++",
    "RatherNotSay",
  ];
  const { t } = useTranslation();

  const field = (name) => `${formItemName}_${name}`;
  const analysisField = field(ANALYSIS_RESULT_TYPE_FIELD);
  const controlNumberField = field(ANALYSIS_CONTROL_NUMBER_FIELD);

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
    { value: "Citizen", label: t("clientTypeCitizen"), icon: <UserOutlined /> },
    { value: "Business", label: t("clientTypeBusiness"), icon: <ShopOutlined /> },
    { value: "Government", label: t("clientTypeGovernment"), icon: <BankOutlined /> },
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

  const customerType = Form.useWatch(field("customerType"), form);
  const selectedServices = Form.useWatch(field("serviceAvailed"), form);
  const needsAnalysisType = includesAnalysisService(selectedServices);

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
    (serviceOptions || []).forEach((opt) => {
      const k = toKey(opt);
      if (svcCatMap.internal.has(k)) internal.push(opt);
      else if (svcCatMap.external.has(k)) external.push(opt);
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

  // Removing "Analysis of Environmental Samples" must also drop the follow-up
  // answer, otherwise a stale value would still be submitted (the form keeps
  // values of unmounted fields).
  const handleServicesChange = (value) => {
    if (includesAnalysisService(value)) return;
    if (form.getFieldValue(analysisField)) form.setFieldValue(analysisField, undefined);
    if (form.getFieldValue(controlNumberField)) form.setFieldValue(controlNumberField, undefined);
  };

  // Names past clients entered as the personnel who assisted them. Offered as
  // suggestions only — the client can still type any name.
  const [personnelNames, setPersonnelNames] = React.useState([]);
  useEffect(() => {
    let cancelled = false;
    getAssistPersonnel()
      .then((res) => {
        if (cancelled) return;
        const names = Array.isArray(res.data?.names) ? res.data.names : [];
        setPersonnelNames(names.map((n) => ({ value: n })));
      })
      .catch(() => { /* suggestions are optional */ });
    return () => { cancelled = true; };
  }, []);

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

  const optionalTag = (
    <span className="client-info-optional">{t("clientInfo.optional", "Optional")}</span>
  );

  return (
    <div className="client-info-card">
      {isInternalSurvey && (
        <div className="client-info-card-internal-badge">
          <Text strong>
            {t("internalSurveyBadge", "Internal Survey — EMB Region III Employee")}
          </Text>
        </div>
      )}

      {/* ── Office visited (auto-filled) ── */}
      <section className="client-info-section client-info-section--muted">
        <h4 className="client-info-section-title">
          {t("clientInfo.autoFilled", "Office visited")}
        </h4>
        <Row gutter={[16, 0]}>
          <Col xs={24} sm={12}>
            <Form.Item name={field("region")} label={t("regionLabel")}>
              <Input readOnly tabIndex={-1} className="client-info-readonly" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name={field("agency")} label={t("agencyLabel")}>
              <Input readOnly tabIndex={-1} className="client-info-readonly" />
            </Form.Item>
          </Col>
        </Row>
        <Text className="client-info-note">{t("regionAgencyNote")}</Text>
      </section>

      {/* ── About you ── */}
      <section className="client-info-section">
        <h4 className="client-info-section-title">
          {t("clientInfo.aboutYou", "About you")}
        </h4>

        <Form.Item
          name={field("customerType")}
          label={t("clientTypeLabel")}
          rules={[{ required: true, message: t("selectClientType") }]}
        >
          <Radio.Group disabled={isInternalSurvey} className="client-type-group">
            {customerTypeOptions.map(({ value, label, icon }) => (
              <Radio key={value} value={value} className="client-type-option">
                <span className="client-type-option-icon" aria-hidden="true">
                  {icon}
                </span>
                <span className="client-type-option-label">{label}</span>
              </Radio>
            ))}
          </Radio.Group>
        </Form.Item>

        {customerType === "Business" && !isInternalSurvey && (
          <Form.Item
            name={field("companyName")}
            label={t("clientInfo.companyNameLabel", "Company / Establishment Name")}
            rules={[{ required: true, whitespace: true, message: t("enterCompanyName") }]}
          >
            <Input placeholder={t("companyNamePlaceholder")} maxLength={200} autoComplete="organization" />
          </Form.Item>
        )}

        {customerType === "Government" && (
          <Form.Item
            name={field("agencyName")}
            label={t("clientInfo.agencyNameLabel", "Agency Name")}
            rules={[{ required: true, whitespace: true, message: t("enterAgencyName") }]}
          >
            <Input
              placeholder={t("agencyPlaceholder")}
              disabled={isInternalSurvey}
              maxLength={200}
              autoComplete="organization"
            />
          </Form.Item>
        )}

        {isInternalSurvey && (
          <Form.Item
            name={field("employeeName")}
            label={
              <>
                {t("summaryLabels.employeeName", "Employee Name")} {optionalTag}
              </>
            }
          >
            <Input
              placeholder={t("employeeName.placeholder", "Enter your name (optional)")}
              maxLength={120}
              autoComplete="name"
            />
          </Form.Item>
        )}

        {(customerType === "Citizen" || !customerType) && (
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name={field("age")}
                label={
                  <>
                    {t("ageLabel")} {optionalTag}
                  </>
                }
                rules={[
                  {
                    validator: (_, v) =>
                      v === undefined || v === null || v === "" || (Number(v) >= 1 && Number(v) <= 120)
                        ? Promise.resolve()
                        : Promise.reject(new Error(t("ageInvalid", "Enter a valid age (1–120)."))),
                  },
                ]}
              >
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={120}
                  placeholder={t("agePlaceholder")}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name={field("gender")}
                label={t("genderLabel")}
                rules={[{ required: true, message: t("selectGender") }]}
              >
                <Select
                  placeholder={t("selectGender")}
                  classNames={{ popup: { root: "survey-select-dropdown" } }}
                  options={genderOptions.map((g) => ({ value: g, label: t(`gender.${g}`) }))}
                />
              </Form.Item>
            </Col>
          </Row>
        )}
      </section>

      {/* ── Service availed ── */}
      <section className="client-info-section">
        <h4 className="client-info-section-title">
          {t("clientInfo.serviceSection", "Service availed")}
        </h4>

        <Form.Item
          name={field("serviceAvailed")}
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
            classNames={{ popup: { root: "survey-select-dropdown survey-service-dropdown" } }}
            listHeight={320}
            onChange={handleServicesChange}
            className="client-info-service-select"
          />
        </Form.Item>

        {needsAnalysisType && (
          <div className="client-info-followup" role="group" aria-label={t("analysisResultType.groupLabel", "Analysis of Environmental Samples")}>
            <p className="client-info-followup-head">
              <ExperimentOutlined aria-hidden="true" />
              <span>{t("analysisResultType.help")}</span>
            </p>
            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  name={analysisField}
                  label={t("analysisResultType.label", "Type of Result of Analyses")}
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: t("analysisResultType.required"),
                    },
                  ]}
                >
                  <Input
                    placeholder={t("analysisResultType.placeholder")}
                    maxLength={200}
                    autoFocus
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name={controlNumberField}
                  label={
                    <>
                      {t("analysisControlNumber.label", "Control Number")} {optionalTag}
                    </>
                  }
                >
                  <Input
                    placeholder={t("analysisControlNumber.placeholder", "Control number on your result of analysis")}
                    maxLength={60}
                    autoComplete="off"
                    autoCapitalize="characters"
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>
        )}

        <Form.Item
          name={field("assistPersonnel")}
          label={
            <>
              {t("assistPersonnel.label", "Assisted Personnel Name")} {optionalTag}
            </>
          }
          extra={personnelNames.length ? t("assistPersonnel.hint", "Start typing to see names from past surveys.") : undefined}
        >
          <AutoComplete
            options={personnelNames}
            filterOption={(input, option) =>
              String(option?.value || "").toLowerCase().includes(String(input || "").trim().toLowerCase())
            }
            placeholder={t("assistPersonnel.placeholder", "Enter name of personnel who assisted you")}
            maxLength={200}
            allowClear
            backfill
            classNames={{ popup: { root: "survey-select-dropdown" } }}
            onChange={(value) => {
              try {
                setEncryptedItem("assistPersonnelName", value || "");
              } catch {
                // ignore
              }
            }}
          />
        </Form.Item>
      </section>
    </div>
  );
}

export default ClientInfoCard;
