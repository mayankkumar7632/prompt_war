import assert from "node:assert/strict";
import test from "node:test";
import {
  generateQuestionSet,
  hashQuestion,
  normalizeQuestionText,
  selectQuestionCandidates,
} from "../../src/services/questionSetService.js";

function question(concept, overrides = {}) {
  return {
    prompt: `How does ${concept} work?`,
    questionType: "multiple_choice",
    options: ["It happens this way", "It happens another way", "It does not happen"],
    correctAnswer: "It happens this way",
    acceptedAnswers: [],
    concept,
    ...overrides,
  };
}

function classifyByConcept(questions) {
  const groups = new Map();
  questions.forEach((item, index) => {
    const concept = item.concept.toLowerCase();
    const alias = concept.includes("water vapor") || concept.includes("evaporat")
      ? "evaporation"
      : concept;
    const indexes = groups.get(alias) ?? [];
    indexes.push(index);
    groups.set(alias, indexes);
  });
  return [...groups].map(([concept, indexes]) => ({ concept, indexes }));
}

test("normalizes punctuation, spacing, case, and unicode before hashing", () => {
  assert.equal(normalizeQuestionText("  What happens when water evaporates?!  "), "what happens when water evaporates");
  assert.equal(
    hashQuestion("What happens when water evaporates?"),
    hashQuestion("  WHAT happens, when water evaporates! "),
  );
});

test("removes duplicate answer options and discards invalid answer keys", async () => {
  const selected = await selectQuestionCandidates({
    targetCount: 1,
    candidates: [
      question("plant roots", {
        options: ["Water", " water ", "Sunlight"],
        correctAnswer: "Water",
      }),
      question("leaf color", { correctAnswer: "purple" }),
    ],
    classifyQuestions: classifyByConcept,
  });

  assert.equal(selected.length, 1);
  assert.deepEqual(selected[0].options, ["Water", "Sunlight"]);
  assert.equal(selected[0].questionHash.length, 64);
});

test("groups semantically similar prompts even when their wording and tags differ", async () => {
  const selected = await selectQuestionCandidates({
    targetCount: 2,
    candidates: [
      question("Evaporation", { prompt: "What happens when water evaporates?" }),
      question("Water vapor", { prompt: "What occurs when water changes into water vapor?" }),
      question("Condensation", { prompt: "What happens when cool vapor forms liquid drops?" }),
    ],
    classifyQuestions: classifyByConcept,
  });

  assert.equal(selected.length, 2);
  assert.equal(new Set(selected.map((item) => item.concept.toLowerCase())).size, 2);
  assert.equal(selected.some((item) => item.prompt.includes("evaporates")), true);
  assert.equal(selected.some((item) => item.prompt.includes("water vapor")), false);
});

test("prefers uncovered concepts on a retry and uses a prior concept only when needed", async () => {
  const selected = await selectQuestionCandidates({
    targetCount: 2,
    previousQuestions: [question("evaporation")],
    candidates: [
      question("evaporation", { prompt: "How does evaporation happen in a puddle?" }),
      question("condensation"),
    ],
    classifyQuestions: classifyByConcept,
  });

  assert.equal(selected.length, 2);
  assert.deepEqual(new Set(selected.map((item) => item.concept.toLowerCase())), new Set(["evaporation", "condensation"]));
  assert.equal(selected[0].prompt, "How does condensation work?");
});

test("does not reuse an exact prior prompt while a fresh concept is available", async () => {
  const previous = question("evaporation");
  const selected = await selectQuestionCandidates({
    targetCount: 1,
    previousQuestions: [previous],
    candidates: [
      question("evaporation"),
      question("condensation"),
    ],
    classifyQuestions: classifyByConcept,
  });

  assert.equal(selected.length, 1);
  assert.equal(selected[0].concept, "condensation");
});

test("generates up to two supplemental batches when filtering leaves too few questions", async () => {
  let supplementalCalls = 0;
  const selected = await generateQuestionSet({
    initialQuestions: [
      question("evaporation"),
      question("Evaporation", { prompt: "What occurs when water evaporates?" }),
    ],
    targetCount: 2,
    requireApplication: false,
    requireMisconception: false,
    classifyQuestions: classifyByConcept,
    generateCandidates: async () => {
      supplementalCalls += 1;
      return [question("condensation"), question("precipitation")];
    },
  });

  assert.equal(supplementalCalls, 1);
  assert.equal(selected.length, 2);
  assert.equal(new Set(selected.map((item) => item.concept.toLowerCase())).size, 2);
});

test("fails explicitly after the bounded retry count instead of returning a duplicate set", async () => {
  let supplementalCalls = 0;
  await assert.rejects(
    generateQuestionSet({
      initialQuestions: [question("evaporation"), question("evaporation", { prompt: "How does water evaporate?" })],
      targetCount: 2,
      requireApplication: false,
      requireMisconception: false,
      classifyQuestions: classifyByConcept,
      generateCandidates: async () => {
        supplementalCalls += 1;
        return [question("evaporation", { prompt: `Another evaporation wording ${supplementalCalls}` })];
      },
    }),
    /could not generate enough distinct/,
  );
  assert.equal(supplementalCalls, 2);
});

test("selects five distinct learning points across ten topic-specific quiz batches", async () => {
  const topics = [
    "water cycle",
    "plants",
    "solar system",
    "fractions",
    "multiplication",
    "habitats",
    "gravity",
    "states of matter",
    "food chains",
    "area",
  ];

  for (const topic of topics) {
    const candidates = [
      question(`${topic} point one`),
      question(`${topic} point one`, { prompt: `Explain the first idea in ${topic}.` }),
      question(`${topic} point two`, { questionType: "true_false", options: ["True", "False"], correctAnswer: "True" }),
      question(`${topic} point three`, {
        questionType: "application",
        concept: `${topic} point three`,
        misconceptionCheck: true,
      }),
      question(`${topic} point four`),
      question(`${topic} point five`),
    ];
    const selected = await selectQuestionCandidates({
      candidates,
      targetCount: 5,
      requireApplication: true,
      requireMisconception: true,
      classifyQuestions: classifyByConcept,
    });

    assert.equal(selected.length, 5, `${topic}: expected five valid questions`);
    assert.equal(new Set(selected.map((item) => item.questionHash)).size, 5, `${topic}: duplicate prompt`);
    assert.equal(new Set(selected.map((item) => item.concept.toLowerCase())).size, 5, `${topic}: duplicate concept`);
    assert.ok(selected.some((item) => item.questionType === "application"), `${topic}: missing application`);
    assert.ok(selected.some((item) => item.misconceptionCheck), `${topic}: missing misconception check`);
  }
});
