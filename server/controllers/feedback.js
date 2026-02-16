import Feedback from "../models/Feedback.js";

export const updateFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    // Only allow specific fields to be updated (prevent mass assignment)
    const allowedFields = ["answers", "answersLabeled"];
    const updateData = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }
    const updated = await Feedback.findByIdAndUpdate(id, updateData, {
      new: true,
    });

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
