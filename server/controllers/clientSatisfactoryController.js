import ClientSatisfactory from "../models/clientsatisfactory.js";
import Question from "../models/Question.js";

export const submitSurvey = (io) => async (req, res) => {
  try {
    const { answers, deviceId } = req.body;

    if (!answers || !deviceId) {
      return res.status(400).json({ message: "Missing answers or deviceId" });
    }

    const questions = await Question.find().lean();

    const questionMap = {};
    for (const q of questions) {
      if (q?._id?.toString()) {
        questionMap[q._id.toString()] = q.questionText;
      }
    }

    const manualLabels = {
      merged_customer_age_gender_question_region: "Region",
      merged_customer_age_gender_question_agency: "Agency",
      merged_customer_age_gender_question_customerType: "Customer Type",
      merged_customer_age_gender_question_gender: "Gender",
      merged_customer_age_gender_question_age: "Age",
      merged_customer_age_gender_question_serviceAvailed: "Service Availed",
      merged_customer_age_gender_question_companyName: "Company Name",
    };

    const labeledAnswers = {};
    for (const key of Object.keys(answers)) {
      const match = key.match(/^answer_(.+)$/);
      if (!match) continue;

      const questionId = match[1];

      const label =
        manualLabels[questionId] ||
        questionMap[questionId] ||
        `Unknown Question (${questionId})`;

      labeledAnswers[label] = answers[key];
    }

    const submission = new ClientSatisfactory({
      deviceId,
      answers,
      answersLabeled: labeledAnswers,
      submittedAt: new Date(),
    });

    await submission.save();

    // ✅ Emit event to clients
    io.emit("feedbackAdded", submission);

    return res.status(201).json({ message: "Submission successful" });
  } catch (err) {
    console.error("❌ Error saving survey:", err);
    return res.status(500).json({ message: "Server error while saving" });
  }
};

export const getAllSurveys = async (req, res) => {
  try {
    const surveys = await ClientSatisfactory.find().sort({ submittedAt: -1 });
    res.json(surveys);
  } catch (err) {
    console.error("❌ Error fetching surveys:", err);
    res.status(500).json({ message: "Server error while fetching surveys" });
  }
};

