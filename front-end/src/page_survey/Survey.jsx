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
        const groupedSQD = chunk(sqdQs, 3);

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
        setError("Failed to load questions. Check the API or network.");
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
          hint: t("survey.hint.selectClientType", {
            defaultValue: "Select your client type to continue.",
          }),
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
  }, [answers, watchedValues, currentQuestion, currentSQDGroupIndex, ccQuestions, t]);

  const sectionMeta = (() => {
    if (stepIndex === 0)
      return {
        icon: <IdcardOutlined />,
        title: t("step.primaryInfo"),
        desc:
          t("survey.primaryInfoDesc", {
            defaultValue: "Tell us a bit about your visit so we can serve you better.",
          }),
      };
    if (stepIndex === 1)
      return {
        icon: <FileTextOutlined />,
        title: t("step.citizensCharter"),
        desc:
          t("survey.citizensCharterDesc", {
            defaultValue:
              "A few quick questions about the Citizen’s Charter and service standards.",
          }),
      };
    return {
      icon: <StarOutlined />,
      title: isMobile ? t("step.sqdShort") : t("step.sqdFull"),
      desc:
        t("survey.sqdDesc", {
          defaultValue:
            "Rate your experience. Your answers help improve public service.",
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

      Swal.fire({
        icon: "success",
        title: t("thankYou"),
        text: t("summary.thankYou") || t("thankYou"),
        confirmButtonText: t("summary.submit"),
      }).then(() => {
        navigate("/");
      });
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
        rules={[{ required: true, message: "Please fill this out." }]}
      >
        <input type="text" placeholder="Answer here..." />
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

    // Citizens Charter: at least one answer required
    if (currentQuestion._id === MERGED_CCSQD_QID) {
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
        <Alert message="Error" description={error} type="error" showIcon />
      </div>
    );
  }

  return (
    <div className="survey-page-container">
      <header className="agency-header-survey">
        <div className="agency-header-inner-survey">
          <div className="agency-header-top">
            <div className="agency-header-logos">
              <img src={EMBLogo} alt="EMB Logo" className="logo-svg-emb" />
              <img src={BPLogo} alt="BP Logo" className="logo-svg-bp" />
            </div>
          </div>

          <div className="agency-header-text">
            <span className="republic-text">Republic of the Philippines</span>
            <span className="department-text">
              Department of Environment and Natural Resources
            </span>
            <span className="bureau-text">
              ENVIRONMENTAL MANAGEMENT BUREAU REGION III
            </span>
            <span className="address-text">
              Masinop Corner Matalino St., Diosdado Macapagal Government Center,
              Maimpis, City of San Fernando, Pampanga
            </span>
          </div>
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
                  "Please answer honestly. This form takes about 2–3 minutes.",
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
                    navigate("/");
                  }
                });
              }}
              className="survey-btn"
            >
              {t("summary.quitSurvey") || "Quit"}
            </Button>
          </Space>

          {!stepState.canProceed && (
            <div className="survey-actions-hint">
              <Text className="survey-actions-hint-text">{stepState.hint}</Text>
            </div>
          )}
        </div>
      </Card>

      <FloatButton.Group shape="circle">
        <FloatButton
          icon={<BulbOutlined />}
          onClick={toggleColorScheme}
          tooltip={<div>Toggle Theme</div>}
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
          &copy; {new Date().getFullYear()} Environmental Management Bureau
          Region III Online Customer Satisfaction Measurement. All rights
          reserved.
        </span>
      </footer>
    </div>
  );
}

export default Survey;
