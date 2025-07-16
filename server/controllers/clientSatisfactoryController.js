import ClientSatisfactory from "../models/clientsatisfactory.js";
import Question from "../models/Question.js";

export const submitSurvey = async (req, res) => {
  try {
    const { answers, deviceId } = req.body;

    if (!answers || !deviceId) {
      return res.status(400).json({ message: "Missing answers or deviceId" });
    }

    const existing = await ClientSatisfactory.findOne({ deviceId });
    if (existing) {
      return res.status(409).json({ message: "Duplicate submission detected." });
    }

    // ✅ Corrected: Fetch questions, store in `questions`
    const questions = await Question.find().lean();

    // ✅ Map question._id => questionText
    const questionMap = {};
    for (const q of questions) {
      if (q?._id?.toString()) {
        questionMap[q._id.toString()] = q.questionText;
      }
    }

    // ✅ Add labels for synthetic/merged fields
    const manualLabels = {
      "merged_customer_age_gender_question_region": "Region",
      "merged_customer_age_gender_question_agency": "Agency",
      "merged_customer_age_gender_question_customerType": "Customer Type",
      "merged_customer_age_gender_question_gender": "Gender",
      "merged_customer_age_gender_question_age": "Age",
      "merged_customer_age_gender_question_serviceAvailed": "Service Availed",
      "merged_customer_age_gender_question_companyName": "Company Name"
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

    //console.log("✅ Saving new survey entry...");
    await submission.save();
    console.log("✅ Saved successfully!");

    return res.status(201).json({ message: "Submission successful" });
  } catch (err) {
    console.error("❌ Error saving survey:", err);
    return res.status(500).json({ message: "Server error while saving" });
  }
};
