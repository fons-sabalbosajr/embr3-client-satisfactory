import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 10 },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Use explicit collection name: 'client-satisfactory-data'
const Feedback = mongoose.model('Feedback', feedbackSchema, 'client-satisfactory-data');

export default Feedback;
