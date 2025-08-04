import React, { useEffect, useState } from "react";
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

const { Title } = Typography;
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

  const stepItems = [
    { title: t("step.primaryInfo") },
    { title: t("step.citizensCharter") },
    {
      title: isMobile ? t("step.sqdShort") : t("step.sqdFull"),
    },
  ];

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

  const currentQuestion = allQuestions[currentQuestionIndex];

  const handleSubmit = async (formValues) => {
    const API_URL = import.meta.env.VITE_API_URL;

    try {
      const response = await fetch(`${API_URL}/client-satisfactory/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answers: formValues,
          deviceId,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }

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
      try {
        await form.validateFields([
          `answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_customerType`,
          `answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_age`,
          `answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_gender`,
          `answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_serviceAvailed`,
          // Optionally add companyName/agencyName if needed
        ]);
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
        <Steps
          progressDot
          direction="horizontal"
          responsive={false}
          current={
            currentQuestion._id === MERGED_CUSTOMER_AGE_GENDER_QID
              ? 0
              : currentQuestion._id === MERGED_CCSQD_QID
              ? 1
              : 2
          }
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
          <Title level={4}>{currentQuestion.questionText}</Title>

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
        </Form>

        <div style={{ textAlign: "center", marginTop: 10 }}>
          <Space size="middle" wrap>
            <Button
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              icon={<ArrowLeftOutlined />}
            >
              {t("back")}
            </Button>

            <Button
              type="primary"
              onClick={handleNextQuestion}
              icon={<ArrowRightOutlined />}
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
