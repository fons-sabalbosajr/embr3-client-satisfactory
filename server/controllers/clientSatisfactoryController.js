import ClientSatisfactory from "../models/clientsatisfactory.js";
import Question from "../models/Question.js";
import { getSurveys, cacheAdd } from "../utils/surveyCache.js";

export const submitSurvey = (io) => async (req, res) => {
  try {
    const { answers, deviceId, surveyType } = req.body;

    if (!answers || !deviceId) {
      return res.status(400).json({ message: "Missing answers or deviceId" });
    }

    const validatedType = surveyType === "internal" ? "internal" : "external";

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
      merged_customer_age_gender_question_analysisResultType: "Type of Result of Analyses",
      merged_customer_age_gender_question_analysisControlNumber: "Analysis Control Number",
      merged_customer_age_gender_question_companyName: "Company Name",
      merged_customer_age_gender_question_agencyName: "Agency Name",
      merged_customer_age_gender_question_assistPersonnel: "Assisted Personnel",
      merged_customer_age_gender_question_employeeName: "Employee Name",
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
      surveyType: validatedType,
      submittedAt: new Date(),
    });

    await submission.save();
    cacheAdd(submission);

    // ✅ Emit event to clients
    io.emit("feedbackAdded", submission);

    return res.status(201).json({ message: "Submission successful" });
  } catch (err) {
    console.error("❌ Error saving survey:", err);
    return res.status(500).json({ message: "Server error while saving" });
  }
};

// Names typed into "Assisted Personnel" on earlier surveys, most frequent
// first. Feeds the autocomplete on the public survey form, so it returns names
// only — never anything about the client who typed them.
const NOT_A_NAME = /^(n\/?a|none|no one|nobody|wala|walang?|secret|unknown|-+|\.+)$/i;
export const getAssistPersonnel = async (req, res) => {
  try {
    const surveys = await getSurveys();
    const seen = new Map(); // normalised key -> { name, count }
    for (const s of surveys) {
      const raw = s?.answersLabeled?.["Assisted Personnel"];
      if (typeof raw !== "string") continue;
      const name = raw.replace(/\s+/g, " ").trim();
      if (name.length < 2 || name.length > 80) continue;
      if (!/\p{L}{2,}/u.test(name) || NOT_A_NAME.test(name)) continue;
      const key = name.toLowerCase();
      const hit = seen.get(key);
      if (hit) hit.count += 1;
      else seen.set(key, { name, count: 1 });
    }
    const names = [...seen.values()]
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 150)
      .map((x) => x.name);
    res.set("Cache-Control", "public, max-age=300");
    res.json({ names });
  } catch (err) {
    console.error("❌ Error listing assisted personnel:", err);
    res.status(500).json({ message: "Server error while listing personnel" });
  }
};

export const getAllSurveys = async (req, res) => {
  try {
    // In-memory cache (utils/surveyCache.js) — avoids re-pulling every
    // response over the slow Atlas link for each report page.
    const surveys = await getSurveys();
    res.json(surveys);
  } catch (err) {
    console.error("❌ Error fetching surveys:", err);
    res.status(500).json({ message: "Server error while fetching surveys" });
  }
};

