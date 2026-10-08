import { Router } from "express";
import { getProgress } from "../controllers/progressController.js";

const router = Router();

router.get("/:childId", getProgress);

export default router;
