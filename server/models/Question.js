import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  questionCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  questionText: {
    type: String,
    required: true,
    trim: true,
  },
  questionType: { // ✨ NEW: Type of question
    type: String,
    enum: ['text', 'dropdown', 'radio'], // Enforce specific types
    required: true,
    default: 'text', // Default to text if not specified
  },
  options: { // ✨ NEW: Options for dropdown/radio types
    type: [String], // Array of strings
    required: function() {
      // Required only if questionType is 'dropdown' or 'radio'
      return this.questionType === 'dropdown' || this.questionType === 'radio';
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  user: {
    type: String,
    required: true,
    trim: true,
  }
}, { collection: 'questions-data' });

questionSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Question = mongoose.model('Question', questionSchema);

export default Question;