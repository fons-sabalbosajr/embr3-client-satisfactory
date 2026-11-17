import express from "express";
import { submitSurvey, getAllSurveys, getAssistPersonnel } from "../controllers/clientSatisfactoryController.js";
import authMiddleware from "../middleware/auth.js";

export default (io) => {
  const router = express.Router();

  router.post("/submit", submitSurvey(io));
  router.get("/assist-personnel", getAssistPersonnel);
  // Every response (remarks, names, companies) — signed-in staff only. It was
  // public; the public pages only needed the total, from /api/feedback/count.
  router.get("/", authMiddleware, getAllSurveys);

  return router;
};

