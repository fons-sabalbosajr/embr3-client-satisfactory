// VERA live insights — aggregates over the client-satisfaction collection.
//
// This is what makes the OCSM VERA an ANALYST rather than a help desk: every
// admin answer can be grounded in fresh figures (response volume, SQD scores per
// dimension, Citizen's Charter awareness, top services, customer mix, trends,
// and the latest remarks). Only aggregates and short remark excerpts are
// produced; no personal identifiers (emails, names) ever leave this module.

import Feedback from "../models/Feedback.js";
import {
  classifyCcAnswer,
  classifySqdAnswer,
  normalizeSqdAnswer,
  sqdScore,
  isCcQuestion,
  isSqdQuestion,
  SENTIMENT,
} from "./responseClassifier.js";

const SQD_DIMENSIONS = [
  ["responsiveness", "Responsiveness"],
  ["reliability", "Reliability"],
  ["access", "Access & Facilities"],
  ["communication", "Communication"],
  ["costs", "Costs"],
  ["integrity", "Integrity"],
  ["assurance", "Assurance"],
  ["outcome", "Outcome"],
];

const CC_LABELS = ["CC1 Awareness", "CC2 Visibility", "CC3 Helpfulness"];

const inferSurveyType = (entry) => {
  if (entry?.surveyType) return entry.surveyType;
  const l = entry?.answersLabeled || {};
  if (l["Customer Type"] === "Government" && (l["Agency Name"] === "EMB Region III" || l["Employee Name"]))
    return "internal";
  return "external";
};

const pct = (num, den) => (den ? Math.round((num / den) * 1000) / 10 : 0);
const topN = (map, n) =>
  [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, count }));
const bump = (map, key, by = 1) => map.set(key, (map.get(key) || 0) + by);

// Cache for a short window: the dashboard and chat can hit this many times a
// minute, and the aggregates do not change faster than submissions arrive.
let cache = { key: "", at: 0, value: null };
const CACHE_MS = 30 * 1000;

/**
 * @param {{ windowDays?: number, includeRemarks?: boolean }} opts
 */
