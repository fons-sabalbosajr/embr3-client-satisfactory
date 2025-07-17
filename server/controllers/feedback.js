import Feedback from "../models/Feedback.js";

export const updateFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Feedback.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    // Emit socket event if update was successful
    if (updated) {
      const io = req.app.get("io");
      io.to("measurements").emit("feedbackUpdated", updated);
    }

    res.json(updated);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Failed to update feedback", error: err });
  }
};
