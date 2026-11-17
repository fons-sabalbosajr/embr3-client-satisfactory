// System routes.
//   GET  /api/system/status         public — is the site in maintenance?
//   GET  /api/system/maintenance    developer — full maintenance state
//   PUT  /api/system/maintenance    developer — turn maintenance on/off
//   GET  /api/system/info           developer — server runtime details
//   POST /api/system/refresh-cache  developer — reload responses from Atlas
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import authMiddleware from "../middleware/auth.js";
import { requireDeveloper } from "../middleware/permission.js";
import { getMaintenance, setMaintenanceCache, publicMaintenance } from "../middleware/maintenance.js";
import { loadSettings } from "../models/AppSettings.js";
import User from "../models/User.js";
import { writeLog } from "../models/Log.js";
import { getSurveys, reloadSurveys } from "../utils/surveyCache.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_VERSION = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json"), "utf8")).version || "";
  } catch {
    return "";
  }
})();

export default (io) => {
  const router = express.Router();

  router.get("/status", async (_req, res) => {
    const m = await getMaintenance();
    res.set("Cache-Control", "no-store");
    res.json({ maintenance: publicMaintenance(m) });
  });

  router.get("/maintenance", authMiddleware, requireDeveloper, async (_req, res) => {
    res.json({ maintenance: await getMaintenance({ fresh: true }) });
  });

  router.put("/maintenance", authMiddleware, requireDeveloper, async (req, res) => {
    try {
      const { enabled, message, endsAt } = req.body || {};
      const user = await User.findById(req.user.id, "fullname username").lean();
      const who = user?.fullname || user?.username || req.user.username || "";
      const doc = await loadSettings();
      if (!doc.system) doc.system = {};
      const m = doc.system.maintenance || {};
      const turningOn = enabled === true && !m.enabled;

      if (typeof enabled === "boolean") m.enabled = enabled;
      if (message !== undefined) m.message = String(message || "").slice(0, 500);
      if (endsAt !== undefined) {
        const d = endsAt ? new Date(endsAt) : null;
        m.endsAt = d && !Number.isNaN(d.getTime()) ? d : null;
      }
      if (turningOn) {
        m.startedAt = new Date();
        m.startedBy = who;
      }
      if (enabled === false) {
        m.startedAt = null;
        m.startedBy = "";
        m.endsAt = null;
      }
      m.updatedAt = new Date();
      m.updatedBy = who;
      doc.system.maintenance = m;
      doc.markModified("system");
      await doc.save();

      setMaintenanceCache(m);
      io?.emit?.("system:maintenance", publicMaintenance(m));
      writeLog({
        level: "audit",
        type: "system",
        message: `Maintenance mode ${m.enabled ? "ON" : "OFF"}`,
        userId: req.user?.id,
        userName: who,
        ip: req.ip,
        meta: { enabled: m.enabled, endsAt: m.endsAt, message: m.message },
      });
      res.json({ maintenance: await getMaintenance() });
    } catch (err) {
      console.error("Maintenance update failed:", err);
      res.status(500).json({ message: "Could not update maintenance mode. Check the database connection." });
    }
  });

  router.get("/info", authMiddleware, requireDeveloper, async (_req, res) => {
    const mem = process.memoryUsage();
    let responses = null;
    try {
      responses = (await getSurveys()).length;
    } catch {
      /* ignore */
    }
    res.json({
      serverVersion: SERVER_VERSION,
      node: process.version,
      env: process.env.NODE_ENV || "development",
      uptimeSec: Math.round(process.uptime()),
      memoryMb: Math.round(mem.rss / 1048576),
      database: { state: mongoose.connection.readyState === 1 ? "connected" : "disconnected", name: mongoose.connection.name || null },
      cachedResponses: responses,
      time: new Date().toISOString(),
    });
  });

  router.post("/refresh-cache", authMiddleware, requireDeveloper, async (_req, res) => {
    try {
      const fresh = await reloadSurveys();
      res.json({ ok: true, responses: fresh.length });
    } catch (err) {
      res.status(500).json({ ok: false, message: err?.message || "Refresh failed" });
    }
  });

  return router;
};
