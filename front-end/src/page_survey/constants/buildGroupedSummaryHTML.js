// Builds the HTML for the "review your answers" dialog shown before the survey
// is submitted. Markup only — the styles live in survey-arta.css (.review-*).
//
// Everything the client typed is escaped before it is placed in the HTML.

const PERSONAL_PREFIXES = [
  "answer_merged_customer_age_gender_question_",
  "answer_merged_info_question_",
];

// Display order for the personal-information rows.
const PERSONAL_ORDER = [
  "region",
  "agency",
  "customerType",
  "companyName",
  "agencyName",
  "employeeName",
  "age",
  "gender",
  "serviceAvailed",
  "analysisResultType",
  "analysisControlNumber",
  "assistPersonnel",
];

const SQD_CODES = ["Q10", "Q11", "Q12", "Q13", "Q14", "Q15", "Q16", "Q17", "Q18"];
const CC_CODES = ["Q7", "Q8", "Q9"];

// Stored rating value -> translation key + chip tone.
const RATINGS = {
  "Strongly Disagree": ["stronglyDisagree", "bad"],
  StronglyDisagree: ["stronglyDisagree", "bad"],
  Disagree: ["disagree", "bad"],
  Satisfactory: ["satisfactory", "mid"],
  Agree: ["agree", "good"],
  "Strongly Agree": ["stronglyAgree", "good"],
  StronglyAgree: ["stronglyAgree", "good"],
  "Not Applicable": ["notApplicable", "na"],
  NA: ["notApplicable", "na"],
};

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const isBlank = (v) =>
  v === undefined || v === null || (Array.isArray(v) ? v.length === 0 : String(v).trim() === "");

export const buildGroupedSummaryHTML = (formValues, questionData, t) => {
  const personal = [];
  const cc = [];
  const sqd = [];
  let remarks = "";

  // ── Personal information ──
  const personalValues = {};
  for (const [id, answer] of Object.entries(formValues || {})) {
    const prefix = PERSONAL_PREFIXES.find((p) => id.startsWith(p));
    if (!prefix || isBlank(answer)) continue;
    personalValues[id.slice(prefix.length)] = answer;
  }
  const personalKeys = [
    ...PERSONAL_ORDER.filter((k) => k in personalValues),
    ...Object.keys(personalValues).filter((k) => !PERSONAL_ORDER.includes(k)),
  ];
  for (const key of personalKeys) {
    const answer = personalValues[key];
    let value;
    if (key === "gender") {
      value = escapeHtml(t(`gender.${answer}`, { defaultValue: String(answer) }));
    } else if (key === "customerType") {
      value = escapeHtml(t(`clientType${answer}`, { defaultValue: String(answer) }));
    } else if (Array.isArray(answer)) {
      value = answer.map((a) => escapeHtml(a)).join("<br>");
    } else {
      value = escapeHtml(answer);
    }
    personal.push({
      label: escapeHtml(t(`summaryLabels.${key}`, { defaultValue: key })),
      value,
    });
  }

  // ── Questions, in questionnaire order ──
  const questions = [...(questionData || [])].sort(
    (a, b) =>
      Number(String(a.questionCode || "").replace(/\D/g, "")) -
      Number(String(b.questionCode || "").replace(/\D/g, ""))
  );

  for (const question of questions) {
    const answer = formValues?.[`answer_${question._id}`];
    if (isBlank(answer)) continue;
    const code = question.questionCode;
    const label = escapeHtml(
      t(`questions.${code}.text`, { defaultValue: question.questionText || code })
    );

    if (SQD_CODES.includes(code)) {
      const [ratingKey, tone] = RATINGS[answer] || [];
      const text = ratingKey ? t(`rating.${ratingKey}`) : String(answer);
      sqd.push({
        label,
        value: `<span class="review-chip review-chip--${tone || "mid"}">${escapeHtml(text)}</span>`,
      });
    } else if (CC_CODES.includes(code)) {
      // The stored answer is the option text in whichever language it was
      // picked in. If the language changed since, show the same option (by
      // position) in the current language.
      let shown = String(answer);
      const current = t(`questions.${code}.options`, { returnObjects: true });
      if (Array.isArray(current) && !current.includes(shown)) {
        for (const lng of ["en", "fil"]) {
          const other = t(`questions.${code}.options`, { lng, returnObjects: true });
          const idx = Array.isArray(other) ? other.indexOf(shown) : -1;
          if (idx !== -1 && current[idx]) {
            shown = current[idx];
            break;
          }
        }
      }
      cc.push({ label, value: escapeHtml(shown) });
    } else if (code === "Q19") {
      remarks = escapeHtml(answer);
    }
  }

  let sectionNo = 0;
  const section = (title, body, modifier = "") => {
    if (!body) return "";
    sectionNo += 1;
    return `
      <section class="review-section ${modifier}">
        <h3 class="review-section-head">
          <span class="review-section-num">${sectionNo}</span>
          <span>${escapeHtml(title)}</span>
        </h3>
        ${body}
      </section>`;
  };

  const rows = (items) =>
    items.length
      ? `<dl class="review-list">${items
          .map(
            ({ label, value }) =>
              `<div class="review-row"><dt>${label}</dt><dd>${value}</dd></div>`
          )
          .join("")}</dl>`
      : "";

  return [
    `<p class="review-lead">${escapeHtml(
      t("summary.reviewLead", {
        defaultValue:
          "Please check your answers. Go back if you need to change anything, then submit.",
      })
    )}</p>`,
    section(t("section.personalInfo"), rows(personal)),
    section(t("section.citizensCharter"), rows(cc), "review-section--stack"),
    section(t("section.sqd"), rows(sqd), "review-section--rating"),
    section(
      t("section.remarks"),
      remarks ? `<p class="review-remarks">${remarks}</p>` : "",
    ),
  ].join("");
};
