// VERA — Virtual Evaluation & Response Assistant API.
//
//   GET  /api/vera/status          (auth)   widget bootstrap: mode, greeting, starters
//   POST /api/vera/chat            (auth)   admin chat, grounded in live survey insights
//   GET  /api/vera/insights        (auth)   the live aggregates as JSON + a readable brief
//   GET  /api/vera/public-status   (open)   landing-page widget bootstrap
//   POST /api/vera/public-chat     (open)   landing-page chat, help library only
//   GET  /api/vera/settings        (manage) full settings (key masked)
//   PUT  /api/vera/settings        (manage) update settings; blank key keeps stored key
//   POST /api/vera/settings/test   (manage) provider round-trip
//   DELETE /api/vera/settings/key  (manage) clear the stored (encrypted) key
//
// Security posture: input is sanitized + length-capped; output is rendered as
// plain text on the client; secrets, env values and personal records are never
// returned or sent to a model. Usage is written to the Log collection.

import express from "express";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import authMiddleware from "../middleware/auth.js";
import { requirePermission } from "../middleware/permission.js";
import User from "../models/User.js";
import Log, { writeLog } from "../models/Log.js";
import { loadSettings } from "../models/AppSettings.js";
import * as provider from "../utils/veraProvider.js";
import * as vera from "../utils/veraAssistant.js";
import { computeInsights, insightsToPromptBlock, insightsToBrief } from "../utils/veraInsights.js";

const router = express.Router();

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

async function veraSettings() {
  const doc = await loadSettings();
  return { doc, cfg: doc.vera?.toObject ? doc.vera.toObject() : doc.vera || {} };
}

async function currentUser(req) {
  if (!req.user?.id) return null;
  return User.findById(req.user.id).select("fullname username privilege position permissions").lean();
}

function statusPayload(cfg, realm) {
  const ctx = vera.contextFor(realm, cfg);
  const enabled = realm === "public" ? !!cfg.enabled && !!cfg.publicEnabled : !!cfg.enabled;
  return {
    enabled,
    mode: provider.isOperational(cfg) && enabled ? "model" : "fallback",
    realm,
    name: ctx.name,
    fullName: ctx.fullName,
    tagline: cfg.tagline || "",
    greeting: ctx.greeting,
    starterQuestions: ctx.starters,
    liveInsights: realm === "admin" ? cfg.liveInsights !== false : false,
  };
}

// Per-IP ceiling for the anonymous landing-page chat, on top of the global limiter.
const publicLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: async (req) => {
    try {
      const { cfg } = await veraSettings();
      return Math.max(1, Number(cfg.publicWindowLimit) || 20);
    } catch {
      return 20;
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, code: "rate_limited", message: "You've sent a lot of messages in a short time. Please wait a few minutes." },
});

// ── Admin realm ──────────────────────────────────────────────────────────────
router.get("/status", authMiddleware, async (_req, res) => {
  try {
    const { cfg } = await veraSettings();
    res.json(statusPayload(cfg, "admin"));
  } catch {
    res.json(statusPayload({}, "admin"));
  }
});

router.get("/insights", authMiddleware, async (_req, res) => {
  try {
    const { cfg } = await veraSettings();
    const insights = await computeInsights({ windowDays: cfg.insightsWindowDays, includeRemarks: cfg.includeRemarks !== false });
    res.json({ insights, brief: insightsToBrief(insights, cfg.name || "VERA") });
  } catch (e) {
    res.status(500).json({ message: "Insights failed to load" });
  }
});

