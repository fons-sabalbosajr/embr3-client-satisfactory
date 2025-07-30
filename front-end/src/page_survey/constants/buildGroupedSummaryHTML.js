export const buildGroupedSummaryHTML = (formValues, questionData, t) => {
  const sections = {
    personalInfo: [],
    citizensCharter: [],
    sqd: [],
    remarks: [],
  };

  for (const [id, answer] of Object.entries(formValues)) {
    const display = Array.isArray(answer) ? answer.join(", ") : answer;
    let label = "";

    // Personal Info fields
    if (id.startsWith("answer_merged_customer_age_gender_question_")) {
      const field = id.replace(
        "answer_merged_customer_age_gender_question_",
        ""
      );
      label = t(`summaryLabels.${field}`) || field;
      sections.personalInfo.push({ label, value: display });
      continue;
    }

    if (id.startsWith("answer_merged_info_question_")) {
      const field = id.replace("answer_merged_info_question_", "");
      label = t(`summaryLabels.${field}`) || field;
      sections.personalInfo.push({ label, value: display });
      continue;
    }

    // Match question by ID
    const question = questionData.find((q) => `answer_${q._id}` === id);
    if (question) {
      label =
        t(`questions.${question.questionCode}.text`) || question.questionText;

      let valueToDisplay = display;
      const options = t(`questions.${question.questionCode}.options`, {
        returnObjects: true,
      });

      if (Array.isArray(options)) {
        const selectedOptionIndex = parseInt(display, 10) - 1;
        valueToDisplay = options[selectedOptionIndex] || display;
      } else if (typeof options === "object" && options !== null) {
        valueToDisplay = options[display] || display;
      }

      if (["Q7", "Q8", "Q9"].includes(question.questionCode)) {
        sections.citizensCharter.push({ label, value: valueToDisplay });
      } else if (
        [
          "Q10",
          "Q11",
          "Q12",
          "Q13",
          "Q14",
          "Q15",
          "Q16",
          "Q17",
          "Q18",
        ].includes(question.questionCode)
      ) {
        sections.sqd.push({ label, value: valueToDisplay });
      } else if (question.questionCode === "Q19") {
        sections.remarks.push({ label, value: valueToDisplay });
      }
    }
  }

  const renderSectionTable = (title, items) => {
    if (!items.length) return "";
    const rows = items
      .map(
        ({ label, value }) =>
          `<tr>
          <td style="
            padding: 6px 12px;
            border: 1px solid #ccc;
            font-size: 12px;
            text-align: left;
            white-space: normal;
            word-break: break-word;
            width: 65%;
          ">
            <strong>${label}</strong>
          </td>
          <td style="
            padding: 6px 12px;
            border: 1px solid #ccc;
            font-size: 12px;
            text-align: left;
            white-space: normal;
            word-break: break-word;
            width: 35%;
          ">
            ${value}
          </td>
        </tr>`
      )
      .join("");

    return `
    <h3 style="margin: 12px 0 6px; font-size: 14px;">${title}</h3>
    <table style="
      border-collapse: collapse;
      width: 100%;
      min-width: 600px;
      margin-bottom: 16px;
      border: 1px solid #ccc;
      table-layout: fixed;
    ">
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
  };

  return [
    renderSectionTable(t("section.personalInfo"), sections.personalInfo),
    renderSectionTable(t("section.citizensCharter"), sections.citizensCharter),
    renderSectionTable(t("section.sqd"), sections.sqd),
    renderSectionTable(t("section.remarks"), sections.remarks),
  ].join("");
};
