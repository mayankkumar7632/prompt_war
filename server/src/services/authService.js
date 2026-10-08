import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import User from "../models/User.js";
import Child from "../models/Child.js";
import HttpError from "../middleware/HttpError.js";

export function createAccessToken(user, role = user.role) {
  return jwt.sign({ userId: user._id.toString(), role, email: user.email }, env.jwtSecret, {
    subject: user._id.toString(),
    expiresIn: env.jwtExpiresIn,
  });
}

export async function registerAccount({ name, email, password, role, child, age, grade, interests }) {
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail })
    .select("+passwordHash name email roles role age grade interests");
  if (existingUser) {
    if (existingUser.hasRole(role)) {
      return { conflict: true };
    }
    if (!(await existingUser.verifyPassword(password))) {
      throw new HttpError(409, "This email already has an account. Use its existing password to add another role.");
    }
    existingUser.roles = [...new Set([...(existingUser.roles ?? []), existingUser.role, role])];
    await existingUser.save();
    return { user: existingUser, child: null };
  }

  const user = new User({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: password,
    role,
    roles: [role],
    age,
    grade,
    interests,
  });
  await user.save();

  let childProfile = null;
  const childData = role === "student"
    ? { name, age, grade, interests }
    : child;
  if (childData) {
    try {
      childProfile = await Child.create({
        parentUser: user._id,
        ...(role === "student" ? { studentUser: user._id } : {}),
        parentUsers: [],
        name: childData.name,
        age: childData.age,
        grade: childData.grade,
        interests: childData.interests ?? [],
      });
    } catch (error) {
      await User.deleteOne({ _id: user._id });
      throw error;
    }
  }

  return { user, child: childProfile };
}
