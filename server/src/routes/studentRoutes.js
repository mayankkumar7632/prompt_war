import { Router } from "express";
import {
  createStudentStory,
  createParentConnectionCode,
  getStudentDashboard,
  getStudentProfile,
  getStudentProgress,
  getStudentStory,
  createStudentQuizAttempt,
  listStudentStories,
  updateStudentProfile,
  joinTeacherClass,
} from "../controllers/studentController.js";
import { submitStudentAnswer } from "../controllers/questionController.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRole } from "../middleware/authorizeRole.js";

const router = Router();
const studentOnly = [authenticate, authorizeRole("student")];

router.use(...studentOnly);
router.get("/profile", getStudentProfile);
router.put("/profile", updateStudentProfile);
router.post("/parent-connection-code", createParentConnectionCode);
router.post("/join-teacher", joinTeacherClass);
router.get("/dashboard", getStudentDashboard);
router.get("/progress", getStudentProgress);
router.get("/stories", listStudentStories);
router.post("/stories", createStudentStory);
router.post("/stories/:storyId/quiz-attempt", createStudentQuizAttempt);
router.get("/stories/:storyId", getStudentStory);
router.post("/questions/:id/answer", submitStudentAnswer);

export default router;
