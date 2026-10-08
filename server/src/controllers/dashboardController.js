import Answer from "../models/Answer.js";
import LearningProgress from "../models/LearningProgress.js";
import Story from "../models/Story.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { findAccessibleChild } from "../middleware/authorizeChild.js";

export const getDashboard = asyncHandler(async (request, response) => {
  const child = await findAccessibleChild(request.params.childId, request.user);
  const [progress, recentStories, completedStories, answers] = await Promise.all([
    LearningProgress.find({ child: child._id }).sort({ lastStudiedAt: -1 }).lean(),
    Story.find({ child: child._id }).sort({ createdAt: -1 }).limit(5).lean(),
    Story.countDocuments({ child: child._id, status: "completed" }),
    Answer.find({ child: child._id, evaluationStatus: "evaluated" }).select("isCorrect").lean(),
  ]);
  const correctAnswers = answers.filter((answer) => answer.isCorrect).length;
  const understandingScore = answers.length
    ? Math.round((correctAnswers / answers.length) * 100)
    : 0;

  response.json({
    child: { id: child._id, name: child.name, age: child.age, grade: child.grade },
    summary: {
      topicsStudied: progress.length,
      storiesCompleted: completedStories,
      evaluatedQuestions: answers.length,
      understandingScore,
    },
    strengths: progress.flatMap((item) =>
      item.conceptMastery.filter((concept) => concept.score >= 80).map((concept) => ({
        subject: item.subject,
        topic: item.topic,
        concept: concept.concept,
        score: concept.score,
      })),
    ),
    weakConcepts: progress.flatMap((item) =>
      item.weakConcepts.map((concept) => ({ subject: item.subject, topic: item.topic, concept })),
    ),
    misconceptions: [...new Set(progress.flatMap((item) => item.misconceptions))],
    recommendedPractice: [...new Set(progress.flatMap((item) => item.recommendedPractice))],
    recentStories,
  });
});
