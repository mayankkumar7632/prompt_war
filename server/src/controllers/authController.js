import User from "../models/User.js";
import HttpError from "../middleware/HttpError.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { createAccessToken, registerAccount } from "../services/authService.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateCredentials(body, isRegistration) {
  const { name, email, password } = body;
  if (typeof email !== "string" || !emailPattern.test(email.trim())) {
    throw new HttpError(400, "Enter a valid email address.");
  }
  if (typeof password !== "string" || password.length < 8) {
    throw new HttpError(400, "Password must be at least 8 characters long.");
  }
  if (Buffer.byteLength(password, "utf8") > 72) {
    throw new HttpError(400, "Password must be no more than 72 UTF-8 bytes.");
  }
  if (isRegistration && (typeof name !== "string" || !name.trim())) {
    throw new HttpError(400, "Name is required.");
  }
}

export const register = asyncHandler(async (request, response) => {
  const body = request.body ?? {};
  validateCredentials(body, true);
  const role = body.role ?? "parent";
  if (!["student", "parent", "teacher"].includes(role)) {
    throw new HttpError(400, "Role must be student, parent, or teacher.");
  }
  if (role === "student" && body.confirmPassword !== body.password) {
    throw new HttpError(400, "Password confirmation does not match.");
  }
  if (
    role === "student" &&
    (!Number.isInteger(body.age) ||
      body.age < 4 ||
      body.age > 18 ||
      typeof body.grade !== "string" ||
      !body.grade.trim())
  ) {
    throw new HttpError(400, "Student registration requires an age from 4 to 18 and a class/grade.");
  }
  if (
    body.interests !== undefined &&
    (!Array.isArray(body.interests) ||
      body.interests.some((interest) => typeof interest !== "string" || interest.length > 40))
  ) {
    throw new HttpError(400, "Interests must be a list of short text values.");
  }
  if (body.child && role !== "parent") {
    throw new HttpError(400, "Only a parent account can create a child profile during registration.");
  }
  if (
    body.child &&
    (typeof body.child.name !== "string" ||
      !body.child.name.trim() ||
      !Number.isInteger(body.child.age) ||
      body.child.age < 4 ||
      body.child.age > 18 ||
      typeof body.child.grade !== "string" ||
      !body.child.grade.trim())
  ) {
    throw new HttpError(400, "Child profile requires a name, age from 4 to 18, and grade.");
  }

  const result = await registerAccount({
    name: body.name,
    email: body.email,
    password: body.password,
    role,
    child: body.child,
    age: role === "student" ? body.age : undefined,
    grade: role === "student" ? body.grade : undefined,
    interests: role === "student" ? body.interests ?? [] : undefined,
  });
  if (result.conflict) {
    throw new HttpError(409, "An account with this email already exists.");
  }

  response.status(201).json({
    user: {
      id: result.user._id,
      name: result.user.name,
      email: result.user.email,
      role,
      roles: result.user.roles?.length ? result.user.roles : [result.user.role],
      age: result.user.age ?? null,
      grade: result.user.grade ?? null,
      interests: result.user.interests ?? [],
    },
    child: result.child ? { id: result.child._id, name: result.child.name } : null,
    token: createAccessToken(result.user, role),
  });
});

export const login = asyncHandler(async (request, response) => {
  const body = request.body ?? {};
  validateCredentials(body, false);
  if (!["student", "parent", "teacher"].includes(body.role)) {
    throw new HttpError(400, "Choose Student, Parent, or Teacher before signing in.");
  }
  const user = await User.findOne({ email: body.email.trim().toLowerCase() }).select("+passwordHash");
  if (!user || !(await user.verifyPassword(body.password))) {
    throw new HttpError(401, "Email or password is incorrect.");
  }
  if (!user.hasRole(body.role)) {
    const roleName = body.role[0].toUpperCase() + body.role.slice(1);
    throw new HttpError(403, `This email is not registered as a ${roleName}.`);
  }

  response.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: body.role,
      roles: user.roles?.length ? user.roles : [user.role],
      age: user.age ?? null,
      grade: user.grade ?? null,
      interests: user.interests ?? [],
    },
    token: createAccessToken(user, body.role),
  });
});
