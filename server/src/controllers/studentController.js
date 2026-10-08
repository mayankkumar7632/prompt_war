import Answer from "../models/Answer.js";
import Child from "../models/Child.js";
import LearningProgress from "../models/LearningProgress.js";
import Question from "../models/Question.js";
import Story from "../models/Story.js";
import User from "../models/User.js";
import HttpError from "../middleware/HttpError.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { findStudentChild } from "../services/studentService.js";
import {
  classifyQuestionSimilarity,
  generateLearningQuestions,
  generateStory,
} from "../services/aiService.js";
import { generateQuestionSet } from "../services/questionSetService.js";
import {
  connectStudentToTeacher,
  issueParentConnectionCode,
} from "../services/relationshipService.js";

const publicQuestion = (question) => ({
  _id: question._id,
  story: question.story,
  prompt: question.prompt,
  questionType: question.questionType,
  options: question.options,
  concept: question.concept,
  order: question.order,
  attempt: question.attempt ?? 1,
});

export const getStudentProfile = asyncHandler(async (request, response) => {
  const user = await User.findById(request.user._id).select(
    "name email role age grade interests profilePhoto createdAt",
  );
  if (!user || user.role !== "student") {
    throw new HttpError(404, "Student account not found.");
  }
  response.json({ profile: user });
});

export const updateStudentProfile = asyncHandler(async (request, response) => {
  const body = request.body ?? {};
  const updates = {};
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 100) {
      throw new HttpError(400, "Name must be between 1 and 100 characters.");
    }
    updates.name = body.name.trim();
  }
  if (body.age !== undefined) {
    if (!Number.isInteger(body.age) || body.age < 4 || body.age > 18) {
      throw new HttpError(400, "Age must be a whole number from 4 to 18.");
    }
    updates.age = body.age;
  }
  if (body.grade !== undefined) {
    if (typeof body.grade !== "string" || !body.grade.trim() || body.grade.trim().length > 40) {
      throw new HttpError(400, "Class/grade is required and must be 40 characters or fewer.");
    }
    updates.grade = body.grade.trim();
  }
  if (body.interests !== undefined) {
    if (
      !Array.isArray(body.interests) ||
      body.interests.length > 12 ||
      body.interests.some((interest) => typeof interest !== "string" || !interest.trim() || interest.length > 40)
    ) {
      throw new HttpError(400, "Interests must be a list of up to 12 short text values.");
    }
    updates.interests = [...new Set(body.interests.map((interest) => interest.trim()))];
  }
  if (body.profilePhoto !== undefined) {
    if (
      body.profilePhoto !== "" &&
      (typeof body.profilePhoto !== "string" ||
        body.profilePhoto.length > 2000 ||
        !/^https?:\/\//i.test(body.profilePhoto))
    ) {
      throw new HttpError(400, "Profile picture must be an HTTP or HTTPS URL.");
    }
    updates.profilePhoto = body.profilePhoto;
  }
  if (Object.hasOwn(body, "role") || Object.hasOwn(body, "email")) {
    throw new HttpError(400, "Email and account role cannot be changed here.");
  }
  if (Object.keys(updates).length === 0) {
    throw new HttpError(400, "Provide at least one profile field to update.");
  }

  const user = await User.findByIdAndUpdate(
    request.user._id,
    { $set: updates },
    { new: true, runValidators: true, select: "name email role age grade interests profilePhoto createdAt" },
  );
  if (!user || user.role !== "student") {
    throw new HttpError(404, "Student account not found.");
  }

  const childUpdates = {};
  if (updates.name) childUpdates.name = updates.name;
  if (updates.age) childUpdates.age = updates.age;
  if (updates.grade) childUpdates.grade = updates.grade;
  if (updates.interests) childUpdates.interests = updates.interests;
  if (Object.keys(childUpdates).length) {
    await Child.updateOne({ studentUser: user._id }, { $set: childUpdates });
  }
  response.json({ profile: user });
});

