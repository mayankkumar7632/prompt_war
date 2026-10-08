import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["student", "parent", "teacher"],
      default: "parent",
      required: true,
    },
    roles: [{
      type: String,
      enum: ["student", "parent", "teacher"],
    }],
    age: { type: Number, min: 4, max: 18 },
    grade: { type: String, trim: true, maxlength: 40 },
    interests: [{ type: String, trim: true, maxlength: 40 }],
    profilePhoto: { type: String, trim: true, maxlength: 2000 },
    teacherConnectionCodeHash: { type: String, select: false },
    teacherConnectionCodeExpiresAt: { type: Date, select: false },
  },
  { timestamps: true },
);

userSchema.index(
  { age: 1, grade: 1 },
  { partialFilterExpression: { role: "student" } },
);

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("passwordHash")) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

userSchema.methods.verifyPassword = function verifyPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.hasRole = function hasRole(role) {
  return (this.roles?.length ? this.roles : [this.role]).includes(role);
};

export default mongoose.model("User", userSchema);
