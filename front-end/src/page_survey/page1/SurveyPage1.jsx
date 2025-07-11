// src/pages/SurveyPage1.jsx
import React, { useEffect, useState } from "react";
import {
  Card,
  Space,
  Typography,
  Button,
  Radio,
  Select, // Keep Select for CCC questions
  Input,
  Form,
  Spin,
  Alert,
  Steps,
  Rate,
  Modal, // Import Modal for better alerts
} from "antd";
import { ArrowRightOutlined, LoadingOutlined } from "@ant-design/icons";
import "./surveypage1.css";
import { getQuestions } from "../../services/api"; // Assuming this path is correct

const { Title, Text } = Typography;

// Define how many questions constitute one 'page' or step in your timeline
const QUESTIONS_PER_STEP = 5;

// Define automatic values for Region and Agency Visited
const AUTO_REGION = "Region III";
const AUTO_AGENCY = "EMB REGION III";

// Define unique IDs for our merged questions
const MERGED_REGION_AGENCY_QID = "merged_region_agency_question";
const MERGED_CUSTOMER_AGE_GENDER_QID = "merged_customer_age_gender_question"; // New merged ID

function SurveyPage1() {
  const [allQuestions, setAllQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [form] = Form.useForm();
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    const fetchQuestionsData = async () => {
      try {
        setLoading(true);
        const fetchedResponse = await getQuestions();
        console.log("API Response (raw):", fetchedResponse);

        let questionsArray = [];
        if (Array.isArray(fetchedResponse)) {
          questionsArray = fetchedResponse;
        } else if (
          fetchedResponse &&
          typeof fetchedResponse === "object" &&
          Array.isArray(fetchedResponse.data)
        ) {
          questionsArray = fetchedResponse.data;
        } else if (
          fetchedResponse &&
          typeof fetchedResponse === "object" &&
          Array.isArray(fetchedResponse.questions)
        ) {
          questionsArray = fetchedResponse.questions;
        } else if (
          !fetchedResponse ||
          (typeof fetchedResponse === "object" &&
            Object.keys(fetchedResponse).length === 0)
        ) {
          questionsArray = [];
        } else {
          console.warn(
            "Unexpected data structure received from API:",
            fetchedResponse
          );
          setError(
            "Received unexpected data format from the server. Please contact support."
          );
          setLoading(false);
          return;
        }

        // Filter out original Region, Agency, Customer Type, Age, and Sex questions
        const filteredQuestions = questionsArray.filter(
          (q) =>
            q.questionText !== "Region:" &&
            q.questionText !== "Agency visited:" &&
            q.questionText !== "Customer type:" &&
            q.questionText !== "Age:" &&
            q.questionText !== "Sex:"
        );

        // --- Create Merged Customer, Age, Gender Question (Q1-Q3) ---
        const customerTypeQ = questionsArray.find(
          (q) => q.questionText === "Customer type:"
        );
        const ageQ = questionsArray.find((q) => q.questionText === "Age:");
        const sexQ = questionsArray.find((q) => q.questionText === "Sex:");

        const mergedCustomerAgeGenderQuestion = {
          _id: MERGED_CUSTOMER_AGE_GENDER_QID,
          questionCode: "Q1-Q3",
          questionText: "Personal Information", // New title for the merged card
          questionType: "merged_customer_age_gender", // Custom type
          options: {
            // Store original options for rendering
            customerTypeOptions: customerTypeQ ? customerTypeQ.options : [],
            ageId: ageQ ? ageQ._id : null,
            genderOptions: sexQ ? sexQ.options : [],
            customerTypeId: customerTypeQ ? customerTypeQ._id : null,
            sexId: sexQ ? sexQ._id : null,
          },
          isMerged: true,
        };

        // Insert the merged Customer/Age/Gender question at the very beginning
        filteredQuestions.unshift(mergedCustomerAgeGenderQuestion);

        // --- Create Merged Region & Agency Question (Q3-Q4) ---
        const mergedRegionAgencyQuestion = {
          _id: MERGED_REGION_AGENCY_QID,
          questionCode: "Q4-Q5", // Adjust code after new Q1-Q3 merge
          questionText: "Region and Agency Visited",
          questionType: "merged_display",
          options: [],
          isMerged: true,
        };

        // Insert the merged Region/Agency question after Personal Info
        const afterPersonalInfoIndex = filteredQuestions.findIndex(
          (q) => q._id === MERGED_CUSTOMER_AGE_GENDER_QID
        );
        if (afterPersonalInfoIndex !== -1) {
          filteredQuestions.splice(
            afterPersonalInfoIndex + 1,
            0,
            mergedRegionAgencyQuestion
          );
        } else {
          // Fallback if personal info wasn't added (shouldn't happen)
          filteredQuestions.unshift(mergedRegionAgencyQuestion);
        }

        setAllQuestions(filteredQuestions);
        setLoading(false);

        // Pre-fill merged values directly into the answers state
        setAnswers((prevAnswers) => ({
          ...prevAnswers, // Keep any existing answers
          [`answer_${MERGED_REGION_AGENCY_QID}_region`]: AUTO_REGION,
          [`answer_${MERGED_REGION_AGENCY_QID}_agency`]: AUTO_AGENCY,
        }));
      } catch (err) {
        console.error("Failed to fetch questions:", err);
        setError(
          "Failed to load questions. Please ensure the server is running and try again later."
        );
        setLoading(false);
      }
    };
    fetchQuestionsData();
  }, []);

  // Calculate the current step for the timeline based on the current question index
  const totalPages = Math.ceil(allQuestions.length / QUESTIONS_PER_STEP);
  const currentTimelineStep = Math.floor(
    currentQuestionIndex / QUESTIONS_PER_STEP
  );

  // Generate the items for the Ant Design Steps component
  const stepItems = Array.from({ length: totalPages }).map((_, index) => {
    const startQ = index * QUESTIONS_PER_STEP + 1;
    const endQ = Math.min(
      (index + 1) * QUESTIONS_PER_STEP,
      allQuestions.length
    );
    return {
      title: `Section ${index + 1}`,
      description: `Q${startQ}-${endQ}`,
    };
  });

  const showCompletionModal = () => {
    Modal.info({
      title: 'Survey Completed!',
      content: 'Thank you for your feedback. Your responses have been recorded.',
      onOk() {
        // Optional: Redirect or reset survey
        console.log("Survey completion acknowledged.");
      },
    });
  };

  const handleNextQuestion = () => {
    // For merged read-only questions, skip validation
    if (
      currentQuestion &&
      (currentQuestion._id === MERGED_REGION_AGENCY_QID ||
        currentQuestion._id === MERGED_CUSTOMER_AGE_GENDER_QID)
    ) {
      if (currentQuestionIndex < allQuestions.length - 1) {
        setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
        const nextQuestionId = allQuestions[currentQuestionIndex + 1]._id;
        const nextQuestionText =
          allQuestions[currentQuestionIndex + 1].questionText;
        const fieldsToSet = {};

        // Pre-fill next question's direct answer
        if (answers[`answer_${nextQuestionId}`]) {
          fieldsToSet[`answer_${nextQuestionId}`] =
            answers[`answer_${nextQuestionId}`];
        }

        // If the next question is Customer Type, prefill its sub-fields too
        if (nextQuestionText === "Customer type:") {
          // This case is now mostly handled by merged customer type, but kept for robustness
          if (answers[`answer_${nextQuestionId}`] === "Business") {
            fieldsToSet[`answer_${nextQuestionId}_companyName`] =
              answers[`answer_${nextQuestionId}_companyName`];
          } else if (answers[`answer_${nextQuestionId}`] === "Government") {
            fieldsToSet[`answer_${nextQuestionId}_agencyName`] =
              answers[`answer_${nextQuestionId}_agencyName`];
          }
        }
        // Pre-fill merged Customer/Age/Gender fields if navigating back to it
        if (
          allQuestions[currentQuestionIndex + 1]._id ===
          MERGED_CUSTOMER_AGE_GENDER_QID
        ) {
          fieldsToSet[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_customerType`] =
            answers[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_customerType`];
          fieldsToSet[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_age`] =
            answers[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_age`];
          fieldsToSet[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_gender`] =
            answers[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_gender`];
          // Also prefill nested customer type inputs
          if (
            answers[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_customerType`] ===
            "Business"
          ) {
            fieldsToSet[
              `answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_companyName`
            ] = answers[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_companyName`];
          } else if (
            answers[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_customerType`] ===
            "Government"
          ) {
            fieldsToSet[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_agencyName`] =
              answers[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_agencyName`];
          }
        }
        form.setFieldsValue(fieldsToSet);
      } else {
        showCompletionModal(); // Use modal instead of alert
      }
      return; // Exit here, no validation needed for this question (it's handled by specific case)
    }

    form
      .validateFields()
      .then((values) => {
        const updatedAnswers = { ...answers };

        // Handle storing values for the merged Customer/Age/Gender card
        if (currentQuestion._id === MERGED_CUSTOMER_AGE_GENDER_QID) {
          updatedAnswers[
            `answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_customerType`
          ] = values[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_customerType`];
          updatedAnswers[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_age`] =
            values[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_age`];
          updatedAnswers[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_gender`] =
            values[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_gender`];

          // Handle nested Company Name/Agency Name for Customer Type
          if (
            values[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_customerType`] ===
            "Business"
          ) {
            updatedAnswers[
              `answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_companyName`
            ] = values[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_companyName`];
          } else {
            delete updatedAnswers[
              `answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_companyName`
            ]; // Clear if no longer Business
          }
          if (
            values[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_customerType`] ===
            "Government"
          ) {
            updatedAnswers[
              `answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_agencyName`
            ] = values[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_agencyName`];
          } else {
            delete updatedAnswers[
              `answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_agencyName`
            ]; // Clear if no longer Government
          }
        } else {
          // General case for other questions
          updatedAnswers[`answer_${currentQuestion._id}`] =
            values[`answer_${currentQuestion._id}`];

          // This logic is mostly for the old Customer Type question, now less relevant
          if (currentQuestion.questionText === "Customer type:") {
            if (values[`answer_${currentQuestion._id}`] === "Business") {
              updatedAnswers[`answer_${currentQuestion._id}_companyName`] =
                values[`answer_${currentQuestion._id}_companyName`];
            } else if (
              values[`answer_${currentQuestion._id}`] === "Government"
            ) {
              updatedAnswers[`answer_${currentQuestion._id}_agencyName`] =
                values[`answer_${currentQuestion._id}_agencyName`];
            }
          }
        }

        setAnswers(updatedAnswers);

        if (currentQuestionIndex < allQuestions.length - 1) {
          setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
          const nextQuestionId = allQuestions[currentQuestionIndex + 1]._id;
          const nextQuestionText =
            allQuestions[currentQuestionIndex + 1].questionText;
          const fieldsToSet = {};

          // Pre-fill next question's direct answer
          if (updatedAnswers[`answer_${nextQuestionId}`]) {
            fieldsToSet[`answer_${nextQuestionId}`] =
              updatedAnswers[`answer_${nextQuestionId}`];
          }

          // Pre-fill merged Customer/Age/Gender fields if navigating to it
          if (
            allQuestions[currentQuestionIndex + 1]._id ===
            MERGED_CUSTOMER_AGE_GENDER_QID
          ) {
            fieldsToSet[
              `answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_customerType`
            ] =
              updatedAnswers[
                `answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_customerType`
              ];
            fieldsToSet[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_age`] =
              updatedAnswers[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_age`];
            fieldsToSet[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_gender`] =
              updatedAnswers[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_gender`]; // Fixed typo here
            // Also prefill nested customer type inputs
            if (
              updatedAnswers[
                `answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_customerType`
              ] === "Business"
            ) {
              fieldsToSet[
                `answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_companyName`
              ] =
                updatedAnswers[
                  `answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_companyName`
                ];
            } else if (
              updatedAnswers[
                `answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_customerType`
              ] === "Government"
            ) {
              fieldsToSet[
                `answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_agencyName`
              ] =
                updatedAnswers[
                  `answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_agencyName`
                ];
            }
          }
          form.setFieldsValue(fieldsToSet);
        } else {
          showCompletionModal(); // Use modal instead of alert
        }
      })
      .catch((info) => {
        console.log("Validation failed:", info);
      });
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      const newIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(newIndex);

      const prevQuestion = allQuestions[newIndex];
      const prevQuestionId = prevQuestion._id;
      // const prevQuestionText = prevQuestion.questionText; // Not strictly needed here

      const fieldsToSet = {};

      // Prefill direct answer if it exists
      if (answers[`answer_${prevQuestionId}`]) {
        fieldsToSet[`answer_${prevQuestionId}`] =
          answers[`answer_${prevQuestionId}`];
      }

      // Special handling for the merged Customer/Age/Gender question when navigating back
      if (prevQuestion._id === MERGED_CUSTOMER_AGE_GENDER_QID) {
        fieldsToSet[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_customerType`] =
          answers[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_customerType`];
        fieldsToSet[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_age`] =
          answers[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_age`];
        fieldsToSet[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_gender`] =
          answers[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_gender`];
        // Also prefill nested customer type inputs
        if (
          answers[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_customerType`] ===
          "Business"
        ) {
          fieldsToSet[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_companyName`] =
            answers[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_companyName`];
        } else if (
          answers[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_customerType`] ===
          "Government"
        ) {
          fieldsToSet[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_agencyName`] =
            answers[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_agencyName`];
        }
      }
      // Special handling for the merged Region/Agency question when navigating back
      if (prevQuestion._id === MERGED_REGION_AGENCY_QID) {
        fieldsToSet[`answer_${MERGED_REGION_AGENCY_QID}_region`] =
          answers[`answer_${MERGED_REGION_AGENCY_QID}_region`];
        fieldsToSet[`answer_${MERGED_REGION_AGENCY_QID}_agency`] =
          answers[`answer_${MERGED_REGION_AGENCY_QID}_agency`];
      }

      form.setFieldsValue(fieldsToSet);
    }
  };

  // --- Loading, Error, No Questions UI ---
  if (loading) {
    return (
      <div className="survey-page-container">
        <Spin
          indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
          tip="Loading Questions..."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="survey-page-container">
        <Alert message="Error" description={error} type="error" showIcon />
      </div>
    );
  }

  if (allQuestions.length === 0) {
    return (
      <div className="survey-page-container">
        <Card className="survey-page-content" bordered={false}>
          <Title level={3}>No Questions Available</Title>
          <Text>
            It seems there are no survey questions configured yet. Please check
            back later.
          </Text>
        </Card>
      </div>
    );
  }

  const currentQuestion = allQuestions[currentQuestionIndex];

  // Helper to render input based on question type
  const renderQuestionInput = (question) => {
    const formItemName = `answer_${question._id}`;

    // Adjusted logic to check questionText instead of questionCode for CCC and SQD
    const isCCCQuestion =
      question.questionText && question.questionText.startsWith("CCC");
    const isSQDQuestion =
      question.questionText && question.questionText.startsWith("SQD");

    // Handle the custom merged Customer Type, Age, Gender question
    if (question._id === MERGED_CUSTOMER_AGE_GENDER_QID) {
      const { customerTypeOptions, ageId, genderOptions } = question.options; // Destructure options from the merged question object
      return (
        <Space direction="vertical" style={{ width: "100%" }} size="middle"> {/* Reduced size here */}
          {/* Customer Type */}
          <Form.Item
            name={`${formItemName}_customerType`}
            label="Customer Type"
            rules={[
              { required: true, message: "Please select your customer type!" },
            ]}
          >
            <Radio.Group>
              <Space direction="vertical">
                {Array.isArray(customerTypeOptions) &&
                  customerTypeOptions.map((option, idx) => (
                    <Radio key={idx} value={option}>
                      {option}
                      {form.getFieldValue(`${formItemName}_customerType`) ===
                        "Business" &&
                        option === "Business" && (
                          <Form.Item
                            name={`${formItemName}_companyName`}
                            noStyle
                            rules={[
                              {
                                required: true,
                                message: "Please specify company name!",
                              },
                            ]}
                          >
                            <Input
                              placeholder="Specify Company Name"
                              style={{ marginLeft: 45, width: 400 }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </Form.Item>
                        )}
                      {form.getFieldValue(`${formItemName}_customerType`) ===
                        "Government" &&
                        option === "Government" && (
                          <Form.Item
                            name={`${formItemName}_agencyName`}
                            noStyle
                            rules={[
                              {
                                required: true,
                                message: "Please specify agency!",
                              },
                            ]}
                          >
                            <Input
                              placeholder="e.g., Agency Name or Name of Employee"
                              style={{ marginLeft: 20, width: 400 }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </Form.Item>
                        )}
                    </Radio>
                  ))}
              </Space>
            </Radio.Group>
          </Form.Item>

          {/* Age */}
          <Form.Item
            name={`${formItemName}_age`}
            label="Age"
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value) {
                    return Promise.resolve(); // Not required unless specified
                  }
                  if (!/^\d+$/.test(value)) {
                    return Promise.reject(
                      new Error("Please enter numbers only!")
                    );
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <Input type="number" placeholder="Enter your age" />
          </Form.Item>

          {/* Gender */}
          <Form.Item
            name={`${formItemName}_gender`}
            label="Gender"
            rules={[{ required: true, message: "Please select your gender!" }]}
          >
            <Select placeholder="Select your gender">
              {Array.isArray(genderOptions) &&
                genderOptions.map((option, idx) => (
                  <Select.Option key={idx} value={option}>
                    {option}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
        </Space>
      );
    }

    // Handle the custom merged Region & Agency question
    if (question._id === MERGED_REGION_AGENCY_QID) {
      return (
        <Space direction="vertical" style={{ width: "100%" }} size="small"> {/* Reduced size here */}
          <Space>
            <Form.Item
              name={`${formItemName}_region`}
              label="Region"
              initialValue={AUTO_REGION}
            >
              <Input readOnly style={{ width: 200 }} />
            </Form.Item>
            <Form.Item
              name={`${formItemName}_agency`}
              label="Agency Visited"
              initialValue={AUTO_AGENCY}
            >
              <Input readOnly style={{ width: 200 }} />
            </Form.Item>
          </Space>
          <Text
            type="secondary"
            style={{ fontStyle: "italic", marginTop: "-15px" }}
          >
            Please proceed to next question. No need to fill up here!
          </Text>
        </Space>
      );
    }

    // Regular question handling
    switch (question.questionText) {
      case "Service Availed:":
        return (
          <Form.Item
            name={formItemName}
            rules={[
              {
                required: true,
                message: "Please select at least one service availed!",
              },
            ]}
          >
            <Select
              mode="multiple"
              allowClear
              placeholder="Select services availed"
              style={{ width: "100%" }}
            >
              {Array.isArray(question.options) &&
                question.options.map((option, idx) => (
                  <Select.Option key={idx} value={option}>
                    {option}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
        );
      default:
        // CCC questions as Dropdown (Select) - now checking questionText
        if (isCCCQuestion && Array.isArray(question.options) && question.options.length > 0) {
          return (
            <Form.Item
              name={formItemName}
              rules={[{ required: true, message: 'Please select an option!' }]}
            >
              <Select placeholder="Select an option" style={{ width: '100%' }}>
                {question.options.map((option, idx) => (
                  <Select.Option key={idx} value={option}>
                    {option}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          );
        } else if (isSQDQuestion) { // SQD questions as Rate stars - now checking questionText
          const SQD_LABELS = {
            1: "Strongly Disagree",
            2: "Disagree",
            3: "Neutral",
            4: "Agree",
            5: "Strongly Agree",
          };
          return (
            <Form.Item
              name={formItemName}
              rules={[{ required: true, message: "Please select a rating!" }]}
            >
              <Rate
                count={5}
                tooltips={Object.values(SQD_LABELS)}
                onChange={(value) =>
                  form.setFieldsValue({ [formItemName]: value })
                }
                value={form.getFieldValue(formItemName)}
              />
              {form.getFieldValue(formItemName) && (
                <Text style={{ marginLeft: 8 }}>
                  {SQD_LABELS[form.getFieldValue(formItemName)]}
                </Text>
              )}
            </Form.Item>
          );
        } else {
          return (
            <Form.Item
              name={formItemName}
              rules={[{ required: true, message: "Please enter your answer!" }]}
            >
              <Input.TextArea rows={4} placeholder="Type your answer here..." />
            </Form.Item>
          );
        }
    }
  };

  return (
    <div className="survey-page-container">
      <Card className="survey-page-content" bordered={false}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}> {/* Changed size to "middle" */}
          {/* Horizontal Timeline (Ant Design Steps) */}
          <Steps
            current={currentTimelineStep}
            items={stepItems}
            style={{
              marginBottom: "20px", // Reduced margin
              maxWidth: "80%",
              margin: "0 auto 20px auto", // Reduced margin
            }}
          />
          {/* End Timeline */}
          <hr />

          <Title level={3}>
            Question {currentQuestionIndex + 1} of {allQuestions.length}
          </Title>
          <Title level={4}>{currentQuestion.questionText}</Title>

            <Form
            form={form}
            layout="vertical"
            initialValues={answers}
            onValuesChange={(changedValues, allValues) => {
              setAnswers(prev => {
                const newAnswers = { ...prev, ...changedValues };

                // Handle conditional clearing for the merged customer type
                if (currentQuestion._id === MERGED_CUSTOMER_AGE_GENDER_QID) {
                    const selectedCustomerType = newAnswers[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_customerType`];
                    if (selectedCustomerType !== 'Business') {
                        delete newAnswers[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_companyName`];
                    }
                    if (selectedCustomerType !== 'Government') {
                        delete newAnswers[`answer_${MERGED_CUSTOMER_AGE_GENDER_QID}_agencyName`];
                    }
                }
                return newAnswers;
              });
            }}
          >
            {renderQuestionInput(currentQuestion)}
          </Form>

          <Space size="middle" style={{ marginTop: "10px" }}> {/* Reduced margin-top */}
            <Button
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>
            <Button
              type="primary"
              shape="round"
              icon={<ArrowRightOutlined />}
              onClick={handleNextQuestion}
            >
              {currentQuestionIndex === allQuestions.length - 1
                ? "Submit Survey"
                : "Next Question"}
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  );
}

export default SurveyPage1;