router.post("/chat", authMiddleware, async (req, res) => {
  const { cfg } = await veraSettings().catch(() => ({ cfg: {} }));
  if (!cfg.enabled) {
    return res.status(200).json({ ok: false, code: "disabled", message: "VERA is currently disabled. An administrator can enable it under Settings → VERA Assistant." });
  }
  const message = vera.sanitizeInput(req.body?.message);
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const page = String(req.body?.page || "").slice(0, 60);
  if (!message) return res.status(400).json({ ok: false, code: "empty", message: "Please type a question." });

  const userId = req.user?.id || null;

  // Per-user daily limit (best-effort).
  try {
    const limit = Number(cfg.dailyUserLimit) || 0;
    if (limit > 0 && userId) {
      const count = await Log.countDocuments({ type: "vera", userId, createdAt: { $gte: startOfToday() } });
      if (count >= limit) {
        return res.status(429).json({ ok: false, code: "user_limit", message: `You've reached today's chat limit (${limit}). Please try again tomorrow.` });
      }
    }
  } catch { /* ignore */ }

  // Duplicate-request guard (same user + message within 8s).
  const requestHash = crypto.createHash("sha256").update(`${userId}|vera|${message}`).digest("hex");
  try {
    const dupe = await Log.findOne({ type: "vera", "meta.requestHash": requestHash, createdAt: { $gte: new Date(Date.now() - 8000) } }).lean();
    if (dupe) return res.status(429).json({ ok: false, code: "duplicate", message: "That question was just sent — one moment." });
  } catch { /* ignore */ }

  // Live insights are attached to every admin turn when enabled — this is the
  // data-first behaviour that distinguishes the OCSM VERA.
  let insights = null;
  let insightsBlock = "";
  if (cfg.liveInsights !== false) {
    try {
      insights = await computeInsights({ windowDays: cfg.insightsWindowDays, includeRemarks: cfg.includeRemarks !== false });
      insightsBlock = insightsToPromptBlock(insights);
    } catch { /* best-effort */ }
  }

  const user = await currentUser(req).catch(() => null);
  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), provider.resolveTimeoutMs(cfg) + 2000);
  const started = Date.now();
  const logging = cfg.loggingLevel || "metadata";

  try {
    const result = await vera.answer({ message, history, page, realm: "admin", settings: cfg, insights, insightsBlock, signal: controller.signal });
    clearTimeout(abortTimer);
    if (logging !== "none") {
      writeLog({
        level: "info",
        type: "vera",
        message: `VERA chat (${result.source})`,
        userId,
        userName: user?.fullname || req.user?.username || null,
        ip: req.ip,
        durationMs: Date.now() - started,
        meta: {
          requestHash,
          source: result.source,
          model: result.usedModel ? result.model : "fallback",
          inputTokens: result.inputTokens || 0,
          outputTokens: result.outputTokens || 0,
          page,
          ...(logging === "full" ? { prompt: message, response: result.answer } : {}),
        },
      });
    }
    if (result.usedModel) {
      loadSettings().then((doc) => {
        doc.vera.lastSuccessfulConnectionAt = new Date();
        doc.vera.lastError = "";
        return doc.save();
      }).catch(() => {});
    }
    return res.json({ ok: true, answer: result.answer, source: result.source });
  } catch (err) {
    clearTimeout(abortTimer);
    const { key } = provider.resolveKey(cfg);
    const { message: safeMsg, code } = provider.sanitizeError(err, key, provider.resolveProvider(cfg));
    loadSettings().then((doc) => {
      doc.vera.lastError = safeMsg;
      doc.vera.lastErrorAt = new Date();
      return doc.save();
    }).catch(() => {});
    writeLog({
      level: "warn",
      type: "vera",
      message: `VERA provider error: ${safeMsg}`,
      userId,
      userName: user?.fullname || null,
      ip: req.ip,
      durationMs: Date.now() - started,
      meta: { requestHash, code, page },
    });
    // Degrade to the rule-based / live-figures answer so the user still gets help.
    const fallback = vera.fallbackFor({ message, realm: "admin", settings: cfg, insights });
    if (fallback) return res.json({ ok: true, answer: fallback, source: "fallback", degraded: true, note: safeMsg });
    return res.status(200).json({ ok: false, code, message: safeMsg });
  }
});

// ── Public realm (landing page) ──────────────────────────────────────────────
router.get("/public-status", async (_req, res) => {
  try {
    const { cfg } = await veraSettings();
    res.json(statusPayload(cfg, "public"));
  } catch {
    res.json(statusPayload({}, "public"));
  }
});

