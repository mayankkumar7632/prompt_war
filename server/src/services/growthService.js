import Answer from "../models/Answer.js";
import LearningProgress from "../models/LearningProgress.js";
import Story from "../models/Story.js";

function weekStart(date) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return start;
}

function buildTrend(answers) {
  const weeks = new Map();
  for (const answer of answers) {
    if (answer.evaluationStatus !== "evaluated" || typeof answer.isCorrect !== "boolean") continue;
    const start = weekStart(answer.answeredAt);
    const key = start.toISOString();
    const bucket = weeks.get(key) ?? { week: key, correct: 0, evaluated: 0 };
    bucket.evaluated += 1;
    if (answer.isCorrect) bucket.correct += 1;
    weeks.set(key, bucket);
  }
  return [...weeks.values()]
    .sort((left, right) => left.week.localeCompare(right.week))
    .slice(-8)
    .map((bucket) => ({
      ...bucket,
      score: Math.round((bucket.correct / bucket.evaluated) * 100),
    }));
}

export async function getChildGrowth(child, { includeDetails = true } = {}) {
  const [progress, stories, answers, storiesCompleted] = await Promise.all([
    LearningProgress.find({ child: child._id }).sort({ lastStudiedAt: -1 }).lean(),
    Story.find({ child: child._id }).sort({ createdAt: -1 }).limit(8).lean(),
    Answer.find({ child: child._id })
      .sort({ answeredAt: -1 })
      .populate({ path: "story", select: "title subject topic" })
      .populate({ path: "question", select: "prompt concept" })
      .lean(),
    Story.countDocuments({ child: child._id, status: "completed" }),
  ]);

  const evaluatedAnswers = answers.filter(
    (answer) => answer.evaluationStatus === "evaluated" && typeof answer.isCorrect === "boolean",
  );
  const correctAnswers = evaluatedAnswers.filter((answer) => answer.isCorrect).length;
  const understandingScore = evaluatedAnswers.length
    ? Math.round((correctAnswers / evaluatedAnswers.length) * 100)
    : null;
  const topics = progress.map((item) => ({
    subject: item.subject,
    topic: item.topic,
    score: item.evaluatedQuestions > 0 ? item.understandingScore : null,
    evaluatedQuestions: item.evaluatedQuestions,
    stories: item.storyCount,
    strongConcepts: (item.conceptMastery ?? [])
      .filter((concept) => concept.score >= 80)
      .map((concept) => ({ name: concept.concept, score: concept.score })),
    weakConcepts: item.weakConcepts ?? [],
  }));
  const misconceptions = [...new Set(progress.flatMap((item) => item.misconceptions ?? []))];
  const recommendations = [...new Set(progress.flatMap((item) => item.recommendedPractice ?? []))];
  const activity = answers.slice(0, 10).map((answer) => ({
    id: answer._id,
    storyTitle: answer.story?.title ?? "Learning checkpoint",
    subject: answer.story?.subject ?? "",
    topic: answer.story?.topic ?? "",
    question: answer.question?.prompt ?? "",
    concept: answer.question?.concept ?? "",
    correct: answer.evaluationStatus === "evaluated" ? answer.isCorrect : null,
    score: answer.score,
    understandingLevel: answer.understandingLevel,
    misconception: answer.misconception ?? null,
    answeredAt: answer.answeredAt,
  }));

  return {
    summary: {
      storiesStarted: await Story.countDocuments({ child: child._id }),
      storiesCompleted,
      questionsAnswered: answers.length,
      evaluatedQuestions: evaluatedAnswers.length,
      correctAnswers,
      incorrectAnswers: evaluatedAnswers.length - correctAnswers,
      understandingScore,
      accuracy: understandingScore,
      lastActivityAt: answers[0]?.answeredAt ?? stories[0]?.createdAt ?? null,
    },
    topics,
    strongTopics: topics.filter((topic) => topic.strongConcepts.length > 0),
    weakTopics: topics.filter((topic) => topic.score !== null && topic.score < 70),
    misconceptions,
    recommendations,
    trend: buildTrend(answers),
    ...(includeDetails
      ? {
          recentStories: stories,
          recentActivity: activity,
        }
      : { recentActivity: activity.slice(0, 5) }),
  };
}

