import LearningProgress from "../models/LearningProgress.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { findAccessibleChild } from "../middleware/authorizeChild.js";

export const getProgress = asyncHandler(async (request, response) => {
  const child = await findAccessibleChild(request.params.childId, request.user);
  const progress = await LearningProgress.find({ child: child._id })
    .sort({ lastStudiedAt: -1 })
    .lean();
  response.json({
    child: { id: child._id, name: child.name, age: child.age, grade: child.grade },
    progress,
  });
});
