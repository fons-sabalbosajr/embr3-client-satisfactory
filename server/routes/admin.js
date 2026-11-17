import express from "express";
import mongoose from "mongoose";
import { authMiddleware } from "../middleware/auth.js";
import { requireDeveloper } from "../middleware/permission.js";
import { getEmailHealth, sendTestEmail } from "../utils/email.js";
import Log from "../models/Log.js";

const router = express.Router();

// Map mongoose readyState to readable string
function connectionStateName(state) {
  switch (state) {
    case 0:
      return "disconnected";
    case 1:
      return "connected";
    case 2:
      return "connecting";
    case 3:
      return "disconnecting";
    default:
      return "unknown";
  }
}

// GET /api/admin/db/status
router.get(
  "/db/status",
  authMiddleware,
  requireDeveloper,
  (req, res) => {
    try {
      const conn = mongoose.connection;
      const state = conn.readyState;
      const info = {
        state: connectionStateName(state),
        readyState: state,
        name: conn.name || null,
        host: conn.host || null,
        port: conn.port || null,
      };

      res.json({ connected: state === 1, info });
    } catch (err) {
      console.error("Error getting DB status:", err);
      res.status(500).json({ connected: false, error: err.message });
    }
  }
);

// POST /api/admin/db/connect
router.post(
  "/db/connect",
  authMiddleware,
  requireDeveloper,
  async (req, res) => {
    try {
      const state = mongoose.connection.readyState;
      if (state === 1) {
        return res.json({ connected: true, message: "Already connected to database" });
      }

      // Attempt to (re)connect using the configured MONGO_URI
      const uri = process.env.MONGO_URI;
      if (!uri) return res.status(500).json({ message: "MONGO_URI not configured on server" });

      await mongoose.connect(uri, { compressors: ["zlib"] });

      const conn = mongoose.connection;
      const connected = conn.readyState === 1;

      res.json({ connected, message: connected ? "Connected" : "Failed to connect" });
    } catch (err) {
      console.error("DB connect error:", err);
      res.status(500).json({ connected: false, error: err.message });
    }
  }
);

