// src/page-survey/surveyMeta.jsx

export const QUESTIONS_PER_STEP = 5;

export const AUTO_REGION = "Region III";
export const AUTO_AGENCY = "EMB REGION III";

// Merged question IDs (used for special rendering)
export const MERGED_REGION_AGENCY_QID = "merged_region_agency_question";
export const MERGED_CUSTOMER_AGE_GENDER_QID = "merged_customer_age_gender_question";
export const MERGED_CCSQD_QID = "merged_cc_sqd";

// Survey Step Description
export const stepItems = [
  {
    title: "Question 1–3",
    description: "Primary Info",
  },
  {
    title: "Question 4–6",
    description: "Citizens Charter (CC)",
  },
  {
    title: "Question 7–14",
    description: "Service Quality Dimensions (SQD)",
  },
];

// Common filtered questions to exclude from display
export const EXCLUDED_QUESTION_TEXTS = [
  "Region:",
  "Agency visited:",
  "Customer type:",
  "Age:",
  "Sex:",
];
