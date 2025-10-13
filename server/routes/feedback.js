import express from 'express';
import Feedback from '../models/Feedback.js';
import { updateFeedback } from '../controllers/feedback.js';
import { requirePermission } from '../middleware/permission.js';

const router = express.Router();

// @desc    Submit feedback
// @route   POST /api/feedback
router.post('/', async (req, res) => {
  try {
    const newFeedback = new Feedback(req.body);
    const savedFeedback = await newFeedback.save();
    res.status(201).json(savedFeedback);
  } catch (err) {
    console.error('Error saving feedback:', err);
    res.status(500).json({ error: 'Failed to save feedback.' });
  }
});

// @desc    Get all feedback
// @route   GET /api/feedback
router.get('/', async (req, res) => {
  try {
    const feedbackList = await Feedback.find().sort({ createdAt: -1 });
    res.status(200).json(feedbackList);
  } catch (err) {
    console.error('Error fetching feedback:', err);
    res.status(500).json({ error: 'Failed to fetch feedback.' });
  }
});

router.put('/:id', requirePermission('canEdit'), updateFeedback);

// Delete feedback (protected)
router.delete('/:id', requirePermission('canDelete'), async (req, res) => {
  try {
    const deleted = await Feedback.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Feedback not found' });
    res.json({ message: 'Feedback deleted' });
  } catch (err) {
    console.error('Error deleting feedback:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;


