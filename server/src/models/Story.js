import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    studentUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    subject: { type: String, required: true, trim: true, maxlength: 80 },
    topic: { type: String, required: true, trim: true, maxlength: 120 },
    interest: { type: String, trim: true, maxlength: 80 },
    age: { type: Number, min: 4, max: 18 },
    grade: { type: String, trim: true, maxlength: 40 },
    learningObjective: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    content: { type: String, required: true, trim: true, maxlength: 30000 },
    chapters: [
      {
        title: { type: String, trim: true, maxlength: 180 },
        text: { type: String, trim: true, maxlength: 12000 },
      },
    ],
    status: {
      type: String,
      enum: ["in_progress", "completed"],
      default: "in_progress",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Story", storySchema);
