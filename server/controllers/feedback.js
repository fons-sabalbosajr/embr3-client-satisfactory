import Feedback from '../models/Feedback.js';

export const updateFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Feedback.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update feedback", error: err });
  }
};
