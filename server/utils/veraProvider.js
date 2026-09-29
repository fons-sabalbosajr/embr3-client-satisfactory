// VERA provider layer — resolves the configured model vendor and performs the
// completion call. Supports Anthropic (Claude) and Google Gemini; "none" means
// VERA answers deterministically from live data + the help library.
//
// Security model:
//   • The operational API key comes FIRST from the provider's env var
//     (ANTHROPIC_API_KEY / GEMINI_API_KEY).
//   • A UI-entered key is only a fallback, stored AES-256-GCM-encrypted in the DB
//     (provider.apiKeyEnc) and tagged with provider.apiKeyProvider. A stored key
//     is ONLY used for its own provider.
//   • The key is NEVER returned to any caller or sent to the browser. Only
//     safeStatus() (masked) leaves this module.

import { encryptSecret, decryptSecret, maskHint } from "./secretBox.js";

// SDKs are loaded lazily so the server boots even if one is not installed.
let AnthropicCtor = null;
let GoogleGenAICtor = null;
async function loadAnthropic() {
  if (AnthropicCtor) return AnthropicCtor;
  try {
    const mod = await import("@anthropic-ai/sdk");
    AnthropicCtor = mod.default || mod.Anthropic;
  } catch {
    AnthropicCtor = null;
  }
  return AnthropicCtor;
}
async function loadGemini() {
  if (GoogleGenAICtor) return GoogleGenAICtor;
  try {
    const mod = await import("@google/genai");
    GoogleGenAICtor = mod.GoogleGenAI;
  } catch {
    GoogleGenAICtor = null;
  }
  return GoogleGenAICtor;
}

