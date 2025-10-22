import express from 'express';
// Assuming your question controllers are in a file like 'controllers/questionController.js'
import {
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
} from '../controllers/questionController.js'; // Adjust path if needed
import { requirePermission } from '../middleware/permission.js';
import authMiddleware from '../middleware/auth.js';

// Export a function that returns the router, accepting the io instance
export default (io) => {
  const router = express.Router();

  // Pass io to controller functions where emissions are needed
  // Protect write operations with auth + permission checks
  router.post('/', authMiddleware, requirePermission('canCreate'), (req, res) => createQuestion(req, res, io));
  router.get('/', getQuestions); // No need to emit for GET
  router.get('/:id', getQuestionById); // No need to emit for GET
  router.put('/:id', authMiddleware, requirePermission('canEdit'), (req, res) => updateQuestion(req, res, io));
  router.delete('/:id', authMiddleware, requirePermission('canDelete'), (req, res) => deleteQuestion(req, res, io));

  // Admin utility: sync Q5 Service Availed options from .env EXTERNAL/INTERNAL lists
  router.post('/sync-services-from-env', authMiddleware, requirePermission('canManageUsers'), async (req, res) => {
    try {
      const parseList = (s) =>
        (s || '')
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean);
      const external = parseList(process.env.EXTERNAL_SERVICES);
      const internal = parseList(process.env.INTERNAL_SERVICES);
      const combined = Array.from(new Set([...external, ...internal]));
      if (!combined.length) {
        return res.status(400).json({ message: 'No services found in env lists' });
      }

      const q = await (await import('../models/Question.js')).default.findOne({ questionCode: 'Q5' });
      if (!q) {
        const QuestionModel = (await import('../models/Question.js')).default;
        const created = await QuestionModel.create({
          questionCode: 'Q5',
          questionText: 'Service Availed:',
          questionType: 'dropdown',
          options: combined,
          user: req.user?.username || 'system',
        });
        return res.status(201).json({ data: created, created: true });
      }
      q.options = combined;
      q.updatedAt = new Date();
      // If both lists used, clear serviceType to avoid stale single-type
      q.serviceType = undefined;
      await q.save();
      return res.json({ data: q, created: false });
    } catch (err) {
      console.error('Sync services from env failed', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
};