import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import http from 'http'; // Import http module
import { Server } from 'socket.io'; // Import Server from socket.io

// Import your routes
import feedbackRoutes from "./routes/feedback.js";
import authRoutes from "./routes/auth.js";
import questionRoutes from "./routes/question.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Create an HTTP server from your Express app
const server = http.createServer(app);

// Initialize Socket.IO with your HTTP server
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);

  // Join a specific room for question updates
  socket.join('questions-table');
  console.log(`Socket ${socket.id} joined 'questions-table' room.`);

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

app.use("/api/feedback", feedbackRoutes);
app.use("/api/auth", authRoutes);

// Modify question routes to include `io` for real-time updates
// Option 1: Pass io directly to the router
app.use("/api/question", questionRoutes(io)); // Assuming your router accepts 'io'

// DB Connect - Now use `server.listen` instead of `app.listen`
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