export async function computeInsights(opts = {}) {
  const windowDays = Number(opts.windowDays) || 0;
  const includeRemarks = opts.includeRemarks !== false;
  const cacheKey = `${windowDays}|${includeRemarks}`;
  if (cache.key === cacheKey && Date.now() - cache.at < CACHE_MS && cache.value) return cache.value;

  const query = {};
  if (windowDays > 0) {
    query.submittedAt = { $gte: new Date(Date.now() - windowDays * 86400000) };
  }
  const docs = await Feedback.find(query, { answersLabeled: 1, surveyType: 1, submittedAt: 1 })
    .sort({ submittedAt: -1 })
    .lean();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d7 = new Date(now.getTime() - 7 * 86400000);
  const d30 = new Date(now.getTime() - 30 * 86400000);

  const counts = { total: docs.length, today: 0, last7: 0, last30: 0, internal: 0, external: 0 };
  const byCustomer = new Map();
  const byGender = new Map();
  const byService = new Map();
  const byPersonnel = new Map();
  const byMonth = new Map();
  const sqd = new Map(); // dimension → { label, counts, na, sumScore, scored }
  const cc = new Map(); // label → { positive, neutral, negative, na }
  const remarks = [];
  let unhappyResponses = 0;
  let happyResponses = 0;

  docs.forEach((d) => {
    const l = d.answersLabeled || {};
    const at = d.submittedAt ? new Date(d.submittedAt) : null;
    if (at) {
      if (at >= startOfToday) counts.today += 1;
      if (at >= d7) counts.last7 += 1;
      if (at >= d30) counts.last30 += 1;
      bump(byMonth, `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}`);
    }
    counts[inferSurveyType(d)] += 1;
    if (l["Customer Type"]) bump(byCustomer, l["Customer Type"]);
    if (l["Gender"]) bump(byGender, l["Gender"]);
    const services = Array.isArray(l["Service Availed"]) ? l["Service Availed"] : l["Service Availed"] ? [l["Service Availed"]] : [];
    services.forEach((s) => bump(byService, s));
    if (l["Assisted Personnel"]) bump(byPersonnel, String(l["Assisted Personnel"]).trim());

    let ccIdx = 0;
    let sqdIdx = 0;
    let negatives = 0;
    let positives = 0;
    let remark = "";
    Object.entries(l).forEach(([q, a]) => {
      if (isCcQuestion(q)) {
        const label = CC_LABELS[ccIdx] || `CC${ccIdx + 1}`;
        ccIdx += 1;
        const c = classifyCcAnswer(a);
        if (!c) return;
        const row = cc.get(label) || { label, positive: 0, neutral: 0, negative: 0, na: 0 };
        row[c] += 1;
        cc.set(label, row);
        return;
      }
      if (isSqdQuestion(q)) {
        const lower = q.toLowerCase();
        const dim = SQD_DIMENSIONS.find(([k]) => lower.includes(`(${k}`));
        const label = dim ? dim[1] : "Overall Satisfaction";
        const code = dim ? `SQD${SQD_DIMENSIONS.indexOf(dim) + 1}` : "SQD0";
        sqdIdx += 1;
        const norm = normalizeSqdAnswer(a);
        if (!norm) return;
        const row = sqd.get(code) || {
          code,
          label,
          counts: { "Strongly Agree": 0, Agree: 0, "Neither Agree nor Disagree": 0, Disagree: 0, "Strongly Disagree": 0 },
          na: 0,
          sumScore: 0,
          scored: 0,
        };
        if (norm === "N/A") row.na += 1;
        else {
          row.counts[norm] += 1;
          const sc = sqdScore(a);
          if (sc) {
            row.sumScore += sc;
            row.scored += 1;
          }
        }
        sqd.set(code, row);
        const s = classifySqdAnswer(a);
        if (s === SENTIMENT.NEGATIVE) negatives += 1;
        if (s === SENTIMENT.POSITIVE) positives += 1;
        return;
      }
      if (/remarks|suggestion|comments/i.test(q)) {
        const txt = String(a || "").trim();
        if (txt && !/^(n\/?a|none|no|wala|-)$/i.test(txt)) remark = txt;
      }
    });
    if (negatives > 0) unhappyResponses += 1;
    else if (positives > 0) happyResponses += 1;
    // Same remark submitted twice (double-tap on the kiosk) should read once.
    if (includeRemarks && remark && remarks.length < 8 && !remarks.some((r) => r.text === (remark.length > 220 ? `${remark.slice(0, 217)}…` : remark))) {
      remarks.push({
        when: at ? at.toISOString().slice(0, 10) : "",
        customerType: l["Customer Type"] || "",
        negative: negatives > 0,
        text: remark.length > 220 ? `${remark.slice(0, 217)}…` : remark,
      });
    }
  });

  // Per-dimension score = (SA + A) / (answered − N/A) × 100 (ARTA CSM formula).
  const sqdRows = [...sqd.values()]
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
    .map((r) => {
      const answered = Object.values(r.counts).reduce((x, y) => x + y, 0);
      const positive = r.counts["Strongly Agree"] + r.counts.Agree;
      return {
        code: r.code,
        label: r.label,
        answered,
        na: r.na,
        counts: r.counts,
        score: pct(positive, answered),
        average: r.scored ? Math.round((r.sumScore / r.scored) * 100) / 100 : null,
      };
    });
  const overallRows = sqdRows.filter((r) => r.code !== "SQD0");
  const overallPos = overallRows.reduce((s, r) => s + r.counts["Strongly Agree"] + r.counts.Agree, 0);
  const overallAns = overallRows.reduce((s, r) => s + r.answered, 0);
  const overallScore = pct(overallPos, overallAns);
  const ranked = [...overallRows].sort((a, b) => b.score - a.score);

  const ccRows = CC_LABELS.map((label) => cc.get(label) || { label, positive: 0, neutral: 0, negative: 0, na: 0 }).map((r) => {
    const answered = r.positive + r.neutral + r.negative;
    return { ...r, answered, positiveRate: pct(r.positive, answered) };
  });

  const months = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([month, count]) => ({ month, count }));
  const trend =
    months.length >= 2 ? months[months.length - 1].count - months[months.length - 2].count : 0;

  const value = {
    generatedAt: new Date().toISOString(),
    windowDays,
    counts,
    customerMix: topN(byCustomer, 5),
    genderMix: topN(byGender, 4),
    topServices: topN(byService, 8),
    topPersonnel: topN(byPersonnel, 5),
    monthly: months,
    monthOverMonth: trend,
    sqd: sqdRows,
    overallScore,
    overallAnswered: overallAns,
    satisfactionScore: sqdRows.find((r) => r.code === "SQD0")?.score ?? null,
    strongest: ranked[0] || null,
    weakest: ranked[ranked.length - 1] || null,
    cc: ccRows,
    awarenessRate: ccRows[0]?.positiveRate ?? 0,
    happyResponses,
    unhappyResponses,
    remarks,
  };
  cache = { key: cacheKey, at: Date.now(), value };
  return value;
}

