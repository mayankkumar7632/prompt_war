import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      required: true,
      index: true,
    },
    studentUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    story: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Story",
      required: true,
    },
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    response: { type: String, required: true, trim: true, maxlength: 3000 },
    learningObjective: { type: String, trim: true, maxlength: 500 },
    isCorrect: { type: Boolean, default: null },
    score: { type: Number, min: 0, max: 1, default: 0 },
    understandingLevel: {
      type: String,
      enum: ["strong", "good", "developing", "needs_support", "unassessed"],
      default: "unassessed",
    },
    misconception: { type: String, trim: true, maxlength: 500 },
    nextAction: {
      type: String,
      enum: ["continue", "practice", "explain_again", "review_answer"],
      default: "review_answer",
    },
    nextDifficulty: {
      type: String,
      enum: ["simpler", "same", "harder"],
      default: "same",
    },
    shouldExplainAgain: { type: Boolean, default: false },
    shouldGenerateAnotherQuestion: { type: Boolean, default: false },
    evaluationStatus: {
      type: String,
      enum: ["evaluated", "needs_review"],
      required: true,
    },
    feedback: { type: String, trim: true, maxlength: 1200 },
    answeredAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

answerSchema.index({ child: 1, question: 1 }, { unique: true });

export default mongoose.model("Answer", answerSchema);
