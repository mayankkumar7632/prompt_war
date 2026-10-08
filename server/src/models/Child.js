import mongoose from "mongoose";

const childSchema = new mongoose.Schema(
  {
    parentUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    studentUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      sparse: true,
      index: true,
    },
    parentUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
    teacherUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    parentConnectionCodeHash: { type: String, select: false },
    parentConnectionCodeExpiresAt: { type: Date, select: false },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    age: { type: Number, required: true, min: 4, max: 18 },
    grade: { type: String, required: true, trim: true, maxlength: 40 },
    interests: [{ type: String, trim: true, maxlength: 40 }],
  },
  { timestamps: true },
);

export default mongoose.model("Child", childSchema);
