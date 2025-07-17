import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    deviceId: { type: String },
    answers: { type: mongoose.Schema.Types.Mixed }, // flexible nested object
    answersLabeled: { type: mongoose.Schema.Types.Mixed },
    submittedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

const Feedback = mongoose.model('Feedback', feedbackSchema, 'client-satisfactory-data');

export default Feedback;
