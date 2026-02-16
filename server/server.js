// Early warning filter: silence known noisy deprecations from dependencies (e.g., util._extend / DEP0060)
import "./warnings.js";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";

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

// Validate required environment variables at startup
if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set. Server cannot start securely.");
  process.exit(1);
}
if (!process.env.MONGO_URI) {
  console.error("FATAL: MONGO_URI environment variable is not set.");
  process.exit(1);
}

// Host selection: prefer explicit SERVER_HOST, otherwise bind to 0.0.0.0
const REQUESTED_HOST = process.env.SERVER_HOST;
const DEFAULT_HOST = "0.0.0.0";
// Prefer standard PORT, fallback to SERVER_PORT, then default
const PORT = Number(process.env.PORT || process.env.SERVER_PORT || 5001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5174";
const IS_PROD = process.env.NODE_ENV === "production";

// The host we'll attempt to bind to. If it fails with EADDRNOTAVAIL we'll
// fall back to DEFAULT_HOST.
// Guard against accidental values like "https://domain" being used as a host.
let attemptingHost = DEFAULT_HOST;
if (REQUESTED_HOST) {
  if (/^https?:\/\//i.test(REQUESTED_HOST)) {
    console.warn(
      `Ignoring SERVER_HOST='${REQUESTED_HOST}' because it looks like a URL. ` +
        `Binding to ${DEFAULT_HOST} instead.`
    );
  } else {
    attemptingHost = REQUESTED_HOST;
  }
}

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

// When running behind Nginx, trust the first proxy so rate-limiters and
// req.ip see the real client IP instead of 127.0.0.1.
if (IS_PROD) {
  app.set("trust proxy", 1);
}

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

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // CSP handled by frontend/nginx in production
    crossOriginEmbedderPolicy: false,
  })
);

// Prevent HTTP parameter pollution
app.use(hpp());

// Rate limiters
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,                 // limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});
app.use(globalLimiter);

// Strict rate-limit for auth endpoints (login, signup, forgot-password)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,                    // 15 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts, please try again after 15 minutes." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/signup", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/resend-verification", authLimiter);

// Limit JSON body size
app.use(express.json({ limit: "500kb" }));

// Register socket.io instance on app for controllers
app.set("io", io);

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

// In production, serve the built frontend SPA (useful when not using nginx)
if (IS_PROD) {
  const path = await import("path");
  const { fileURLToPath } = await import("url");
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.default.dirname(__filename);
  const distPath = path.default.join(__dirname, "../front-end/dist");

  app.use(express.static(distPath));
  // SPA fallback: serve index.html for any non-API route
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api") && !req.path.startsWith("/socket.io")) {
      res.sendFile(path.default.join(distPath, "index.html"));
    }
  });
}

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

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  try {
    server.close(() => console.log("HTTP server closed."));
    io.close();
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
  } catch (err) {
    console.error("Error during shutdown:", err);
  } finally {
    process.exit(0);
  }
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
