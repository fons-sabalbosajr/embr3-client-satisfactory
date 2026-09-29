// src/utils/responseExport.js
// Turns raw feedback documents into flat, human-readable rows for Excel export.
// Used by the Measurement Data export and as the "Responses" sheet of the
// report exports so every download carries the same columns — including the
// multi-select "Service Availed" answer, which is an array in the database.
import dayjs from "dayjs";
import { isCcQuestion, isSqdQuestion } from "./responseClassifier";

export const inferSurveyType = (entry) => {
  if (entry?.surveyType) return entry.surveyType;
  const labeled = entry?.answersLabeled || {};
  if (
    labeled["Customer Type"] === "Government" &&
    (labeled["Agency Name"] === "EMB Region III" || labeled["Employee Name"])
  )
    return "internal";
  return "external";
};

const joinList = (v) =>
  Array.isArray(v) ? v.filter(Boolean).join("; ") : v ?? "";

// Fixed profile columns, in the order they should appear in the sheet. Any key
// here is pulled out of answersLabeled by name; the CC/SQD/remarks questions are
// appended after, in the order they were answered.
const PROFILE_COLUMNS = [
  ["Region", "Region"],
  ["Agency", "Agency"],
  ["Customer Type", "Customer Type"],
  ["Company Name", "Company / Establishment"],
  ["Agency Name", "Agency Name"],
  ["Employee Name", "Employee Name"],
  ["Age", "Age"],
  ["Gender", "Sex / Gender"],
  ["Assisted Personnel", "Assisted Personnel"],
];

/**
 * Build one flat row per feedback record.
 * @param {Object[]} entries - feedback docs ({ answersLabeled, submittedAt, surveyType })
 * @returns {Object[]}
 */
export function buildResponseRows(entries) {
  return (entries || []).map((entry) => {
    const labeled = entry?.answersLabeled || {};
    const row = {
      "Submitted At": entry?.submittedAt
        ? dayjs(entry.submittedAt).format("YYYY-MM-DD HH:mm:ss")
        : "",
      "Survey Type": inferSurveyType(entry) === "internal" ? "Internal" : "External",
    };
    PROFILE_COLUMNS.forEach(([key, header]) => {
      row[header] = joinList(labeled[key]);
    });
    row["Service Availed"] = joinList(labeled["Service Availed"]);

    const consumed = new Set([...PROFILE_COLUMNS.map(([k]) => k), "Service Availed"]);
    let cc = 0;
    let sqd = 0;
    Object.entries(labeled).forEach(([question, answer]) => {
      if (consumed.has(question)) return;
      let header = question;
      if (isCcQuestion(question)) {
        cc += 1;
        header = `CC${cc} — ${question}`;
      } else if (isSqdQuestion(question)) {
        header = `SQD${sqd} — ${question}`;
        sqd += 1;
      }
      row[header] = joinList(answer);
    });
    return row;
  });
}
