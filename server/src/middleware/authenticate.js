import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { env } from "../config/env.js";
import HttpError from "./HttpError.js";
import asyncHandler from "./asyncHandler.js";

export const authenticate = asyncHandler(async (request, _response, next) => {
  const authorization = request.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new HttpError(401, "A bearer token is required.");
  }

  let payload;
  try {
    payload = jwt.verify(authorization.slice(7), env.jwtSecret);
  } catch {
    throw new HttpError(401, "The access token is invalid or has expired.");
  }

  if (
    typeof payload !== "object" ||
    typeof payload.sub !== "string" ||
    !["student", "parent", "teacher"].includes(payload.role)
  ) {
    throw new HttpError(401, "The access token is invalid.");
  }

  const user = await User.findById(payload.sub).select("_id email role roles");
  if (!user) {
    throw new HttpError(401, "The account for this access token no longer exists.");
  }
  if (!user.hasRole(payload.role)) {
    throw new HttpError(401, "The role in this access token is no longer available.");
  }

  request.user = { _id: user._id, email: user.email, role: payload.role };
  next();
});
