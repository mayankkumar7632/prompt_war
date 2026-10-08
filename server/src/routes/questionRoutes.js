import { Router } from "express";
import { submitAnswer } from "../controllers/questionController.js";

const router = Router();

router.post("/:id/answer", submitAnswer);

export default router;
