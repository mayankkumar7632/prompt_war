import assert from "node:assert/strict";
import test from "node:test";
import { assessUnderstanding, evaluateResponse } from "../../src/services/assessmentService.js";

const learningObjective = "Explain how water vapor cools to form cloud droplets.";
const question = {
  questionType: "explain",
  concept: "Condensation",
  correctAnswer: "Water vapor cools and changes into tiny liquid droplets.",
  acceptedAnswers: ["Cooling vapor forms tiny water droplets."],
  explanation: "Cooling changes water vapor into liquid droplets.",
  simplerExplanation: "When vapor cools, it turns into tiny drops of liquid water.",
  misconceptionOnIncorrect: "Clouds form because water vapor gets warmer.",
};

test("accepts an authored alternate answer and recommends moving on", () => {
  const result = assessUnderstanding({
    learningObjective,
    question,
    childAnswer: "Cooling vapor forms tiny water droplets.",
  });

  assert.equal(result.correct, true);
  assert.equal(result.understandingLevel, "good");
  assert.equal(result.misconception, null);
  assert.equal(result.nextAction, "continue");
  assert.equal(result.nextDifficulty, "same");
  assert.equal(result.shouldExplainAgain, false);
  assert.equal(result.shouldGenerateAnotherQuestion, true);
});

test("returns a simpler explanation and flags a configured misconception on an incorrect answer", () => {
  const result = assessUnderstanding({
    learningObjective,
    question,
    childAnswer: "Water vapor gets warmer to make clouds.",
  });

  assert.equal(result.correct, false);
  assert.equal(result.understandingLevel, "developing");
  assert.equal(result.misconception, question.misconceptionOnIncorrect);
  assert.equal(result.feedback, question.simplerExplanation);
  assert.equal(result.nextAction, "explain_again");
  assert.equal(result.shouldExplainAgain, true);
  assert.equal(result.shouldGenerateAnotherQuestion, true);
});

test("moves to simpler difficulty after repeated incorrect performance", () => {
  const result = assessUnderstanding({
    learningObjective,
    question,
    childAnswer: "Not sure",
    previousPerformance: [
      { isCorrect: false },
      { isCorrect: false },
      { isCorrect: true },
    ],
  });

  assert.equal(result.understandingLevel, "needs_support");
  assert.equal(result.nextDifficulty, "simpler");
  assert.equal(result.nextAction, "explain_again");
});

test("raises difficulty after sustained correct performance", () => {
  const result = assessUnderstanding({
    learningObjective,
    question,
    childAnswer: question.correctAnswer,
    previousPerformance: [
      { isCorrect: true },
      { isCorrect: true },
      { isCorrect: true },
    ],
  });

  assert.equal(result.understandingLevel, "strong");
  assert.equal(result.nextDifficulty, "harder");
});

test("leaves free-text responses for review when no answer key is authored", () => {
  const result = evaluateResponse(
    { questionType: "explain", concept: "Condensation" },
    "Clouds have tiny water droplets.",
    { learningObjective },
  );

  assert.equal(result.correct, null);
  assert.equal(result.isCorrect, null);
  assert.equal(result.evaluationStatus, "needs_review");
  assert.equal(result.understandingLevel, "unassessed");
  assert.equal(result.nextAction, "review_answer");
  assert.equal(result.shouldGenerateAnotherQuestion, false);
});

test("rejects missing assessment inputs explicitly", () => {
  assert.throws(
    () => assessUnderstanding({ question, childAnswer: "answer" }),
    /learningObjective, question, and a non-empty childAnswer are required/,
  );
});