// Compact, prompt-ready text block (what the model sees). Kept terse on purpose
// so a chat turn stays cheap.
export function insightsToPromptBlock(ins) {
  if (!ins) return "";
  const lines = [];
  lines.push(`LIVE SURVEY DATA (as of ${ins.generatedAt.slice(0, 16).replace("T", " ")} UTC${ins.windowDays ? `, last ${ins.windowDays} days` : ", all time"}):`);
  lines.push(
    `- Responses: total ${ins.counts.total} | today ${ins.counts.today} | last 7 days ${ins.counts.last7} | last 30 days ${ins.counts.last30} | internal ${ins.counts.internal} | external ${ins.counts.external}`
  );
  if (ins.monthly.length) {
    lines.push(`- Monthly volume: ${ins.monthly.map((m) => `${m.month}=${m.count}`).join(", ")} (month-over-month ${ins.monthOverMonth >= 0 ? "+" : ""}${ins.monthOverMonth})`);
  }
  if (ins.customerMix.length) lines.push(`- Customer type mix: ${ins.customerMix.map((c) => `${c.label} ${c.count}`).join(", ")}`);
  if (ins.genderMix.length) lines.push(`- Sex/gender (citizens): ${ins.genderMix.map((c) => `${c.label} ${c.count}`).join(", ")}`);
  lines.push(`- Overall SQD score (SQD1–SQD8, SA+A over answered excl. N/A): ${ins.overallScore}% of ${ins.overallAnswered} answers`);
  if (ins.satisfactionScore != null) lines.push(`- SQD0 overall satisfaction: ${ins.satisfactionScore}%`);
  ins.sqd.forEach((r) => {
    const c = r.counts;
    lines.push(`  · ${r.code} ${r.label}: ${r.score}% (SA ${c["Strongly Agree"]}, A ${c.Agree}, N ${c["Neither Agree nor Disagree"]}, D ${c.Disagree}, SD ${c["Strongly Disagree"]}, N/A ${r.na}${r.average != null ? `, avg ${r.average}/5` : ""})`);
  });
  if (ins.strongest && ins.weakest) lines.push(`- Strongest dimension: ${ins.strongest.label} (${ins.strongest.score}%); weakest: ${ins.weakest.label} (${ins.weakest.score}%)`);
  ins.cc.forEach((r) => {
    lines.push(`- ${r.label}: positive ${r.positive}, neutral ${r.neutral}, negative ${r.negative}, N/A ${r.na} → ${r.positiveRate}% positive`);
  });
  lines.push(`- Responses with at least one Disagree/Strongly Disagree: ${ins.unhappyResponses}; fully positive responses: ${ins.happyResponses}`);
  if (ins.topServices.length) lines.push(`- Top services availed: ${ins.topServices.map((s) => `${s.label} (${s.count})`).join("; ")}`);
  if (ins.topPersonnel.length) lines.push(`- Most-cited assisting personnel: ${ins.topPersonnel.map((s) => `${s.label} (${s.count})`).join("; ")}`);
  if (ins.remarks.length) {
    lines.push("- Latest remarks (verbatim, trimmed):");
    ins.remarks.forEach((r) => lines.push(`  · [${r.when}${r.customerType ? `, ${r.customerType}` : ""}${r.negative ? ", flagged negative" : ""}] "${r.text}"`));
  }
  return lines.join("\n");
}

