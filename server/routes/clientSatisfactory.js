import express from "express";
import { submitSurvey } from "../controllers/clientSatisfactoryController.js";

export default (io) => {
  const router = express.Router();

  router.post("/submit", submitSurvey(io));

  return router;
};
