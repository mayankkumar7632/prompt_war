import { Router } from "express";
import { createStory, getStory } from "../controllers/storyController.js";

const router = Router();

router.post("/", createStory);
router.get("/:id", getStory);

export default router;