router.post("/public-chat", publicLimiter, async (req, res) => {
  const { cfg } = await veraSettings().catch(() => ({ cfg: {} }));
  if (!cfg.enabled || !cfg.publicEnabled) {
    return res.status(200).json({ ok: false, code: "disabled", message: "The assistant is currently unavailable." });
  }
  const message = vera.sanitizeInput(req.body?.message);
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-6) : [];
  if (!message) return res.status(400).json({ ok: false, code: "empty", message: "Please type your question." });

  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), provider.resolveTimeoutMs(cfg) + 2000);
  try {
    // Public realm never receives insights — hard-coded here, not from the request.
    const result = await vera.answer({ message, history, realm: "public", settings: cfg, signal: controller.signal });
    clearTimeout(abortTimer);
    // Metadata only — an anonymous visitor's message is never stored.
    writeLog({ level: "info", type: "vera", message: `VERA public chat (${result.source})`, ip: req.ip, meta: { realm: "public", source: result.source } });
    return res.json({ ok: true, answer: result.answer, source: result.source });
  } catch (err) {
    clearTimeout(abortTimer);
    const fallback = vera.fallbackFor({ message, realm: "public", settings: cfg });
    return res.json({ ok: true, answer: fallback, source: "fallback", degraded: true });
  }
});

// ── Settings (Manage Users permission, admins and Developers pass) ───────────
function settingsPayload(cfg) {
  const { apiKeyEnc, ...providerRest } = cfg.provider || {};
  return {
    config: { ...cfg, provider: { ...providerRest } },
    status: provider.safeStatus(cfg),
    providers: Object.values(provider.PROVIDERS).map((p) => ({ id: p.id, label: p.label, envKey: p.envKey, defaultModel: p.defaultModel() })),
  };
}

router.get("/settings", authMiddleware, requirePermission("canManageUsers"), async (_req, res) => {
  try {
    const { cfg } = await veraSettings();
    const usageToday = await Log.countDocuments({ type: "vera", createdAt: { $gte: startOfToday() } }).catch(() => 0);
    res.json({ ...settingsPayload(cfg), usageToday });
  } catch (e) {
    res.status(500).json({ message: "Could not load VERA settings" });
  }
});

const str = (v, max = 2000) => String(v ?? "").slice(0, max);
const list = (v, max = 10) =>
  (Array.isArray(v) ? v : String(v || "").split("\n"))
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .slice(0, max);
const num = (v, def, min, max) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
};

