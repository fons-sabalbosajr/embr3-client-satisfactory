// src/utils/responseExport.js
// Turns raw feedback documents into flat, human-readable rows for Excel export.
// Used by the Measurement Data export, Extract Data, and the "Responses" sheet
// of every report export, so every download carries the same columns.
//
// Why a fixed schema: answers are stored keyed by question TEXT in whatever
// order the client answered. Numbering CC/SQD columns per record (the old
// approach) gave records answered in a different order *different* headers —
// e.g. "SQD0 — I spent a reasonable amount of time…" next to the real
// "SQD1 — I spent a reasonable amount of time…" — so data scattered across
// duplicate columns and columns looked empty. Each answer is now resolved to a
// canonical code (CC1–CC3, SQD0–SQD8, Remarks) before it becomes a column.
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
  Array.isArray(v) ? v.filter((x) => x !== null && x !== undefined && x !== "").join("; ") : v ?? "";

const isBlank = (v) =>
  v === undefined || v === null || (typeof v === "string" && !v.trim()) ||
  (Array.isArray(v) && v.length === 0);

// Profile columns, in sheet order: [answersLabeled key(s), header].
// Several keys = aliases seen in older records; first non-blank wins.
export const PROFILE_COLUMNS = [
  [["Region"], "Region"],
  [["Agency"], "Agency"],
  [["Customer Type"], "Customer Type"],
  [["Company Name"], "Company / Establishment"],
  [["Agency Name", "Unknown Question (merged_customer_age_gender_question_agencyName)"], "Agency Name"],
  [["Employee Name"], "Employee Name"],
  [["Age"], "Age"],
  [["Gender", "Sex/Gender", "Sex"], "Sex / Gender"],
  [["Assisted Personnel"], "Assisted Personnel"],
  [["Service Availed"], "Service Availed"],
  [["Type of Result of Analyses"], "Type of Result of Analyses"],
  [["Analysis Control Number"], "Analysis Control Number"],
];

const CC_CODES = ["CC1", "CC2", "CC3"];
const SQD_CODES = ["SQD0", "SQD1", "SQD2", "SQD3", "SQD4", "SQD5", "SQD6", "SQD7", "SQD8"];
export const QUESTION_CODES = [...CC_CODES, ...SQD_CODES];

const SQD_DIMENSIONS = [
  [/responsiveness/, "SQD1"],
  [/reliability/, "SQD2"],
  [/access/, "SQD3"],
  [/communication/, "SQD4"],
  [/costs?\b/, "SQD5"],
  [/integrity/, "SQD6"],
  [/assurance/, "SQD7"],
  [/outcome/, "SQD8"],
];

const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Map a stored question label to its canonical code.
 * @returns {"CC1"|"CC2"|"CC3"|"SQD0".."SQD8"|"REMARKS"|null}
 */
export function canonicalQuestionCode(label) {
  const q = norm(label);
  if (!q) return null;
  if (/remark|recommendation|suggestion|komento|suhestyon/.test(q)) return "REMARKS";
  if (isCcQuestion(label)) {
    // CC3 = used / helped; CC2 = saw / visible / followed; CC1 = awareness.
    if (/\b(use|used|guide|help|helped|nakatulong)\b/.test(q)) return "CC3";
    if (/\b(see|saw|seen|visible|followed|find|makita|sundan)\b/.test(q)) return "CC2";
    if (/\b(know|aware|awareness|alam|kaalaman)\b/.test(q)) return "CC1";
    return null;
  }
  if (isSqdQuestion(label) || /\((responsiveness|reliability|access|communication|costs?|integrity|assurance|outcome)/.test(q)) {
    for (const [rx, code] of SQD_DIMENSIONS) {
      if (rx.test(q.replace(/^.*\(/, "("))) return code;
    }
    if (q.startsWith("i am satisfied") || q.includes("nasiyahan")) return "SQD0";
  }
  return null;
}

/**
 * Pull CC/SQD/remarks answers out of a record keyed by canonical code.
 * @returns {{ [code: string]: any }}
 */
export function canonicalAnswers(entry) {
  const out = {};
  Object.entries(entry?.answersLabeled || {}).forEach(([question, answer]) => {
    const code = canonicalQuestionCode(question);
    if (!code || isBlank(answer)) return;
    if (code === "REMARKS") {
      out.REMARKS = out.REMARKS ? `${out.REMARKS}\n${joinList(answer)}` : joinList(answer);
    } else if (out[code] === undefined) {
      out[code] = answer;
    }
  });
  return out;
}

/**
 * Build one flat row per feedback record. Every row carries every column (in
 * the same order) whether or not that record answered it.
 * @param {Object[]} entries - feedback docs ({ answersLabeled, submittedAt, surveyType, _id })
 * @returns {Object[]}
 */
export function buildResponseRows(entries) {
  const list = entries || [];
  const profileKeys = new Set(PROFILE_COLUMNS.flatMap(([keys]) => keys));

  // Header text per code comes from the question wording actually stored,
  // first seen wins, so the sheet reads the same as the survey.
  const questionHeader = {};
  const extraHeaders = [];
  const extraSeen = new Set();
  list.forEach((entry) => {
    Object.keys(entry?.answersLabeled || {}).forEach((question) => {
      if (profileKeys.has(question)) return;
      const code = canonicalQuestionCode(question);
      if (code && code !== "REMARKS") {
        if (!questionHeader[code]) questionHeader[code] = `${code} — ${question}`;
      } else if (!code && !extraSeen.has(question)) {
        // Anything we cannot classify is still exported, never dropped.
        extraSeen.add(question);
        extraHeaders.push(question);
      }
    });
  });
  QUESTION_CODES.forEach((code) => {
    if (!questionHeader[code]) questionHeader[code] = code;
  });

  return list.map((entry) => {
    const labeled = entry?.answersLabeled || {};
    const row = {
      "Submitted At": entry?.submittedAt
        ? dayjs(entry.submittedAt).format("YYYY-MM-DD HH:mm:ss")
        : "",
      "Survey Type": inferSurveyType(entry) === "internal" ? "Internal" : "External",
    };
    PROFILE_COLUMNS.forEach(([keys, header]) => {
      const key = keys.find((k) => !isBlank(labeled[k]));
      row[header] = key ? joinList(labeled[key]) : "";
    });

    const answers = canonicalAnswers(entry);
    QUESTION_CODES.forEach((code) => {
      row[questionHeader[code]] = joinList(answers[code]);
    });
    row["Remarks / Recommendations"] = answers.REMARKS || "";

    extraHeaders.forEach((question) => {
      row[question] = joinList(labeled[question]);
    });
    row["Response ID"] = entry?._id ? String(entry._id) : "";
    return row;
  });
}
