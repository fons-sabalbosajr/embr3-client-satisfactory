import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Table,
  Space,
  Typography,
  Button,
  Tag,
  message,
  Form,
  DatePicker,
  Select,
  Divider,
} from "antd";
import * as api from "../../../services/api";
import { exportToExcelFile } from "../../../utils/excelExport";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import {
  categorizeServices,
  EXTERNAL_SERVICES,
  INTERNAL_SERVICES,
} from "../../../utils/serviceCategories";
import "./generatereport.css";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  Legend as ReLegend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from "recharts";

// Small reusable tooltip for Recharts to match Ant Design card styling
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  return (
    <div className="gr-chart-tooltip">
      <div className="gr-chart-tooltip-label">{label}</div>
      <div className="gr-chart-tooltip-value">{p.value}</div>
    </div>
  );
};

const roundPx = 6; // small radius for bar corners
// Color palette for services (distinct, professional colors)
const SERVICE_PALETTE = [
  "#1652f0",
  "#1aa3a3",
  "#ff7a45",
  "#9254de",
  "#ffa940",
  "#13c2c2",
  "#52c41a",
  "#fa8c16",
  "#1890ff",
  "#f5222d",
  "#2f54eb",
  "#a0d911",
  "#f759ab",
  "#722ed1",
  "#ff85c0",
];

const { Title, Text } = Typography;

// Service classification will reuse the shared categorizeServices utility,
// which reads Vite env lists and falls back gracefully.

// Normalizers from Dashboard patterns
function normalizeCcAnswer(val) {
  if (!val || typeof val !== "string") return null;
  const s = val.trim().toLowerCase();
  if (s === "yes" || s === "y" || /\byes\b/i.test(val)) return "Yes";
  if (s === "no" || s === "n" || /\bno\b/i.test(val)) return "No";
  const cleaned = s.replace(/[^a-z]/g, "");
  if (cleaned === "na" || cleaned === "notapplicable") return "N/A";
  if (s === "n/a" || s === "n.a" || s === "n a") return "N/A";
  if (s.includes("skip question")) return "N/A";
  return null;
}

function normalizeSqdAnswer(val) {
  if (!val || typeof val !== "string") return null;
  const s = val.trim();
  if (/^satisfactory$/i.test(s)) return "Neutral";
  if (/^neither\s+agree\s+nor\s+disagree$/i.test(s)) return "Neutral";
  if (/^n\/?a$/i.test(s)) return "N/A";
  return s;
}

// Export helpers
function exportToExcel(filename, rows) {
  exportToExcelFile(filename, rows, "Report");
}

function exportToPdf(title, headers, bodyRows, filename) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, 40, 40);
  autoTable(doc, {
    startY: 60,
    head: [headers],
    body: bodyRows,
    styles: { font: "helvetica", fontSize: 9, cellPadding: 6 },
    headStyles: {
      fillColor: [22, 119, 255],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    theme: "grid",
    margin: { left: 40, right: 40 },
  });
  doc.save(filename);
}

