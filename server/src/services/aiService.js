import { env } from "../config/env.js";
import HttpError from "../middleware/HttpError.js";

const GEMINI_API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";

async function generateJson(prompt, { maxOutputTokens = 6000, temperature = 0.55 } = {}) {
  if (!env.geminiApiKey) {
    throw new HttpError(503, "AI story services are not configured. Add GEMINI_API_KEY to server/.env.");
  }

  let response;
  try {
    response = await fetch(
      `${GEMINI_API_ROOT}/${encodeURIComponent(env.geminiModel)}:generateContent?key=${encodeURIComponent(env.geminiApiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature,
            maxOutputTokens,
          },
        }),
      },
    );
  } catch {
    throw new HttpError(502, "The AI story service could not be reached. Please try again.");
  }

  if (!response.ok) {
    const status = response.status;
    if (status === 429 || status === 503) {
      throw new HttpError(503, "The AI story service is busy. Please try again shortly.");
    }
    console.error(`Gemini API returned HTTP ${status}.`);
    throw new HttpError(502, "The AI story service could not complete this request.");
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new HttpError(502, "The AI story service returned an invalid response.");
  }
  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!text) {
    throw new HttpError(502, "The AI story service returned an empty response.");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(502, "The AI story service returned an invalid JSON response.");
  }
}

export async function generateStory({ age, grade, subject, topic, interest, learningObjective }) {
  const result = await generateJson(`
You create accurate, age-appropriate educational stories for children. Return a single JSON object, no markdown.
Learner: age ${age}, grade ${grade}.
Subject: ${subject}. Topic: ${topic}. Story interest: ${interest}.
${learningObjective ? `Requested objective: ${learningObjective}.` : ""}
Teach the requested topic only. Do not invent facts. Use vocabulary appropriate for this learner.
Age guidance: ages 6-8 need very short, simple questions; ages 9-12 can handle simple reasoning and familiar applications; ages 13+ can handle deeper reasoning and analysis without unnecessary difficulty.
Return exactly this shape:
{
  "title": "short engaging title",
  "learningObjectives": ["specific measurable objective"],
  "chapters": [{"title":"chapter title","text":"story text"}],
  "questions": [{
    "prompt":"question that checks understanding",
    "questionType":"multiple_choice|true_false|application|explain",
    "options":["..."],
    "correctAnswer":"answer or empty string for explain",
    "acceptedAnswers":["other clearly correct short answers"],
    "explanation":"brief friendly explanation",
    "simplerExplanation":"simpler explanation for an incorrect answer",
    "concept":"specific concept",
    "misconceptionOnIncorrect":"specific plausible misconception the wrong answer may indicate",
    "misconceptionCheck":true
  }]
}
Provide 3 to 5 short chapters and 8 to 10 candidate checkpoint questions so the application can select a varied set of 5. Questions must test different learning points and thinking skills, not merely reword one another. Include at least one application question and at least one misconception-checking question. Include an explain question when appropriate. Multiple choice and application questions need 3 plausible options. True/false options must be ["True","False"] and correctAnswer must be one of them. Each objective and answer must match reliable facts about the requested topic. Keep strings plain text.
`, { maxOutputTokens: 10000 });

  if (
    !result ||
    typeof result.title !== "string" ||
    !Array.isArray(result.learningObjectives) ||
    result.learningObjectives.length === 0 ||
    !Array.isArray(result.chapters) ||
    result.chapters.length === 0 ||
    !Array.isArray(result.questions)
  ) {
    throw new HttpError(502, "The AI story service did not return a complete story.");
  }

  return result;
}

export async function generateLearningQuestions({
  age,
  grade,
  subject,
  topic,
  learningObjective,
  concepts = [],
  avoidQuestions = [],
  storyContent = "",
  count = 3,
}) {
  const safeCount = Math.max(1, Math.min(10, Math.floor(count)));
  const ageGuidance = age <= 8
    ? "Use very short questions and simple, familiar words."
    : age <= 12
      ? "Use clear language with simple reasoning and familiar applications."
      : "Use age-appropriate reasoning, analysis, and application without unnecessary difficulty.";
  const result = await generateJson(`
Write ${safeCount} new, accurate candidate questions for a ${age}-year-old learner in ${grade}.
Subject: ${subject}. Topic: ${topic}. Learning objective: ${learningObjective}.
Age guidance: ${ageGuidance}
Story context: ${storyContent.slice(0, 10000)}
Learning points already covered or to avoid when possible: ${concepts.join(", ") || "none"}.
Previously used question prompts to avoid: ${avoidQuestions.slice(0, 30).map((item) => item.prompt).join("\n") || "none"}.
Return only JSON: {"questions":[{"prompt":"...","questionType":"multiple_choice|true_false|application|explain","options":["..."],"correctAnswer":"...","acceptedAnswers":["..."],"explanation":"...","simplerExplanation":"...","concept":"...","misconceptionOnIncorrect":"...","misconceptionCheck":true}]}.
Cover different concepts and thinking skills. Do not repeat or paraphrase a previously used question or concept unless fresh concepts cannot reasonably cover the topic. Include application questions when useful. Questions must have unambiguous answer keys; explain questions may be unscored when no answer key is appropriate.
For batches of four or more, include at least one application question and at least one misconception-checking question, and set misconceptionCheck to true for the latter.
`);
  if (!Array.isArray(result?.questions) || result.questions.length === 0) {
    throw new HttpError(502, "The AI service did not return usable questions.");
  }
  return result.questions;
}

export async function classifyQuestionSimilarity(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new TypeError("At least one question is required for similarity classification.");
  }
  const result = await generateJson(`
Group the numbered educational questions by whether they test the same specific learning point. Treat paraphrases and different wording as duplicates. Questions that test different concepts, stages, or applications must remain separate, even if they share a broad topic. Return every input index exactly once; singleton groups are required too.
Questions:
${questions.map((question, index) => `${index + 1}. [concept: ${question.concept}; type: ${question.questionType}] ${question.prompt}`).join("\n")}
Return strict JSON only in this shape: {"groups":[{"concept":"short canonical learning-point label","questionIndexes":[1,3]},{"concept":"another learning point","questionIndexes":[2]}]}.
Use one-based question indexes. Do not omit, repeat, or invent an index.
`, { maxOutputTokens: 3000, temperature: 0.1 });

  if (!Array.isArray(result?.groups)) {
    throw new HttpError(502, "The AI could not group similar quiz questions.");
  }

  const indexes = [];
  const groups = [];
  for (const group of result.groups) {
    if (
      !Array.isArray(group?.questionIndexes) ||
      typeof group.concept !== "string" ||
      !group.concept.trim()
    ) {
      throw new HttpError(502, "The AI returned an invalid question-similarity result.");
    }
    const zeroBased = [];
    for (const index of group.questionIndexes) {
      if (!Number.isInteger(index) || index < 1 || index > questions.length) {
        throw new HttpError(502, "The AI returned an invalid question-similarity index.");
      }
      indexes.push(index);
      zeroBased.push(index - 1);
    }
    if (zeroBased.length === 0) {
      throw new HttpError(502, "The AI returned an empty question-similarity group.");
    }
    groups.push({ concept: group.concept.trim().slice(0, 120), indexes: zeroBased });
  }
  const sortedIndexes = [...indexes].sort((first, second) => first - second);
  if (
    indexes.length !== questions.length ||
    new Set(indexes).size !== questions.length ||
    sortedIndexes.some((index, offset) => index !== offset + 1)
  ) {
    throw new HttpError(502, "The AI did not classify every quiz question exactly once.");
  }
  return groups;
}

export async function evaluateStudentAnswer({ age, learningObjective, question, correctAnswer, childAnswer, previousPerformance }) {
  const result = await generateJson(`
Evaluate a child's response conservatively. Do not assume correctness unless it matches the factual answer or is a clearly equivalent explanation. Do not penalize spelling or age-appropriate wording. Use the learning objective and prior performance.
Age: ${age}. Learning objective: ${learningObjective}.
Question: ${question.prompt}. Type: ${question.questionType}.
Expected answer: ${correctAnswer || "Use the concept and question to evaluate the explanation."}
Child response: ${childAnswer}.
Recent same-concept performance: ${JSON.stringify(previousPerformance)}.
Return JSON only: {"correct":true,"understandingLevel":"strong|good|developing|needs_support","misconception":null,"feedback":"friendly concise feedback","nextDifficulty":"simpler|same|harder","shouldExplainAgain":false,"shouldGenerateAnotherQuestion":true}.
If incorrect, explain the idea simply and identify a misconception only when the response gives evidence for one. Strong requires repeated success. Set shouldGenerateAnotherQuestion to true only when another question will help reinforce or deepen this concept; otherwise false. Do not reveal the answer key unnecessarily.
`);
  if (
    typeof result?.correct !== "boolean" ||
    !["strong", "good", "developing", "needs_support"].includes(result.understandingLevel) ||
    typeof result.feedback !== "string"
  ) {
    throw new HttpError(502, "The AI service could not evaluate this answer.");
  }
  return {
    correct: result.correct,
    understandingLevel: result.understandingLevel,
    misconception: typeof result.misconception === "string" && result.misconception.trim()
      ? result.misconception.trim().slice(0, 500)
      : null,
    feedback: result.feedback.trim().slice(0, 1200),
    nextDifficulty: ["simpler", "same", "harder"].includes(result.nextDifficulty)
      ? result.nextDifficulty
      : "same",
    shouldExplainAgain: Boolean(result.shouldExplainAgain),
    shouldGenerateAnotherQuestion: Boolean(result.shouldGenerateAnotherQuestion),
    evaluationStatus: "evaluated",
  };
}

export async function generateAdaptiveExplanation({ age, learningObjective, concept, misconception }) {
  const result = await generateJson(`
Explain this learning idea simply to a child aged ${age}.
Learning objective: ${learningObjective}. Concept: ${concept}.
${misconception ? `Gently correct this misconception: ${misconception}.` : ""}
Return JSON only: {"explanation":"a short, accurate explanation in 2 to 4 sentences","example":"one age-appropriate example"}.
Do not add unrelated facts.
`);
  if (typeof result?.explanation !== "string" || typeof result?.example !== "string") {
    throw new HttpError(502, "The AI service could not create a simpler explanation.");
  }
  return {
    explanation: result.explanation.trim().slice(0, 1200),
    example: result.example.trim().slice(0, 800),
  };
}