export const getStudentDashboard = asyncHandler(async (request, response) => {
  const child = await findStudentChild(request.user);
  const [user, progress, recentStories, completedStories, answers] = await Promise.all([
    User.findById(request.user._id).select("name age grade interests profilePhoto"),
    LearningProgress.find({ child: child._id }).sort({ lastStudiedAt: -1 }).lean(),
    Story.find({ child: child._id }).sort({ createdAt: -1 }).limit(6).lean(),
    Story.countDocuments({ child: child._id, status: "completed" }),
    Answer.find({ child: child._id }).sort({ answeredAt: -1 }).limit(10)
      .populate({ path: "question", select: "prompt concept" })
      .populate({ path: "story", select: "title subject topic" })
      .lean(),
  ]);
  const evaluatedAnswers = answers.filter((answer) => answer.evaluationStatus === "evaluated");
  const correctAnswers = evaluatedAnswers.filter((answer) => answer.isCorrect).length;
  const recommendedPractice = [...new Set(progress.flatMap((item) => item.recommendedPractice))];
  const recommendation = recommendedPractice[0]
    ? { type: "practice", text: recommendedPractice[0] }
    : { type: "topic", text: "Choose a new topic and start a story adventure." };

  response.json({
    student: {
      id: user._id,
      name: user.name,
      age: user.age,
      grade: user.grade,
      interests: user.interests,
      profilePhoto: user.profilePhoto,
    },
    summary: {
      storiesStarted: await Story.countDocuments({ child: child._id }),
      storiesCompleted: completedStories,
      topicsStudied: progress.length,
      questionsAttempted: answers.length,
      correctAnswers,
      incorrectAnswers: evaluatedAnswers.length - correctAnswers,
      understandingScore: evaluatedAnswers.length
        ? Math.round((correctAnswers / evaluatedAnswers.length) * 100)
        : null,
      lastActivityAt: answers[0]?.answeredAt ?? recentStories[0]?.createdAt ?? null,
    },
    subjectProgress: progress.map((item) => ({
      subject: item.subject,
      topic: item.topic,
      score: item.understandingScore,
      weakConcepts: item.weakConcepts,
      conceptMastery: item.conceptMastery,
    })),
    recentStories,
    recentQuizResults: answers.map((answer) => ({
      id: answer._id,
      storyTitle: answer.story?.title ?? "Learning checkpoint",
      subject: answer.story?.subject ?? "",
      topic: answer.story?.topic ?? "",
      question: answer.question?.prompt ?? "",
      correct: answer.isCorrect,
      score: answer.score,
      understandingLevel: answer.understandingLevel,
      answeredAt: answer.answeredAt,
    })),
    recommendation,
  });
});

export const listStudentStories = asyncHandler(async (request, response) => {
  const child = await findStudentChild(request.user);
  const stories = await Story.find({ child: child._id }).sort({ createdAt: -1 }).lean();
  response.json({ stories });
});

