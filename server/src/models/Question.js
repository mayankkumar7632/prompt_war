import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    story: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Story",
      required: true,
      index: true,
    },
    attempt: { type: Number, min: 1, default: 1 },
    prompt: { type: String, required: true, trim: true, maxlength: 1000 },
    questionHash: { type: String, trim: true, lowercase: true, minlength: 64, maxlength: 64 },
    questionType: {
      type: String,
      enum: ["multiple_choice", "true_false", "application", "explain"],
      required: true,
    },
    options: [{ type: String, trim: true, maxlength: 300 }],
    correctAnswer: { type: String, trim: true, maxlength: 500 },
    acceptedAnswers: [{ type: String, trim: true, maxlength: 500 }],
    explanation: { type: String, trim: true, maxlength: 1200 },
    simplerExplanation: { type: String, trim: true, maxlength: 1200 },
    concept: { type: String, required: true, trim: true, maxlength: 120 },
    misconceptionOnIncorrect: { type: String, trim: true, maxlength: 300 },
    misconceptionCheck: { type: Boolean, default: false },
    order: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

questionSchema.index({ story: 1, order: 1 }, { unique: true });
questionSchema.index({ story: 1, attempt: -1, order: 1 });

export default mongoose.model("Question", questionSchema);
