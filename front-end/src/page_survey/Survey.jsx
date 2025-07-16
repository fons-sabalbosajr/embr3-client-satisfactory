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
} from "antd";
import Swal from "sweetalert2";
import {
  ArrowRightOutlined,
  ArrowLeftOutlined,
  LoadingOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import "./survey.css";
import { getQuestions, submitFeedback } from "../services/api";
import { useNavigate } from "react-router-dom";
import EMBLogo from "../assets/emblogo.svg";
import BPLogo from "../assets/bplogo.svg";
import ClientInfoCard from "./components/ClientInfoCard";
import FeedbackTable from "./components/FeedbackTable";
import SQDTable from "./components/SQDTable";
import { chunk } from "lodash";
import { v4 as uuidv4 } from "uuid";

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

  useEffect(() => {
    const fetchQuestionsData = async () => {
      try {
        setLoading(true);
        const fetchedResponse = await getQuestions();
        let questionsArray = [];

        if (Array.isArray(fetchedResponse)) {
          questionsArray = fetchedResponse;
        } else if (fetchedResponse?.data) {
          questionsArray = fetchedResponse.data;
        } else if (fetchedResponse?.questions) {
          questionsArray = fetchedResponse.questions;
        }

        if (!Array.isArray(questionsArray)) {
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

  const currentQuestion = allQuestions[currentQuestionIndex];

  const renderQuestionInput = (question) => {
    const formItemName = `answer_${question._id}`;
    if (question._id === MERGED_CUSTOMER_AGE_GENDER_QID) {
      return (
        <ClientInfoCard
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

  const buildGroupedSummaryHTML = () => {
    const sections = {
      "Personal Information": [],
      "Citizen’s Charter": [],
      "Service Quality Dimensions": [],
      "Remarks / Suggestions": [],
    };

    // Flatten questions from merged blocks for lookup
    const questionMap = {};
    allQuestions.forEach((q) => {
      if (q.isMerged) {
        if (Array.isArray(q.questions)) {
          q.questions.forEach((subQ) => {
            questionMap[subQ._id.toString()] = subQ;
          });
        }
        if (Array.isArray(q.groupedSQD)) {
          q.groupedSQD.flat().forEach((subQ) => {
            questionMap[subQ._id.toString()] = subQ;
          });
        }
        if (q.extraQuestion?._id) {
          questionMap[q.extraQuestion._id.toString()] = q.extraQuestion;
        }
      } else {
        questionMap[q._id.toString()] = q;
      }
    });

    // Manual label for merged personal info fields
    const fieldLabels = {
      region: "Region",
      agency: "Agency",
      customerType: "Customer Type",
      companyName: "Establishment/Proponent Name",
      gender: "Gender",
      age: "Age",
      serviceAvailed: "Service Availed",
    };

    for (const [key, value] of Object.entries(answers)) {
      if (!key.startsWith("answer_")) continue;

      const id = key.replace("answer_", "");
      let label = key;
      let display = Array.isArray(value) ? value.join(", ") : value;

      if (id.startsWith("merged_customer_age_gender_question_")) {
        const field = id.replace("merged_customer_age_gender_question_", "");
        label = fieldLabels[field] || field;
        sections["Personal Information"].push({ label, value: display });
        continue;
      }

      const question = questionMap[id];
      if (!question) {
        sections["Remarks / Suggestions"].push({ label: id, value: display });
        continue;
      }

      label = question.questionText || id;
      const code = question.questionCode || "";

      if (["Q7", "Q8", "Q9"].includes(code)) {
        sections["Citizen’s Charter"].push({ label, value: display });
      } else if (
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
        ].includes(code)
      ) {
        sections["Service Quality Dimensions"].push({ label, value: display });
      } else if (code === "Q19") {
        sections["Remarks / Suggestions"].push({ label, value: display });
      }
    }

    const renderSectionTable = (title, items) => {
      if (!items.length) return "";

      const rows = items
        .map(
          (item) => `
          <tr>
            <td style="font-weight:500; text-align:left; padding:6px; border:1px solid #ccc; width: 60%; word-break: break-word; vertical-align: top;">
              ${item.label}
            </td>
            <td style="padding:6px; border:1px solid #ccc; width: 40%; word-break: break-word; vertical-align: middle;">
              ${item.value}
            </td>
          </tr>`
        )
        .join("");

      return `
      <h3 style="margin-top:5px; margin-bottom:6px; font-size:14px; font-weight:600;">${title}</h3>
      <table style="width:100%; border-collapse:collapse; margin-bottom:6px; font-size:12px; table-layout:fixed;">
        <tbody>${rows}</tbody>
      </table>
`;
    };

    return Object.entries(sections)
      .map(([title, items]) => renderSectionTable(title, items))
      .join("");
  };

  const handleNextQuestion = async () => {
    try {
      if (currentQuestion.questionType === "merged_sqd_table") {
        const group = currentQuestion.groupedSQD[currentSQDGroupIndex];
        const isLastGroup =
          currentSQDGroupIndex === currentQuestion.groupedSQD.length - 1;
        const fieldNames = group.map((q) => `answer_${q._id}`);
        if (isLastGroup && currentQuestion.extraQuestion) {
          fieldNames.push(`answer_${currentQuestion.extraQuestion._id}`);
        }
        await form.validateFields(fieldNames);
        if (!isLastGroup) {
          setCurrentSQDGroupIndex((prev) => prev + 1);
          return;
        }
      } else {
        await form.validateFields();
      }

      const isLast = currentQuestionIndex === allQuestions.length - 1;
      if (isLast) {
        const result = await Swal.fire({
          title: "Client Response Summary",
          html: buildGroupedSummaryHTML(),
          showCancelButton: true,
          confirmButtonText: "Submit Response",
          cancelButtonText: "Review again",
          width: 800,
        });

        if (result.isConfirmed) {
          const payload = { answers, deviceId };
          await submitFeedback(payload);
          Swal.fire("Success", "Survey submitted successfully!", "success");
          navigate("/");
        }
      } else {
        setCurrentQuestionIndex((prev) => prev + 1);
        setCurrentSQDGroupIndex(0);
      }
    } catch (err) {
      console.warn("Validation error:", err);
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
      <header className="agency-header">
        <div className="agency-header-inner">
          <div className="agency-header-top">
            <div className="agency-header-logos">
              <img src={EMBLogo} alt="EMB Logo" className="logo-svg-emb" />
              <img src={BPLogo} alt="BP Logo" className="logo-svg-bp" />
            </div>
            <div className="agency-header-toggle">
              <FloatButton
                icon={<BulbOutlined />}
                onClick={toggleColorScheme}
              />
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

      <Card className="survey-page-content" bordered={false}>
        <Steps
          progressDot
          current={
            currentQuestion._id === MERGED_CUSTOMER_AGE_GENDER_QID
              ? 0
              : currentQuestion._id === MERGED_CCSQD_QID
              ? 1
              : 2
          }
          items={[
            { title: "Primary Info" },
            { title: "Citizens Charter" },
            { title: "Service Quality Dimensions (SQD)" },
          ]}
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
            />
          ) : (
            renderQuestionInput(currentQuestion)
          )}
        </Form>

        <Space style={{ marginTop: 20 }}>
          <Button
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
            icon={<ArrowLeftOutlined />}
          >
            Previous
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
                  ? "Next"
                  : currentQuestionIndex === allQuestions.length - 1
                  ? "Submit"
                  : "Next";
              }
              return currentQuestionIndex === allQuestions.length - 1
                ? "Submit"
                : "Next";
            })()}
          </Button>
        </Space>
      </Card>

      <FloatButton icon={<BulbOutlined />} onClick={toggleColorScheme} />
      <footer className="survey-footer">
        <span>
          &copy; {new Date().getFullYear()} Environmental Management Bureau
          Region III. All rights reserved.
        </span>
      </footer>
    </div>
  );
}

export default Survey;