// GET /api/admin/db/collections
router.get(
  "/db/collections",
  authMiddleware,
  requireDeveloper,
  async (req, res) => {
    try {
      const db = mongoose.connection.db;
      if (!db) return res.status(500).json({ message: "Database not available" });
      const cols = await db.listCollections().toArray();
      const names = cols.map((c) => c.name).sort();
      res.json({ collections: names });
    } catch (err) {
      console.error("Error listing collections:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /api/admin/db/stats — detailed database + per-collection statistics
router.get(
  "/db/stats",
  authMiddleware,
  requireDeveloper,
  async (req, res) => {
    try {
      const conn = mongoose.connection;
      const db = conn.db;
      if (!db) return res.status(500).json({ message: "Database not available" });

      let dbStats = {};
      try {
        dbStats = await db.stats();
      } catch (e) {
        dbStats = {};
      }

      const cols = await db.listCollections().toArray();
      const collections = [];
      for (const c of cols) {
        try {
          const count = await db.collection(c.name).estimatedDocumentCount();
          let cs = {};
          try {
            cs = await db.command({ collStats: c.name });
          } catch {
            cs = {};
          }
          collections.push({
            name: c.name,
            type: c.type || "collection",
            count,
            size: cs.size || 0,
            storageSize: cs.storageSize || 0,
            totalIndexSize: cs.totalIndexSize || 0,
            nindexes: cs.nindexes || 0,
          });
        } catch (e) {
          collections.push({ name: c.name, count: null });
        }
      }
      collections.sort((a, b) => a.name.localeCompare(b.name));

      res.json({
        connection: {
          state: connectionStateName(conn.readyState),
          readyState: conn.readyState,
          name: conn.name || db.databaseName || null,
          host: conn.host || null,
          port: conn.port || null,
          mongooseVersion: mongoose.version,
        },
        db: {
          name: db.databaseName,
          collections: dbStats.collections || collections.length,
          objects: dbStats.objects || 0,
          dataSize: dbStats.dataSize || 0,
          storageSize: dbStats.storageSize || 0,
          indexes: dbStats.indexes || 0,
          indexSize: dbStats.indexSize || 0,
          avgObjSize: dbStats.avgObjSize || 0,
        },
        collections,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Error getting DB stats:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /api/admin/db/export?collection=NAME&format=json|csv
router.get(
  "/db/export",
  authMiddleware,
  requireDeveloper,
  async (req, res) => {
    try {
      const { collection, format = "json" } = req.query;
      if (!collection) return res.status(400).json({ message: "collection query param is required" });

      const db = mongoose.connection.db;
      if (!db) return res.status(500).json({ message: "Database not available" });

      const docs = await db.collection(collection).find({}).toArray();

      if ((format || "").toLowerCase() === "csv") {
        // Flatten nested objects into dotted columns (e.g.
        // "answersLabeled.Service Availed") so every field gets its own
        // column instead of one JSON blob per cell.
        const isPlainObject = (v) =>
          v !== null &&
          typeof v === "object" &&
          !Array.isArray(v) &&
          !(v instanceof Date) &&
          !v._bsontype &&
          Object.getPrototypeOf(v) === Object.prototype;
        const scalar = (v) => {
          if (v === undefined || v === null) return "";
          if (v instanceof Date) return v.toISOString();
          if (v && v._bsontype) return String(v); // ObjectId, Decimal128…
          if (Array.isArray(v)) {
            return v.every((x) => x === null || typeof x !== "object" || x instanceof Date || x?._bsontype)
              ? v.map(scalar).filter((x) => x !== "").join("; ")
              : JSON.stringify(v);
          }
          if (typeof v === "object") return JSON.stringify(v);
          return String(v);
        };
        const flatten = (obj, prefix = "", out = {}) => {
          Object.entries(obj || {}).forEach(([k, v]) => {
            const key = prefix ? `${prefix}.${k}` : k;
            if (isPlainObject(v) && Object.keys(v).length) flatten(v, key, out);
            else out[key] = scalar(v);
          });
          return out;
        };
        const flatDocs = docs.map((d) => flatten(d));

        // Union of keys, first-seen order
        const keys = [];
        const seen = new Set();
        flatDocs.forEach((d) =>
          Object.keys(d).forEach((k) => {
            if (!seen.has(k)) {
              seen.add(k);
              keys.push(k);
            }
          })
        );

        const cell = (raw) => {
          let s = String(raw ?? "");
          // Prevent CSV formula injection
          if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
          s = s.replace(/"/g, '""');
          return /[",\r\n]/.test(s) ? `"${s}"` : s;
        };
        const header = keys.map(cell).join(",");
        const rows = flatDocs.map((d) => keys.map((k) => cell(d[k])).join(","));

        // BOM so Excel opens the file as UTF-8 (Filipino text, em dashes).
        const csv = "﻿" + [header, ...rows].join("\r\n");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${collection}.csv"`);
        return res.send(csv);
      }

      // Default: JSON
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="${collection}.json"`);
      return res.send(JSON.stringify(docs, null, 2));
    } catch (err) {
      console.error("Error exporting collection:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Email transport health check (admin only)
router.get(
  "/email/health",
  authMiddleware,
  requireDeveloper,
  async (req, res) => {
    try {
      const health = await getEmailHealth();
      res.json({ ok: !!health.ok, error: health.error || null });
    } catch (err) {
      console.error("Email health check error:", err);
      res.status(500).json({ ok: false, error: err.message || String(err) });
    }
  }
);

// POST /api/admin/email/test - Send a test email to verify configuration
router.post(
  "/email/test",
  authMiddleware,
  requireDeveloper,
  async (req, res) => {
    try {
      const { to } = req.body;
      if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        return res.status(400).json({ ok: false, error: "Valid 'to' email address is required" });
      }
      await sendTestEmail(to);
      res.json({ ok: true, message: `Test email sent to ${to}` });
    } catch (err) {
      console.error("Test email send error:", err);
      res.status(500).json({ ok: false, error: err.message || String(err) });
    }
  }
);

// GET /api/admin/logs — paginated application logs with optional filters
router.get(
  "/logs",
  authMiddleware,
  requireDeveloper,
  async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const pageSize = Math.min(
        200,
        Math.max(1, parseInt(req.query.pageSize, 10) || 25)
      );
      const { level, search } = req.query;

      const filter = {};
      if (level && ["info", "warn", "error", "audit"].includes(level)) {
        filter.level = level;
      }
      if (search) {
        const rx = new RegExp(
          String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "i"
        );
        filter.$or = [
          { message: rx },
          { path: rx },
          { userName: rx },
          { method: rx },
        ];
      }

      const [items, total, levelCounts] = await Promise.all([
        Log.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .lean(),
        Log.countDocuments(filter),
        Log.aggregate([{ $group: { _id: "$level", count: { $sum: 1 } } }]),
      ]);

      const counts = { info: 0, warn: 0, error: 0, audit: 0 };
      for (const lc of levelCounts) {
        if (lc._id && counts[lc._id] !== undefined) counts[lc._id] = lc.count;
      }

      res.json({ items, total, page, pageSize, counts });
    } catch (err) {
      console.error("Error fetching logs:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE /api/admin/logs — clear logs (optionally older than N days)
router.delete(
  "/logs",
  authMiddleware,
  requireDeveloper,
  async (req, res) => {
    try {
      const olderThanDays = parseInt(req.query.olderThanDays, 10);
      let filter = {};
      if (Number.isFinite(olderThanDays) && olderThanDays > 0) {
        const cutoff = new Date(Date.now() - olderThanDays * 86400000);
        filter = { createdAt: { $lt: cutoff } };
      }
      const result = await Log.deleteMany(filter);
      res.json({ deletedCount: result.deletedCount || 0 });
    } catch (err) {
      console.error("Error clearing logs:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