export function summarizeTeacherGrowth(studentRecords) {
  const evaluatedQuestions = studentRecords.reduce(
    (total, item) => total + item.summary.evaluatedQuestions,
    0,
  );
  const correctAnswers = studentRecords.reduce(
    (total, item) => total + item.summary.correctAnswers,
    0,
  );
  const trend = new Map();
  for (const record of studentRecords) {
    for (const week of record.trend) {
      const bucket = trend.get(week.week) ?? { week: week.week, correct: 0, evaluated: 0 };
      bucket.correct += week.correct;
      bucket.evaluated += week.evaluated;
      trend.set(week.week, bucket);
    }
  }

  const topicTotals = new Map();
  const misconceptionCounts = new Map();
  const activity = [];
  for (const record of studentRecords) {
    for (const topic of record.topics) {
      if (topic.score === null || topic.evaluatedQuestions < 1) continue;
      const key = `${topic.subject}\u0000${topic.topic}`;
      const total = topicTotals.get(key) ?? {
        subject: topic.subject,
        topic: topic.topic,
        weightedScore: 0,
        evaluatedQuestions: 0,
      };
      total.weightedScore += topic.score * topic.evaluatedQuestions;
      total.evaluatedQuestions += topic.evaluatedQuestions;
      topicTotals.set(key, total);
    }
    for (const misconception of record.misconceptions) {
      misconceptionCounts.set(misconception, (misconceptionCounts.get(misconception) ?? 0) + 1);
    }
    activity.push(...record.recentActivity.map((item) => ({
      ...item,
      student: record.student.name,
      studentId: record.student.studentId,
    })));
  }

  const recommendations = [...new Set(studentRecords.flatMap((item) => item.recommendations))];
  return {
    summary: {
      totalStudents: studentRecords.length,
      averageUnderstanding: evaluatedQuestions
        ? Math.round((correctAnswers / evaluatedQuestions) * 100)
        : null,
      studentsNeedingSupport: studentRecords.filter(
        (item) => item.summary.understandingScore !== null && item.summary.understandingScore < 60,
      ).length,
      storiesCompleted: studentRecords.reduce((total, item) => total + item.summary.storiesCompleted, 0),
      questionsAnswered: studentRecords.reduce((total, item) => total + item.summary.questionsAnswered, 0),
      correctAnswers,
      incorrectAnswers: evaluatedQuestions - correctAnswers,
      evaluatedQuestions,
    },
    students: studentRecords.map(({ student, summary, topics, trend }) => ({
      ...student,
      understandingScore: summary.understandingScore,
      questionsAnswered: summary.questionsAnswered,
      storiesCompleted: summary.storiesCompleted,
      topics,
      trend,
    })),
    topicPerformance: [...topicTotals.values()]
      .map((item) => ({
        subject: item.subject,
        topic: item.topic,
        score: Math.round(item.weightedScore / item.evaluatedQuestions),
        evaluatedQuestions: item.evaluatedQuestions,
      }))
      .sort((left, right) => left.score - right.score),
    commonMisconceptions: [...misconceptionCounts.entries()]
      .map(([misconception, students]) => ({ misconception, students }))
      .sort((left, right) => right.students - left.students),
    recentActivity: activity
      .sort((left, right) => new Date(right.answeredAt) - new Date(left.answeredAt))
      .slice(0, 12),
    recommendations,
    trend: [...trend.values()]
      .sort((left, right) => left.week.localeCompare(right.week))
      .slice(-8)
      .map((item) => ({
        ...item,
        score: Math.round((item.correct / item.evaluated) * 100),
      })),
  };
}
