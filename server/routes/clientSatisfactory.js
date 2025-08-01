import express from "express";
import { submitSurvey, getAllSurveys } from "../controllers/clientSatisfactoryController.js";

export default (io) => {
  const router = express.Router();

  router.post("/submit", submitSurvey(io));
  router.get("/", getAllSurveys);

  return router;
};

