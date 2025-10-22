// Early warning filter: silence known noisy deprecations from dependencies (e.g., util._extend / DEP0060)
import "./warnings.js";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

// Routes
import feedbackRoutes from "./routes/feedback.js";
import authRoutes from "./routes/auth.js";
import questionRoutes from "./routes/question.js";
import clientSatisfactoryRoutes from "./routes/clientSatisfactory.js";
import configRoute from "./routes/config.js";
import adminRoute from "./routes/admin.js";
import announcementsRoute from "./routes/announcements.js";
import serviceCategoriesRoute from "./routes/serviceCategories.js";

dotenv.config();

// Host selection: prefer explicit SERVER_HOST, otherwise bind to 0.0.0.0
const REQUESTED_HOST = process.env.SERVER_HOST;
const DEFAULT_HOST = "0.0.0.0";
// Prefer standard PORT, fallback to SERVER_PORT, then default
const PORT = Number(process.env.PORT || process.env.SERVER_PORT || 5001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5174";
const IS_PROD = process.env.NODE_ENV === "production";

// The host we'll attempt to bind to. If it fails with EADDRNOTAVAIL we'll
// fall back to DEFAULT_HOST.
let attemptingHost = REQUESTED_HOST || DEFAULT_HOST;

const app = express();

// HTTP server
const server = http.createServer(app);

const io = new Server(server, {
  cors: IS_PROD
    ? {
        origin: CLIENT_ORIGIN,
        methods: ["GET", "POST"],
        credentials: true,
      }
    : {
        // during development allow any origin (helps when frontend is proxied)
        origin: true,
        methods: ["GET", "POST"],
        credentials: true,
      },
});

// Middleware
app.use(
  cors(
    IS_PROD
      ? {
          origin: CLIENT_ORIGIN,
          credentials: true,
        }
      : { origin: true, credentials: true }
  )
);
app.use(express.json());

const activeFeedbacks = new Map();

io.on("connection", (socket) => {
  //console.log(`Socket connected: id=${socket.id}, handshake=${JSON.stringify(socket.handshake.address)}`);
  socket.on("error", (err) => {
    console.error(`Socket error (id=${socket.id}):`, err);
  });
  socket.conn.on("error", (err) => {
    console.error(`Socket conn error (id=${socket.id}):`, err);
  });
  socket.conn.on("timeout", () => {
    console.warn(`Socket conn timeout (id=${socket.id})`);
  });
  socket.on("joinRoom", (room) => {
    socket.join(room);
  });

  socket.on("feedback-incoming", (data) => {
    activeFeedbacks.set(socket.id, { ...data, socketId: socket.id });
    io.to("questions-table").emit(
      "active-feedbacks",
      Array.from(activeFeedbacks.values()).slice(0, 3)
    );
  });

  socket.on("feedback-leave", () => {
    activeFeedbacks.delete(socket.id);
    io.to("questions-table").emit(
      "active-feedbacks",
      Array.from(activeFeedbacks.values()).slice(0, 3)
    );
  });

  socket.on("disconnect", () => {
    activeFeedbacks.delete(socket.id);
    io.to("questions-table").emit(
      "active-feedbacks",
      Array.from(activeFeedbacks.values()).slice(0, 3)
    );
  });

  // ✅ NEW: support polling from frontend every 10s
  socket.on("fetchLatestFeedback", () => {
    io.to("questions-table").emit(
      "active-feedbacks",
      Array.from(activeFeedbacks.values()).slice(0, 3)
    );
  });
});

// Routes
app.use("/api/feedback", feedbackRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/question", questionRoutes(io)); // pass io to question routes
app.use("/api/client-satisfactory", clientSatisfactoryRoutes(io));
app.use("/api/config", configRoute);
app.use("/api/admin", adminRoute);
app.use("/api/announcements", announcementsRoute);
app.use("/api/service-categories", serviceCategoriesRoute);

// Lightweight health endpoint for Render/uptime checks
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// DB Connection and start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    // attempt to listen on the requested host first
    server.listen(PORT, attemptingHost, () => {
      const addr = server.address();
      const host = addr && addr.address ? addr.address : attemptingHost;
      const port = addr && addr.port ? addr.port : PORT;
      console.log(`Server + Socket.IO running at http://${host}:${port}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
  });

// Provide clearer error message when port is already in use
// Enhanced error handling: support automatic fallback when the configured
// host address isn't available (EADDRNOTAVAIL). Also provide clear tips
// for EADDRINUSE.
server.on("error", (err) => {
  if (!err) return;

  if (err.code === "EADDRNOTAVAIL") {
    console.warn(
      `Address not available: ${attemptingHost}:${PORT}. ` +
        `Attempting to fall back to ${DEFAULT_HOST}:${PORT}...`
    );

    // If we're already trying the default host, just log and stop.
    if (attemptingHost === DEFAULT_HOST) {
      console.error(
        `Address ${DEFAULT_HOST} is not available. Server cannot start.`
      );
      return;
    }

    // Try to listen on the default host now.
    attemptingHost = DEFAULT_HOST;
    try {
      server.listen(PORT, attemptingHost, () => {
        const addr = server.address();
        const host = addr && addr.address ? addr.address : attemptingHost;
        const port = addr && addr.port ? addr.port : PORT;
        console.log(
          `Server + Socket.IO running at http://${host}:${port} (fallback)`
        );
      });
    } catch (listenErr) {
      console.error("Failed to bind on fallback host:", listenErr);
    }

    return;
  }

  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} on ${attemptingHost} is already in use. Another process is listening there.\n` +
        `Tips: close the other process or change PORT/SERVER_PORT in server/.env.`
    );
    return;
  }

  console.error("Server error:", err);
});
