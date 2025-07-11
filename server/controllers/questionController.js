import Question from '../models/Question.js'; // Assuming your Mongoose model is here

export const createQuestion = async (req, res, ioInstance) => { // Added ioInstance
  try {
    const newQuestion = new Question(req.body);
    await newQuestion.save();
    res.status(201).json(newQuestion);
    // Emit event after successful creation
    ioInstance.to('questions-table').emit('questionAdded', newQuestion);
    //console.log('Server: Emitted questionAdded event');
  } catch (error) {
    console.error("Error creating question:", error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
};

export const getQuestions = async (req, res) => {
  try {
    const questions = await Question.find({});
    res.status(200).json(questions);
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
};

export const getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }
    res.status(200).json(question);
  } catch (error) {
    console.error("Error fetching question by ID:", error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
};


export const updateQuestion = async (req, res, ioInstance) => { // Added ioInstance
  try {
    const { id } = req.params;
    const updatedQuestion = await Question.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedQuestion) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.status(200).json(updatedQuestion);
    // Emit event after successful update
    ioInstance.to('questions-table').emit('questionUpdated', updatedQuestion);
    //console.log('Server: Emitted questionUpdated event');
  } catch (error) {
    console.error("Error updating question:", error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
};

export const deleteQuestion = async (req, res, ioInstance) => { // Added ioInstance
  try {
    const { id } = req.params;
    const deletedQuestion = await Question.findByIdAndDelete(id);
    if (!deletedQuestion) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.status(200).json({ message: 'Question deleted successfully' });
    // Emit event after successful deletion
    ioInstance.to('questions-table').emit('questionDeleted', id); // Send the ID
    //console.log('Server: Emitted questionDeleted event');
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
};