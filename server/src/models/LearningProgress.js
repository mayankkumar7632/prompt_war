import mongoose from "mongoose";

const learningProgressSchema = new mongoose.Schema(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      required: true,
      index: true,
    },
    subject: { type: String, required: true, trim: true, maxlength: 80 },
    topic: { type: String, required: true, trim: true, maxlength: 120 },
    storyCount: { type: Number, min: 0, default: 0 },
    answeredQuestions: { type: Number, min: 0, default: 0 },
    evaluatedQuestions: { type: Number, min: 0, default: 0 },
    understandingScore: { type: Number, min: 0, max: 100, default: 0 },
    conceptMastery: [
      {
        concept: { type: String, required: true },
        score: { type: Number, min: 0, max: 100, required: true },
      },
    ],
    weakConcepts: [{ type: String, trim: true }],
    misconceptions: [{ type: String, trim: true }],
    recommendedPractice: [{ type: String, trim: true }],
    lastStudiedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

learningProgressSchema.index({ child: 1, subject: 1, topic: 1 }, { unique: true });

export default mongoose.model("LearningProgress", learningProgressSchema);
