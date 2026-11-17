import express from 'express';
import mongoose from 'mongoose';
import Feedback from '../models/Feedback.js';
import { updateFeedback } from '../controllers/feedback.js';
import { authMiddleware } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission.js';
import { getSurveys, cacheAdd, cacheRemove } from '../utils/surveyCache.js';

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
    cacheAdd(savedFeedback);
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
    // From the in-memory cache: the public pages call this on every visit and
    // a round trip to the shared Atlas cluster is slow.
    const count = (await getSurveys()).length;
    res.set('Cache-Control', 'public, max-age=60');
    res.status(200).json({ count });
  } catch (err) {
    console.error('Error counting feedback:', err);
    res.status(500).json({ error: 'Failed to count feedback.' });
  }
});

// @desc    Get all feedback
// @route   GET /api/feedback
// Served from the in-memory survey cache (utils/surveyCache.js). Measurement
// Data only reads answersLabeled, so the raw `answers` copy (keyed by question
// id) and deviceId are left out of the reply. Edits still work: updateFeedback
// only touches the fields sent.
router.get('/', authMiddleware, async (req, res) => {
  try {
    const surveys = await getSurveys();
    const feedbackList = surveys.map(({ answers, deviceId, __v, ...rest }) => rest);
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
    cacheRemove(req.params.id);
    res.json({ message: 'Feedback deleted' });
  } catch (err) {
    console.error('Error deleting feedback:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;