export const PROVIDERS = {
  none: {
    id: "none",
    label: "No model (rule-based only)",
    envKey: "",
    defaultModel: () => "",
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic (Claude)",
    envKey: "ANTHROPIC_API_KEY",
    defaultModel: () => (process.env.ANTHROPIC_MODEL || "claude-opus-5").trim(),
  },
  gemini: {
    id: "gemini",
    label: "Google Gemini",
    envKey: "GEMINI_API_KEY",
    defaultModel: () => (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim(),
  },
};

// Selected provider. When nothing has been chosen in the settings UI, fall
// back to VERA_PROVIDER, then to whichever vendor has a key in the server env —
// so a deployment configured purely through .env works without a DB write.
export function resolveProvider(cfg) {
  const p = String(cfg?.provider?.provider || "").trim().toLowerCase();
  if (p && p !== "none" && PROVIDERS[p]) return p;
  if (p === "none" && cfg?.provider?.providerExplicit) return "none";
  const envPref = String(process.env.VERA_PROVIDER || "").trim().toLowerCase();
  if (PROVIDERS[envPref]) return envPref;
  if ((process.env.ANTHROPIC_API_KEY || "").trim()) return "anthropic";
  if ((process.env.GEMINI_API_KEY || "").trim()) return "gemini";
  return "none";
}

// Effective API key + where it came from, for the SELECTED provider.
//   returns { key: string, source: "env" | "database" | "" }
export function resolveKey(cfg) {
  const provider = resolveProvider(cfg);
  if (provider === "none") return { key: "", source: "" };
  const envKey = (process.env[PROVIDERS[provider].envKey] || "").trim();
  if (envKey) return { key: envKey, source: "env" };
  const storedProvider = String(cfg?.provider?.apiKeyProvider || "").toLowerCase();
  if (storedProvider === provider) {
    const dec = decryptSecret(cfg?.provider?.apiKeyEnc || "");
    if (dec) return { key: dec, source: "database" };
  }
  return { key: "", source: "" };
}

export function resolveModel(cfg) {
  const explicit = String(cfg?.provider?.model || "").trim();
  if (explicit) return explicit;
  return PROVIDERS[resolveProvider(cfg)].defaultModel();
}
// Per-vendor env defaults (ANTHROPIC_MAX_TOKENS, GEMINI_TEMPERATURE, …) apply
// when the settings document holds no explicit value.
const envNum = (cfg, suffix) => {
  const vendor = resolveProvider(cfg) === "gemini" ? "GEMINI" : "ANTHROPIC";
  const raw = process.env[`${vendor}_${suffix}`];
  return raw != null && raw !== "" && Number.isFinite(Number(raw)) ? Number(raw) : null;
};
export const resolveMaxTokens = (cfg) =>
  Number(cfg?.provider?.maxTokens) || envNum(cfg, "MAX_TOKENS") || 1200;
export const resolveTemperature = (cfg) =>
  cfg?.provider?.temperature == null ? envNum(cfg, "TEMPERATURE") ?? 0.3 : Number(cfg.provider.temperature);
export const resolveTimeoutMs = (cfg) =>
  Number(cfg?.provider?.requestTimeoutMs) || envNum(cfg, "TIMEOUT_MS") || 30000;
export const resolveEffort = (cfg) => {
  const e = String(cfg?.provider?.effort || "medium");
  return ["low", "medium", "high"].includes(e) ? e : "medium";
};

// Is a real model call possible right now?
export function isOperational(cfg) {
  if (!cfg?.enabled) return false;
  if (resolveProvider(cfg) === "none") return false;
  return !!resolveKey(cfg).key;
}

function notConfigured() {
  const err = new Error("not_configured");
  err.code = "not_configured";
  return err;
}
function sdkMissing(vendor) {
  const err = new Error(`${vendor} SDK not installed`);
  err.code = "sdk_missing";
  return err;
}

// Anthropic request shape. Current Claude models take adaptive thinking +
// effort and reject sampling params; Haiku 4.5 still uses the older shape, so
// thinking is simply omitted there.
function anthropicParams({ model, maxTokens, effort, system, messages }) {
  const isHaiku = /haiku/i.test(model);
  const params = {
    model,
    max_tokens: maxTokens,
    system: system || undefined,
    messages,
  };
  if (!isHaiku) {
    params.thinking = { type: "adaptive" };
    params.output_config = { effort };
  }
  return params;
}

async function anthropicComplete(cfg, { system, messages, signal, maxTokens }) {
  const Anthropic = await loadAnthropic();
  if (!Anthropic) throw sdkMissing("Anthropic");
  const { key } = resolveKey(cfg);
  if (!key) throw notConfigured();
  const model = resolveModel(cfg);
  const client = new Anthropic({ apiKey: key, timeout: resolveTimeoutMs(cfg), maxRetries: 1 });
  const base = anthropicParams({
    model,
    maxTokens: maxTokens ?? resolveMaxTokens(cfg),
    effort: resolveEffort(cfg),
    system,
    messages,
  });

  // Server-side refusal fallbacks (routes a safety refusal to a fallback model
  // by category). Not every deployment/model accepts the beta, so a rejected
  // request is retried once in the plain shape.
  let resp;
  try {
    resp = await client.beta.messages.create(
      { ...base, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" },
      { signal }
    );
  } catch (err) {
    const status = err?.status;
    if (status === 400 && /fallback|beta/i.test(String(err?.message || ""))) {
      resp = await client.messages.create(base, { signal });
    } else {
      throw err;
    }
  }

  const text = (resp.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return {
    provider: "anthropic",
    model: resp?.model || model,
    text,
    stopReason: resp?.stop_reason || "",
    refused: resp?.stop_reason === "refusal",
    inputTokens: resp?.usage?.input_tokens || 0,
    outputTokens: resp?.usage?.output_tokens || 0,
  };
}

async function geminiComplete(cfg, { system, messages, signal, maxTokens }) {
  const GoogleGenAI = await loadGemini();
  if (!GoogleGenAI) throw sdkMissing("Gemini");
  const { key } = resolveKey(cfg);
  if (!key) throw notConfigured();
  const model = resolveModel(cfg);
  const ai = new GoogleGenAI({ apiKey: key });
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.content || "") }],
  }));
  const resp = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: system || undefined,
      maxOutputTokens: maxTokens ?? resolveMaxTokens(cfg),
      temperature: resolveTemperature(cfg),
      abortSignal: signal,
    },
  });
  const usage = resp?.usageMetadata || {};
  return {
    provider: "gemini",
    model,
    text: String(resp?.text || "").trim(),
    stopReason: resp?.candidates?.[0]?.finishReason || "",
    refused: false,
    inputTokens: usage.promptTokenCount || 0,
    outputTokens: usage.candidatesTokenCount || 0,
  };
}

// Unified completion. `messages` = [{ role: "user"|"assistant", content }]
// ending with the user turn. Returns a normalized shape regardless of vendor.
export async function complete(cfg, opts) {
  const provider = resolveProvider(cfg);
  if (provider === "none") throw notConfigured();
  return provider === "gemini" ? geminiComplete(cfg, opts) : anthropicComplete(cfg, opts);
}

