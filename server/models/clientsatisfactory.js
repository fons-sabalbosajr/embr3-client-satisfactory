import mongoose from "mongoose";

const ClientSatisfactorySchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  answers: { type: Object, required: true },
  answersLabeled: { type: Object },
  submittedAt: { type: Date, default: Date.now },
});



// Ensure index is only applied once
ClientSatisfactorySchema.index({ deviceId: 1, submittedAt: 1 }, { unique: true });

export default mongoose.model(
  "ClientSatisfactory",
  ClientSatisfactorySchema,
  "client-satisfactory-data" // ✅ hardcode the target collection name
);
