import mongoose from "mongoose";
import Child from "../models/Child.js";
import HttpError from "../middleware/HttpError.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { getChildGrowth, summarizeTeacherGrowth } from "../services/growthService.js";
import {
  issueTeacherConnectionCode,
} from "../services/relationshipService.js";

function teacherChildQuery(teacherId) {
  return { teacherUsers: teacherId };
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

async function getTeacherChildren(teacherId) {
  return Child.find(teacherChildQuery(teacherId))
    .populate({ path: "studentUser", select: "name age grade" })
    .sort({ name: 1 })
    .lean();
}

export const listTeacherStudents = asyncHandler(async (request, response) => {
  const children = await getTeacherChildren(request.user._id);
  const students = await Promise.all(children.map(async (child) => ({
    ...childSummary(child),
    ...(await getChildGrowth(child, { includeDetails: false })),
  })));
  response.json({ students });
});

export const getTeacherDashboard = asyncHandler(async (request, response) => {
  const children = await getTeacherChildren(request.user._id);
  const students = await Promise.all(children.map(async (child) => ({
    student: childSummary(child),
    ...(await getChildGrowth(child, { includeDetails: false })),
  })));
  response.json({ dashboard: summarizeTeacherGrowth(students) });
});

export const getTeacherStudentProgress = asyncHandler(async (request, response) => {
  const { studentId } = request.params;
  if (!mongoose.isValidObjectId(studentId)) {
    throw new HttpError(404, "The requested progress could not be found.");
  }
  const child = await Child.findOne({
    $and: [
      teacherChildQuery(request.user._id),
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
  response.json({
    student: childSummary(child),
    ...(await getChildGrowth(child)),
  });
});

export const createTeacherConnectionCode = asyncHandler(async (request, response) => {
  const code = await issueTeacherConnectionCode(request.user._id);
  response.json(code);
});
