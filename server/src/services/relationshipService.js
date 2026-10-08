import { createHash, randomBytes } from "node:crypto";
import Child from "../models/Child.js";
import User from "../models/User.js";
import HttpError from "../middleware/HttpError.js";
import { findStudentChild } from "./studentService.js";

const PARENT_CODE_LIFETIME_MS = 24 * 60 * 60 * 1000;
const TEACHER_CODE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const codeHash = (code) => createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
const newCode = () => randomBytes(6).toString("hex").toUpperCase();

export async function issueParentConnectionCode(user) {
  const [child, code] = await Promise.all([findStudentChild(user), Promise.resolve(newCode())]);
  const expiresAt = new Date(Date.now() + PARENT_CODE_LIFETIME_MS);
  child.parentConnectionCodeHash = codeHash(code);
  child.parentConnectionCodeExpiresAt = expiresAt;
  await child.save();
  return { code, expiresAt };
}

export async function connectParentToStudent(parentId, code) {
  const normalizedCode = typeof code === "string" ? code.trim().toUpperCase() : "";
  if (!/^[A-F0-9]{12}$/.test(normalizedCode)) {
    throw new HttpError(400, "Enter the 12-character connection code shared by the student.");
  }

  const child = await Child.findOneAndUpdate(
    {
      parentConnectionCodeHash: codeHash(normalizedCode),
      parentConnectionCodeExpiresAt: { $gt: new Date() },
    },
    {
      $addToSet: { parentUsers: parentId },
      $unset: { parentConnectionCodeHash: 1, parentConnectionCodeExpiresAt: 1 },
    },
    { new: true },
  );
  if (!child) {
    throw new HttpError(404, "That connection code is invalid or has expired.");
  }
  return { studentName: child.name };
}

export async function issueTeacherConnectionCode(teacherId) {
  const teacher = await User.findById(teacherId).select("+teacherConnectionCodeHash +teacherConnectionCodeExpiresAt");
  if (!teacher || !teacher.hasRole("teacher")) {
    throw new HttpError(404, "Teacher account not found.");
  }
  const code = newCode();
  const expiresAt = new Date(Date.now() + TEACHER_CODE_LIFETIME_MS);
  teacher.teacherConnectionCodeHash = codeHash(code);
  teacher.teacherConnectionCodeExpiresAt = expiresAt;
  await teacher.save();
  return { code, expiresAt };
}

export async function connectStudentToTeacher(student, code) {
  const normalizedCode = typeof code === "string" ? code.trim().toUpperCase() : "";
  if (!/^[A-F0-9]{12}$/.test(normalizedCode)) {
    throw new HttpError(400, "Enter the 12-character class code shared by the teacher.");
  }
  const teacher = await User.findOne({
    teacherConnectionCodeHash: codeHash(normalizedCode),
    teacherConnectionCodeExpiresAt: { $gt: new Date() },
    _id: { $ne: student._id },
    $or: [{ role: "teacher" }, { roles: "teacher" }],
  }).select("_id");
  if (!teacher) {
    throw new HttpError(404, "That class code is invalid or has expired.");
  }

  const child = await findStudentChild(student);
  await Child.updateOne({ _id: child._id }, { $addToSet: { teacherUsers: teacher._id } });
  return { teacherId: teacher._id };
}
