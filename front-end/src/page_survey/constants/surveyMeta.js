// src/page-survey/surveyMeta.jsx

export const QUESTIONS_PER_STEP = 5;

export const AUTO_REGION = "Region III";
export const AUTO_AGENCY = "EMB REGION III";

// Merged question IDs (used for special rendering)
export const MERGED_REGION_AGENCY_QID = "merged_region_agency_question";
export const MERGED_CUSTOMER_AGE_GENDER_QID = "merged_customer_age_gender_question";
export const MERGED_CCSQD_QID = "merged_cc_sqd";

// "Analysis of Environmental Samples" asks the client which type of result of
// analyses they need. Matched loosely so a renamed/pluralised service still
// triggers the follow-up textbox.
export const ANALYSIS_RESULT_TYPE_FIELD = "analysisResultType";
export const ANALYSIS_CONTROL_NUMBER_FIELD = "analysisControlNumber";
export const isAnalysisService = (service) =>
  /analys[ie]s\s+of\s+environmental\s+samples?/i.test(String(service || ""));
export const includesAnalysisService = (services) =>
  (Array.isArray(services) ? services : services ? [services] : []).some(
    isAnalysisService
  );

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