// Targeted rule-based answers for the common data intents, so VERA is useful
// without a model. Returns null when no specific intent matches (the caller
// then falls back to the full snapshot).
export function targetedBrief(message, ins, name = "VERA") {
  if (!ins) return null;
  const m = String(message || "").toLowerCase();
  const c = ins.counts;
  const dims = ins.sqd.filter((r) => r.code !== "SQD0");
  const fmt = (r) => `${r.label} (${r.code}) ${r.score}%`;

  if (/\b(weakest|lowest|worst|lagging|below target|needs? (attention|improvement)|improve)\b/.test(m) && dims.length) {
    const ranked = [...dims].sort((a, b) => a.score - b.score);
    const w = ranked[0];
    const under = ranked.filter((r) => r.score < 80);
    return [
      `Weakest dimension: ${fmt(w)} — ${w.counts.Disagree + w.counts["Strongly Disagree"]} of ${w.answered} rated answers were Disagree/Strongly Disagree.`,
      `Bottom three: ${ranked.slice(0, 3).map(fmt).join("; ")}.`,
      under.length ? `Below the 80% ARTA target: ${under.map((r) => r.label).join(", ")}.` : `Every dimension is above the 80% ARTA target${w.score < 90 ? `, but ${w.label} is under the 90% Very Satisfactory mark` : ""}.`,
      `Suggested action: open the ${w.code} tile on the Dashboard to read the Disagree responses and their remarks.`,
    ].join("\n");
  }
  if (/\b(strongest|highest|best|top dimension|performing well)\b/.test(m) && dims.length && !/service/.test(m)) {
    const ranked = [...dims].sort((a, b) => b.score - a.score);
    return `Strongest dimension: ${fmt(ranked[0])}.\nTop three: ${ranked.slice(0, 3).map(fmt).join("; ")}.\nOverall SQD score (SQD1–SQD8): ${ins.overallScore}% of ${ins.overallAnswered} answers.`;
  }
  if (/\bservice/.test(m) && ins.topServices.length) {
    return [
      `Most availed service: ${ins.topServices[0].label} (${ins.topServices[0].count} responses).`,
      "Top services:",
      ...ins.topServices.map((s, i) => `${i + 1}. ${s.label} — ${s.count}`),
    ].join("\n");
  }
  if (/\b(charter|awareness|aware|cc1|cc2|cc3)\b/.test(m) && ins.cc.length) {
    const [a, v, h] = ins.cc;
    return [
      `Citizen's Charter awareness (CC1): ${a.positiveRate}% positive — ${a.positive} aware, ${a.negative} unaware, ${a.neutral} partial, of ${a.answered} answers.`,
      v ? `CC2 visibility: ${v.positiveRate}% found it easy to see (${v.positive} easy, ${v.neutral} somewhat, ${v.negative} hard/not visible).` : "",
      h ? `CC3 helpfulness: ${h.positiveRate}% said it helped very much (${h.positive} very much, ${h.neutral} somewhat, ${h.negative} did not help).` : "",
      a.negative ? `Suggested action: ${a.negative} client(s) did not know the Charter — check that it is posted at the frontline and on the website.` : "",
    ].filter(Boolean).join("\n");
  }
  if (/\b(remarks?|comments?|suggestions?|complaints?|feedback text|what (are|do) (clients|people) say)\b/.test(m)) {
    if (!ins.remarks.length) return "No client remarks are on record in this window.";
    const neg = ins.remarks.filter((r) => r.negative);
    return [
      `${ins.remarks.length} recent remark(s), ${neg.length} from responses with a negative rating:`,
      ...ins.remarks.map((r) => `• [${r.when}${r.customerType ? `, ${r.customerType}` : ""}${r.negative ? ", negative" : ""}] "${r.text}"`),
      neg.length ? "Suggested action: follow up the negative ones in Measurement Data (filter by date) before the next report." : "",
    ].filter(Boolean).join("\n");
  }
  if (/\b(negative|unhappy|dissatisfied|disagree)\b/.test(m)) {
    return `${ins.unhappyResponses} response(s) contain at least one Disagree/Strongly Disagree; ${ins.happyResponses} are fully positive.\nWeakest dimension: ${ins.weakest ? fmt(ins.weakest) : "—"}.\nSuggested action: filter Measurement Data by the affected dates and read the remarks.`;
  }
  if (/\b(how many|count|total|number of|volume|responses?|submissions?)\b/.test(m) && !/score/.test(m)) {
    const trend = ins.monthly.map((x) => `${x.month}: ${x.count}`).join(", ");
    return `${c.total} responses on record — ${c.today} today, ${c.last7} in the last 7 days, ${c.last30} in the last 30 days.\nMix: ${c.external} external, ${c.internal} internal; ${ins.customerMix.map((x) => `${x.label} ${x.count}`).join(", ")}.${trend ? `\nMonthly: ${trend} (month-over-month ${ins.monthOverMonth >= 0 ? "+" : ""}${ins.monthOverMonth}).` : ""}`;
  }
  if (/\b(score|satisfaction|rating|percentage|average)\b/.test(m) && dims.length) {
    return [
      `Overall SQD score: ${ins.overallScore}% (SQD1–SQD8, ${ins.overallAnswered} answers) — ${ins.overallScore >= 90 ? "Very Satisfactory" : ins.overallScore >= 80 ? "Satisfactory" : "below the 80% ARTA target"}.`,
      ins.satisfactionScore != null ? `Overall satisfaction (SQD0): ${ins.satisfactionScore}%.` : "",
      "Per dimension:",
      ...ins.sqd.map((r) => `• ${r.code} ${r.label}: ${r.score}%${r.average != null ? ` (avg ${r.average}/5)` : ""}`),
    ].filter(Boolean).join("\n");
  }
  return null;
}

