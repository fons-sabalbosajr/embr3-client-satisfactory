// Parses EXTERNAL_SERVICES / INTERNAL_SERVICES env values into a list.
//
// Several official service names contain commas ("Facilitation, Evaluation,
// Updating and Approval of Ten-Year Solid Waste Management Plan"), so splitting
// on commas turned one service into several fake ones on the survey. Use "|"
// (or ";") between services; a plain comma list is still accepted for older
// .env files, but names containing commas will only survive with "|" or ";".
export function parseServiceList(value) {
  const raw = String(value || "");
  const sep = raw.includes("|") ? "|" : raw.includes(";") ? ";" : ",";
  return [...new Set(raw.split(sep).map((s) => s.trim()).filter(Boolean))];
}
