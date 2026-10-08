import { Router } from "express";
import {
  createTeacherConnectionCode,
  getTeacherDashboard,
  getTeacherStudentProgress,
  listTeacherStudents,
} from "../controllers/teacherController.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRole } from "../middleware/authorizeRole.js";

const router = Router();
router.use(authenticate, authorizeRole("teacher"));
router.get("/dashboard", getTeacherDashboard);
router.get("/students", listTeacherStudents);
router.get("/students/:studentId/progress", getTeacherStudentProgress);
router.post("/connection-code", createTeacherConnectionCode);

export default router;
