import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import feedbackRoutes from "./routes/feedback.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/feedback", feedbackRoutes);

// DB Connect
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(5000, "0.0.0.0", () => {
      console.log("Server running at http://10.14.77.107:5000");
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
  });
