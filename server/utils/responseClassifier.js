// server/utils/responseClassifier.js
// Mirror of front-end/src/utils/responseClassifier.js — keep the two in sync.
// Turns a stored survey answer into a sentiment bucket for VERA insights.
// Answers are stored as the full option TEXT the respondent picked, in
// whichever language they answered in, and the option wording has changed over
// time (legacy "1. Yes... I am aware" options, the current i18n options, and the
// Filipino translations all exist in the collection). Every consumer that counts
// Positive / Neutral / Negative must go through here so the numbers agree.

export const SENTIMENT = {
  POSITIVE: "positive",
  NEUTRAL: "neutral",
  NEGATIVE: "negative",
  NA: "na",
};

const norm = (val) =>
  String(Array.isArray(val) ? val.join(" ") : val ?? "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim();

// N/A in all the forms it has been stored in.
const isNotApplicable = (s) => {
  const cleaned = s.replace(/[^a-z]/g, "");
  return (
    cleaned === "na" ||
    cleaned === "notapplicable" ||
    cleaned === "notapplicablena" ||
    cleaned === "hindinaaangkop" ||
    cleaned === "hindinaaangkopna"
  );
};

// ── Citizen's Charter (CC1–CC3) ─────────────────────────────────────────────
// Positive = aware / easy to see / helped. Negative = unaware / hard to see /
// not visible / did not help. "Somewhat" answers are neutral.
const CC_POSITIVE = [
  // CC1 awareness
  "i know what a citizen's charter is and i saw",
  "i know what a cc is and i saw",
  "i learned of the citizen's charter only when i saw",
  "learned of the cc only when i saw",
  "alam ko kung ano ang citizen's charter at nakita ko",
  "nalaman ko lang ang citizen's charter nang makita ko",
  "yes... i am aware before my transaction",
  "yes... but i am aware only when i saw",
  // CC2 visibility
  "easy to see and follow",
  "easy to see",
  "madaling makita at sundan",
  "yes the citizen's charter was easy to find",
  // CC3 helpfulness
  "help very much",
  "helped very much",
  "lubos na nakatulong",
  "yes i was able to use the citizen's charter",
];
const CC_NEUTRAL = [
  "somewhat to see and follow",
  "somewhat easy to see",
  "medyo madaling makita",
  "somewhat helped",
  "medyo nakatulong",
  "yes but the citizen's charter was hard to find",
];
const CC_NEGATIVE = [
  // CC1
  "but i did not see",
  "i do not know what a citizen's charter is",
  "do not know what a cc is",
  "hindi ko alam kung ano ang citizen's charter",
  "pero hindi ko ito nakita",
  "no... i am not aware",
  // CC2
  "difficult to see",
  "not visible at all",
  "mahirap makita",
  "hindi nakikita",
  "no i did not see this office's citizen's charter",
  // CC3
  "did not help",
  "hindi nakatulong",
  "no i was not able to use",
];

export function classifyCcAnswer(answer) {
  const s = norm(answer);
  if (!s) return null;
  if (isNotApplicable(s)) return SENTIMENT.NA;
  // "Somewhat easy to see" must not be caught by "easy to see", so neutral
  // phrases are checked first; negative next because "did not see" contains
  // wording that would otherwise look like the positive "saw" branch.
  if (CC_NEUTRAL.some((k) => s.includes(k))) return SENTIMENT.NEUTRAL;
  if (CC_NEGATIVE.some((k) => s.includes(k))) return SENTIMENT.NEGATIVE;
  if (CC_POSITIVE.some((k) => s.includes(k))) return SENTIMENT.POSITIVE;
  // Legacy bare answers
  if (/^(yes|y|oo)$/.test(s)) return SENTIMENT.POSITIVE;
  if (/^(no|n|hindi)$/.test(s)) return SENTIMENT.NEGATIVE;
  return SENTIMENT.NEUTRAL;
}

// ── Service Quality Dimensions (SQD0–SQD8) ──────────────────────────────────
// Canonical Likert labels. Filipino and the legacy "Satisfactory" label are
// mapped onto the same five points.
export const SQD_LIKERT = [
  "Strongly Agree",
  "Agree",
  "Neither Agree nor Disagree",
  "Disagree",
  "Strongly Disagree",
];

const SQD_MAP = [
  ["strongly agree", "Strongly Agree"],
  ["lubos na sumasang-ayon", "Strongly Agree"],
  ["strongly disagree", "Strongly Disagree"],
  ["lubos na hindi sumasang-ayon", "Strongly Disagree"],
  ["neither agree nor disagree", "Neither Agree nor Disagree"],
  ["satisfactory", "Neither Agree nor Disagree"],
  ["neutral", "Neither Agree nor Disagree"],
  ["walang kinikilingan", "Neither Agree nor Disagree"],
  ["hindi sumasang-ayon", "Disagree"],
  ["disagree", "Disagree"],
  ["sumasang-ayon", "Agree"],
  ["agree", "Agree"],
];

// Returns one of SQD_LIKERT, "N/A", or null when the value is not an SQD answer.
export function normalizeSqdAnswer(answer) {
  const s = norm(answer);
  if (!s) return null;
  if (isNotApplicable(s)) return "N/A";
  for (const [needle, label] of SQD_MAP) {
    if (s === needle) return label;
  }
  // Order matters for substring fallback ("strongly agree" before "agree").
  for (const [needle, label] of SQD_MAP) {
    if (s.includes(needle)) return label;
  }
  return null;
}

export function classifySqdAnswer(answer) {
  const label = normalizeSqdAnswer(answer);
  if (!label) return null;
  if (label === "N/A") return SENTIMENT.NA;
  if (label === "Strongly Agree" || label === "Agree") return SENTIMENT.POSITIVE;
  if (label === "Neither Agree nor Disagree") return SENTIMENT.NEUTRAL;
  return SENTIMENT.NEGATIVE;
}

// Likert → 1..5 score (N/A and unknown → null so they are excluded from averages).
export function sqdScore(answer) {
  const label = normalizeSqdAnswer(answer);
  const idx = SQD_LIKERT.indexOf(label);
  return idx === -1 ? null : 5 - idx;
}

// Count a list of answers into { positive, neutral, negative, na, total }.
export function tallySentiment(answers, classify) {
  const out = { positive: 0, neutral: 0, negative: 0, na: 0, total: 0 };
  (answers || []).forEach((a) => {
    const c = classify(a);
    if (!c) return;
    out[c] += 1;
    out.total += 1;
  });
  return out;
}

// ── Question detection helpers ──────────────────────────────────────────────
// Records store answers keyed by question TEXT, so consumers need a stable way
// to tell which labeled entries are CC questions vs SQD questions.
export function isCcQuestion(questionText) {
  const q = norm(questionText);
  return q.includes("citizen") || /\bcc\d?\b/.test(q);
}

export function isSqdQuestion(questionText) {
  const q = norm(questionText);
  if (isCcQuestion(q)) return false;
  return (
    q.startsWith("i am satisfied with the service") ||
    q.includes("nasiyahan ako sa serbisyo") ||
    /\((responsiveness|reliability|access and facilities|access & facilities|communication|costs|integrity|assurance|outcome)\)\s*$/.test(q)
  );
}
