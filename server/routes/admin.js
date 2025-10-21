import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { requirePermission } from "../middleware/permission.js";

const router = express.Router();

// Lightweight auth middleware (mirrors auth.js behavior)
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication invalid, no token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, username: payload.username };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Authentication invalid, token is invalid" });
  }
};

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
  requirePermission("canManageUsers"),
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
  requirePermission("canManageUsers"),
  async (req, res) => {
    try {
      const state = mongoose.connection.readyState;
      if (state === 1) {
        return res.json({ connected: true, message: "Already connected to database" });
      }

      // Attempt to (re)connect using the configured MONGO_URI
      const uri = process.env.MONGO_URI;
      if (!uri) return res.status(500).json({ message: "MONGO_URI not configured on server" });

      await mongoose.connect(uri, {
        // Mongoose v6+ ignores these, but harmless to include for older environments
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

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
  requirePermission("canManageUsers"),
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

// GET /api/admin/db/export?collection=NAME&format=json|csv
router.get(
  "/db/export",
  authMiddleware,
  requirePermission("canManageUsers"),
  async (req, res) => {
    try {
      const { collection, format = "json" } = req.query;
      if (!collection) return res.status(400).json({ message: "collection query param is required" });

      const db = mongoose.connection.db;
      if (!db) return res.status(500).json({ message: "Database not available" });

      const docs = await db.collection(collection).find({}).toArray();

      if ((format || "").toLowerCase() === "csv") {
        // Build union of keys
        const keys = Array.from(new Set(docs.flatMap((d) => Object.keys(d))));
        // CSV header
        const header = keys.join(",") + "\n";
        const rows = docs
          .map((doc) =>
            keys
              .map((k) => {
                let v = doc[k];
                if (v === undefined || v === null) return "";
                if (typeof v === "object") v = JSON.stringify(v);
                // escape quotes
                const s = String(v).replace(/"/g, '""');
                // wrap fields containing comma/newline/quote in quotes
                return /[",\n]/.test(s) ? `"${s}"` : s;
              })
              .join(",")
          )
          .join("\n");

        const csv = header + rows;
        res.setHeader("Content-Type", "text/csv");
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

export default router;
