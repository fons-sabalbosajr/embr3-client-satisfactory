import mongoose from "mongoose";

const logSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      enum: ["info", "warn", "error", "audit"],
      default: "info",
      index: true,
    },
    type: { type: String, default: "request" }, // request | audit | system
    message: { type: String, default: "" },
    method: { type: String, default: null },
    path: { type: String, default: null },
    statusCode: { type: Number, default: null },
    durationMs: { type: Number, default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    userName: { type: String, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Auto-expire log entries after 30 days to keep the collection bounded.
logSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
// Common query patterns
logSchema.index({ createdAt: -1 });

const Log = mongoose.model("Log", logSchema);

// Best-effort writer used by middleware and controllers. Never throws.
export async function writeLog(entry) {
  try {
    await Log.create(entry);
  } catch (err) {
    // Logging must never break the request flow.
    if (process.env.NODE_ENV !== "production") {
      console.warn("writeLog failed:", err?.message || err);
    }
  }
}

export default Log;