export default function GenerateReport() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [surveys, setSurveys] = useState([]);
  const [filters, setFilters] = useState({
    dateRange: null, // [dayjs, dayjs]
    regions: [], // multi
    customerTypes: [], // multi
    agencies: [], // multi
    services: [], // multi
  });

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const res = await api.getClientSatisfactoryData();
        const data = Array.isArray(res?.data) ? res.data : [];
        setSurveys(data);
      } catch (e) {
        console.error("Failed to load survey data for report:", e);
        message.error("Failed to load data for Generate Report");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Derive unique option lists for filters
  const { regionOptions, customerTypeOptions, agencyOptions, serviceOptions } =
    useMemo(() => {
      const regions = new Set();
      const customerTypes = new Set();
      const agencies = new Set();
      const services = new Set();
      surveys.forEach((entry) => {
        const labeled = entry.answersLabeled || {};
        const region = labeled["Region"]; if (region) regions.add(region);
        const ct = labeled["Customer Type"]; if (ct) customerTypes.add(ct);
        const agency =
          labeled["Company Name"] ||
          labeled["Unknown Question (merged_customer_age_gender_question_agencyName)"] ||
          labeled["Agency"] ||
          null;
        if (agency) agencies.add(agency);
        const svc = Array.isArray(labeled["Service Availed"]) ? labeled["Service Availed"] : [];
        svc.forEach((s) => { if (s) services.add(s); });
      });
      return {
        regionOptions: Array.from(regions).sort(),
        customerTypeOptions: Array.from(customerTypes).sort(),
        agencyOptions: Array.from(agencies).sort(),
        serviceOptions: Array.from(services).sort(),
      };
    }, [surveys]);

  // Helper to get agency/company label
  const getAgency = (entry) => {
    const labeled = entry.answersLabeled || {};
    return (
      labeled["Company Name"] ||
      labeled["Unknown Question (merged_customer_age_gender_question_agencyName)"] ||
      labeled["Agency"] ||
      "—"
    );
  };

  // Apply filters to surveys
  const filteredSurveys = useMemo(() => {
    const { dateRange, regions, customerTypes, agencies, services } = filters;
    return surveys.filter((entry) => {
      const labeled = entry.answersLabeled || {};
      // Date filter
      if (dateRange && Array.isArray(dateRange) && dateRange[0] && dateRange[1]) {
        const d = dayjs(entry.submittedAt);
        if (!d.isValid()) return false;
        // inclusive range
        const start = dateRange[0].startOf("day");
        const end = dateRange[1].endOf("day");
        if (d.isBefore(start) || d.isAfter(end)) return false;
      }
      // Region
      if (regions?.length) {
        const region = labeled["Region"];
        if (!region || !regions.includes(region)) return false;
      }
      // Customer Type
      if (customerTypes?.length) {
        const ct = labeled["Customer Type"];
        if (!ct || !customerTypes.includes(ct)) return false;
      }
      // Agency/Company
      if (agencies?.length) {
        const ag = getAgency(entry);
        if (!ag || !agencies.includes(ag)) return false;
      }
      // Service Availed (any match)
      if (services?.length) {
        const svcArr = Array.isArray(labeled["Service Availed"]) ? labeled["Service Availed"] : [];
        if (!svcArr.some((s) => services.includes(s))) return false;
      }
      return true;
    });
  }, [surveys, filters]);

  // CC keys (align with Dashboard mapping)
  const ccKeys = useMemo(
    () => ({
      CC1: "answer_6870a4056988ee91c469a5e9",
      CC2: "answer_6870a4396988ee91c469a5f2",
      CC3: "answer_6870a4646988ee91c469a5fa",
    }),
    []
  );
  const ccMapMeta = useMemo(
    () => ({
      CC1: { code: "Q7", id: ccKeys.CC1 },
      CC2: { code: "Q8", id: ccKeys.CC2 },
      CC3: { code: "Q9", id: ccKeys.CC3 },
    }),
    [ccKeys]
  );

  // Try to map CC answers to option index using numeric prefix or keyword heuristics
  const mapCcAnswerToIndex = (qCode, answer, optionsEN, optionsFIL, optionsCurrent) => {
    if (!answer || typeof answer !== "string") return -1;
    const s = answer.trim();
    const m = s.match(/^\s*(\d+)\s*[\.)-]/); // e.g., "1.", "2)"
    if (m) {
      const n = parseInt(m[1], 10);
      const optsLen = Array.isArray(optionsCurrent) ? optionsCurrent.length : 0;
      if (n >= 1 && n <= optsLen) return n - 1;
    }
    // Fallback: try exact match across languages
    const idxEN = Array.isArray(optionsEN) ? optionsEN.indexOf(s) : -1;
    if (idxEN !== -1) return idxEN;
    const idxFIL = Array.isArray(optionsFIL) ? optionsFIL.indexOf(s) : -1;
    if (idxFIL !== -1) return idxFIL;
    const idxCur = Array.isArray(optionsCurrent) ? optionsCurrent.indexOf(s) : -1;
    if (idxCur !== -1) return idxCur;

    // Heuristic keywords per CC
    const low = s.toLowerCase();
    if (qCode === "Q7") {
      if (low.includes("do not know") || low.includes("hindi ko alam")) return 3; // option 4
      if (low.includes("only when") || low.includes("nalaman ko lang")) return 2; // option 3
      if (low.includes("did not see") || low.includes("hindi ko ito nakita")) return 1; // option 2
      if (low.includes("saw it") || low.includes("nakita ko ito") || low.includes("aware")) return 0; // option 1
    }
    if (qCode === "Q8") {
      if (low.includes("not applicable")) return 4; // N/A
      if (low.includes("not visible")) return 3;
      if (low.includes("difficult")) return 2;
      if (low.includes("somewhat")) return 1;
      if (low.includes("easy")) return 0;
    }
    if (qCode === "Q9") {
      if (low.includes("not applicable")) return 3; // N/A
      if (low.includes("did not help")) return 2;
      if (low.includes("somewhat")) return 1;
      if (low.includes("help very much") || low.includes("lubos")) return 0;
    }
    return -1;
  };

  const sqdKeys = useMemo(
    () => ({
      SQD0: "answer_6870a4e26988ee91c469a604",
      SQD1: "answer_6870a52d6988ee91c469a60d",
      SQD2: "answer_6870a5436988ee91c469a611",
      SQD3: "answer_6870a58e6988ee91c469a615",
      SQD4: "answer_6870a5c66988ee91c469a61e",
      SQD5: "answer_6870a5dd6988ee91c469a622",
      SQD6: "answer_6870a6556988ee91c469a634",
      SQD7: "answer_6870a66a6988ee91c469a638",
      SQD8: "answer_6870a67b6988ee91c469a63c",
    }),
    []
  );

  // 1) Citizens Charter Results rows
  const { ccGroups, ccRows } = useMemo(() => {
    const groups = {};
    const flatRows = [];
    ["CC1", "CC2", "CC3"].forEach((sec) => {
      const meta = ccMapMeta[sec];
      if (!meta) return;
      const qCode = meta.code;
      const key = meta.id;
      const questionText = t(`questions.${qCode}.text`);
      const optsCurrent = t(`questions.${qCode}.options`, { returnObjects: true });
      const optsEN = t(`questions.${qCode}.options`, { lng: "en", returnObjects: true });
      const optsFIL = t(`questions.${qCode}.options`, { lng: "fil", returnObjects: true });
      const options = Array.isArray(optsCurrent) ? optsCurrent : [];
      const counts = new Array(options.length).fill(0);

      filteredSurveys.forEach((s) => {
        const ans = s.answers?.[key];
        const idx = mapCcAnswerToIndex(qCode, ans, optsEN, optsFIL, optsCurrent);
        if (idx >= 0 && idx < counts.length) counts[idx] += 1;
      });
      const total = counts.reduce((a, b) => a + b, 0);
      const rows = options.map((opt, i) => ({
        key: `${sec}-${i}`,
        item: `${i + 1}. ${opt}`,
        count: counts[i] || 0,
        percentage: total ? Number(((counts[i] / total) * 100).toFixed(1)) : 0,
      }));
      groups[sec] = { questionText, rows, total };

      // build export rows with section + question context
      rows.forEach((r, i) => {
        flatRows.push({
          key: r.key,
          item: `${sec}: ${questionText}\n${r.item}`,
          count: r.count,
          percentage: r.percentage,
        });
      });
    });
    return { ccGroups: groups, ccRows: flatRows };
  }, [filteredSurveys, ccMapMeta, t, i18n.language]);

  // 2) SQD results rows
  const sqdRows = useMemo(() => {
    const rows = [];
    const order = [
      "Strongly Agree",
      "Agree",
      "Neutral",
      "Disagree",
      "Strongly Disagree",
    ];
    Object.entries(sqdKeys).forEach(([code, key]) => {
      const counts = {
        "Strongly Agree": 0,
        Agree: 0,
        Neutral: 0,
        Disagree: 0,
        "Strongly Disagree": 0,
        "N/A": 0,
      };
      filteredSurveys.forEach((s) => {
        const a = normalizeSqdAnswer(s.answers?.[key]);
        if (!a) return;
        if (Object.prototype.hasOwnProperty.call(counts, a)) counts[a] += 1;
      });
      const total = order.reduce((acc, k) => acc + counts[k], 0);
      const pctScore = total
        ? ((counts["Strongly Agree"] + counts["Agree"]) / total) * 100
        : 0;
      rows.push({
        key: code,
        type: code,
        sa: counts["Strongly Agree"],
        a: counts["Agree"],
        n: counts["Neutral"],
        d: counts["Disagree"],
        sd: counts["Strongly Disagree"],
        na: counts["N/A"],
        total,
        percentage: Number(pctScore.toFixed(1)),
      });
    });
    return rows;
  }, [filteredSurveys, sqdKeys]);

  // 3) Score Per Service Availed
  const serviceRows = useMemo(() => {
    const counter = new Map();
    let totalMentions = 0;
    filteredSurveys.forEach((s) => {
      const labeled = s.answersLabeled || {};
      const services = Array.isArray(labeled["Service Availed"])
        ? labeled["Service Availed"]
        : [];
      services.forEach((name) => {
        const key = String(name || "").trim();
        if (!key) return;
        totalMentions += 1;
        counter.set(key, (counter.get(key) || 0) + 1);
      });
    });
    const rows = Array.from(counter.entries()).map(([name, count]) => ({
      key: name,
      service: name,
      count,
      percentage: totalMentions
        ? Number(((count / totalMentions) * 100).toFixed(1))
        : 0,
    }));
    // sort by count desc
    rows.sort((a, b) => b.count - a.count);
    return rows;
  }, [filteredSurveys]);

  // 4) Respondents Profile: Gender/Sex and Customer Type
  const classifyWithFallback = (services) => {
    const base = categorizeServices(services);
    const noEnvConfigured =
      (EXTERNAL_SERVICES?.length ?? 0) === 0 &&
      (INTERNAL_SERVICES?.length ?? 0) === 0;
    const bothEmpty =
      (!base.external || base.external.length === 0) &&
      (!base.internal || base.internal.length === 0);
    if (services?.length && (noEnvConfigured || bothEmpty)) {
      // Heuristic fallback: treat common online system names as external services
      const extRegex =
        /\b(ecc|cnc|opms|hwms|cmr|coc|elr|pcl|pcp|pmpin|crs|smr|pco|pcb|online)\b/i;
      const intRegex = /\b(provision|technical|training|internal)\b/i;
      const external = [];
      const internal = [];
      (services || []).forEach((s) => {
        if (extRegex.test(s)) external.push(s);
        else if (intRegex.test(s)) internal.push(s);
      });
      return { external, internal, other: [] };
    }
    return base;
  };
  const profileGenderRows = useMemo(() => {
    const map = new Map();
    filteredSurveys.forEach((s) => {
      const labeled = s.answersLabeled || {};
      const sex =
        labeled["Sex/Gender"] ||
        labeled["Gender"] ||
        labeled["Sex"] ||
        "Unknown";
      const services = Array.isArray(labeled["Service Availed"])
        ? labeled["Service Availed"]
        : [];
      const { external = [], internal = [] } = classifyWithFallback(services);
      const hasExternal = (external || []).length > 0;
      const hasInternal = (internal || []).length > 0;
      const rec = map.get(sex) || {
        key: sex,
        gender: sex,
        external: 0,
        internal: 0,
      };
      if (hasExternal) rec.external += 1;
      if (hasInternal) rec.internal += 1;
      map.set(sex, rec);
    });
    return Array.from(map.values());
  }, [filteredSurveys]);

  const profileCustomerRows = useMemo(() => {
    const map = new Map();
    filteredSurveys.forEach((s) => {
      const labeled = s.answersLabeled || {};
      const customerType = labeled["Customer Type"] || "Unknown";
      const services = Array.isArray(labeled["Service Availed"])
        ? labeled["Service Availed"]
        : [];
      const { external = [], internal = [] } = classifyWithFallback(services);
      const hasExternal = (external || []).length > 0;
      const hasInternal = (internal || []).length > 0;
      const rec = map.get(customerType) || {
        key: customerType,
        customerType,
        external: 0,
        internal: 0,
      };
      if (hasExternal) rec.external += 1;
      if (hasInternal) rec.internal += 1;
      map.set(customerType, rec);
    });
    return Array.from(map.values());
  }, [filteredSurveys]);

  // Columns
  const ccGroupColumns = [
    {
      title: "Citizens Answers",
      dataIndex: "item",
      key: "item",
      onHeaderCell: () => ({ style: { width: "50%" } }),
      onCell: () => ({ style: { width: "50%" } }),
      render: (txt) => <div style={{ whiteSpace: "pre-wrap" }}>{txt}</div>,
    },
    {
      title: "Response Count",
      dataIndex: "count",
      key: "count",
      onHeaderCell: () => ({ style: { width: "25%" } }),
      onCell: () => ({ style: { width: "25%" } }),
      align: "center"
    },
    {
      title: "Percentage",
      dataIndex: "percentage",
      key: "percentage",
      onHeaderCell: () => ({ style: { width: "25%" } }),
      onCell: () => ({ style: { width: "25%" } }),
      render: (v) => `${v}%`,
      align: "center"
    },
  ];

  const sqdColumns = [
    {
      title: "SQD Type",
      dataIndex: "type",
      key: "type",
      render: (t) => <Text strong>{t}</Text>,
    },
    {
      title: "Strongly Agree",
      dataIndex: "sa",
      key: "sa",
      render: (v) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: "Agree",
      dataIndex: "a",
      key: "a",
      render: (v) => <Tag color="green">{v}</Tag>,
    },
    {
      title: "Neither Agree nor Disagree",
      dataIndex: "n",
      key: "n",
      render: (v) => <Tag color="orange">{v}</Tag>,
    },
    {
      title: "Disagree",
      dataIndex: "d",
      key: "d",
      render: (v) => <Tag color="red">{v}</Tag>,
    },
    {
      title: "Strongly Disagree",
      dataIndex: "sd",
      key: "sd",
      render: (v) => <Tag color="magenta">{v}</Tag>,
    },
    { title: "N/A", dataIndex: "na", key: "na" },
    { title: "Total Response", dataIndex: "total", key: "total" },
    {
      title: "Percentage Score",
      dataIndex: "percentage",
      key: "percentage",
      render: (v) => <Text strong>{v}%</Text>,
    },
  ];

  const serviceColumns = [
    { title: "Type of Service", dataIndex: "service", key: "service" },
    { title: "Response Count", dataIndex: "count", key: "count" },
    {
      title: "Percentage Score",
      dataIndex: "percentage",
      key: "percentage",
      render: (v) => `${v}%`,
    },
  ];

  const profileGenderColumns = [
    { title: "Respondent Sex/Gender", dataIndex: "gender", key: "gender" },
    {
      title: "External Service Availed Response Count",
      dataIndex: "external",
      key: "external",
    },
    {
      title: "Internal Service Availed Response Count",
      dataIndex: "internal",
      key: "internal",
    },
  ];

  const profileCustomerColumns = [
    { title: "Customer Type", dataIndex: "customerType", key: "customerType" },
    {
      title: "External Service Availed Response Count",
      dataIndex: "external",
      key: "external",
    },
    {
      title: "Internal Service Availed Response Count",
      dataIndex: "internal",
      key: "internal",
    },
  ];

  // Export handlers per section
  const onExportCcExcel = () =>
    exportToExcel(
      `cc-results-${new Date().toISOString().slice(0, 10)}.xlsx`,
      ccRows.map((r) => ({
        "Citizens Answers": r.item,
        "Response Count": r.count,
        "Percentage": `${r.percentage}%`,
      }))
    );
  const onExportSqdExcel = () =>
    exportToExcel(
      `sqd-results-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sqdRows.map((r) => ({
        "SQD Type": r.type,
        "Strongly Agree": r.sa,
        Agree: r.a,
        "Neither Agree nor Disagree": r.n,
        Disagree: r.d,
        "Strongly Disagree": r.sd,
        "N/A": r.na,
        "Total Response": r.total,
        "Percentage Score": `${r.percentage}%`,
      }))
    );
  const onExportServicesExcel = () =>
    exportToExcel(
      `services-results-${new Date().toISOString().slice(0, 10)}.xlsx`,
      serviceRows.map((r) => ({
        "Type of Service": r.service,
        "Response Count": r.count,
        "Percentage Score": `${r.percentage}%`,
      }))
    );
  const onExportGenderExcel = () =>
    exportToExcel(
      `respondents-gender-${new Date().toISOString().slice(0, 10)}.xlsx`,
      profileGenderRows.map((r) => ({
        "Respondent Sex/Gender": r.gender,
        "External Service Availed Response Count": r.external,
        "Internal Service Availed Response Count": r.internal,
      }))
    );
  const onExportCustomerExcel = () =>
    exportToExcel(
      `respondents-customer-${new Date().toISOString().slice(0, 10)}.xlsx`,
      profileCustomerRows.map((r) => ({
        "Customer Type": r.customerType,
        "External Service Availed Response Count": r.external,
        "Internal Service Availed Response Count": r.internal,
      }))
    );

  const onExportCcPdf = () => {
    exportToPdf(
      "Citizen's Charter Results",
      ["Answer", "Response Count", "Percentage"],
      ccRows.map((r) => [r.item, r.count, `${r.percentage}%`]),
      `cc-results-${new Date().toISOString().slice(0, 10)}.pdf`
    );
  };

  const onExportSqdPdf = () => {
    exportToPdf(
      "9 Service Quality Dimension Results",
      [
        "SQD Type",
        "Strongly Agree",
        "Agree",
        "Neither Agree nor Disagree",
        "Disagree",
        "Strongly Disagree",
        "N/A",
        "Total Response",
        "Percentage Score",
      ],
      sqdRows.map((r) => [
        r.type,
        r.sa,
        r.a,
        r.n,
        r.d,
        r.sd,
        r.na,
        r.total,
        `${r.percentage}%`,
      ]),
      `sqd-results-${new Date().toISOString().slice(0, 10)}.pdf`
    );
  };

  const onExportServicesPdf = () => {
    exportToPdf(
      "Score Per Service Availed",
      ["Type of Service", "Response Count", "Percentage Score"],
      serviceRows.map((r) => [r.service, r.count, `${r.percentage}%`]),
      `services-results-${new Date().toISOString().slice(0, 10)}.pdf`
    );
  };

  const onExportGenderPdf = () => {
    exportToPdf(
      "Respondents Profile (Gender/Sex)",
      ["Respondent Sex/Gender", "External Count", "Internal Count"],
      profileGenderRows.map((r) => [r.gender, r.external, r.internal]),
      `respondents-gender-${new Date().toISOString().slice(0, 10)}.pdf`
    );
  };

  const onExportCustomerPdf = () => {
    exportToPdf(
      "Respondents Profile (Customer Type)",
      ["Customer Type", "External Count", "Internal Count"],
      profileCustomerRows.map((r) => [r.customerType, r.external, r.internal]),
      `respondents-customer-${new Date().toISOString().slice(0, 10)}.pdf`
    );
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      <Card className="gr-card">
        <Title level={3} className="gr-title">
          Generate Report
        </Title>
        <Text type="secondary">
          Download report tables as Excel or PDF. Styled to match the dashboard
          color accents.
        </Text>
        <Divider style={{ margin: "12px 0" }} />
        <Form
          layout="inline"
          onFinish={() => {}}
          style={{ rowGap: 12 }}
          onReset={() =>
            setFilters({ dateRange: null, regions: [], customerTypes: [], agencies: [], services: [] })
          }
        >
          <Form.Item label="Date Range">
            <DatePicker.RangePicker
              allowEmpty={[true, true]}
              value={filters.dateRange}
              onChange={(v) => setFilters((f) => ({ ...f, dateRange: v }))}
            />
          </Form.Item>
          <Form.Item label="Region">
            <Select
              mode="multiple"
              allowClear
              showSearch
              placeholder="All"
              value={filters.regions}
              onChange={(v) => setFilters((f) => ({ ...f, regions: v }))}
              options={regionOptions.map((r) => ({ value: r, label: r }))}
              style={{ minWidth: 180 }}
            />
          </Form.Item>
          <Form.Item label="Customer Type">
            <Select
              mode="multiple"
              allowClear
              showSearch
              placeholder="All"
              value={filters.customerTypes}
              onChange={(v) => setFilters((f) => ({ ...f, customerTypes: v }))}
              options={customerTypeOptions.map((r) => ({ value: r, label: r }))}
              style={{ minWidth: 200 }}
            />
          </Form.Item>
          <Form.Item label="Agency/Company">
            <Select
              mode="multiple"
              allowClear
              showSearch
              placeholder="All"
              value={filters.agencies}
              onChange={(v) => setFilters((f) => ({ ...f, agencies: v }))}
              options={agencyOptions.map((r) => ({ value: r, label: r }))}
              style={{ minWidth: 220 }}
            />
          </Form.Item>
          <Form.Item label="Service Availed">
            <Select
              mode="multiple"
              allowClear
              showSearch
              placeholder="All"
              value={filters.services}
              onChange={(v) => setFilters((f) => ({ ...f, services: v }))}
              options={serviceOptions.map((r) => ({ value: r, label: r }))}
              style={{ minWidth: 220 }}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button htmlType="reset">Reset</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 1. Citizens Charter Results */}
      <Card
        className="gr-card"
        loading={loading}
        title={<span>1. Citizen's Charter Results</span>}
        extra={
          <Space>
            <Button onClick={onExportCcExcel}>Export Excel</Button>
            <Button type="primary" onClick={onExportCcPdf}>
              Export PDF
            </Button>
          </Space>
        }
      >
        {["CC1", "CC2", "CC3"].map((sec, idx) => {
          const group = ccGroups?.[sec];
          if (!group) return null;
          const ccChartData = (group.rows || []).map((r) => ({
            name: (r.item || "").replace(/^\d+\.\s*/, ""),
            count: r.count || 0,
          }));
          return (
            <div key={sec} style={{ marginBottom: idx < 2 ? 16 : 0 }}>
              <Title level={5} style={{ marginBottom: 8 }}>{`${sec}: ${group.questionText}`}</Title>
              <div style={{ width: "100%", height: 260, marginBottom: 12 }}>
                <ResponsiveContainer>
                  <BarChart data={ccChartData} margin={{ left: 8, right: 16 }}>
                    <defs>
                      <linearGradient id={`grad-cc-${sec}`} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#69c0ff" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#1677ff" stopOpacity={0.9} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <ReTooltip content={ChartTooltip} />
                    <ReLegend />
                    <Bar dataKey="count" fill={`url(#grad-cc-${sec})`} radius={[roundPx, roundPx, 4, 4]} animationDuration={800}>
                      <LabelList dataKey="count" position="top" style={{ fontSize: 12, fill: '#222' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Table
                dataSource={group.rows}
                columns={ccGroupColumns}
                rowKey="key"
                pagination={false}
                size="small"
                tableLayout="fixed"
              />
              {idx < 2 ? <Divider style={{ margin: "12px 0" }} /> : null}
            </div>
          );
        })}
      </Card>

      {/* 2. 9 Service Quality Dimension Results */}
      <Card
        className="gr-card"
        loading={loading}
        title={<span>2. 9 Service Quality Dimension Results (SQD)</span>}
        extra={
          <Space>
            <Button onClick={onExportSqdExcel}>Export Excel</Button>
            <Button type="primary" onClick={onExportSqdPdf}>
              Export PDF
            </Button>
          </Space>
        }
      >
        <div style={{ width: "100%", height: 320, marginBottom: 12 }}>
          <ResponsiveContainer>
            <BarChart data={sqdRows} margin={{ left: 20, right: 20 }}>
              <defs>
                <linearGradient id="grad-sqd-a" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#0050b3" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#2f54eb" stopOpacity={0.9} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis allowDecimals={false} />
              <ReTooltip content={ChartTooltip} />
              <ReLegend />
              <Bar dataKey="sa" stackId="a" fill="#003f5c" radius={[roundPx, roundPx, 0, 0]} />
              <Bar dataKey="a" stackId="a" fill="#2f4b7c" radius={[roundPx, roundPx, 0, 0]} />
              <Bar dataKey="n" stackId="a" fill="#665191" radius={[roundPx, roundPx, 0, 0]} />
              <Bar dataKey="d" stackId="a" fill="#a05195" radius={[roundPx, roundPx, 0, 0]} />
              <Bar dataKey="sd" stackId="a" fill="#d45087" radius={[roundPx, roundPx, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <Table
          dataSource={sqdRows}
          columns={sqdColumns}
          rowKey="key"
          pagination={{ pageSize: 10 }}
          scroll={{ x: true }}
          size="small"
        />
      </Card>

      {/* 3. Score Per Service Availed */}
      <Card
        className="gr-card"
        loading={loading}
        title={<span>3. Score Per Service Availed</span>}
        extra={
          <Space>
            <Button onClick={onExportServicesExcel}>Export Excel</Button>
            <Button type="primary" onClick={onExportServicesPdf}>
              Export PDF
            </Button>
          </Space>
        }
      >
        <div style={{ width: "100%", height: Math.min(520, 60 + serviceRows.length * 32), marginBottom: 12 }}>
          <ResponsiveContainer>
            <BarChart data={serviceRows.slice(0, 20)} layout="vertical" margin={{ left: 24, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              {/* Give more width to Y axis so full service names can be displayed */}
              <YAxis dataKey="service" type="category" width={320} tick={{ fontSize: 13 }} />
              <ReTooltip content={ChartTooltip} />
              <Bar dataKey="count" radius={[0, roundPx, roundPx, 0]}>
                {serviceRows.slice(0, 20).map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={SERVICE_PALETTE[i % SERVICE_PALETTE.length]} />
                ))}
                <LabelList dataKey="count" position="right" style={{ fontSize: 12, fill: '#222' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <Table
          dataSource={serviceRows}
          columns={serviceColumns}
          rowKey="key"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>

      {/* 4. Respondents Profile (Gender/Sex) */}
      <Card
        className="gr-card"
        loading={loading}
        title={<span>4. Respondents Profile (Gender/Sex)</span>}
        extra={
          <Space>
            <Button onClick={onExportGenderExcel}>Export Excel</Button>
            <Button type="primary" onClick={onExportGenderPdf}>
              Export PDF
            </Button>
          </Space>
        }
      >
        <div style={{ width: "100%", height: 300, marginBottom: 12 }}>
          <ResponsiveContainer>
            <BarChart data={profileGenderRows} margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="gender" />
              <YAxis allowDecimals={false} />
              <ReTooltip content={ChartTooltip} />
              <ReLegend />
              <Bar dataKey="external" stackId="b" fill="#52c41a" radius={[roundPx, roundPx, 0, 0]}>
                <LabelList dataKey="external" position="top" />
              </Bar>
              <Bar dataKey="internal" stackId="b" fill="#fa8c16" radius={[roundPx, roundPx, 0, 0]}>
                <LabelList dataKey="internal" position="top" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <Table
          dataSource={profileGenderRows}
          columns={profileGenderColumns}
          rowKey="key"
          pagination={{ pageSize: 10 }}
          size="small"
          summary={(data) => {
            const totals = data.reduce(
              (acc, r) => {
                acc.external += r.external || 0;
                acc.internal += r.internal || 0;
                return acc;
              },
              { external: 0, internal: 0 }
            );
            return (
              <Table.Summary>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}>
                    <Text strong>Total</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <Text strong>{totals.external}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2}>
                    <Text strong>{totals.internal}</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />
      </Card>

      {/* 5. Respondents Profile (Customer Type) */}
      <Card
        className="gr-card"
        loading={loading}
        title={<span>5. Respondents Profile (Customer Type)</span>}
        extra={
          <Space>
            <Button onClick={onExportCustomerExcel}>Export Excel</Button>
            <Button type="primary" onClick={onExportCustomerPdf}>
              Export PDF
            </Button>
          </Space>
        }
      >
        <div style={{ width: "100%", height: 300, marginBottom: 12 }}>
          <ResponsiveContainer>
            <BarChart data={profileCustomerRows} margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="customerType" />
              <YAxis allowDecimals={false} />
              <ReTooltip content={ChartTooltip} />
              <ReLegend />
              <Bar dataKey="external" stackId="c" fill="#13c2c2" radius={[roundPx, roundPx, 0, 0]}>
                <LabelList dataKey="external" position="top" />
              </Bar>
              <Bar dataKey="internal" stackId="c" fill="#722ed1" radius={[roundPx, roundPx, 0, 0]}>
                <LabelList dataKey="internal" position="top" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <Table
          dataSource={profileCustomerRows}
          columns={profileCustomerColumns}
          rowKey="key"
          pagination={{ pageSize: 10 }}
          size="small"
          summary={(data) => {
            const totals = data.reduce(
              (acc, r) => {
                acc.external += r.external || 0;
                acc.internal += r.internal || 0;
                return acc;
              },
              { external: 0, internal: 0 }
            );
            return (
              <Table.Summary>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}>
                    <Text strong>Total</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <Text strong>{totals.external}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2}>
                    <Text strong>{totals.internal}</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />
      </Card>
    </Space>
  );
}
