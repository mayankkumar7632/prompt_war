import Answer from "../models/Answer.js";
import Question from "../models/Question.js";
import Story from "../models/Story.js";
import User from "../models/User.js";
import HttpError from "../middleware/HttpError.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { findAccessibleChild } from "../middleware/authorizeChild.js";
import { findStudentChild } from "../services/studentService.js";
import { evaluateResponse, refreshLearningProgress } from "../services/assessmentService.js";
import {
  evaluateStudentAnswer,
  generateAdaptiveExplanation,
  classifyQuestionSimilarity,
  generateLearningQuestions,
} from "../services/aiService.js";
import { selectQuestionCandidates } from "../services/questionSetService.js";

const attemptQuery = (storyId, attempt) => ({
  story: storyId,
  ...(attempt === 1
    ? { $or: [{ attempt: 1 }, { attempt: { $exists: false } }] }
    : { attempt }),
});

async function submitForChild({ request, response, child, submittedResponse, useAi }) {
  if (typeof submittedResponse !== "string" || !submittedResponse.trim()) {
    throw new HttpError(400, "A non-empty answer is required.");
  }

  const question = await Question.findById(request.params.id);
  if (!question) {
    throw new HttpError(404, "Question not found.");
  }
  const story = await Story.findById(question.story);
  if (!story || !story.child.equals(child._id)) {
    throw new HttpError(404, "Question not found for this learner.");
  }

  const relatedQuestionIds = await Question.find({ concept: question.concept }).distinct("_id");
  const previousAnswers = await Answer.find({
    child: child._id,
    question: { $in: relatedQuestionIds, $ne: question._id },
    evaluationStatus: "evaluated",
  })
    .sort({ answeredAt: -1 })
    .limit(5)
    .select("isCorrect")
    .lean();
  const previousPerformance = previousAnswers.map((answer) => ({ isCorrect: answer.isCorrect }));

  let evaluation;
  if (useAi) {
    const student = await User.findById(request.user._id).select("age");
    const aiAssessment = await evaluateStudentAnswer({
      age: student.age,
      learningObjective: story.learningObjective,
      question,
      correctAnswer: question.correctAnswer,
      childAnswer: submittedResponse.trim(),
      previousPerformance,
    });
    evaluation = {
      ...aiAssessment,
      isCorrect: aiAssessment.correct,
      score: aiAssessment.correct ? 1 : 0,
      nextAction: aiAssessment.shouldExplainAgain
        ? "explain_again"
        : aiAssessment.correct
          ? "continue"
          : "practice",
    };
  } else {
    evaluation = evaluateResponse(question, submittedResponse, {
      learningObjective: story.learningObjective,
      correctAnswer: question.correctAnswer,
      previousPerformance,
    });
  }

  let adaptiveExplanation = null;
  if (useAi && evaluation.shouldExplainAgain) {
    const student = await User.findById(request.user._id).select("age");
    adaptiveExplanation = await generateAdaptiveExplanation({
      age: student.age,
      learningObjective: story.learningObjective,
      concept: question.concept,
      misconception: evaluation.misconception,
    });
  }

  let additionalQuestion = null;
  if (useAi && evaluation.shouldGenerateAnotherQuestion) {
    const currentAttempt = question.attempt ?? 1;
    const currentAttemptQuestions = await Question.find(
      attemptQuery(story._id, currentAttempt),
    ).sort({ order: 1 }).lean();
    const currentQuestionCount = currentAttemptQuestions.length;
    if (currentQuestionCount < 10) {
      const student = await User.findById(request.user._id).select("age grade");
      const generatedQuestions = await generateLearningQuestions({
        age: student.age,
        grade: student.grade,
        subject: story.subject,
        topic: story.topic,
        learningObjective: story.learningObjective,
        storyContent: story.content,
        count: 5,
        concepts: currentAttemptQuestions.map((item) => item.concept),
        avoidQuestions: currentAttemptQuestions,
      });
      const [candidate] = await selectQuestionCandidates({
        candidates: generatedQuestions,
        previousQuestions: currentAttemptQuestions,
        targetCount: 1,
        classifyQuestions: classifyQuestionSimilarity,
        allowHistoricalFallback: false,
        excludePreviouslyCoveredConcepts: true,
      });
      if (candidate) {
        const lastOrder = await Question.findOne({ story: story._id })
          .sort({ order: -1 })
          .select("order")
          .lean();
        const nextQuestion = new Question({
          story: story._id,
          attempt: currentAttempt,
          prompt: candidate.prompt.trim(),
          questionHash: candidate.questionHash,
          questionType: candidate.questionType,
          options: candidate.options,
          correctAnswer: candidate.correctAnswer,
          acceptedAnswers: candidate.acceptedAnswers,
          explanation: candidate.explanation,
          simplerExplanation: candidate.simplerExplanation,
          concept: candidate.concept.trim(),
          misconceptionOnIncorrect: candidate.misconceptionOnIncorrect,
          misconceptionCheck: Boolean(candidate.misconceptionCheck),
          order: (lastOrder?.order ?? -1) + 1,
        });
        await nextQuestion.validate();
        await nextQuestion.save();
        additionalQuestion = {
          _id: nextQuestion._id,
          story: nextQuestion.story,
          prompt: nextQuestion.prompt,
          questionType: nextQuestion.questionType,
          options: nextQuestion.options,
          concept: nextQuestion.concept,
          order: nextQuestion.order,
          attempt: nextQuestion.attempt,
        };
      }
    }
  }

  const answer = await Answer.findOneAndUpdate(
    { child: child._id, question: question._id },
    {
      $set: {
        story: story._id,
        ...(request.user.role === "student" ? { studentUser: request.user._id } : {}),
        response: submittedResponse.trim(),
        learningObjective: story.learningObjective,
        ...evaluation,
        answeredAt: new Date(),
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  const progress = await refreshLearningProgress(child, story);
  const currentAttemptQuestionIds = await Question.find(
    attemptQuery(story._id, question.attempt ?? 1),
  ).distinct("_id");
  const answeredCount = await Answer.countDocuments({
    child: child._id,
    story: story._id,
    question: { $in: currentAttemptQuestionIds },
  });
  const questionCount = currentAttemptQuestionIds.length;
  const latestQuestion = await Question.findOne({ story: story._id })
    .sort({ attempt: -1, order: -1 })
    .select("attempt")
    .lean();
  if (
    questionCount > 0 &&
    answeredCount >= questionCount &&
    (latestQuestion?.attempt ?? 1) === (question.attempt ?? 1)
  ) {
    await Story.updateOne({ _id: story._id }, { $set: { status: "completed" } });
  }

  response.json({
    answer,
    assessment: {
      correct: evaluation.correct,
      understandingLevel: evaluation.understandingLevel,
      misconception: evaluation.misconception,
      feedback: evaluation.feedback,
      nextAction: evaluation.nextAction,
      nextDifficulty: evaluation.nextDifficulty,
      shouldExplainAgain: evaluation.shouldExplainAgain,
      shouldGenerateAnotherQuestion: evaluation.shouldGenerateAnotherQuestion,
      adaptiveExplanation,
      additionalQuestion,
    },
    progress: {
      understandingScore: progress.understandingScore,
      conceptMastery: progress.conceptMastery,
      weakConcepts: progress.weakConcepts,
      misconceptions: progress.misconceptions,
    },
  });
}

export const submitAnswer = asyncHandler(async (request, response) => {
  const { childId, response: submittedResponse } = request.body ?? {};
  if (typeof childId !== "string" || !childId.trim()) {
    throw new HttpError(400, "childId is required.");
  }
  const child = await findAccessibleChild(childId, request.user);
  await submitForChild({ request, response, child, submittedResponse, useAi: false });
});

export const submitStudentAnswer = asyncHandler(async (request, response) => {
  const child = await findStudentChild(request.user);
  const { response: submittedResponse } = request.body ?? {};
  await submitForChild({ request, response, child, submittedResponse, useAi: true });
});
