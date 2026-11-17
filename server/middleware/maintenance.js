// Maintenance mode — enforced on the server, not just hidden in the UI.
//
// While it is on, every API request is answered 503 { code: "maintenance" }
// unless it comes from a Developer account (position "Developer"), so the
// developer keeps full access to fix things. A few routes stay open so the
// site can explain itself and the developer can still sign in:
//   GET  /api/health, /api/system/status, /api/config, /api/feedback/count
//   POST /api/auth/login   (the login route itself only admits developers)
//   GET  /api/auth/me      (passes the developer check below like any route)
//
// The state is cached in memory and refreshed every 15 s, so the check costs
// nothing per request on the slow Atlas link; toggling it from Developer
// Settings updates the cache immediately.
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { loadSettings } from "../models/AppSettings.js";
import { isDeveloperUser } from "./permission.js";

const REFRESH_MS = 15 * 1000;
let state = { enabled: false, message: "", endsAt: null };
let loadedAt = 0;
let inflight = null;

const toPlain = (m) => ({
  enabled: !!m?.enabled,
  message: String(m?.message || ""),
  endsAt: m?.endsAt || null,
  startedAt: m?.startedAt || null,
  startedBy: m?.startedBy || "",
  updatedAt: m?.updatedAt || null,
  updatedBy: m?.updatedBy || "",
});

export async function getMaintenance({ fresh = false } = {}) {
  if (!fresh && Date.now() - loadedAt < REFRESH_MS) return state;
  if (!inflight) {
    inflight = loadSettings()
      .then((doc) => {
        state = toPlain(doc?.system?.maintenance);
        loadedAt = Date.now();
        return state;
      })
      .catch((err) => {
        // Keep the last known state if the database is briefly unreachable.
        console.warn("[maintenance] could not read settings:", err?.message || err);
        return state;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function setMaintenanceCache(m) {
  state = toPlain(m);
  loadedAt = Date.now();
}

// What anyone (signed in or not) may know about maintenance.
export const publicMaintenance = (m) => ({
  enabled: !!m.enabled,
  message: m.enabled ? m.message : "",
  endsAt: m.enabled ? m.endsAt : null,
});

// Developer lookups are cached briefly so a developer working during
// maintenance does not cost a user query per request.
const devCache = new Map(); // userId -> { dev, at }
const DEV_TTL = 60 * 1000;
async function isDeveloperId(id) {
  const hit = devCache.get(id);
  if (hit && Date.now() - hit.at < DEV_TTL) return hit.dev;
  const user = await User.findById(id, "position").lean();
  const dev = isDeveloperUser(user);
  devCache.set(id, { dev, at: Date.now() });
  return dev;
}

const OPEN = [
  ["GET", /^\/api\/health\/?$/],
  ["GET", /^\/api\/system\/status\/?$/],
  ["GET", /^\/api\/config\/?$/],
  ["GET", /^\/api\/feedback\/count\/?$/],
  ["POST", /^\/api\/auth\/login\/?$/],
];

export async function maintenanceGate(req, res, next) {
  try {
    const path = (req.originalUrl || req.url || "").split("?")[0];
    if (!path.startsWith("/api")) return next();
    const m = await getMaintenance();
    if (!m.enabled) return next();
    if (OPEN.some(([method, re]) => (method === req.method || req.method === "HEAD") && re.test(path))) return next();

    const auth = req.headers.authorization || "";
    if (auth.startsWith("Bearer ")) {
      try {
        const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
        if (payload?.id && (await isDeveloperId(String(payload.id)))) return next();
      } catch {
        /* invalid/expired token → treated as not a developer */
      }
    }
    res.locals.maintenanceBlocked = true; // requestLogger skips these
    res.set("Retry-After", "300");
    return res.status(503).json({
      code: "maintenance",
      message: m.message || "The system is under maintenance. Please try again later.",
      endsAt: m.endsAt || null,
    });
  } catch (err) {
    console.error("[maintenance] gate error:", err?.message || err);
    return next(); // never take the API down because of the gate itself
  }
}

export default maintenanceGate;
