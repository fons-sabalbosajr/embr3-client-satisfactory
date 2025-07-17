import mongoose from "mongoose";

const ClientSatisfactorySchema = new mongoose.Schema({
 deviceId: { type: String, required: true },
  answers: { type: Object, required: true },
  answersLabeled: { type: Object },
  submittedAt: { type: Date, default: Date.now },
});

ClientSatisfactorySchema.index({ deviceId: 1, submittedAt: -1 });

export default mongoose.model(
  "ClientSatisfactory",
  ClientSatisfactorySchema,
  "client-satisfactory-data" // ✅ hardcode the target collection name
);
