import mongoose from "mongoose";

// VERA — Virtual Evaluation & Response Assistant configuration.
//
// The API key is NEVER stored in plain text: the operational source of truth is
// the provider's server env var (ANTHROPIC_API_KEY / GEMINI_API_KEY), and a key
// entered from the settings UI is kept only as an AES-256-GCM-encrypted fallback
// (apiKeyEnc, see utils/secretBox.js) tagged with the provider it belongs to,
// plus a non-reversible hint for display. Nothing in this sub-document is ever
// returned raw to the browser — routes/vera.js only exposes safeStatus().
const veraSchema = new mongoose.Schema(
  {
    // Master switch for the admin widget; publicEnabled gates the landing-page helper.
    enabled: { type: Boolean, default: true },
    publicEnabled: { type: Boolean, default: true },

    // Identity — editable so the office can rebrand the assistant.
    name: { type: String, default: "VERA" },
    fullName: { type: String, default: "Virtual Evaluation & Response Assistant" },
    tagline: { type: String, default: "Your client-satisfaction insight partner" },

    // How VERA talks. "analyst" leads with figures and a recommended action;
    // "friendly" is conversational; "formal" is memo-style for management.
    tone: { type: String, enum: ["analyst", "friendly", "formal"], default: "analyst" },
    responseLength: { type: String, enum: ["brief", "balanced", "detailed"], default: "balanced" },
    customInstructions: { type: String, default: "" },

    // Greeting + starter chips per realm. Empty → built-in defaults from veraKnowledge.js.
    greeting: { type: String, default: "" },
    greetingPublic: { type: String, default: "" },
    starterQuestions: { type: [String], default: [] },
    starterQuestionsPublic: { type: [String], default: [] },

    // Live data: when on, every admin answer is grounded in fresh survey
    // aggregates (scores, awareness, top services, trends). Window 0 = all time.
    liveInsights: { type: Boolean, default: true },
    insightsWindowDays: { type: Number, default: 0 },
    includeRemarks: { type: Boolean, default: true },

    provider: {
      provider: { type: String, enum: ["none", "anthropic", "gemini"], default: "none" },
      // "none" chosen deliberately in the UI (otherwise "none" means "not set"
      // and the server env keys pick the provider — see veraProvider.js).
      providerExplicit: { type: Boolean, default: false },
      model: { type: String, default: "" }, // blank → provider default
      apiKeyEnc: { type: String, default: "" }, // "v1:iv:tag:cipher"
      apiKeyHint: { type: String, default: "" }, // "••••••••AB12" — display only
      apiKeyProvider: { type: String, default: "" },
      effort: { type: String, enum: ["low", "medium", "high"], default: "medium" },
      temperature: { type: Number, default: 0.3 }, // Gemini only
      maxTokens: { type: Number, default: 1200 },
      requestTimeoutMs: { type: Number, default: 30000 },
    },

    // Usage governance
    dailyUserLimit: { type: Number, default: 150 },
    publicWindowLimit: { type: Number, default: 20 }, // per IP per 10 minutes
    loggingLevel: { type: String, enum: ["none", "metadata", "full"], default: "metadata" },

    // Connection health (updated by Test Connection + chat flows).
    lastSuccessfulConnectionAt: { type: Date, default: null },
    lastError: { type: String, default: "" },
    lastErrorAt: { type: Date, default: null },
    updatedBy: { type: String, default: "" },
  },
  { _id: false }
);

const appSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "global", unique: true },
    vera: { type: veraSchema, default: () => ({}) },
  },
  { timestamps: true, collection: "app-settings" }
);

const AppSettings = mongoose.model("AppSettings", appSettingsSchema);

// Single-document settings store. Creates the row on first access. If the row
// cannot be written (e.g. the cluster is read-only or over quota) an unsaved
// document with schema defaults is returned so features that only READ
// settings keep working; a later save() will surface the write error.
export async function loadSettings() {
  const doc = await AppSettings.findOne({ key: "global" });
  if (doc) return doc;
  try {
    return await AppSettings.create({ key: "global" });
  } catch (err) {
    console.warn("[AppSettings] could not create the settings document:", err?.message || err);
    return new AppSettings({ key: "global" });
  }
}

export default AppSettings;
