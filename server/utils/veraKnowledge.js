// VERA knowledge base — Online Client Satisfaction Measurement (OCSM).
//
// Two realms:
//   • admin  — authenticated OCSM staff: reading the dashboard, measurement
//              data, reports, exports, accounts, data configuration, and how
//              the ARTA Client Satisfaction Measurement is scored.
//   • public — anonymous visitors on the landing / survey pages: what the
//              survey is, why it matters, how long it takes, privacy, the two
//              survey types, and languages. No data, no account help.
//
// Shape: { id, category, question, keywords[], answer }. Answers are plain text.

export const DEFAULT_NAME = "VERA";
export const DEFAULT_FULL_NAME = "Virtual Evaluation & Response Assistant";
export const SUPPORT_EMAIL = "embr3.ocsm@gmail.com";

export const ADMIN_PAGE_LABELS = {
  dashboard: "Dashboard",
  "measurement-data": "Measurement Data",
  "generate-report": "Reports → Generate Report",
  "extract-data": "Reports → Extract Data",
  announcements: "Announcements",
  "app-logs": "App Logs",
  "data-configuration": "Settings → Data Configuration",
  "account-settings": "Settings → Account Settings",
  "developer-settings": "Settings → Developer Settings",
  "backup-data": "Settings → Backup Data",
  "vera-settings": "Settings → VERA Assistant",
};

export const ADMIN_STARTERS = [
  "How are we doing this month?",
  "Which SQD dimension is the weakest?",
  "How many clients are aware of the Citizen's Charter?",
  "What are the most availed services?",
  "Summarise the latest client remarks",
  "How is the SQD score computed?",
];

export const PUBLIC_STARTERS = [
  "What is this survey for?",
  "How long does the survey take?",
  "Are my answers anonymous?",
  "Internal or external survey — which one do I take?",
  "Can I answer in Filipino?",
];

export const ADMIN_GREETING =
  "Hi, I'm VERA — your Virtual Evaluation & Response Assistant. Ask me about satisfaction scores, Citizen's Charter awareness, services availed, trends, client remarks, or how to use any OCSM page. I answer from the live survey data.";

export const PUBLIC_GREETING =
  "Hello! I'm VERA, the assistant for the EMB Region III Client Satisfaction Survey. I can explain what the survey is for, how long it takes, how your answers are protected, and which survey type applies to you.";

export const ADMIN_OUT_OF_SCOPE =
  "I can only help with the EMB Region III Online Client Satisfaction Measurement — survey results, scores, trends, remarks, reports, and how to use the admin pages. That topic is outside what I cover.";

export const PUBLIC_OUT_OF_SCOPE =
  "I can help with questions about the EMB Region III Client Satisfaction Survey — what it is, how to take it, privacy, and the survey types. For anything else, please contact the office directly.";

export const CANNOT_VERIFY =
  "I can't confirm that from the data I have. Try the Measurement Data page for individual responses, or Reports → Generate Report for a filtered breakdown.";

