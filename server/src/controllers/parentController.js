import mongoose from "mongoose";
import Child from "../models/Child.js";
import HttpError from "../middleware/HttpError.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { getChildGrowth } from "../services/growthService.js";
import { connectParentToStudent } from "../services/relationshipService.js";

function parentChildQuery(parentId) {
  return {
    $or: [
      { parentUsers: parentId },
      { parentUser: parentId, studentUser: { $exists: false } },
    ],
  };
}

function childSummary(child) {
  const student = child.studentUser;
  return {
    studentId: student?._id?.toString() ?? child._id.toString(),
    id: student?._id?.toString() ?? child._id.toString(),
    name: student?.name ?? child.name,
    age: student?.age ?? child.age,
    grade: student?.grade ?? child.grade,
    hasStudentAccount: Boolean(student?._id),
  };
}

async function getParentChildren(parentId) {
  const children = await Child.find(parentChildQuery(parentId))
    .populate({ path: "studentUser", select: "name age grade" })
    .sort({ name: 1 })
    .lean();
  return children;
}

export const listParentChildren = asyncHandler(async (request, response) => {
  const children = await getParentChildren(request.user._id);
  response.json({ children: children.map(childSummary) });
});

export const getParentDashboard = asyncHandler(async (request, response) => {
  const children = await getParentChildren(request.user._id);
  const availableChildren = children.map(childSummary);
  if (!children.length) {
    response.json({ children: [], dashboard: null });
    return;
  }

  const selectedId = request.query.studentId;
  const selectedChild = selectedId
    ? children.find((child) =>
        child.studentUser?._id?.toString() === selectedId ||
        child._id.toString() === selectedId)
    : children[0];
  if (!selectedChild) {
    throw new HttpError(403, "You do not have permission to view this student's progress.");
  }

  const summary = childSummary(selectedChild);
  const growth = await getChildGrowth(selectedChild);
  response.json({
    children: availableChildren,
    dashboard: { student: summary, ...growth },
  });
});

export const getParentStudentProgress = asyncHandler(async (request, response) => {
  const { studentId } = request.params;
  if (!mongoose.isValidObjectId(studentId)) {
    throw new HttpError(404, "The requested progress could not be found.");
  }
  const child = await Child.findOne({
    $and: [
      parentChildQuery(request.user._id),
      {
        $or: [
          { studentUser: studentId },
          { studentUser: { $exists: false }, _id: studentId },
        ],
      },
    ],
  }).populate({ path: "studentUser", select: "name age grade" });
  if (!child) {
    const targetExists = await Child.exists({
      $or: [{ studentUser: studentId }, { _id: studentId }],
    });
    throw new HttpError(targetExists ? 403 : 404, targetExists
      ? "You do not have permission to view this student's progress."
      : "The requested progress could not be found.");
  }
  response.json({ student: childSummary(child), ...(await getChildGrowth(child)) });
});

export const connectStudent = asyncHandler(async (request, response) => {
  if (typeof request.body?.code !== "string") {
    throw new HttpError(400, "A student connection code is required.");
  }
  const connection = await connectParentToStudent(request.user._id, request.body.code);
  response.status(201).json({ message: `Connected to ${connection.studentName}.` });
});
