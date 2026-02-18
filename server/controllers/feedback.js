import Feedback from "../models/Feedback.js";
import mongoose from "mongoose";

export const updateFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid feedback ID format" });
    }
    // Only allow specific fields to be updated (prevent mass assignment)
    const allowedFields = ["answers", "answersLabeled"];
    const updateData = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }
    const updated = await Feedback.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (!updated) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    // Emit socket event if update was successful
    if (updated) {
      try {
        const io = req.app.get("io");
        if (io) io.to("measurements").emit("feedbackUpdated", updated);
      } catch (_) {
        // socket emit failure should not break the response
      }
    }

    res.json(updated);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Failed to update feedback" });
  }
};
