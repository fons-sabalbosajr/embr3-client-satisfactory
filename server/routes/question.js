import express from 'express';
// Assuming your question controllers are in a file like 'controllers/questionController.js'
import {
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
} from '../controllers/questionController.js'; // Adjust path if needed

// Export a function that returns the router, accepting the io instance
export default (io) => {
  const router = express.Router();

  // Pass io to controller functions where emissions are needed
  router.post('/', (req, res) => createQuestion(req, res, io));
  router.get('/', getQuestions); // No need to emit for GET
  router.get('/:id', getQuestionById); // No need to emit for GET
  router.put('/:id', (req, res) => updateQuestion(req, res, io));
  router.delete('/:id', (req, res) => deleteQuestion(req, res, io));

  return router;
};