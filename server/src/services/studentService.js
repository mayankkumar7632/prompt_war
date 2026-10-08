import Child from "../models/Child.js";
import HttpError from "../middleware/HttpError.js";

export async function findStudentChild(user) {
  if (user.role !== "student") {
    throw new HttpError(403, "This route is only available to student accounts.");
  }
  const child = await Child.findOne({ studentUser: user._id });
  if (!child) {
    throw new HttpError(404, "Student profile is not available.");
  }
  return child;
}