export const ADMIN_KB = [
  {
    id: "dashboard-read",
    category: "dashboard",
    question: "How do I read the Admin Dashboard?",
    keywords: ["dashboard", "read", "tiles", "overview", "charts", "understand"],
    answer:
      "The Dashboard opens with headline tiles — total surveys, overall SQD score, Citizen's Charter positives, and recent responses. Below them: a per-question CC breakdown (Positive / Neutral / Negative), an SQD breakdown per dimension (Strongly Agree → Strongly Disagree), and the most recent five surveys. Click any question tile to open a detail modal listing every response for that question. Use the survey-type switch to view Internal, External, or all responses.",
  },
  {
    id: "sqd-score-formula",
    category: "scoring",
    question: "How is the SQD score computed?",
    keywords: ["score", "formula", "computed", "compute", "percentage", "sqd score", "overall score", "arta", "csm", "calculation"],
    answer:
      "Per ARTA's Client Satisfaction Measurement: SQD score = (Strongly Agree + Agree) ÷ (all answers except N/A) × 100. The overall score averages SQD1–SQD8 (Responsiveness, Reliability, Access & Facilities, Communication, Costs, Integrity, Assurance, Outcome); SQD0 (overall satisfaction) is reported separately. ARTA's target is at least 80% (Satisfactory), with 90% and above rated Very Satisfactory. The Dashboard and Generate Report both apply this formula.",
  },
  {
    id: "sqd-dimensions",
    category: "scoring",
    question: "What do the SQD dimensions mean?",
    keywords: ["sqd", "dimension", "responsiveness", "reliability", "access", "facilities", "communication", "costs", "integrity", "assurance", "outcome", "sqd0", "sqd1", "sqd8", "meaning"],
    answer:
      "SQD0 — Overall satisfaction with the service. SQD1 Responsiveness — time spent was reasonable. SQD2 Reliability — office followed the published requirements and steps. SQD3 Access & Facilities — the online steps and payment were simple and convenient. SQD4 Communication — information about the transaction was easy to find. SQD5 Costs — fees were acceptable. SQD6 Integrity — the online transaction was secure. SQD7 Assurance — online support was available and responsive. SQD8 Outcome — the client got what they needed, or a denial was explained.",
  },
  {
    id: "cc-questions",
    category: "scoring",
    question: "What are the Citizen's Charter (CC) questions?",
    keywords: ["citizen", "charter", "cc", "cc1", "cc2", "cc3", "awareness", "visibility", "helpful", "positive", "neutral", "negative"],
    answer:
      "CC1 asks whether the client knows about the Citizen's Charter (aware and saw it / learned of it here / did not see it / does not know). CC2 asks if the Charter was easy to see and follow. CC3 asks how much it helped. VERA and the Dashboard bucket them as Positive (aware, easy to see, helped a lot), Neutral (somewhat), Negative (unaware, hard to see or not visible, did not help), and N/A. A client who answered 'does not know' in CC1 skips CC2 and CC3, so those show fewer answers.",
  },
  {
    id: "measurement-page",
    category: "measurement",
    question: "What can I do on the Measurement Data page?",
    keywords: ["measurement", "measurement data", "responses", "individual", "search", "filter", "date range", "view", "review", "table"],
    answer:
      "Measurement Data lists every submitted response. Use the search box (matches any answer text), the date range picker, and the column filters (survey type, client type, gender, service availed). The eye button opens a full review with a Positive / Neutral / Negative / N/A summary, the detailed CC and SQD answers, and remarks. The pencil edits a response; the bin deletes it (needs the delete permission). Export downloads the filtered rows to Excel.",
  },
  {
    id: "export-excel",
    category: "reports",
    question: "How do I export responses to Excel, and does it include Service Availed?",
    keywords: ["export", "excel", "xlsx", "download", "spreadsheet", "service availed", "services", "csv"],
    answer:
      "Measurement Data → Export downloads the currently filtered responses, one row each, with profile columns, Service Availed (multiple services separated by ';'), every CC and SQD answer, and remarks. Reports → Extract Data exports a lighter profile-only sheet. Reports → Generate Report exports each results table plus a 'Responses' sheet with the same per-response columns. Settings → Backup Data dumps raw collections as JSON or CSV.",
  },
  {
    id: "generate-report",
    category: "reports",
    question: "How do I generate the ARTA CSM report?",
    keywords: ["generate", "report", "arta", "pdf", "results", "cc results", "sqd results", "services results", "respondents", "period", "quarter"],
    answer:
      "Reports → Generate Report. Set the date range (a quarter or year), optional survey type, region, customer type, and services, then review the five tables: Citizen's Charter results, SQD results (with the percentage score), Services availed, Respondents by sex, and Respondents by customer type. Each table has Export Excel and Export PDF buttons. The Excel file also carries a Responses sheet.",
  },
  {
    id: "extract-data",
    category: "reports",
    question: "What is Extract Data for?",
    keywords: ["extract", "extract data", "personnel", "assisted", "company", "list"],
    answer:
      "Reports → Extract Data is a quick roster of responses: submitted date, survey type, region, customer type, company/agency, assisting personnel and services availed. Filter by keyword, assisting personnel, or survey type, then Export to Excel. Use it when you need a list of who transacted and which services, rather than the ratings.",
  },
  {
    id: "survey-types",
    category: "survey",
    question: "What is the difference between the Internal and External survey?",
    keywords: ["internal", "external", "survey type", "difference", "employee", "government", "types"],
    answer:
      "External is for citizens, businesses and other agencies transacting with EMB Region III. Internal is for EMB Region III employees availing internal services (HR, records, finance and the like); the client type is set to Government and an optional employee name field is shown. The service list differs per type and is maintained under Settings → Data Configuration. Every page can filter by survey type.",
  },
  {
    id: "data-config",
    category: "settings",
    question: "How do I change survey questions or the services list?",
    keywords: ["data configuration", "questions", "options", "services list", "add service", "edit question", "configure", "service categories"],
    answer:
      "Settings → Data Configuration (needs the edit permission). Questions: edit the text, type, and options of Q1–Q19; changes apply to new submissions only. Services: maintain the Service Availed options and tag each as internal or external. Changing a question's text does not rewrite past answers, so keep the wording stable within a reporting period.",
  },
  {
    id: "accounts-permissions",
    category: "settings",
    question: "How do accounts and permissions work?",
    keywords: ["account", "accounts", "permission", "permissions", "user", "users", "role", "privilege", "admin", "viewer", "manage users", "can edit", "can delete"],
    answer:
      "Accounts are managed by users with the Manage Users permission (Developer Settings → Accounts). Each account has permissions: can create, can edit, can delete, can manage users, can manage announcements. Admin privilege and the Developer position pass every check. Account Settings lets any user change their own name, email and password; new sign-ups must verify their email before logging in.",
  },
  {
    id: "announcements",
    category: "settings",
    question: "How do announcements work?",
    keywords: ["announcement", "announcements", "notice", "email", "broadcast", "send email"],
    answer:
      "Announcements lets staff with the announcements permission post notices shown to admin users, and optionally send them by email. Create, edit, or delete an announcement, then use Send Email to broadcast it.",
  },
  {
    id: "backup",
    category: "settings",
    question: "How do I back up the data?",
    keywords: ["backup", "back up", "restore", "json", "collection", "dump", "database"],
    answer:
      "Settings → Backup Data (Manage Users permission). Pick a collection — client-satisfactory-data holds the responses, questions-data the questions — and export it as JSON (full fidelity) or CSV. Keep a JSON copy before large edits or deletions; there is no in-app restore, so a backup is re-imported by the developer.",
  },
  {
    id: "app-logs",
    category: "settings",
    question: "What are App Logs?",
    keywords: ["logs", "app logs", "audit", "error", "activity", "who changed"],
    answer:
      "App Logs (Manage Users permission) records every mutation and error: method, path, status, duration, user and IP. Filter by level (info, warn, error, audit) or search text to see who edited or deleted a response and when. Entries expire after 30 days.",
  },
  {
    id: "share-survey",
    category: "survey",
    question: "How do clients access the survey?",
    keywords: ["link", "url", "qr", "qr code", "client", "tablet", "kiosk", "share", "access", "phone"],
    answer:
      "The public landing page and the /client page show a QR code and the survey link. Clients pick Internal or External and a language (English or Filipino), then answer the three steps: profile, Citizen's Charter, and SQD. A kiosk tablet can be left on the /client page; it flags a 'live' banner on Measurement Data while someone is answering.",
  },
  {
    id: "edit-delete",
    category: "measurement",
    question: "How do I edit or delete a response?",
    keywords: ["edit", "delete", "remove", "correct", "fix", "wrong answer", "duplicate"],
    answer:
      "On Measurement Data, click the pencil to open the editor, change the answers, and save; the bin deletes after confirmation. Both need the matching permission (edit / delete) or admin privilege, and both are recorded in App Logs. Prefer editing over deleting so the response count for the period stays intact.",
  },
  {
    id: "vera-settings",
    category: "settings",
    question: "How do I configure VERA?",
    keywords: ["vera", "assistant", "configure", "provider", "api key", "model", "anthropic", "gemini", "settings", "tone", "starter", "disable"],
    answer:
      "Settings → VERA Assistant (Manage Users permission or Developer). Choose the provider (Anthropic, Gemini, or none for rule-based answers), the model, and paste the API key — it is stored encrypted and never shown again. Set the tone, response length, greetings and starter questions, whether live survey data is included, the daily per-user limit, and logging level. Use Test Connection after saving. Without a provider VERA still answers from live figures and this help library.",
  },
  {
    id: "dark-mode",
    category: "general",
    question: "How do I switch dark mode or the theme colours?",
    keywords: ["dark", "theme", "colour", "color", "light", "appearance"],
    answer:
      "The bulb switch in the header toggles dark mode. Developers can set the sidebar, header and primary colours under Settings → Developer Settings → Theme, with presets available.",
  },
  {
    id: "weak-scores",
    category: "insights",
    question: "What should we do about a low score?",
    keywords: ["low", "weak", "improve", "improvement", "action", "recommend", "below target", "fail", "negative", "complaint", "disagree"],
    answer:
      "Start with the weakest dimension: open the Dashboard tile to list its Disagree / Strongly Disagree responses, read their remarks, and note the services and assisting personnel involved. Costs and Assurance are the usual laggards for online permitting; check whether fee schedules and online support hours are published. Then set a target for the next quarter and compare with Generate Report using the same date range.",
  },
];

