import React, { useState, useEffect } from "react";
import {
  Card,
  Col,
  Row,
  Statistic,
  Typography,
  Spin,
  Space,
  Tooltip,
  Tag,
  Modal,
  Table,
  Button,
  Checkbox,
  Segmented,
} from "antd";
import {
  BarChartOutlined,
  PieChartOutlined,
  StarOutlined,
  RiseOutlined,
  FileDoneOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import * as api from "../../services/api";
import socket from "../../utils/socket";
import "./dashboard.css";

const { Title, Text } = Typography;

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSurveys: 0,
    averageOverallScore: 0,
    scoreDistribution: [],
    recentSurveys: [],
    questionTypeData: [],
    totalQuestions: 0,
  });

  const [ccResponseCounts, setCcResponseCounts] = useState([]);
  const [ccBreakdownTiles, setCcBreakdownTiles] = useState([]);
  const [ccTotals, setCcTotals] = useState({ Positive: 0, Neutral: 0, Negative: 0 });
  const [sqdBreakdownTiles, setSqdBreakdownTiles] = useState([]);
  const [allSurveys, setAllSurveys] = useState([]);
  const [detailModal, setDetailModal] = useState({
    open: false,
    title: "",
    rows: [],
    counts: {},
    total: 0,
    section: null,
  });
  const [detailFilter, setDetailFilter] = useState([]);
  const [surveyTypeFilter, setSurveyTypeFilter] = useState("all");
  // Assisted Personnel filter removed per request
  const keysRef = React.useRef({ cc: {}, sqd: {} });
  const [questionTextMap, setQuestionTextMap] = useState({});

  // Derive SQD indicator label from question text or known keywords
  const getSqdIndicatorLabel = (shortCode) => {
    const txt = questionTextMap?.[shortCode] || "";
    if (!txt) return shortCode;
    // Try to extract trailing category in parentheses: e.g., "... (Responsiveness)"
    const m = txt.match(/\(([^)]+)\)\s*$/);
    if (m && m[1]) return m[1].trim();
    const lower = txt.toLowerCase();
    if (lower.includes("responsiveness")) return "Responsiveness";
    if (lower.includes("reliability")) return "Reliability";
    if (lower.includes("access")) return "Access and Facilities";
    if (lower.includes("communication")) return "Communication";
    if (lower.includes("costs")) return "Costs";
    if (lower.includes("integrity")) return "Integrity";
    if (lower.includes("assurance")) return "Assurance";
    if (lower.includes("outcome")) return "Outcome";
    if (
      lower.startsWith("i am satisfied") ||
      lower.includes("satisfied with the service")
    )
      return "Satisfaction";
    return shortCode;
  };

  // Infer survey type for records that don't have surveyType stored
  const inferSurveyType = (entry) => {
    if (entry.surveyType) return entry.surveyType;
    const labeled = entry.answersLabeled || {};
    if (
      labeled["Customer Type"] === "Government" &&
      (labeled["Agency Name"] === "EMB Region III" || labeled["Employee Name"])
    ) return "internal";
    return "external";
  };

  // --- Normalizers (component scope) ---
  // Classify a Citizen's Charter answer into Positive / Neutral / Negative.
  // CC answers are full-text options (awareness, visibility, helpfulness),
  // so a plain Yes/No match misses everything. Legacy Yes/No is still handled.
  function normalizeCcAnswer(val) {
    if (!val) return null;
    const raw = Array.isArray(val) ? val.join(" ") : String(val);
    const s = raw.trim().toLowerCase();
    if (!s) return null;

    // N/A variants -> Neutral bucket
    const cleaned = s.replace(/[^a-z]/g, "");
    if (cleaned === "na" || cleaned === "notapplicable") return "Neutral";
    if (s.includes("skip question")) return "Neutral";

    const positive = [
      "i know what a cc is and i saw",
      "learned of the cc only when i saw",
      "easy to see", // also matches "somewhat easy to see"
      "help very much",
      "somewhat helped",
    ];
    const negative = [
      "did not see this office",
      "do not know what a cc is",
      "difficult to see",
      "not visible at all",
      "did not help",
    ];
    if (positive.some((k) => s.includes(k))) return "Positive";
    if (negative.some((k) => s.includes(k))) return "Negative";

    // Legacy simple answers
    if (s === "yes" || s === "y" || /\byes\b/i.test(raw)) return "Positive";
    if (s === "no" || s === "n" || /\bno\b/i.test(raw)) return "Negative";

    return "Neutral";
  }

  function normalizeSqdAnswer(val) {
    if (!val || typeof val !== "string") return null;
    const s = val.trim();
    // Map common synonyms
    if (/^satisfactory$/i.test(s)) return "Neutral";
    if (/^neither\s+agree\s+nor\s+disagree$/i.test(s)) return "Neutral";
    return s; // assume already in canonical form
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all survey responses
        const response = await api.getClientSatisfactoryData();
        const data = response.data;
        // Fetch question texts to show subtitle under code in tiles and modal
        let qList = [];
        try {
          const qRes = await api.getQuestions();
          qList = Array.isArray(qRes?.data) ? qRes.data : [];
        } catch (e) {
          // Non-fatal if questions cannot be fetched
          console.warn("Questions fetch failed (subtitle will be missing):", e);
        }

        const totalSurveys = data.length;
        setAllSurveys(data);

        const ccKeys = {
          CC1: "answer_6870a4056988ee91c469a5e9",
          CC2: "answer_6870a4396988ee91c469a5f2",
          CC3: "answer_6870a4646988ee91c469a5fa",
        };

        const sqdKeys = {
          SQD0: "answer_6870a4e26988ee91c469a604",
          SQD1: "answer_6870a52d6988ee91c469a60d",
          SQD2: "answer_6870a5436988ee91c469a611",
          SQD3: "answer_6870a58e6988ee91c469a615",
          SQD4: "answer_6870a5c66988ee91c469a61e",
          SQD5: "answer_6870a5dd6988ee91c469a622",
          SQD6: "answer_6870a6556988ee91c469a634",
          SQD7: "answer_6870a66a6988ee91c469a638",
          SQD8: "answer_6870a67b6988ee91c469a63c",
        };

        keysRef.current = { cc: ccKeys, sqd: sqdKeys };

        // Build question text map:
        // 1) by backend questionCode (e.g., Q10 -> text)
        // 2) by our short codes (e.g., SQD0/CC1 -> text via answer_<id> lookup)
        try {
          const byCode = (qList || []).reduce((acc, q) => {
            if (q?.questionCode && q?.questionText)
              acc[q.questionCode] = q.questionText;
            return acc;
          }, {});

          const byShort = {};
          const allMaps = { ...ccKeys, ...sqdKeys };
          const idToText = (qList || []).reduce((acc, q) => {
            if (q?._id && q?.questionText) acc[q._id] = q.questionText;
            return acc;
          }, {});
          Object.entries(allMaps).forEach(([short, ansKey]) => {
            const id = String(ansKey || "").replace(/^answer_/, "");
            if (idToText[id]) byShort[short] = idToText[id];
          });

          setQuestionTextMap({ ...byCode, ...byShort });
        } catch (e) {
          // If building alias map fails, fall back to empty map
          console.warn("Building question subtitle map failed:", e);
        }

        const scoreKeyMap = { ...ccKeys, ...sqdKeys };

        const scoreMap = {
          "Strongly Agree": 5,
          Agree: 4,
          Neutral: 3,
          Disagree: 2,
          "Strongly Disagree": 1,
          // Alias
          Satisfactory: 3,
        };

        // per-question averages below; overall average computed separately from SQD only

        const questionScores = Object.entries(scoreKeyMap).map(
          ([label, key]) => {
            let sum = 0;
            let count = 0;
            data.forEach((entry) => {
              const val = normalizeSqdAnswer(entry.answers?.[key]);
              if (scoreMap[val]) {
                sum += scoreMap[val];
                count++;
              }
            });
            return {
              name: label,
              average: count ? sum / count : 0,
            };
          }
        );

        // Note: score distribution for rendering is computed later excluding CC

        // Compute overall average from SQD questions only to avoid CC Yes/No/N/A skew
        let sqdScoreAccum = 0;
        let sqdCountAccum = 0;
        data.forEach((entry) => {
          Object.values(sqdKeys).forEach((k) => {
            const v = normalizeSqdAnswer(entry.answers?.[k]);
            const n = scoreMap[v];
            if (n) {
              sqdScoreAccum += n;
              sqdCountAccum += 1;
            }
          });
        });
        const averageOverallScore = sqdCountAccum
          ? sqdScoreAccum / sqdCountAccum
          : 0;

        const newCcResponseCounts = Object.entries(ccKeys).map(
          ([label, key]) => ({
            question: label,
            responses: data.filter((entry) => entry.answers?.[key]).length,
          })
        );
        setCcResponseCounts(newCcResponseCounts);

        // Build per-question breakdown tiles for CC (Yes/No/N/A) and SQD (Likert)
        const SQD_ANSWER_ORDER = [
          "Strongly Agree",
          "Agree",
          "Neutral",
          "Disagree",
          "Strongly Disagree",
        ];

        // (normalizers moved to component scope)

        function makeCcBreakdown(entries, keyMap) {
          return Object.entries(keyMap).map(([short, key]) => {
            const counts = { Positive: 0, Neutral: 0, Negative: 0 };
            entries.forEach((e) => {
              const a = normalizeCcAnswer(e.answers?.[key]);
              if (a && Object.prototype.hasOwnProperty.call(counts, a))
                counts[a] += 1;
            });
            const total = counts.Positive + counts.Neutral + counts.Negative;
            return { question: short, counts, total };
          });
        }

        function makeSqdBreakdown(entries, keyMap) {
          return Object.entries(keyMap).map(([short, key]) => {
            const counts = {
              "Strongly Agree": 0,
              Agree: 0,
              Neutral: 0,
              Disagree: 0,
              "Strongly Disagree": 0,
            };
            entries.forEach((e) => {
              const raw = e.answers?.[key];
              const a = normalizeSqdAnswer(raw);
              if (a && Object.prototype.hasOwnProperty.call(counts, a))
                counts[a] += 1;
            });
            const total = SQD_ANSWER_ORDER.reduce(
              (acc, k) => acc + counts[k],
              0
            );
            return { question: short, counts, total };
          });
        }

        const ccTiles = makeCcBreakdown(data, ccKeys);
        setCcBreakdownTiles(ccTiles);
        // Compute CC totals for summary chart
        const totals = ccTiles.reduce(
          (acc, t) => {
            acc.Positive += t.counts["Positive"] || 0;
            acc.Neutral += t.counts["Neutral"] || 0;
            acc.Negative += t.counts["Negative"] || 0;
            return acc;
          },
          { Positive: 0, Neutral: 0, Negative: 0 }
        );
        setCcTotals(totals);
        setSqdBreakdownTiles(makeSqdBreakdown(data, sqdKeys));

        const recentSurveys = data
          .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
          .slice(0, 5)
          .map((entry) => {
            const labeled = entry.answersLabeled || {};
            const customerType = labeled["Customer Type"] || "Unknown";
            const companyOrAgency =
              labeled["Company Name"] ||
              labeled[
                "Unknown Question (merged_customer_age_gender_question_agencyName)"
              ] ||
              labeled["Agency"] ||
              "—";
            const assistedPersonnel = labeled["Assisted Personnel"] || null;

            const ccClassified = Object.values(ccKeys)
              .map((key) => normalizeCcAnswer(entry.answers?.[key]))
              .filter((v) => v !== null);
            const ccPositive = ccClassified.filter(
              (v) => v === "Positive"
            ).length;
            const ccTotal = ccClassified.length;

            const sqdResponsesRaw = Object.values(sqdKeys)
              .map((key) => entry.answers?.[key])
              .filter((val) => !!val);

            const sqdResponses = sqdResponsesRaw.map((v) =>
              normalizeSqdAnswer(v)
            );

            const sqdPositive = sqdResponses.filter(
              (ans) => ans === "Strongly Agree" || ans === "Agree"
            ).length;

            const sqdNegative = sqdResponses.filter(
              (ans) => ans === "Disagree" || ans === "Strongly Disagree"
            ).length;

            const sqdScores = sqdResponses.map((val) => scoreMap[val] || null);
            const avgSqdScore = sqdScores.length
              ? Number(
                  (
                    sqdScores.reduce((a, b) => a + b, 0) / sqdScores.length
                  ).toFixed(2)
                )
              : null;

            return {
              id: entry._id,
              companyCustomerInfo: {
                name: companyOrAgency,
                type: customerType,
              },
              assistedPersonnel,
              surveyDate: new Date(entry.submittedAt).toLocaleDateString(),
              ccPositive,
              ccTotal,
              averageSqdScore: avgSqdScore,
              sqdPositive,
              sqdNegative,
              status: "Completed",
              remarks: labeled["Remarks/Recommendations:"],
            };
          });
        // Build SQD-only average scores using 1-5 Likert scale
        const questionExcludingCitizenScores = Object.entries(sqdKeys).map(
          ([label, key]) => {
            let sum = 0;
            let count = 0;
            data.forEach((entry) => {
              const val = normalizeSqdAnswer(entry.answers?.[key]);
              const n = scoreMap[val];
              if (n) {
                sum += n;
                count++;
              }
            });
            return {
              name: label, // e.g., SQD0, SQD1
              "Average Score": count ? Number((sum / count).toFixed(2)) : 0,
            };
          }
        );

        // Compute SQD Overall Score per provided formula, EXCLUDING SQD0 (Satisfaction):
        // ("Strongly Disagree" + "Agree") / (Total Responses - N/A)
        // Here, Total Responses counts all SQD answers across indicators (excluding SQD0) that are one of the 5 Likert options; 'N/A' are excluded from denominator.
        let sqdNumerator = 0;
        let sqdConsidered = 0; // counts responses excluding N/A
        data.forEach((entry) => {
          Object.entries(sqdKeys).forEach(([label, k]) => {
            if (label === "SQD0") return; // exclude Satisfaction item from overall score
            const a = normalizeSqdAnswer(entry.answers?.[k]);
            if (!a) return;
            if (a === "N/A") return; // exclude N/A from denominator
            if (
              [
                "Strongly Agree",
                "Agree",
                "Neutral",
                "Disagree",
                "Strongly Disagree",
              ].includes(a)
            ) {
              sqdConsidered += 1;
              if (a === "Strongly Agree" || a === "Agree") sqdNumerator += 1;
            }
          });
        });
        const sqdOverallScore = sqdConsidered
          ? (sqdNumerator / sqdConsidered) * 100
          : 0;
        setStats({
          totalSurveys,
          averageOverallScore: Number(averageOverallScore.toFixed(2)),
          recentSurveys,
          questionTypeData: [
            { name: "Text", count: 5 },
            { name: "Dropdown", count: 2 },
            { name: "Radio", count: 2 },
          ],
          totalQuestions: Object.keys(scoreKeyMap).length,
          scoreDistribution: questionExcludingCitizenScores,
          sqdOverallScore: Number(sqdOverallScore.toFixed(1)),
        });
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Real-time: auto-refresh dashboard when a new survey is submitted
  useEffect(() => {
    const onNewFeedback = () => {
      // Re-run the data fetch without showing the full-page spinner
      (async () => {
        try {
          const response = await api.getClientSatisfactoryData();
          const data = response.data;
          setAllSurveys(data);
          setStats((prev) => ({ ...prev, totalSurveys: data.length }));
        } catch (err) {
          console.error("Dashboard auto-refresh failed:", err);
        }
      })();
    };
    socket.on("feedbackAdded", onNewFeedback);
    return () => socket.off("feedbackAdded", onNewFeedback);
  }, []);

  // Recompute CC/SQD tiles and totals (no Assisted Personnel filter)
  useEffect(() => {
    if (!allSurveys.length || !keysRef.current.cc || !keysRef.current.sqd)
      return;
    const filtered = surveyTypeFilter === "all"
      ? allSurveys
      : allSurveys.filter((s) => inferSurveyType(s) === surveyTypeFilter);

    const ccKeys = keysRef.current.cc;
    const sqdKeys = keysRef.current.sqd;

    const makeCc = (entries, keyMap) => {
      return Object.entries(keyMap).map(([short, key]) => {
        const counts = { Positive: 0, Neutral: 0, Negative: 0 };
        entries.forEach((e) => {
          const a = normalizeCcAnswer(e.answers?.[key]);
          if (a && Object.prototype.hasOwnProperty.call(counts, a))
            counts[a] += 1;
        });
        const total = counts.Positive + counts.Neutral + counts.Negative;
        return { question: short, counts, total };
      });
    };
    const makeSqd = (entries, keyMap) => {
      return Object.entries(keyMap).map(([short, key]) => {
        const counts = {
          "Strongly Agree": 0,
          Agree: 0,
          Neutral: 0,
          Disagree: 0,
          "Strongly Disagree": 0,
        };
        entries.forEach((e) => {
          const a = normalizeSqdAnswer(e.answers?.[key]);
          if (a && Object.prototype.hasOwnProperty.call(counts, a))
            counts[a] += 1;
        });
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        return { question: short, counts, total };
      });
    };

    const ccTiles = makeCc(filtered, ccKeys);
    setCcBreakdownTiles(ccTiles);
    const totals = ccTiles.reduce(
      (acc, t) => {
        acc.Positive += t.counts["Positive"] || 0;
        acc.Neutral += t.counts["Neutral"] || 0;
        acc.Negative += t.counts["Negative"] || 0;
        return acc;
      },
      { Positive: 0, Neutral: 0, Negative: 0 }
    );
    setCcTotals(totals);
    setSqdBreakdownTiles(makeSqd(filtered, sqdKeys));

    // ── Recompute chart data for the current filter ──
    const scoreMap = {
      "Strongly Agree": 5,
      Agree: 4,
      Neutral: 3,
      Disagree: 2,
      "Strongly Disagree": 1,
      Satisfactory: 3,
    };

    // CC response counts bar chart
    const newCcResponseCounts = Object.entries(ccKeys).map(([label, key]) => ({
      question: label,
      responses: filtered.filter((entry) => entry.answers?.[key]).length,
    }));
    setCcResponseCounts(newCcResponseCounts);

    // SQD average scores bar chart
    const scoreDistribution = Object.entries(sqdKeys).map(([label, key]) => {
      let sum = 0;
      let count = 0;
      filtered.forEach((entry) => {
        const val = normalizeSqdAnswer(entry.answers?.[key]);
        const n = scoreMap[val];
        if (n) { sum += n; count++; }
      });
      return {
        name: label,
        "Average Score": count ? Number((sum / count).toFixed(2)) : 0,
      };
    });

    // Overall average from SQD only
    let sqdScoreAccum = 0;
    let sqdCountAccum = 0;
    filtered.forEach((entry) => {
      Object.values(sqdKeys).forEach((k) => {
        const v = normalizeSqdAnswer(entry.answers?.[k]);
        const n = scoreMap[v];
        if (n) { sqdScoreAccum += n; sqdCountAccum += 1; }
      });
    });
    const averageOverallScore = sqdCountAccum ? sqdScoreAccum / sqdCountAccum : 0;

    // SQD Overall Score (SA+A / total excl. N/A), excluding SQD0
    let sqdNumerator = 0;
    let sqdConsidered = 0;
    filtered.forEach((entry) => {
      Object.entries(sqdKeys).forEach(([label, k]) => {
        if (label === "SQD0") return;
        const a = normalizeSqdAnswer(entry.answers?.[k]);
        if (!a || a === "N/A") return;
        if (["Strongly Agree", "Agree", "Neutral", "Disagree", "Strongly Disagree"].includes(a)) {
          sqdConsidered += 1;
          if (a === "Strongly Agree" || a === "Agree") sqdNumerator += 1;
        }
      });
    });
    const sqdOverallScore = sqdConsidered ? (sqdNumerator / sqdConsidered) * 100 : 0;

    setStats((prev) => ({
      ...prev,
      totalSurveys: filtered.length,
      scoreDistribution,
      averageOverallScore: Number(averageOverallScore.toFixed(2)),
      sqdOverallScore: Number(sqdOverallScore.toFixed(1)),
    }));
  }, [allSurveys, surveyTypeFilter]);

  // Open details modal for a selected question breakdown tile
  const openDetail = (section, shortCode) => {
    const keyMap = section === "cc" ? keysRef.current.cc : keysRef.current.sqd;
    const key = keyMap?.[shortCode];
    if (!key) return;

    const surveysToUse = surveyTypeFilter === "all"
      ? allSurveys
      : allSurveys.filter((s) => inferSurveyType(s) === surveyTypeFilter);

    const rows = [];
    let counts;

    if (section === "cc") {
      counts = { Positive: 0, Neutral: 0, Negative: 0 };
      surveysToUse.forEach((entry) => {
        const raw = entry.answers?.[key];
        const answer = normalizeCcAnswer(raw);
        if (!answer) return;
        if (Object.prototype.hasOwnProperty.call(counts, answer))
          counts[answer] += 1;

        const labeled = entry.answersLabeled || {};
        const customerType = labeled["Customer Type"] || "Unknown";
        const companyOrAgency =
          labeled["Company Name"] ||
          labeled[
            "Unknown Question (merged_customer_age_gender_question_agencyName)"
          ] ||
          labeled["Agency"] ||
          "—";

        rows.push({
          id: entry._id,
          company: companyOrAgency,
          customerType,
          assisted: labeled["Assisted Personnel"] || null,
          answer,
          submittedAt: entry.submittedAt
            ? new Date(entry.submittedAt).toLocaleString()
            : "—",
        });
      });
    } else {
      counts = {
        "Strongly Agree": 0,
        Agree: 0,
        Neutral: 0,
        Disagree: 0,
        "Strongly Disagree": 0,
      };
      surveysToUse.forEach((entry) => {
        const raw = entry.answers?.[key];
        const answer = normalizeSqdAnswer(raw);
        if (!answer) return;
        if (Object.prototype.hasOwnProperty.call(counts, answer))
          counts[answer] += 1;

        const labeled = entry.answersLabeled || {};
        const customerType = labeled["Customer Type"] || "Unknown";
        const companyOrAgency =
          labeled["Company Name"] ||
          labeled[
            "Unknown Question (merged_customer_age_gender_question_agencyName)"
          ] ||
          labeled["Agency"] ||
          "—";

        rows.push({
          id: entry._id,
          company: companyOrAgency,
          customerType,
          assisted: labeled["Assisted Personnel"] || null,
          answer,
          submittedAt: entry.submittedAt
            ? new Date(entry.submittedAt).toLocaleString()
            : "—",
        });
      });
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    setDetailFilter([]);
    setDetailModal({
      open: true,
      title: `Details: ${shortCode}`,
      shortCode,
      qText: questionTextMap?.[shortCode],
      rows,
      counts,
      total,
      section,
    });
  };

  const recentSurveysColumns = [
    {
      title: "Company/Agency",
      dataIndex: "companyCustomerInfo",
      key: "companyCustomerInfo",
      render: (info) => (
        <div>
          <Text strong>{info.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {info.type}
          </Text>
        </div>
      ),
    },
    {
      title: "Assisted Personnel",
      dataIndex: "assistedPersonnel",
      key: "assistedPersonnel",
      render: (val) => <Text>{val || "—"}</Text>,
    },
    {
      title: "Survey Date",
      dataIndex: "surveyDate",
      key: "surveyDate",
    },
    {
      title: "CC Positive",
      dataIndex: "ccPositive",
      key: "ccPositive",
      render: (val, record) =>
        record.ccTotal ? (
          <Text strong>
            {val}/{record.ccTotal}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "SQD Breakdown",
      key: "sqdBreakdown",
      render: (_, record) => (
        <div>
          <Text type="success">👍 {record.sqdPositive}</Text>{" "}
          <Text type="danger">👎 {record.sqdNegative}</Text>
        </div>
      ),
    },

    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Text type={status === "Completed" ? "success" : "warning"}>
          {status}
        </Text>
      ),
    },
    {
      title: "Remarks",
      dataIndex: "remarks",
      key: "remarks",
      render: (text) => <Text>{text}</Text>,
    },
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <Title level={3} className="dashboard-title">
          <BarChartOutlined /> Admin Dashboard
        </Title>
        <Text type="secondary" className="dashboard-subtitle">
          Client satisfaction overview &amp; survey analytics
        </Text>
      </div>

      {loading ? (
        <div className="dashboard-loading">
          <Spin size="large" tip="Loading Dashboard Data...">
            <div style={{ minHeight: "200px" }} />{" "}
            {/* placeholder for nested mode */}
          </Spin>
        </div>
      ) : (
        <Space direction="vertical" size={24} style={{ width: "100%" }}>
          {/* Survey Type Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Text strong>Filter by Survey Type:</Text>
            <Segmented
              options={[
                { label: `All (${allSurveys.length})`, value: "all" },
                { label: `Internal (${allSurveys.filter((s) => inferSurveyType(s) === "internal").length})`, value: "internal" },
                { label: `External (${allSurveys.filter((s) => inferSurveyType(s) === "external").length})`, value: "external" },
              ]}
              value={surveyTypeFilter}
              onChange={setSurveyTypeFilter}
            />
          </div>
          {/* Key Statistics */}
          <Row gutter={[20, 20]}>
            <Col xs={12} md={12} lg={6}>
              <Card className="dashboard-card kpi-tile kpi-blue">
                <div className="kpi-tile-inner">
                  <div className="kpi-icon">
                    <FileDoneOutlined />
                  </div>
                  <Statistic
                    title="Total Surveys Completed"
                    value={stats.totalSurveys}
                  />
                </div>
              </Card>
            </Col>
            <Col xs={12} md={12} lg={6}>
              <Card className="dashboard-card kpi-tile kpi-orange">
                <div className="kpi-tile-inner">
                  <div className="kpi-icon">
                    <StarOutlined />
                  </div>
                  <Statistic
                    title="Avg. Overall Score"
                    value={(stats.averageOverallScore / 5) * 100}
                    precision={1}
                    suffix="%"
                  />
                </div>
              </Card>
            </Col>
            <Col xs={12} md={12} lg={6}>
              <Card className="dashboard-card kpi-tile kpi-green">
                <div className="kpi-tile-inner">
                  <div className="kpi-icon">
                    <RiseOutlined />
                  </div>
                  <Statistic
                    title="Satisfaction Rate"
                    value={stats.sqdOverallScore ?? 0}
                    precision={1}
                    suffix="%"
                  />
                </div>
              </Card>
            </Col>
            <Col xs={12} md={12} lg={6}>
              <Card className="dashboard-card kpi-tile kpi-purple">
                <div className="kpi-tile-inner">
                  <div className="kpi-icon">
                    <SafetyCertificateOutlined />
                  </div>
                  <Statistic
                    title="Total Questions"
                    value={stats.totalQuestions}
                  />
                </div>
              </Card>
            </Col>
          </Row>

          {/* Question Type Distribution */}
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <Card
                title={
                  <Space>
                    <BarChartOutlined />{" "}
                    <span>Citizen's Charter Response Count</span>
                  </Space>
                }
                className="dashboard-card chart-card"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ccResponseCounts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="question" />
                    <YAxis allowDecimals={false} />
                    <RechartsTooltip /> {/* <== FIXED */}
                    <Bar dataKey="responses" fill="#1677ff" />
                  </BarChart>
                </ResponsiveContainer>
                <Text
                  type="secondary"
                  style={{
                    fontSize: "0.8em",
                    marginTop: "10px",
                    display: "block",
                    textAlign: "center",
                  }}
                >
                  * Data is based on actual citizen's charter responses.
                </Text>
              </Card>
            </Col>

            {/* Survey Score Distribution */}
            <Col xs={24} lg={12}>
              <Card
                title={
                  <Space>
                    <BarChartOutlined />{" "}
                    <span>Average SQD Score Per Question</span>
                  </Space>
                }
                className="dashboard-card chart-card"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={stats.scoreDistribution}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-30}
                      textAnchor="end"
                      interval={0}
                      height={80}
                    />
                    <YAxis domain={[1, 5]} allowDecimals={false} />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="Average Score" fill="#13c2c2" />
                  </BarChart>
                </ResponsiveContainer>
                <Text
                  type="secondary"
                  style={{
                    fontSize: "0.8em",
                    marginTop: "10px",
                    display: "block",
                    textAlign: "center",
                  }}
                >
                  * Based on SQD responses only (1 = Strongly Disagree … 5 =
                  Strongly Agree).
                </Text>
              </Card>
            </Col>
          </Row>

          {/* CC Yes/No/N/A Summary combined with Per-Question and Breakdown tiles in one card */}
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={24}>
              <Card
                bodyStyle={{ padding: "16px 0px" }}
                title={
                  <Space>
                    <PieChartOutlined /> <span>Citizen's Charter Summary</span>
                  </Space>
                }
                className="dashboard-card chart-card"
              >
                {/* Top row: Pie (left) and Per-Question Stacked Bar (right) with tighter gutters to maximize width */}
                <Row gutter={[0, 12]}>
                  <Col xs={24} lg={12}>
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsPieChart>
                        <RechartsTooltip />
                        <Legend
                          layout="horizontal"
                          verticalAlign="bottom"
                          align="center"
                        />
                        <Pie
                          data={[
                            { name: "Positive", value: ccTotals.Positive },
                            { name: "Neutral", value: ccTotals.Neutral },
                            { name: "Negative", value: ccTotals.Negative },
                          ]}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius="55%"
                          outerRadius="90%"
                          paddingAngle={2}
                          label={false}
                          labelLine={false}
                        >
                          {[
                            { name: "Positive", color: "#52c41a" },
                            { name: "Neutral", color: "#faad14" },
                            { name: "Negative", color: "#ff4d4f" },
                          ].map((seg, idx) => (
                            <Cell key={`cell-${idx}`} fill={seg.color} />
                          ))}
                        </Pie>
                      </RechartsPieChart>
                    </ResponsiveContainer>
                    <Text
                      type="secondary"
                      style={{
                        fontSize: "0.8em",
                        marginTop: 10,
                        display: "block",
                        textAlign: "center",
                      }}
                    >
                      * Summary of all CC questions combined.
                    </Text>
                  </Col>
                  <Col xs={24} lg={12}>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart
                        data={ccBreakdownTiles.map((t) => ({
                          question: t.question,
                          Positive: t.counts["Positive"] || 0,
                          Neutral: t.counts["Neutral"] || 0,
                          Negative: t.counts["Negative"] || 0,
                        }))}
                        margin={{ top: 8, right: 0, left: 0, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="question" tickMargin={8} />
                        <YAxis allowDecimals={false} />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="Positive" stackId="a" fill="#52c41a" />
                        <Bar dataKey="Neutral" stackId="a" fill="#faad14" />
                        <Bar dataKey="Negative" stackId="a" fill="#ff4d4f" />
                      </BarChart>
                    </ResponsiveContainer>
                    <Text
                      type="secondary"
                      style={{
                        fontSize: "0.8em",
                        marginTop: 10,
                        display: "block",
                        textAlign: "center",
                      }}
                    >
                      * Each bar shows the distribution for a CC question.
                    </Text>
                  </Col>
                </Row>
                {/* Inline CC Breakdown Tiles under the summary pie */}
                <div style={{ marginTop: 16 }}>
                  <Text strong>Citizen's Charter Breakdown</Text>
                  <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
                    {ccBreakdownTiles.map((tile) => (
                      <Col
                        key={`cc-inline-${tile.question}`}
                        xs={24}
                        sm={12}
                        md={8}
                        lg={8}
                        xl={8}
                      >
                        <Card
                          size="small"
                          hoverable
                          onClick={() => openDetail("cc", tile.question)}
                          style={{ cursor: "pointer" }}
                        >
                          <Space
                            direction="vertical"
                            size={4}
                            style={{ width: "100%" }}
                          >
                            <Text strong>{tile.question}</Text>
                            {questionTextMap?.[tile.question] ? (
                              <Tooltip title={questionTextMap[tile.question]}>
                                <Text
                                  type="secondary"
                                  style={{ fontSize: 11 }}
                                  ellipsis
                                >
                                  {questionTextMap[tile.question]}
                                </Text>
                              </Tooltip>
                            ) : null}
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                              }}
                            >
                              <Tooltip title="Positive">
                                <Tag color="green">
                                  Positive: {tile.counts["Positive"]}
                                </Tag>
                              </Tooltip>
                              <Tooltip title="Neutral">
                                <Tag color="orange">
                                  Neutral: {tile.counts["Neutral"]}
                                </Tag>
                              </Tooltip>
                              <Tooltip title="Negative">
                                <Tag color="red">
                                  Negative: {tile.counts["Negative"]}
                                </Tag>
                              </Tooltip>
                            </div>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              Total: {tile.total}
                            </Text>
                          </Space>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Breakdown Tiles: SQD full width */}
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={24}>
              <Card
                title={
                  <Space>
                    <BarChartOutlined /> <span>SQD Breakdown</span>
                  </Space>
                }
                className="dashboard-card"
              >
                {/* SQD Per-Indicator Stacked Bar Chart */}
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Per-Indicator Response Distribution</Text>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={sqdBreakdownTiles.map((t) => ({
                        indicator: getSqdIndicatorLabel(t.question),
                        "Strongly Agree": t.counts["Strongly Agree"] || 0,
                        Agree: t.counts["Agree"] || 0,
                        Neutral: t.counts["Neutral"] || 0,
                        Disagree: t.counts["Disagree"] || 0,
                        "Strongly Disagree": t.counts["Strongly Disagree"] || 0,
                        __code: t.question,
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="indicator"
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis allowDecimals={false} />
                      <RechartsTooltip
                        formatter={(value, name) => [
                          value,
                          name === "Neutral"
                            ? "Neither Agree nor Disagree"
                            : name,
                        ]}
                        labelFormatter={(label, payload) => {
                          const p =
                            Array.isArray(payload) && payload[0]
                              ? payload[0].payload
                              : null;
                          return p ? `${label} (${p.__code})` : label;
                        }}
                      />
                      <Legend
                        formatter={(value) =>
                          value === "Neutral"
                            ? "Neither Agree nor Disagree"
                            : value
                        }
                      />
                      <Bar
                        dataKey="Strongly Agree"
                        stackId="sqd"
                        fill="#1677ff"
                      />
                      <Bar dataKey="Agree" stackId="sqd" fill="#389e0d" />
                      <Bar dataKey="Neutral" stackId="sqd" fill="#fa8c16" />
                      <Bar dataKey="Disagree" stackId="sqd" fill="#f5222d" />
                      <Bar
                        dataKey="Strongly Disagree"
                        stackId="sqd"
                        fill="#800000"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* SQD tiles below */}
                <Row gutter={[16, 16]}>
                  {sqdBreakdownTiles.map((tile) => (
                    <Col
                      key={`sqd-${tile.question}`}
                      xs={24}
                      sm={12}
                      md={8}
                      lg={8}
                      xl={8}
                    >
                      <Card
                        size="small"
                        hoverable
                        onClick={() => openDetail("sqd", tile.question)}
                        style={{ cursor: "pointer" }}
                      >
                        <Space
                          direction="vertical"
                          size={4}
                          style={{ width: "100%" }}
                        >
                          <Text className="tile-header-code" strong>
                            {tile.question}
                          </Text>
                          {questionTextMap?.[tile.question] ? (
                            <Tooltip title={questionTextMap[tile.question]}>
                              <Text
                                type="secondary"
                                className="tile-description"
                                ellipsis
                              >
                                {questionTextMap[tile.question]}
                              </Text>
                            </Tooltip>
                          ) : null}
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 6,
                            }}
                          >
                            <Tooltip title="Strongly Agree">
                              <Tag color="blue">
                                SA: {tile.counts["Strongly Agree"]}
                              </Tag>
                            </Tooltip>
                            <Tooltip title="Agree">
                              <Tag color="green">A: {tile.counts["Agree"]}</Tag>
                            </Tooltip>
                            <Tooltip title="Neither Agree nor Disagree">
                              <Tag color="orange">
                                N: {tile.counts["Neutral"]}
                              </Tag>
                            </Tooltip>
                            <Tooltip title="Disagree">
                              <Tag color="red">
                                D: {tile.counts["Disagree"]}
                              </Tag>
                            </Tooltip>
                            <Tooltip title="Strongly Disagree">
                              <Tag color="maroon">
                                SD: {tile.counts["Strongly Disagree"]}
                              </Tag>
                            </Tooltip>
                          </div>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            Total: {tile.total}
                          </Text>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card>
            </Col>
          </Row>

          {/* Details Modal */}
          <Modal
            title={
              <div>
                <Text strong>{detailModal.title}</Text>
                {detailModal.qText ? (
                  <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                    {detailModal.qText}
                  </div>
                ) : null}
              </div>
            }
            open={detailModal.open}
            onCancel={() => setDetailModal((s) => ({ ...s, open: false }))}
            footer={null}
            width={800}
          >
            <Space direction="vertical" style={{ width: "100%" }}>
              <Space size="small" wrap>
                {detailModal.section === "cc" ? (
                  <>
                    <Tag color="green">
                      Positive: {detailModal.counts["Positive"] || 0}
                    </Tag>
                    <Tag color="orange">
                      Neutral: {detailModal.counts["Neutral"] || 0}
                    </Tag>
                    <Tag color="red">
                      Negative: {detailModal.counts["Negative"] || 0}
                    </Tag>
                  </>
                ) : (
                  <>
                    <Tag color="blue">
                      Strongly Agree:{" "}
                      {detailModal.counts["Strongly Agree"] || 0}
                    </Tag>
                    <Tag color="green">
                      Agree: {detailModal.counts["Agree"] || 0}
                    </Tag>
                    <Tag color="orange">
                      Neither Agree nor Disagree:{" "}
                      {detailModal.counts["Neutral"] || 0}
                    </Tag>
                    <Tag color="red">
                      Disagree: {detailModal.counts["Disagree"] || 0}
                    </Tag>
                    <Tag color="maroon">
                      Strongly Disagree:{" "}
                      {detailModal.counts["Strongly Disagree"] || 0}
                    </Tag>
                  </>
                )}
                <Tag>Total: {detailModal.total || 0}</Tag>
              </Space>

              {/* Filter controls */}
              <Space
                align="center"
                style={{ width: "100%", justifyContent: "space-between" }}
              >
                <Space size="small" wrap>
                  <Text strong>Filter answers:</Text>
                  <Checkbox.Group
                    value={detailFilter}
                    onChange={(vals) => setDetailFilter(vals)}
                    options={
                      detailModal.section === "cc"
                        ? [
                            { label: "Positive", value: "Positive" },
                            { label: "Neutral", value: "Neutral" },
                            { label: "Negative", value: "Negative" },
                          ]
                        : [
                            { label: "SA", value: "Strongly Agree" },
                            { label: "A", value: "Agree" },
                            { label: "N", value: "Neutral" },
                            { label: "D", value: "Disagree" },
                            { label: "SD", value: "Strongly Disagree" },
                          ]
                    }
                  />
                </Space>
                <Button size="small" onClick={() => setDetailFilter([])}>
                  Clear
                </Button>
              </Space>

              <Table
                size="small"
                dataSource={
                  detailFilter.length
                    ? detailModal.rows.filter((r) =>
                        detailFilter.includes(r.answer)
                      )
                    : detailModal.rows
                }
                rowKey="id"
                pagination={{ pageSize: 10 }}
                columns={[
                  {
                    title: "Company/Agency",
                    dataIndex: "company",
                    key: "company",
                  },
                  {
                    title: "Customer Type",
                    dataIndex: "customerType",
                    key: "customerType",
                  },
                  {
                    title: "Assisted Personnel",
                    dataIndex: "assisted",
                    key: "assisted",
                  },
                  {
                    title: "Answer",
                    dataIndex: "answer",
                    key: "answer",
                    render: (ans) => {
                      if (!ans) return <Text>—</Text>;
                      if (detailModal.section === "cc") {
                        if (ans === "Positive")
                          return <Tag color="green">Positive</Tag>;
                        if (ans === "Negative")
                          return <Tag color="red">Negative</Tag>;
                        if (ans === "Neutral")
                          return <Tag color="orange">Neutral</Tag>;
                        return <Tag>{ans}</Tag>;
                      }
                      // SQD Likert coloring
                      const colorMap = {
                        "Strongly Agree": "blue",
                        Agree: "green",
                        Neutral: "orange",
                        Disagree: "red",
                        "Strongly Disagree": "maroon",
                      };
                      const color = colorMap[ans] || "default";
                      const display =
                        ans === "Neutral" ? "Neither Agree nor Disagree" : ans;
                      return <Tag color={color}>{display}</Tag>;
                    },
                  },
                  {
                    title: "Submitted At",
                    dataIndex: "submittedAt",
                    key: "submittedAt",
                  },
                ]}
              />
            </Space>
          </Modal>

          {/* Recent Surveyed Clients Table */}
          <Row gutter={[24, 24]}>
            <Col span={24}>
              <Card
                title="Recent Survey Submissions"
                className="dashboard-card"
              >
                <Table
                  columns={recentSurveysColumns}
                  dataSource={stats.recentSurveys}
                  rowKey="id"
                  pagination={{ pageSize: 5 }}
                  scroll={{ x: "max-content" }}
                />
              </Card>
            </Col>
          </Row>
        </Space>
      )}
    </div>
  );
}

export default Dashboard;