// Minimal round-trip that confirms auth + model access.
export async function testConnection(cfg) {
  return complete(cfg, {
    system: "Reply with the single word: OK",
    messages: [{ role: "user", content: "Connection test." }],
    maxTokens: 64,
  });
}

// UI-safe status. NEVER includes the key — only a masked hint + booleans.
export function safeStatus(cfg) {
  const provider = resolveProvider(cfg);
  const { key, source } = resolveKey(cfg);
  const stored = String(cfg?.provider?.provider || "").toLowerCase();
  return {
    provider,
    providerLabel: PROVIDERS[provider].label,
    // "settings" when chosen in the UI, "env" when auto-detected from server keys
    providerSource: provider !== "none" && (!stored || stored === "none") ? "env" : "settings",
    enabled: !!cfg?.enabled,
    publicEnabled: !!cfg?.publicEnabled,
    operational: isOperational(cfg),
    keyConfigured: !!key,
    keySource: source,
    keyEnvVar: PROVIDERS[provider].envKey,
    keyHint:
      source === "database"
        ? cfg?.provider?.apiKeyHint || maskHint(key)
        : key
          ? "configured via server environment"
          : "",
    model: resolveModel(cfg),
    effort: resolveEffort(cfg),
    maxTokens: resolveMaxTokens(cfg),
    temperature: resolveTemperature(cfg),
    requestTimeoutMs: resolveTimeoutMs(cfg),
    lastSuccessfulConnectionAt: cfg?.lastSuccessfulConnectionAt || null,
    lastError: cfg?.lastError || "",
    lastErrorAt: cfg?.lastErrorAt || null,
  };
}

// Prepare a DB write for a UI-supplied key. Blank → null (keep existing key).
export function prepareKeyForStorage(plaintext, provider) {
  const text = String(plaintext || "").trim();
  if (!text) return null;
  const prov = PROVIDERS[String(provider || "").toLowerCase()] ? provider.toLowerCase() : "anthropic";
  return { apiKeyEnc: encryptSecret(text), apiKeyHint: maskHint(text), apiKeyProvider: prov };
}

// Maps raw SDK/HTTP errors to a short user-facing message + stable code, and
// NEVER leaks the API key, stack traces, or raw provider payloads.
export function sanitizeError(err, key, provider = "anthropic") {
  const vendor = provider === "gemini" ? "Gemini" : "Anthropic";
  const status = err?.status || err?.statusCode;
  const rawType = err?.error?.type || err?.name || "";
  const rawMsg = String(err?.message || err?.error?.message || "");
  let message = "The assistant request failed. Please try again.";
  let code = "unknown";
  if (err?.code === "not_configured") {
    message = "No model provider or API key is configured for VERA.";
    code = "not_configured";
  } else if (err?.code === "sdk_missing") {
    message = `The ${vendor} SDK is not installed on the server.`;
    code = "sdk_missing";
  } else if (status === 401 || rawType === "authentication_error" || /UNAUTHENTICATED|API key/i.test(rawMsg)) {
    message = `Authentication failed — the ${vendor} API key was rejected.`;
    code = "auth_failed";
  } else if (status === 403 || rawType === "permission_error" || /PERMISSION_DENIED/i.test(rawMsg)) {
    message = "The API key lacks permission for this model.";
    code = "permission_denied";
  } else if (status === 404 || rawType === "not_found_error" || /NOT_FOUND|is not found/i.test(rawMsg)) {
    message = `The configured model is not available for this ${vendor} API key.`;
    code = "model_unavailable";
  } else if (status === 429 || rawType === "rate_limit_error" || /rate limit|RESOURCE_EXHAUSTED/i.test(rawMsg)) {
    message = `${vendor} rate limit reached. Please wait and try again.`;
    code = "rate_limited";
  } else if (status === 400 && /credit|balance|billing|quota/i.test(rawMsg)) {
    message = `Insufficient ${vendor} credits — check billing on the provider console.`;
    code = "insufficient_credits";
  } else if (status === 400) {
    message = `${vendor} rejected the request (check the model name in VERA settings).`;
    code = "bad_request";
  } else if (
    err?.name === "APIConnectionTimeoutError" ||
    /timeout|timed out|ETIMEDOUT|ECONNRESET|AbortError|abort/i.test(`${err?.message || ""} ${err?.name || ""}`)
  ) {
    message = `The request to ${vendor} timed out. Please try again.`;
    code = "timeout";
  }
  if (key) message = message.split(key).join("****");
  return { message, code };
}
