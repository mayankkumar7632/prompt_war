import Child from "../models/Child.js";
import Question from "../models/Question.js";
import Story from "../models/Story.js";
import HttpError from "../middleware/HttpError.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { findAccessibleChild } from "../middleware/authorizeChild.js";

const questionTypes = ["multiple_choice", "true_false", "application", "explain"];

function validateStory(body) {
  for (const field of ["childId", "title", "subject", "topic", "learningObjective", "content"]) {
    if (typeof body[field] !== "string" || !body[field].trim()) {
      throw new HttpError(400, `${field} is required.`);
    }
  }
  if (!Array.isArray(body.questions) || body.questions.length === 0) {
    throw new HttpError(400, "At least one checkpoint question is required.");
  }
  for (const [index, question] of body.questions.entries()) {
    if (
      typeof question.prompt !== "string" ||
      !question.prompt.trim() ||
      !questionTypes.includes(question.questionType) ||
      typeof question.concept !== "string" ||
      !question.concept.trim()
    ) {
      throw new HttpError(400, `Question ${index + 1} requires a prompt, supported questionType, and concept.`);
    }
    if (question.questionType !== "explain" && typeof question.correctAnswer !== "string") {
      throw new HttpError(400, `Question ${index + 1} requires a correctAnswer.`);
    }
    if (
      ["multiple_choice", "application"].includes(question.questionType) &&
      (!Array.isArray(question.options) || question.options.length < 2)
    ) {
      throw new HttpError(400, `Question ${index + 1} requires at least two options.`);
    }
    if (
      question.acceptedAnswers !== undefined &&
      (!Array.isArray(question.acceptedAnswers) ||
        question.acceptedAnswers.some((answer) => typeof answer !== "string"))
    ) {
      throw new HttpError(400, `Question ${index + 1} acceptedAnswers must be an array of strings.`);
    }
  }
}

export const createStory = asyncHandler(async (request, response) => {
  const body = request.body ?? {};
  validateStory(body);
  const child = await findAccessibleChild(body.childId, request.user);

  const story = new Story({
    child: child._id,
    createdBy: request.user._id,
    title: body.title,
    subject: body.subject,
    topic: body.topic,
    interest: body.interest,
    learningObjective: body.learningObjective,
    content: body.content,
  });
  await story.validate();

  const questions = body.questions.map((question, index) => new Question({
    story: story._id,
    prompt: question.prompt,
    questionType: question.questionType,
    options: question.options ?? [],
    correctAnswer: question.correctAnswer,
    acceptedAnswers: question.acceptedAnswers ?? [],
    explanation: question.explanation,
    simplerExplanation: question.simplerExplanation,
    concept: question.concept,
    misconceptionOnIncorrect: question.misconceptionOnIncorrect,
    misconceptionCheck: question.misconceptionCheck ?? false,
    order: index,
  }));
  await Promise.all(questions.map((question) => question.validate()));

  await story.save();
  try {
    await Question.insertMany(questions);
  } catch (error) {
    await Question.deleteMany({ story: story._id });
    await Story.deleteOne({ _id: story._id });
    throw error;
  }

  response.status(201).json({
    story: story.toObject(),
    questions: questions.map((question) => question.toObject()),
  });
});

export const getStory = asyncHandler(async (request, response) => {
  const story = await Story.findById(request.params.id);
  if (!story) {
    throw new HttpError(404, "Story not found.");
  }
  await findAccessibleChild(story.child, request.user);
  const questions = await Question.find({ story: story._id }).sort({ order: 1 });
  response.json({ story, questions });
});