// Human-readable snapshot for the no-model fallback and the "Insights" quick
// action. Written as VERA's own brief rather than a raw dump.
export function insightsToBrief(ins, name = "VERA") {
  if (!ins) return "";
  const c = ins.counts;
  const out = [];
  out.push(`📊 ${name} snapshot${ins.windowDays ? ` (last ${ins.windowDays} days)` : ""}`);
  out.push(`Headline: ${c.total} responses on record — ${c.last7} this week, ${c.today} today. Overall SQD score is ${ins.overallScore}%.`);
  out.push("");
  out.push("Key figures");
  out.push(`• Survey mix: ${c.external} external, ${c.internal} internal.`);
  if (ins.customerMix.length) out.push(`• Customer types: ${ins.customerMix.map((x) => `${x.label} ${x.count}`).join(", ")}.`);
  if (ins.satisfactionScore != null) out.push(`• Overall satisfaction (SQD0): ${ins.satisfactionScore}%.`);
  if (ins.strongest && ins.weakest) out.push(`• Strongest dimension: ${ins.strongest.label} at ${ins.strongest.score}%; weakest: ${ins.weakest.label} at ${ins.weakest.score}%.`);
  if (ins.cc[0]) out.push(`• Citizen's Charter awareness (CC1): ${ins.awarenessRate}% positive.`);
  if (ins.topServices[0]) out.push(`• Most availed service: ${ins.topServices[0].label} (${ins.topServices[0].count}).`);
  out.push("");
  out.push("What it means");
  if (ins.unhappyResponses > 0) {
    out.push(`${ins.unhappyResponses} response(s) contain a Disagree or Strongly Disagree — review those first in Measurement Data.`);
  } else {
    out.push("No response carries a negative SQD rating in this window.");
  }
  if (ins.weakest && ins.weakest.score < 90) {
    out.push(`Suggested action: focus improvement on ${ins.weakest.label} — it is below the 90% target.`);
  }
  return out.join("\n");
}
