import express from 'express';
import mongoose from 'mongoose';
import Feedback from '../models/Feedback.js';
import { updateFeedback } from '../controllers/feedback.js';
import { authMiddleware } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission.js';

const router = express.Router();

// @desc    Submit feedback
// @route   POST /api/feedback
router.post('/', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'Request body is required.' });
    }
    const newFeedback = new Feedback(req.body);
    const savedFeedback = await newFeedback.save();
    res.status(201).json(savedFeedback);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    console.error('Error saving feedback:', err);
    res.status(500).json({ error: 'Failed to save feedback.' });
  }
});

// @desc    Get public feedback count (no auth required)
// @route   GET /api/feedback/count
router.get('/count', async (req, res) => {
  try {
    const count = await Feedback.countDocuments();
    res.status(200).json({ count });
  } catch (err) {
    console.error('Error counting feedback:', err);
    res.status(500).json({ error: 'Failed to count feedback.' });
  }
});

// @desc    Get all feedback
// @route   GET /api/feedback
router.get('/', authMiddleware, async (req, res) => {
  try {
    const feedbackList = await Feedback.find().sort({ createdAt: -1 });
    res.status(200).json(feedbackList);
  } catch (err) {
    console.error('Error fetching feedback:', err);
    res.status(500).json({ error: 'Failed to fetch feedback.' });
  }
});

router.put('/:id', authMiddleware, requirePermission('canEdit'), updateFeedback);

// Delete feedback (protected)
router.delete('/:id', authMiddleware, requirePermission('canDelete'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid feedback ID format.' });
    }
    const deleted = await Feedback.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Feedback not found' });
    res.json({ message: 'Feedback deleted' });
  } catch (err) {
    console.error('Error deleting feedback:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;


