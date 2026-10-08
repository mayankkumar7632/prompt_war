import Child from "../models/Child.js";
import HttpError from "./HttpError.js";

export async function findAccessibleChild(childId, user) {
  const child = await Child.findById(childId);
  if (!child) {
    throw new HttpError(404, "Learner not found.");
  }

  const isParent =
    user.role === "parent" &&
    (child.parentUser.equals(user._id) ||
      (child.parentUsers ?? []).some((parentId) => parentId.equals(user._id)));
  const isAssignedTeacher =
    user.role === "teacher" &&
    child.teacherUsers.some((teacherId) => teacherId.equals(user._id));

  if (!isParent && !isAssignedTeacher) {
    throw new HttpError(403, "You do not have access to this learner.");
  }

  return child;
}
