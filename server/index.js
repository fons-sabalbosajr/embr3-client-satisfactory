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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// HTTP server
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://10.14.77.107:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(
  cors({
    origin: "http://10.14.77.107:5173",
    credentials: true,
  })
);
app.use(express.json());

const activeFeedbacks = new Map();

io.on("connection", (socket) => {
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

// DB Connection and start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running at http://10.14.77.107:${PORT}`);
      console.log(`Socket.IO listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
  });