router.put("/settings", authMiddleware, requirePermission("canManageUsers"), async (req, res) => {
  try {
    const b = req.body || {};
    const doc = await loadSettings();
    const v = doc.vera;
    const user = await currentUser(req).catch(() => null);

    if (typeof b.enabled === "boolean") v.enabled = b.enabled;
    if (typeof b.publicEnabled === "boolean") v.publicEnabled = b.publicEnabled;
    if (b.name !== undefined) v.name = str(b.name, 40) || "VERA";
    if (b.fullName !== undefined) v.fullName = str(b.fullName, 120) || "Virtual Evaluation & Response Assistant";
    if (b.tagline !== undefined) v.tagline = str(b.tagline, 160);
    if (["analyst", "friendly", "formal"].includes(b.tone)) v.tone = b.tone;
    if (["brief", "balanced", "detailed"].includes(b.responseLength)) v.responseLength = b.responseLength;
    if (b.customInstructions !== undefined) v.customInstructions = str(b.customInstructions, 2000);
    if (b.greeting !== undefined) v.greeting = str(b.greeting, 500);
    if (b.greetingPublic !== undefined) v.greetingPublic = str(b.greetingPublic, 500);
    if (b.starterQuestions !== undefined) v.starterQuestions = list(b.starterQuestions);
    if (b.starterQuestionsPublic !== undefined) v.starterQuestionsPublic = list(b.starterQuestionsPublic);
    if (typeof b.liveInsights === "boolean") v.liveInsights = b.liveInsights;
    if (typeof b.includeRemarks === "boolean") v.includeRemarks = b.includeRemarks;
    if (b.insightsWindowDays !== undefined) v.insightsWindowDays = num(b.insightsWindowDays, 0, 0, 3650);
    if (b.dailyUserLimit !== undefined) v.dailyUserLimit = num(b.dailyUserLimit, 150, 0, 10000);
    if (b.publicWindowLimit !== undefined) v.publicWindowLimit = num(b.publicWindowLimit, 20, 1, 500);
    if (["none", "metadata", "full"].includes(b.loggingLevel)) v.loggingLevel = b.loggingLevel;

    const p = b.provider || {};
    if (["none", "anthropic", "gemini"].includes(p.provider)) {
      v.provider.provider = p.provider;
      v.provider.providerExplicit = true; // a UI choice always wins over env auto-detection
    }
    if (p.model !== undefined) v.provider.model = str(p.model, 80).trim();
    if (["low", "medium", "high"].includes(p.effort)) v.provider.effort = p.effort;
    if (p.temperature !== undefined) v.provider.temperature = num(p.temperature, 0.3, 0, 2);
    if (p.maxTokens !== undefined) v.provider.maxTokens = num(p.maxTokens, 1200, 128, 8192);
    if (p.requestTimeoutMs !== undefined) v.provider.requestTimeoutMs = num(p.requestTimeoutMs, 30000, 5000, 120000);
    // A supplied key is encrypted at rest and tagged to the provider it was
    // entered for; blank keeps whatever is stored.
    const prepared = provider.prepareKeyForStorage(p.apiKey, v.provider.provider);
    if (prepared) Object.assign(v.provider, prepared);

    v.updatedBy = user?.fullname || req.user?.username || "";
    await doc.save();

    writeLog({ level: "audit", type: "vera", message: "VERA settings updated", userId: req.user?.id, userName: v.updatedBy, ip: req.ip, meta: { provider: v.provider.provider, model: v.provider.model, keyChanged: !!prepared } });
    const cfg = doc.vera.toObject();
    res.json(settingsPayload(cfg));
  } catch (e) {
    console.error("VERA settings save failed:", e);
    res.status(500).json({ message: "Could not save VERA settings" });
  }
});

router.post("/settings/test", authMiddleware, requirePermission("canManageUsers"), async (_req, res) => {
  const doc = await loadSettings();
  const cfg = doc.vera.toObject();
  if (provider.resolveProvider(cfg) === "none") {
    return res.json({ ok: false, code: "not_configured", message: "No provider selected — VERA will answer from live figures and the help library only." });
  }
  const { key } = provider.resolveKey(cfg);
  try {
    const r = await provider.testConnection(cfg);
    doc.vera.lastSuccessfulConnectionAt = new Date();
    doc.vera.lastError = "";
    doc.vera.lastErrorAt = null;
    await doc.save();
    res.json({ ok: true, message: `Connected to ${r.provider} · ${r.model} (${r.inputTokens}+${r.outputTokens} tokens). Reply: "${String(r.text).slice(0, 40)}"`, status: provider.safeStatus(doc.vera.toObject()) });
  } catch (err) {
    const { message, code } = provider.sanitizeError(err, key, provider.resolveProvider(cfg));
    doc.vera.lastError = message;
    doc.vera.lastErrorAt = new Date();
    await doc.save().catch(() => {});
    res.json({ ok: false, code, message, status: provider.safeStatus(doc.vera.toObject()) });
  }
});

router.delete("/settings/key", authMiddleware, requirePermission("canManageUsers"), async (req, res) => {
  try {
    const doc = await loadSettings();
    doc.vera.provider.apiKeyEnc = "";
    doc.vera.provider.apiKeyHint = "";
    doc.vera.provider.apiKeyProvider = "";
    await doc.save();
    writeLog({ level: "audit", type: "vera", message: "VERA stored API key cleared", userId: req.user?.id, ip: req.ip });
    res.json(settingsPayload(doc.vera.toObject()));
  } catch {
    res.status(500).json({ message: "Could not clear the stored key" });
  }
});

export default router;