export const PUBLIC_KB = [
  {
    id: "what-is",
    category: "survey",
    question: "What is this survey for?",
    keywords: ["what", "survey", "purpose", "for", "why", "csm", "arta", "about"],
    answer:
      "This is the EMB Region III Client Satisfaction Measurement — the feedback form required by the Anti-Red Tape Authority (ARTA) for every government service. Your ratings on time, steps, fees, courtesy and outcome tell the office what to improve, and the results are reported to ARTA each year.",
  },
  {
    id: "how-long",
    category: "survey",
    question: "How long does the survey take?",
    keywords: ["long", "time", "minutes", "how many questions", "quick", "duration"],
    answer:
      "About three to five minutes. There are three short steps: a few profile questions, three Citizen's Charter questions, and nine service-quality statements you rate from Strongly Disagree to Strongly Agree. A remarks box at the end is optional.",
  },
  {
    id: "anonymous",
    category: "privacy",
    question: "Are my answers anonymous?",
    keywords: ["anonymous", "privacy", "private", "confidential", "name", "email", "data privacy", "who sees"],
    answer:
      "Yes. You are not required to give your name or email. Only your client type, sex, age (for citizens), the service you availed and your ratings are recorded, and results are reported in aggregate to ARTA. The office uses individual remarks only to improve the service.",
  },
  {
    id: "types",
    category: "survey",
    question: "Internal or external survey — which one do I take?",
    keywords: ["internal", "external", "which", "type", "employee", "citizen", "business", "government", "agency"],
    answer:
      "Take the External survey if you are a citizen, a business, or from another government agency and you transacted with EMB Region III. Take the Internal survey only if you are an EMB Region III employee who availed an internal service such as HR, records or finance.",
  },
  {
    id: "language",
    category: "survey",
    question: "Can I answer in Filipino?",
    keywords: ["filipino", "tagalog", "language", "english", "translate"],
    answer:
      "Yes. Use the language selector next to the Take Survey button to switch between English and Filipino before you start.",
  },
  {
    id: "cc-explained",
    category: "survey",
    question: "What is the Citizen's Charter?",
    keywords: ["citizen", "charter", "cc", "what is"],
    answer:
      "The Citizen's Charter is the office's published list of services, requirements, steps, fees and processing times. The survey asks whether you knew about it, whether it was easy to see and follow, and whether it helped with your transaction.",
  },
  {
    id: "services",
    category: "survey",
    question: "Which services can I rate?",
    keywords: ["service", "services", "permit", "ecc", "cnc", "pco", "hazardous", "discharge", "which services", "list"],
    answer:
      "Any EMB Region III service you availed — for example Environmental Compliance Certificates, Certificates of Non-Coverage, Permits to Operate, Discharge Permits, Hazardous Waste registrations, Pollution Control Officer accreditation, chemical clearances and more. You can select more than one service in a single survey.",
  },
  {
    id: "contact",
    category: "support",
    question: "How do I contact the office?",
    keywords: ["contact", "office", "phone", "email", "address", "where", "help", "support"],
    answer:
      `EMB Region III is at Masinop Corner Matalino St., Diosdado Macapagal Government Center, Maimpis, City of San Fernando, Pampanga. For questions about this survey portal, email ${SUPPORT_EMAIL}.`,
  },
  {
    id: "phone-qr",
    category: "survey",
    question: "Can I take the survey on my phone?",
    keywords: ["phone", "mobile", "qr", "scan", "tablet", "device"],
    answer:
      "Yes. Scan the QR code on this page with your phone camera to open the survey, or tap Take the Survey directly. The form works on any screen size.",
  },
];
