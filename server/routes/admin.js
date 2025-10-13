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

export default router;
