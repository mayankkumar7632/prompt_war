import Answer from "../models/Answer.js";
import LearningProgress from "../models/LearningProgress.js";
import Question from "../models/Question.js";
import Story from "../models/Story.js";

function normalize(value) {
  return String(value)
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase()
    .replace(/[.!?,;:]+$/g, "")
    .replace(/\s+/g, " ");
}

function previousStats(previousPerformance = {}) {
  if (Array.isArray(previousPerformance)) {
    const answers = previousPerformance.filter((item) => typeof item?.isCorrect === "boolean");
    let consecutiveIncorrect = 0;
    for (const answer of answers.slice(0, 5)) {
      if (answer.isCorrect) break;
      consecutiveIncorrect += 1;
    }
    return {
      recentCorrect: answers.filter((item) => item.isCorrect).length,
      recentTotal: answers.length,
      consecutiveIncorrect,
    };
  }

  const recentCorrect = Number.isInteger(previousPerformance.recentCorrect)
    ? previousPerformance.recentCorrect
    : Number.isInteger(previousPerformance.correct)
      ? previousPerformance.correct
      : 0;
  const recentTotal = Number.isInteger(previousPerformance.recentTotal)
    ? previousPerformance.recentTotal
    : Number.isInteger(previousPerformance.total)
      ? previousPerformance.total
      : 0;

  return {
    recentCorrect: Math.max(0, Math.min(recentCorrect, recentTotal)),
    recentTotal: Math.max(0, recentTotal),
    consecutiveIncorrect: Number.isInteger(previousPerformance.consecutiveIncorrect)
      ? Math.max(0, previousPerformance.consecutiveIncorrect)
      : 0,
  };
}

function gradeAnswer({ question, correctAnswer, childAnswer }) {
  const expectedAnswers = [
    correctAnswer,
    ...(Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers : []),
  ].filter((answer) => typeof answer === "string" && answer.trim());

  if (expectedAnswers.length === 0) return null;
  const normalizedResponse = normalize(childAnswer);
  return expectedAnswers.some((answer) => normalize(answer) === normalizedResponse);
}

export function assessUnderstanding({
  learningObjective,
  question,
  correctAnswer = question?.correctAnswer,
  childAnswer,
  previousPerformance = {},
}) {
  if (
    !question ||
    typeof learningObjective !== "string" ||
    !learningObjective.trim() ||
    typeof childAnswer !== "string" ||
    !childAnswer.trim()
  ) {
    throw new TypeError("learningObjective, question, and a non-empty childAnswer are required.");
  }

  const stats = previousStats(previousPerformance);
  const correct = gradeAnswer({ question, correctAnswer, childAnswer });
  const previousAccuracy = stats.recentTotal
    ? stats.recentCorrect / stats.recentTotal
    : null;

  if (correct === null) {
    return {
      correct: null,
      understandingLevel: "unassessed",
      misconception: null,
      feedback: "Your answer has been saved for a teacher or parent to review.",
      nextAction: "review_answer",
      nextDifficulty: "same",
      shouldExplainAgain: false,
      shouldGenerateAnotherQuestion: false,
      evaluationStatus: "needs_review",
    };
  }

  let understandingLevel;
  if (!correct) {
    understandingLevel =
      stats.consecutiveIncorrect >= 1 ||
      (previousAccuracy !== null && previousAccuracy < 0.5)
        ? "needs_support"
        : "developing";
  } else if (previousAccuracy !== null && previousAccuracy >= 0.8 && stats.recentTotal >= 3) {
    understandingLevel = "strong";
  } else if (previousAccuracy !== null && previousAccuracy < 0.5 && stats.recentTotal >= 2) {
    understandingLevel = "developing";
  } else {
    understandingLevel = "good";
  }

  const shouldExplainAgain =
    !correct || (previousAccuracy !== null && previousAccuracy < 0.5 && stats.recentTotal >= 2);
  const misconception =
    !correct && typeof question.misconceptionOnIncorrect === "string"
      ? question.misconceptionOnIncorrect
      : null;
  const feedback = correct
    ? question.explanation || `That's right! You understood the learning objective: ${learningObjective.trim()}`
    : question.simplerExplanation ||
      question.explanation ||
      `Not quite. Let's review the key idea: ${learningObjective.trim()}`;

  return {
    correct,
    understandingLevel,
    misconception,
    feedback,
    nextAction: shouldExplainAgain ? "explain_again" : correct ? "continue" : "practice",
    nextDifficulty:
      understandingLevel === "strong"
        ? "harder"
        : understandingLevel === "needs_support"
          ? "simpler"
          : "same",
    shouldExplainAgain,
    shouldGenerateAnotherQuestion: true,
    evaluationStatus: "evaluated",
  };
}

export function evaluateResponse(question, response, context = {}) {
  const assessment = assessUnderstanding({
    learningObjective: context.learningObjective ?? question.concept,
    question,
    correctAnswer: context.correctAnswer ?? question.correctAnswer,
    childAnswer: response,
    previousPerformance: context.previousPerformance,
  });

  return {
    ...assessment,
    isCorrect: assessment.correct,
    score: assessment.correct === true ? 1 : 0,
  };
}

export async function refreshLearningProgress(child, story) {
  const storyIds = await Story.find({
    child: child._id,
    subject: story.subject,
    topic: story.topic,
  }).distinct("_id");
  const questionIds = await Question.find({ story: { $in: storyIds } }).distinct("_id");
  const answers = await Answer.find({
    child: child._id,
    question: { $in: questionIds },
  }).populate("question", "concept");

  const evaluatedAnswers = answers.filter((answer) => answer.evaluationStatus === "evaluated");
  const correctCount = evaluatedAnswers.filter((answer) => answer.isCorrect).length;
  const concepts = new Map();
  const misconceptions = new Set();

  for (const answer of evaluatedAnswers) {
    const concept = answer.question.concept;
    const entry = concepts.get(concept) ?? { attempted: 0, correct: 0 };
    entry.attempted += 1;
    if (answer.isCorrect) {
      entry.correct += 1;
    } else if (answer.misconception) {
      misconceptions.add(answer.misconception);
    }
    concepts.set(concept, entry);
  }

  const conceptMastery = [...concepts].map(([concept, totals]) => ({
    concept,
    score: Math.round((totals.correct / totals.attempted) * 100),
  }));
  const weakConcepts = conceptMastery
    .filter((item) => item.score < 70)
    .map((item) => item.concept);
  const understandingScore = evaluatedAnswers.length
    ? Math.round((correctCount / evaluatedAnswers.length) * 100)
    : 0;
  const storyCount = storyIds.length;

  return LearningProgress.findOneAndUpdate(
    { child: child._id, subject: story.subject, topic: story.topic },
    {
      $set: {
        storyCount,
        answeredQuestions: answers.length,
        evaluatedQuestions: evaluatedAnswers.length,
        understandingScore,
        conceptMastery,
        weakConcepts,
        misconceptions: [...misconceptions],
        recommendedPractice: weakConcepts.map((concept) => `Practice ${concept} with another example.`),
        lastStudiedAt: new Date(),
      },
    },
    { upsert: true, new: true, runValidators: true },
  );
}
