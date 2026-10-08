import { Router } from "express";
import {
  connectStudent,
  getParentDashboard,
  getParentStudentProgress,
  listParentChildren,
} from "../controllers/parentController.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRole } from "../middleware/authorizeRole.js";

const router = Router();
router.use(authenticate, authorizeRole("parent"));
router.get("/dashboard", getParentDashboard);
router.get("/children", listParentChildren);
router.get("/children/:studentId/progress", getParentStudentProgress);
router.post("/connect-student", connectStudent);

export default router;