export const createStudentStory = asyncHandler(async (request, response) => {
  const { subject, topic, learningObjective, interest } = request.body ?? {};
  if (typeof subject !== "string" || !subject.trim() || subject.trim().length > 80) {
    throw new HttpError(400, "Choose a subject (up to 80 characters).");
  }
  if (typeof topic !== "string" || !topic.trim() || topic.trim().length > 120) {
    throw new HttpError(400, "Choose a topic (up to 120 characters).");
  }
  if (learningObjective !== undefined && (typeof learningObjective !== "string" || learningObjective.length > 500)) {
    throw new HttpError(400, "Learning objective must be 500 characters or fewer.");
  }

  const [child, student] = await Promise.all([
    findStudentChild(request.user),
    User.findById(request.user._id).select("name age grade interests"),
  ]);
  const selectedInterest =
    typeof interest === "string" && interest.trim()
      ? interest.trim().slice(0, 80)
      : student.interests[0] ?? "Adventure";
  const generated = await generateStory({
    age: student.age,
    grade: student.grade,
    subject: subject.trim(),
    topic: topic.trim(),
    interest: selectedInterest,
    learningObjective: learningObjective?.trim() || undefined,
  });

  const objectives = generated.learningObjectives.filter(
    (objective) => typeof objective === "string" && objective.trim(),
  );
  const chapters = generated.chapters.filter(
    (chapter) =>
      typeof chapter?.title === "string" &&
      chapter.title.trim() &&
      typeof chapter?.text === "string" &&
      chapter.text.trim(),
  );
  if (!objectives.length || !chapters.length) {
    throw new HttpError(502, "The AI generated incomplete learning content. Please try again.");
  }
  const storyText = chapters.map((chapter) => chapter.text.trim()).join("\n\n");
  const learningObjectiveText = objectives.join(" ");
  const questionContext = {
    age: student.age,
    grade: student.grade,
    subject: subject.trim(),
    topic: topic.trim(),
    learningObjective: learningObjectiveText,
    storyContent: storyText,
  };
  const selectedQuestions = await generateQuestionSet({
    initialQuestions: generated.questions,
    context: questionContext,
    generateCandidates: ({ count, concepts, avoidQuestions, context }) =>
      generateLearningQuestions({ ...context, count, concepts, avoidQuestions }),
    classifyQuestions: classifyQuestionSimilarity,
  });

  const story = new Story({
    child: child._id,
    createdBy: request.user._id,
    studentUser: request.user._id,
    title: generated.title.trim().slice(0, 180),
    subject: subject.trim(),
    topic: topic.trim(),
    interest: selectedInterest,
    age: student.age,
    grade: student.grade,
    learningObjective: learningObjectiveText,
    content: storyText,
    chapters,
  });
  await story.validate();

  const questions = selectedQuestions.map((question, index) => new Question({
    story: story._id,
    attempt: 1,
    prompt: question.prompt.trim(),
    questionHash: question.questionHash,
    questionType: question.questionType,
    options: Array.isArray(question.options) ? question.options.filter((option) => typeof option === "string") : [],
    correctAnswer: typeof question.correctAnswer === "string" ? question.correctAnswer : undefined,
    acceptedAnswers: Array.isArray(question.acceptedAnswers)
      ? question.acceptedAnswers.filter((answer) => typeof answer === "string")
      : [],
    explanation: typeof question.explanation === "string" ? question.explanation : undefined,
    simplerExplanation: typeof question.simplerExplanation === "string" ? question.simplerExplanation : undefined,
    concept: question.concept.trim(),
    misconceptionOnIncorrect:
      typeof question.misconceptionOnIncorrect === "string" ? question.misconceptionOnIncorrect : undefined,
    misconceptionCheck: Boolean(question.misconceptionCheck),
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
    story,
    questions: questions.map(publicQuestion),
  });
});

export const getStudentStory = asyncHandler(async (request, response) => {
  const child = await findStudentChild(request.user);
  const story = await Story.findOne({ _id: request.params.storyId, child: child._id });
  if (!story) {
    throw new HttpError(404, "Story not found.");
  }
  const allQuestions = await Question.find({ story: story._id }).sort({ attempt: -1, order: 1 }).lean();
  const latestAttempt = allQuestions[0]?.attempt ?? 1;
  const questions = allQuestions.filter((question) => (question.attempt ?? 1) === latestAttempt);
  response.json({ story, questions: questions.map(publicQuestion) });
});

export const createStudentQuizAttempt = asyncHandler(async (request, response) => {
  const child = await findStudentChild(request.user);
  const story = await Story.findOne({ _id: request.params.storyId, child: child._id }).lean();
  if (!story) {
    throw new HttpError(404, "Story not found.");
  }

  const allQuestions = await Question.find({ story: story._id }).sort({ attempt: -1, order: -1 }).lean();
  if (!allQuestions.length) {
    throw new HttpError(404, "This story does not have a quiz to retry.");
  }
  const latestAttempt = allQuestions[0].attempt ?? 1;
  const currentAttemptQuestions = allQuestions.filter(
    (question) => (question.attempt ?? 1) === latestAttempt,
  );
  const currentQuestionIds = currentAttemptQuestions.map((question) => question._id);
  const answeredCount = await Answer.countDocuments({
    child: child._id,
    question: { $in: currentQuestionIds },
  });
  if (answeredCount < currentAttemptQuestions.length) {
    throw new HttpError(409, "Finish the current quiz before starting a fresh question set.");
  }

  const learner = await User.findById(request.user._id).select("age grade");
  const context = {
    age: learner.age,
    grade: learner.grade,
    subject: story.subject,
    topic: story.topic,
    learningObjective: story.learningObjective,
    storyContent: story.content,
  };
  const recentQuestions = allQuestions.slice(0, 20);
  const selectedQuestions = await generateQuestionSet({
    previousQuestions: recentQuestions,
    context,
    generateCandidates: ({ count, concepts, avoidQuestions, context: generationContext }) =>
      generateLearningQuestions({
        ...generationContext,
        count,
        concepts,
        avoidQuestions,
      }),
    classifyQuestions: classifyQuestionSimilarity,
  });
  const firstOrder = Math.max(...allQuestions.map((question) => question.order)) + 1;
  const questions = selectedQuestions.map((question, index) => new Question({
    story: story._id,
    attempt: latestAttempt + 1,
    order: firstOrder + index,
    questionHash: question.questionHash,
    prompt: question.prompt,
    questionType: question.questionType,
    options: question.options,
    correctAnswer: question.correctAnswer,
    acceptedAnswers: question.acceptedAnswers,
    explanation: question.explanation,
    simplerExplanation: question.simplerExplanation,
    concept: question.concept,
    misconceptionOnIncorrect: question.misconceptionOnIncorrect,
    misconceptionCheck: question.misconceptionCheck,
  }));
  await Promise.all(questions.map((question) => question.validate()));
  await Question.insertMany(questions);
  await Story.updateOne({ _id: story._id }, { $set: { status: "in_progress" } });

  response.status(201).json({ questions: questions.map(publicQuestion) });
});

export const getStudentProgress = asyncHandler(async (request, response) => {
  const child = await findStudentChild(request.user);
  const [progress, answers] = await Promise.all([
    LearningProgress.find({ child: child._id }).sort({ lastStudiedAt: -1 }).lean(),
    Answer.find({ child: child._id }).sort({ answeredAt: -1 }).limit(50)
      .populate({ path: "question", select: "prompt concept" })
      .populate({ path: "story", select: "title subject topic" })
      .lean(),
  ]);
  response.json({ progress, recentAnswers: answers });
});

export const createParentConnectionCode = asyncHandler(async (request, response) => {
  response.json(await issueParentConnectionCode(request.user));
});

export const joinTeacherClass = asyncHandler(async (request, response) => {
  const { code } = request.body ?? {};
  if (typeof code !== "string") {
    throw new HttpError(400, "A teacher class code is required.");
  }
  await connectStudentToTeacher(request.user, code);
  response.status(201).json({ message: "You have joined the teacher's class." });
});
