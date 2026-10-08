import { createHash } from "node:crypto";
import HttpError from "../middleware/HttpError.js";

const VALID_TYPES = new Set(["multiple_choice", "true_false", "application", "explain"]);
const MAX_CANDIDATES = 30;
const MAX_RECENT_QUESTIONS = 10;

export function normalizeQuestionText(value) {
  return String(value)
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hashQuestion(value) {
  return createHash("sha256").update(normalizeQuestionText(value)).digest("hex");
}

function prepareQuestion(question) {
  if (
    !question ||
    typeof question.prompt !== "string" ||
    !question.prompt.trim() ||
    question.prompt.trim().length > 1000 ||
    typeof question.concept !== "string" ||
    !question.concept.trim() ||
    question.concept.trim().length > 120 ||
    !VALID_TYPES.has(question.questionType)
  ) {
    return null;
  }

    const normalizedPrompt = normalizeQuestionText(question.prompt);
    if (!normalizedPrompt) return null;

  const options = [];
  const optionKeys = new Set();
  for (const option of Array.isArray(question.options) ? question.options : []) {
    if (typeof option !== "string" || !option.trim() || option.trim().length > 300) continue;
    const key = normalizeQuestionText(option);
    if (!key || optionKeys.has(key)) continue;
    optionKeys.add(key);
    options.push(option.trim());
  }

  const correctAnswer = typeof question.correctAnswer === "string" && question.correctAnswer.trim()
    ? question.correctAnswer.trim()
    : undefined;
  const explanation = typeof question.explanation === "string" ? question.explanation.trim() : undefined;
  const simplerExplanation = typeof question.simplerExplanation === "string"
    ? question.simplerExplanation.trim()
    : undefined;
  const misconceptionOnIncorrect = typeof question.misconceptionOnIncorrect === "string"
    ? question.misconceptionOnIncorrect.trim()
    : undefined;
  if (
    (correctAnswer && correctAnswer.length > 500) ||
    (explanation && explanation.length > 1200) ||
    (simplerExplanation && simplerExplanation.length > 1200) ||
    (misconceptionOnIncorrect && misconceptionOnIncorrect.length > 300)
  ) {
    return null;
  }
  const acceptedAnswers = [];
  const acceptedKeys = new Set();
  for (const answer of Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers : []) {
    if (typeof answer !== "string" || !answer.trim() || answer.trim().length > 500) continue;
    const key = normalizeQuestionText(answer);
    if (!key || acceptedKeys.has(key)) continue;
    acceptedKeys.add(key);
    acceptedAnswers.push(answer.trim());
  }
  const hasAnswerKey = Boolean(correctAnswer || acceptedAnswers.length);

  if (question.questionType !== "explain" && !hasAnswerKey) return null;
  if (["multiple_choice", "application", "true_false"].includes(question.questionType) && options.length < 2) {
    return null;
  }
  if (["multiple_choice", "application", "true_false"].includes(question.questionType)) {
    const answerOptions = new Set(options.map(normalizeQuestionText));
    if (!correctAnswer || !answerOptions.has(normalizeQuestionText(correctAnswer))) return null;
  }
  if (
    question.questionType === "true_false" &&
    (options.length !== 2 || !optionKeys.has("true") || !optionKeys.has("false"))
  ) {
    return null;
  }

  const prompt = question.prompt.trim();
  return {
    ...question,
    prompt,
    questionHash: hashQuestion(prompt),
    options,
    correctAnswer,
    acceptedAnswers,
    concept: question.concept.trim(),
    explanation,
    simplerExplanation,
    misconceptionOnIncorrect,
    misconceptionCheck: Boolean(question.misconceptionCheck || question.misconceptionOnIncorrect),
    historical: Boolean(question.historical),
  };
}

function unionFind(size) {
  const parents = Array.from({ length: size }, (_value, index) => index);
  const find = (value) => {
    if (parents[value] !== value) parents[value] = find(parents[value]);
    return parents[value];
  };
  const union = (first, second) => {
    const firstRoot = find(first);
    const secondRoot = find(second);
    if (firstRoot !== secondRoot) parents[secondRoot] = firstRoot;
  };
  return { find, union };
}

function groupedQuestions(allQuestions, similarityGroups) {
  const { find, union } = unionFind(allQuestions.length);
  const seenIndexes = [];
  const conceptOwner = new Map();
  const questionConceptOwner = new Map();
  const hashOwner = new Map();

  for (const group of similarityGroups) {
    if (!Array.isArray(group?.indexes) || !group.indexes.length || typeof group.concept !== "string") {
      throw new HttpError(502, "The AI returned an invalid question-similarity result.");
    }
    for (const index of group.indexes) {
      if (!Number.isInteger(index) || index < 0 || index >= allQuestions.length) {
        throw new HttpError(502, "The AI returned an invalid question-similarity index.");
      }
      seenIndexes.push(index);
      union(group.indexes[0], index);
    }
    const canonicalConcept = normalizeQuestionText(group.concept);
    if (canonicalConcept) {
      const previous = conceptOwner.get(canonicalConcept);
      if (previous !== undefined) union(previous, group.indexes[0]);
      else conceptOwner.set(canonicalConcept, group.indexes[0]);
    }
  }

  if (
    seenIndexes.length !== allQuestions.length ||
    new Set(seenIndexes).size !== allQuestions.length
  ) {
    throw new HttpError(502, "The AI did not classify every quiz question exactly once.");
  }

  allQuestions.forEach((question, index) => {
    const concept = normalizeQuestionText(question.concept);
    const sameConcept = questionConceptOwner.get(concept);
    if (sameConcept !== undefined) union(index, sameConcept);
    else questionConceptOwner.set(concept, index);
    const samePrompt = hashOwner.get(question.questionHash);
    if (samePrompt !== undefined) union(index, samePrompt);
    else hashOwner.set(question.questionHash, index);
  });

  const clusters = new Map();
  allQuestions.forEach((question, index) => {
    const root = find(index);
    const cluster = clusters.get(root) ?? [];
    cluster.push(question);
    clusters.set(root, cluster);
  });
  return [...clusters.values()];
}

function questionValue(question) {
  return {
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
    questionHash: question.questionHash,
    historical: question.historical,
  };
}

export async function selectQuestionCandidates({
  candidates,
  previousQuestions = [],
  targetCount = 5,
  classifyQuestions,
  requireApplication = false,
  requireMisconception = false,
  allowHistoricalFallback = true,
  excludePreviouslyCoveredConcepts = false,
}) {
  if (typeof classifyQuestions !== "function") {
    throw new TypeError("A batched question similarity classifier is required.");
  }

  const history = previousQuestions.slice(0, MAX_RECENT_QUESTIONS)
    .map((question) => prepareQuestion({ ...question, historical: true }))
    .filter(Boolean);
  const historicalHashes = new Set(history.map((question) => question.questionHash));
  const current = [];
  const exactCandidateHashes = new Set();
  for (const question of candidates) {
    const prepared = prepareQuestion(question);
    if (
      !prepared ||
      historicalHashes.has(prepared.questionHash) ||
      exactCandidateHashes.has(prepared.questionHash)
    ) continue;
    exactCandidateHashes.add(prepared.questionHash);
    current.push(prepared);
  }
  if (!current.length && !history.length) return [];

  const allQuestions = [...history, ...current];
  const similarityGroups = await classifyQuestions(
    allQuestions.map(({ prompt, concept, questionType }) => ({ prompt, concept, questionType })),
  );
  const clusters = groupedQuestions(allQuestions, similarityGroups);
  const available = clusters.map((cluster) => {
    const fresh = cluster.filter((question) => !question.historical);
    const old = cluster.filter((question) => question.historical);
    return {
      questions: excludePreviouslyCoveredConcepts && old.length
        ? []
        : fresh.length
          ? fresh
          : allowHistoricalFallback
            ? old
            : [],
      hasHistory: old.length > 0,
    };
  }).filter((cluster) => cluster.questions.length);

  const selected = [];
  const selectedTypes = new Set();
  let hasApplication = false;
  let hasMisconception = false;
  while (selected.length < targetCount && available.length) {
    let bestClusterIndex = 0;
    let bestQuestionIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;
    available.forEach((cluster, clusterIndex) => {
      cluster.questions.forEach((question, questionIndex) => {
        const score =
          (cluster.hasHistory ? 0 : 80) +
          (!hasApplication && question.questionType === "application" ? 200 : 0) +
          (!hasMisconception && question.misconceptionCheck ? 180 : 0) +
          (!selectedTypes.has(question.questionType) ? 20 : 0) -
          clusterIndex / 1000 -
          questionIndex / 10000;
        if (score > bestScore) {
          bestScore = score;
          bestClusterIndex = clusterIndex;
          bestQuestionIndex = questionIndex;
        }
      });
    });

    const [cluster] = available.splice(bestClusterIndex, 1);
    const [chosen] = cluster.questions.splice(bestQuestionIndex, 1);
    selected.push(questionValue(chosen));
    selectedTypes.add(chosen.questionType);
    hasApplication ||= chosen.questionType === "application";
    hasMisconception ||= chosen.misconceptionCheck;
  }

  if (
    selected.length !== targetCount ||
    (requireApplication && !hasApplication) ||
    (requireMisconception && !hasMisconception)
  ) {
    return selected;
  }

  const hashes = new Set(selected.map((question) => question.questionHash));
  const concepts = new Set(selected.map((question) => normalizeQuestionText(question.concept)));
  if (hashes.size !== selected.length || concepts.size !== selected.length) {
    throw new HttpError(502, "The final quiz still contains duplicate learning points.");
  }
  return selected;
}

export async function generateQuestionSet({
  initialQuestions = [],
  previousQuestions = [],
  targetCount = 5,
  context,
  generateCandidates,
  classifyQuestions,
  requireApplication = true,
  requireMisconception = true,
  maxRetries = 2,
}) {
  if (typeof generateCandidates !== "function") {
    throw new TypeError("A candidate question generator is required.");
  }

  const candidates = initialQuestions.slice(0, MAX_CANDIDATES);
  if (candidates.length === 0) {
    candidates.push(...await generateCandidates({
      count: Math.max(8, targetCount * 2),
      context,
      avoidQuestions: previousQuestions,
      concepts: previousQuestions.map((question) => question.concept),
    }));
  }

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const selected = await selectQuestionCandidates({
      candidates,
      previousQuestions,
      targetCount,
      classifyQuestions,
      requireApplication,
      requireMisconception,
    });
    if (
      selected.length === targetCount &&
      (!requireApplication || selected.some((question) => question.questionType === "application")) &&
      (!requireMisconception || selected.some((question) => question.misconceptionCheck))
    ) {
      return selected.map(({ historical: _historical, ...question }) => question);
    }
    if (attempt < maxRetries) {
      if (candidates.length >= MAX_CANDIDATES) break;
      const missing = Math.max(1, targetCount - selected.length);
      const additional = await generateCandidates({
        count: Math.min(10, Math.max(4, missing + 3)),
        context,
        avoidQuestions: [...previousQuestions, ...candidates],
        concepts: [...previousQuestions, ...candidates].map((question) => question.concept).filter(Boolean),
      });
      candidates.push(...additional.slice(0, MAX_CANDIDATES - candidates.length));
    }
  }

  throw new HttpError(
    502,
    `The AI could not generate enough distinct, valid quiz questions after ${maxRetries} supplemental attempts. Please try again.`,
  );
}
