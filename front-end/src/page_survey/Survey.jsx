import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Space,
  Typography,
  Button,
  Form,
  Spin,
  Alert,
  Steps,
  FloatButton,
  Dropdown,
} from "antd";
import Swal from "sweetalert2";
import {
  ArrowRightOutlined,
  ArrowLeftOutlined,
  LoadingOutlined,
  BulbOutlined,
  HomeOutlined,
  TranslationOutlined,
  IdcardOutlined,
  FileTextOutlined,
  StarOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import "./survey.css";
import { useSearchParams } from "react-router-dom";
import { getQuestions, submitFeedback } from "../services/api";
import { useNavigate } from "react-router-dom";
import EMBLogo from "../assets/emblogo.svg";
import BPLogo from "../assets/bplogo.svg";
import ClientInfoCard from "./components/ClientInfoCard";
import FeedbackTable from "./components/FeedbackTable";
import SQDTable from "./components/SQDTable";
import { chunk } from "lodash";
import { v4 as uuidv4 } from "uuid";
import i18n from "../i18n";
import { useTranslation } from "react-i18next";
import { buildGroupedSummaryHTML } from "./constants/buildGroupedSummaryHTML";
import {
  AUTO_REGION,
  AUTO_AGENCY,
  MERGED_CUSTOMER_AGE_GENDER_QID,
  MERGED_CCSQD_QID,
} from "./constants/surveyMeta";

const { Title, Text, Paragraph } = Typography;
const deviceId = uuidv4();

function Survey({ toggleColorScheme }) {
  const [allQuestions, setAllQuestions] = useState([]);
  const [ccQuestions, setCCQuestions] = useState([]);
  const [sqdQuestions, setSQDQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentSQDGroupIndex, setCurrentSQDGroupIndex] = useState(0);
  const [currentCCPageIndex, setCurrentCCPageIndex] = useState(0);
  const [form] = Form.useForm();
  const [answers, setAnswers] = useState({});
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [searchParams] = useSearchParams();
  const language = searchParams.get("lang") || "en"; // fallback
  const [currentLang, setCurrentLang] = useState(language);
  const { t, i18n } = useTranslation();
  const [originalQuestionData, setOriginalQuestionData] = useState([]);

  const watchedValues = Form.useWatch([], form);

  useEffect(() => {
    const fetchQuestionsData = async () => {
      try {
        setLoading(true);
        const fetchedResponse = await getQuestions();
        //console.log("Fetched questions response:", fetchedResponse);
        let questionsArray = [];

        if (Array.isArray(fetchedResponse)) {
          questionsArray = fetchedResponse;
        } else if (fetchedResponse && Array.isArray(fetchedResponse.data)) {
          questionsArray = fetchedResponse.data;
        } else if (
          fetchedResponse &&
          Array.isArray(fetchedResponse.questions)
        ) {
          questionsArray = fetchedResponse.questions;
        } else {
          throw new Error("Invalid data structure");
        }

        const customerTypeQ = questionsArray.find(
          (q) => q.questionText === "Customer type:"
        );
        const ageQ = questionsArray.find((q) => q.questionText === "Age:");
        const sexQ = questionsArray.find((q) => q.questionText === "Sex:");
        const serviceAvailedQ = questionsArray.find(
          (q) => q.questionText === "Service Availed:"
        );

        // Use DB-provided options for Service Availed (Q5) as the source of truth.

        const ccQs = questionsArray.filter((q) =>
          ["Q7", "Q8", "Q9"].includes(q.questionCode)
        );
        const sqdQs = questionsArray.filter((q) =>
          [
            "Q10",
            "Q11",
            "Q12",
            "Q13",
            "Q14",
            "Q15",
            "Q16",
            "Q17",
            "Q18",
          ].includes(q.questionCode)
        );
        setCCQuestions(ccQs);
        setSQDQuestions(sqdQs);

        const q18 = questionsArray.find((q) => q.questionCode === "Q19");
        const groupedSQD = chunk(sqdQs, 2);

        const filteredQuestions = [
          {
            _id: MERGED_CUSTOMER_AGE_GENDER_QID,
            questionType: "merged_customer_age_gender",
            options: {
              customerTypeOptions: customerTypeQ?.options || [],
              genderOptions: sexQ?.options || [],
              region: AUTO_REGION,
              agency: AUTO_AGENCY,
              serviceOptions: serviceAvailedQ?.options || [],
            },
            isMerged: true,
          },
          {
            _id: MERGED_CCSQD_QID,
            questionType: "merged_table",
            isMerged: true,
            questions: ccQs,
          },
          {
            _id: "merged_sqd",
            questionType: "merged_sqd_table",
            isMerged: true,
            groupedSQD,
            extraQuestion: q18 || null,
          },
        ];

        setAllQuestions(filteredQuestions);
        setOriginalQuestionData(questionsArray);
        setAnswers((prev) => ({
          ...prev,
          [`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_region`]: AUTO_REGION,
          [`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_agency`]: AUTO_AGENCY,
        }));

        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch questions:", err);
        setError(t("loadError", "Failed to load questions. Check the API or network."));
        setLoading(false);
      }
    };

    fetchQuestionsData();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    i18n.changeLanguage(currentLang);
  }, [currentLang]);

  const currentQuestion = allQuestions[currentQuestionIndex] || null;

  const ccGroups = useMemo(() => chunk(ccQuestions || [], 2), [ccQuestions]);

  useEffect(() => {
    if (!currentQuestion) return;
    if (currentQuestion._id !== MERGED_CCSQD_QID) {
      setCurrentCCPageIndex(0);
    }
  }, [currentQuestion?._id]);

  useEffect(() => {
    const cardEl = document.querySelector(".survey-page-content");
    cardEl?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentQuestionIndex, currentSQDGroupIndex]);

  const stepItems = [
    {
      title: (
        <span className="survey-step-title">
          <IdcardOutlined className="survey-step-icon" />
          {t("step.primaryInfo")}
        </span>
      ),
    },
    {
      title: (
        <span className="survey-step-title">
          <FileTextOutlined className="survey-step-icon" />
          {t("step.citizensCharter")}
        </span>
      ),
    },
    {
      title: (
        <span className="survey-step-title">
          <StarOutlined className="survey-step-icon" />
          {isMobile ? t("step.sqdShort") : t("step.sqdFull")}
        </span>
      ),
    },
  ];

  const stepIndex =
    currentQuestion?._id === MERGED_CUSTOMER_AGE_GENDER_QID
      ? 0
      : currentQuestion?._id === MERGED_CCSQD_QID
      ? 1
      : 2;

  const stepState = useMemo(() => {
    const values = { ...(answers || {}), ...(watchedValues || {}) };
    if (!currentQuestion) {
      return { canProceed: false, hint: t("loading", { defaultValue: "Loading…" }) };
    }

    if (currentQuestion._id === MERGED_CUSTOMER_AGE_GENDER_QID) {
      const base = `answer_${MERGED_CUSTOMER_AGE_GENDER_QID}`;
      const customerType = values[`${base}_customerType`];
      const serviceAvailed = values[`${base}_serviceAvailed`];
      const gender = values[`${base}_gender`];
      const companyName = values[`${base}_companyName`];
      const agencyName = values[`${base}_agencyName`];

      if (!customerType) {
        return {
          canProceed: false,
          hint: "",
        };
      }

      const serviceOk = Array.isArray(serviceAvailed)
        ? serviceAvailed.length > 0
        : !!serviceAvailed;

      if (!serviceOk) {
        return {
          canProceed: false,
          hint: t("survey.hint.selectService", {
            defaultValue: "Select at least one service availed.",
          }),
        };
      }

      if (customerType === "Citizen" && !gender) {
        return {
          canProceed: false,
          hint: t("survey.hint.selectGender", {
            defaultValue: "Select your gender to continue.",
          }),
        };
      }

      if (customerType === "Business" && !companyName) {
        return {
          canProceed: false,
          hint: t("survey.hint.enterCompany", {
            defaultValue: "Enter your company name to continue.",
          }),
        };
      }

      if (customerType === "Government" && !agencyName) {
        return {
          canProceed: false,
          hint: t("survey.hint.enterAgency", {
            defaultValue: "Enter your agency name to continue.",
          }),
        };
      }

      return { canProceed: true, hint: "" };
    }

    if (currentQuestion._id === MERGED_CCSQD_QID) {
      const isLastCCPage = currentCCPageIndex >= (ccGroups.length || 1) - 1;
      if (!isLastCCPage) {
        return { canProceed: true, hint: "" };
      }

      const ccKeys = (ccQuestions || []).map((q) => `answer_${q._id}`);
      const answeredCount = ccKeys.reduce((count, key) => {
        const val = values[key];
        return val !== undefined && val !== null && val !== "" ? count + 1 : count;
      }, 0);

      if (answeredCount < 1) {
        return {
          canProceed: false,
          hint:
            t("summary.atLeastOneCCRequired") ||
            "Answer at least one question on this page to continue.",
        };
      }
      return { canProceed: true, hint: "" };
    }

    if (currentQuestion.questionType === "merged_sqd_table") {
      const group = currentQuestion.groupedSQD?.[currentSQDGroupIndex] || [];
      const missing = group.filter((q) => {
        const v = values[`answer_${q._id}`];
        return v === undefined || v === null || v === "";
      });
      if (missing.length > 0) {
        return {
          canProceed: false,
          hint:
            t("survey.hint.rateRemaining", {
              defaultValue: "Please rate the remaining items to continue.",
            }) +
            ` (${missing.length})`,
        };
      }
      return { canProceed: true, hint: "" };
    }

    return { canProceed: true, hint: "" };
  }, [
    answers,
    watchedValues,
    currentQuestion,
    currentSQDGroupIndex,
    ccQuestions,
    currentCCPageIndex,
    ccGroups.length,
    t,
  ]);

  const sectionMeta = (() => {
    if (stepIndex === 0)
      return {
        icon: <IdcardOutlined />,
        title: t("step.primaryInfo"),
        desc:
          t("survey.primaryInfoDesc", {
            defaultValue: "Tell us about your visit.",
          }),
      };
    if (stepIndex === 1)
      return {
        icon: <FileTextOutlined />,
        title: t("step.citizensCharter"),
        desc:
          t("survey.citizensCharterDesc", {
            defaultValue: "Quick questions about service standards.",
          }),
      };
    return {
      icon: <StarOutlined />,
      title: isMobile ? t("step.sqdShort") : t("step.sqdFull"),
      desc:
        t("survey.sqdDesc", {
          defaultValue: "Rate your experience.",
        }),
    };
  })();

  const languageItems = [
    {
      key: "en",
      label: "🇬🇧 English",
    },
    {
      key: "fil",
      label: "🇵🇭 Filipino",
    },
  ];

  const handleSubmit = async (formValues) => {
    try {
      await submitFeedback({ answers: formValues, deviceId });

      await Swal.fire({
        icon: "success",
        title: t("thankYou"),
        text: t("summary.thankYou") || t("thankYou"),
        confirmButtonText: t("summary.submit"),
      });

      // Show agency contact info prompt
      await Swal.fire({
        html: `
          <div style="text-align:center;font-family:inherit;">
            <div style="margin-bottom:14px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </div>
            <h3 style="margin:0 0 4px;font-size:17px;font-weight:700;color:inherit;">
              ${t("agencyPrompt.title")}
            </h3>
            <p style="margin:0 0 16px;font-size:13px;color:#64748b;">
              ${t("agencyPrompt.subtitle")}
            </p>
            <div style="display:flex;flex-direction:column;gap:10px;align-items:center;">
              <a href="https://facebook.com/EMB3Official" target="_blank" rel="noopener noreferrer"
                style="display:inline-flex;align-items:center;gap:8px;padding:8px 18px;border-radius:10px;background:#1877f2;color:#fff;text-decoration:none;font-size:13px;font-weight:600;width:fit-content;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                EMB3Official
              </a>
              <a href="https://r3.emb.gov.ph" target="_blank" rel="noopener noreferrer"
                style="display:inline-flex;align-items:center;gap:8px;padding:8px 18px;border-radius:10px;background:linear-gradient(90deg,#0ea5e9,#22c55e);color:#fff;text-decoration:none;font-size:13px;font-weight:600;width:fit-content;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                r3.emb.gov.ph
              </a>
              <a href="tel:0459633623"
                style="display:inline-flex;align-items:center;gap:8px;padding:8px 18px;border-radius:10px;background:#f1f5f9;color:#0f172a;text-decoration:none;font-size:13px;font-weight:600;width:fit-content;border:1px solid #e2e8f0;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                (045) 963-3623
              </a>
            </div>
          </div>
        `,
        confirmButtonText: t("agencyPrompt.close", "Close"),
        confirmButtonColor: "#0ea5e9",
        showCloseButton: true,
        customClass: {
          popup: "swal-agency-popup",
        },
      });

      navigate("/client");
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: t("summary.submissionFailed") || "Submission Failed",
        text:
          error?.response?.data?.message ||
          error.message ||
          t("summary.submissionError") ||
          "An error occurred while submitting feedback.",
      });
    }
  };

  const renderQuestionInput = (question) => {
    const formItemName = `answer_${question._id}`;
    if (question._id === MERGED_CUSTOMER_AGE_GENDER_QID) {
      return (
        <ClientInfoCard
          key={currentLang}
          formItemName={formItemName}
          form={form}
          options={question.options}
        />
      );
    }

    return (
      <Form.Item
        name={formItemName}
        rules={[{ required: true, message: t("pleaseFillOut", "Please fill this out.") }]}
      >
        <input type="text" placeholder={t("answerHere", "Answer here...")} />
      </Form.Item>
    );
  };

  const handleNextQuestion = async () => {
    if (currentQuestion._id === MERGED_CUSTOMER_AGE_GENDER_QID) {
      const base = `answer_${MERGED_CUSTOMER_AGE_GENDER_QID}`;
      const values = form.getFieldsValue(true);
      const customerType = values[`${base}_customerType`];
      const fieldsToValidate = [
        `${base}_customerType`,
        `${base}_serviceAvailed`,
      ];
      if (customerType === "Citizen") fieldsToValidate.push(`${base}_gender`);
      if (customerType === "Business") fieldsToValidate.push(`${base}_companyName`);
      if (customerType === "Government") fieldsToValidate.push(`${base}_agencyName`);

      try {
        await form.validateFields(fieldsToValidate);
      } catch (err) {
        // Validation failed, do not proceed
        return;
      }
    }

    // Citizens Charter paging + rule: at least one answer required before leaving CC
    if (currentQuestion._id === MERGED_CCSQD_QID) {
      const isLastCCPage = currentCCPageIndex >= (ccGroups.length || 1) - 1;
      if (!isLastCCPage) {
        setCurrentCCPageIndex((prev) => prev + 1);
        return;
      }

      const formValues = form.getFieldsValue(true);
      const ccAnswerKeys = ccQuestions.map((q) => `answer_${q._id}`);
      const hasAtLeastOneAnswer = ccAnswerKeys.some((key) => {
        const val = formValues[key];
        return val !== undefined && val !== null && val !== "";
      });
      if (!hasAtLeastOneAnswer) {
        Swal.fire({
          icon: "warning",
          title: t("summary.incompleteCC"),
          text:
            t("summary.atLeastOneCCRequired") ||
            "Please answer at least one Citizens Charter question before proceeding.",
        });
        return;
      }
    }

    const formValues = form.getFieldsValue(true);

    // Check if we're in SQD grouped section
    if (currentQuestion.questionType === "merged_sqd_table") {
      const formValuesForSQD = form.getFieldsValue(true);
      const group = currentQuestion.groupedSQD?.[currentSQDGroupIndex] || [];
      const missing = group.filter((q) => {
        const v = formValuesForSQD[`answer_${q._id}`];
        return v === undefined || v === null || v === "";
      });
      if (missing.length > 0) {
        Swal.fire({
          icon: "warning",
          title: t("summary.incomplete", { defaultValue: "Incomplete" }),
          text:
            t("survey.hint.rateRemaining", {
              defaultValue: "Please rate the remaining items to continue.",
            }),
        });
        return;
      }

      const isLastSQDGroup =
        currentSQDGroupIndex >= currentQuestion.groupedSQD.length - 1;

      if (!isLastSQDGroup) {
        // Just go to next group of SQD questions
        setCurrentSQDGroupIndex((prev) => prev + 1);
        return;
      }
    }

    const isLastMainStep = currentQuestionIndex >= allQuestions.length - 1;

    if (!isLastMainStep) {
      // Go to next main step
      setCurrentQuestionIndex((prev) => prev + 1);
      setCurrentSQDGroupIndex(0); // Reset group index on step change
      setCurrentCCPageIndex(0);
      return;
    }

    // At final question and final group — show SweetAlert summary
    const summaryHTML = buildGroupedSummaryHTML(
      formValues,
      originalQuestionData,
      t
    );

    const result = await Swal.fire({
      title: t("summary.confirmTitle"),
      html: summaryHTML,
      showCancelButton: true,
      width: Math.min(window.innerWidth * 0.95, 600), // <-- dynamic width
      confirmButtonText: t("summary.submit"),
      cancelButtonText: t("summary.cancel"),
      customClass: {
        popup: "swal-wide",
      },
    });

    if (result.isConfirmed) {
      handleSubmit(formValues);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion._id === MERGED_CCSQD_QID && currentCCPageIndex > 0) {
      setCurrentCCPageIndex((prev) => prev - 1);
      return;
    }

    if (
      currentQuestion.questionType === "merged_sqd_table" &&
      currentSQDGroupIndex > 0
    ) {
      setCurrentSQDGroupIndex((prev) => prev - 1);
      return;
    }

    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      setCurrentSQDGroupIndex(0);
      setCurrentCCPageIndex(0);
    }
  };

  if (loading) {
    return (
      <div className="survey-page-container flex items-center justify-center min-h-screen">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="survey-page-container flex items-center justify-center min-h-screen">
        <Alert message={t("errorLabel", "Error")} description={error} type="error" showIcon />
      </div>
    );
  }

  return (
    <div className="survey-page-container">
      <header className="agency-header-survey">
        <div className="agency-header-inner-survey">
          <img src={EMBLogo} alt="EMB Logo" className="logo-svg-emb" />

          <div className="agency-header-text">
            <span className="republic-text">{t("agencyTitle")}</span>
            <span className="department-text">
              {t("department")}
            </span>
            <span className="bureau-text">
              {t("bureau")}
            </span>
            <span className="address-text">
              {t("address1")}, {t("address2")}
            </span>
          </div>

          <img src={BPLogo} alt="BP Logo" className="logo-svg-bp" />
        </div>
      </header>
      <Card className="survey-page-content">
        <div className="survey-intro">
          <div className="survey-intro-left">
            <div className="survey-title-row">
              <SafetyCertificateOutlined className="survey-title-icon" />
              <Title level={2} className="survey-title">
                {t("survey.title", {
                  defaultValue: "Client Satisfaction Survey",
                })}
              </Title>
            </div>
            <Paragraph className="survey-subtitle">
              {t("survey.subtitle", {
                defaultValue:
                  "Takes about 2–3 minutes.",
              })}
            </Paragraph>
          </div>
          <div className="survey-intro-right">
            <div className="survey-section-pill">
              <span className="survey-section-pill-icon">{sectionMeta.icon}</span>
              <span className="survey-section-pill-text">{sectionMeta.title}</span>
            </div>
            {currentQuestion?.questionType === "merged_sqd_table" && (
              <Text className="survey-group-indicator">
                {t("survey.group", { defaultValue: "Group" })} {currentSQDGroupIndex + 1} / {currentQuestion.groupedSQD.length}
              </Text>
            )}
            {currentQuestion?._id === MERGED_CCSQD_QID && ccGroups.length > 1 && (
              <Text className="survey-group-indicator">
                {t("survey.page", { defaultValue: "Page" })} {currentCCPageIndex + 1} / {ccGroups.length}
              </Text>
            )}
          </div>
        </div>

        <Steps
          progressDot
          direction="horizontal"
          responsive={false}
          current={stepIndex}
          items={stepItems}
          className="survey-steps"
        />
        <Form
          form={form}
          layout="vertical"
          initialValues={answers}
          onValuesChange={(changed) =>
            setAnswers((prev) => ({ ...prev, ...changed }))
          }
        >
          <div
            className="survey-step-panel"
            key={`${currentQuestionIndex}-${currentSQDGroupIndex}-${currentLang}`}
          >
            <div className="survey-section-header">
              <div className="survey-section-header-icon">{sectionMeta.icon}</div>
              <div className="survey-section-header-text">
                <Title level={3} className="survey-section-title">
                  {sectionMeta.title}
                </Title>
                <Text className="survey-section-desc">{sectionMeta.desc}</Text>
              </div>
            </div>

            {currentQuestion._id === MERGED_CCSQD_QID ? (
              <FeedbackTable
                key={currentLang}
                language={currentLang}
                questions={currentQuestion.questions}
                visibleQuestions={ccGroups[currentCCPageIndex]}
                renderInput={renderQuestionInput}
                form={form}
                answers={answers}
              />
            ) : currentQuestion.questionType === "merged_sqd_table" ? (
              <SQDTable
                group={currentQuestion.groupedSQD[currentSQDGroupIndex]}
                form={form}
                extraQuestion={
                  currentSQDGroupIndex === currentQuestion.groupedSQD.length - 1
                    ? currentQuestion.extraQuestion
                    : null
                }
                onAnswerChange={(field, value) =>
                  setAnswers((prev) => ({ ...prev, [field]: value }))
                }
                startIndex={currentQuestion.groupedSQD
                  .slice(0, currentSQDGroupIndex)
                  .reduce((sum, group) => sum + group.length, 1)}
              />
            ) : (
              renderQuestionInput(currentQuestion)
            )}
          </div>
        </Form>

        <div className="survey-actions">
          <Space size="middle" wrap className="survey-actions-inner">
            <Button
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              icon={<ArrowLeftOutlined />}
              className="survey-btn"
            >
              {t("back")}
            </Button>

            <Button
              type="primary"
              onClick={handleNextQuestion}
              disabled={!stepState.canProceed}
              icon={<ArrowRightOutlined />}
              className="survey-btn survey-btn-primary"
            >
              {(() => {
                if (currentQuestion.questionType === "merged_sqd_table") {
                  return currentSQDGroupIndex <
                    currentQuestion.groupedSQD.length - 1
                    ? t("next")
                    : currentQuestionIndex === allQuestions.length - 1
                    ? t("submitSurvey")
                    : t("next");
                }
                if (currentQuestion._id === MERGED_CCSQD_QID) {
                  const isLastCCPage = currentCCPageIndex >= (ccGroups.length || 1) - 1;
                  if (!isLastCCPage) return t("next");
                  return currentQuestionIndex === allQuestions.length - 1
                    ? t("submitSurvey")
                    : t("next");
                }
                return currentQuestionIndex === allQuestions.length - 1
                  ? t("submitSurvey")
                  : t("next");
              })()}
            </Button>

            <Button
              danger
              type="primary"
              icon={<HomeOutlined />}
              onClick={() => {
                Swal.fire({
                  title: t("summary.exitTitle") || "Exit Survey?",
                  text:
                    t("summary.exitText") ||
                    "Are you sure you want to return home? Your progress will not be saved.",
                  icon: "warning",
                  showCancelButton: true,
                  confirmButtonText: t("summary.quitSurvey") || "Quit Survey",
                  cancelButtonText: t("summary.stay") || "Stay",
                }).then((result) => {
                  if (result.isConfirmed) {
                    navigate("/client");
                  }
                });
              }}
              className="survey-btn"
            >
              {t("summary.quitSurvey") || "Quit"}
            </Button>
          </Space>

        </div>
      </Card>

      <FloatButton.Group shape="circle">
        <FloatButton
          icon={<BulbOutlined />}
          onClick={toggleColorScheme}
          tooltip={<div>{t("toggleTheme", "Toggle Theme")}</div>}
        />

        <Dropdown
          menu={{
            items: languageItems,
            onClick: ({ key }) => {
              setCurrentLang(key);
              i18n.changeLanguage(key); // <-- make it global
            },
          }}
          placement="topRight"
          trigger={["click"]}
        >
          <FloatButton
            icon={<span>{currentLang === "fil" ? "🇵🇭" : "🇬🇧"}</span>}
          />
        </Dropdown>
      </FloatButton.Group>
      <footer className="survey-footer">
        <span>
          &copy; {new Date().getFullYear()} {t("surveyFooter")}
        </span>
      </footer>
    </div>
  );
}

export default Survey;
