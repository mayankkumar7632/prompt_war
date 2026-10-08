# StoryLearn AI API

The API runs on port `5000` by default. Protected routes require `Authorization: Bearer <token>`. The backend loads environment variables from `server/.env` (not from the frontend). Copy `server/.env.example` to `server/.env`, then set a private `JWT_SECRET` (at least 32 characters), `MONGODB_URI`, and `GEMINI_API_KEY`. `GEMINI_MODEL` defaults to `gemini-3.1-flash-lite`. Never put Gemini credentials in the client.

Put the MongoDB connection string on the `MONGODB_URI=` line in `server/.env`. For a local MongoDB server, use:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/storylearn_ai
```

For MongoDB Atlas, paste the connection string copied from Atlas after `MONGODB_URI=`. Replace its `<username>`, `<password>`, and database placeholders with your own values; URL-encode special characters in the username or password. Do not put the connection string in `client/.env`, React source files, or any file under `client/`.

## Student API

Student accounts use the existing `User` collection with the `student` role and an associated `Child` profile. Student APIs derive ownership from the JWT and do not accept a learner ID to select whose records to access.

- `POST /api/auth/register` accepts `role: "student"` with `age`, `grade`, `interests`, `confirmPassword`, name, email, and password.
- Login requires the selected role in `{ "email": "...", "password": "...", "role": "student|parent|teacher" }`. The JWT carries the selected role, email, and user ID (`sub` and `userId`). A wrong role returns a clear 403 and never signs in as another role.
- One email can use multiple roles without removing the unique email index: register each added role with the same existing password. Roles share that account and password. Existing users without a `roles` array continue to use their existing `role`.
- `GET /api/student/profile` and `PUT /api/student/profile` return/update the authenticated student's profile. Email and account roles cannot be changed.
- `POST /api/student/parent-connection-code` creates a one-use code that expires after 24 hours. A parent submits it to `POST /api/parent/connect-student`; the server stores only a hash and adds the authenticated parent to that learner's relationship.
- `POST /api/teacher/connection-code` creates a class code that expires after 7 days. A student submits it to `POST /api/student/join-teacher`; teacher access is then limited to assigned student profiles.
- `GET /api/student/dashboard` returns actual student totals, progress by topic, recent stories, quiz results, and a recommended next action.
- `GET /api/student/progress` returns topic progress and recent answers.
- `GET /api/student/stories` lists only the authenticated student's stories.
- `POST /api/student/stories` accepts subject, topic, and optional learning objective/interest. Age, grade, and default interest are taken from the student's stored profile and sent to Gemini by the backend. Gemini generates 8–10 candidate questions; the API validates them, removes exact duplicates, groups conceptual duplicates in one batch AI call, then selects five varied learning points. It requests at most two supplemental batches if needed and returns an explicit error rather than saving an incomplete/duplicate set.
- `GET /api/student/stories/:storyId` returns the student's own story and safe question data for the latest quiz attempt; correct answer keys and internal question hashes are never sent to the browser.
- `POST /api/student/stories/:storyId/quiz-attempt` starts a fresh quiz set after the current set is answered. It prefers concepts and prompts not used in the most recent questions, creates new `Question` records for the attempt, and falls back to a previously used concept only when necessary to complete a distinct set.
- `POST /api/student/questions/:id/answer` accepts `{ "response": "..." }`, evaluates it using Gemini, stores answer, objective, score, and assessment, updates progress, and can return an adaptive explanation and another question.

Quiz candidates are filtered for valid question types, answer keys, option uniqueness, and correct-answer/option agreement. The existing `Question` model now stores an additive normalized prompt hash and attempt number; existing questions without these fields are treated as attempt one and their hash is computed when checked. Scoring still uses the existing saved-answer evaluation. Each retry creates new question records, so each attempt's answer evidence remains available to progress reports. A repeated learning concept is not added to the same set.

The legacy parent/teacher APIs remain under `/api/stories`, `/api/questions`, `/api/progress`, and `/api/dashboard`, and require parent or teacher JWT roles. New growth data is served by the parent and teacher routes below. Student roles are rejected from adult APIs.

## Parent and teacher growth APIs

- `GET /api/parent/children` lists only learners linked to the authenticated parent.
- `GET /api/parent/dashboard?studentId=<student-user-id>` returns the selected linked learner's real summary, topic mastery, misconceptions, recommendations, recent stories/answers, and weekly trend. The first linked learner is selected if `studentId` is omitted.
- `GET /api/parent/children/:studentId/progress` returns progress only when the learner is connected to that parent.
- `POST /api/parent/connect-student` accepts `{ "code": "..." }` from the student's one-time code.
- `GET /api/teacher/students` and `GET /api/teacher/dashboard` return data only for students assigned to that teacher.
- `GET /api/teacher/students/:studentId/progress` returns details only for an assigned student.
- `POST /api/teacher/connection-code` creates a seven-day class code. Students join with `POST /api/student/join-teacher` and `{ "code": "..." }`.

Dashboard accuracy and understanding use the student scoring formula: correctly evaluated answers divided by evaluated answers, rounded to a percentage. Unassessed free-text answers count as answered but are excluded from accuracy. Trend points use evaluated answers grouped by UTC week; no activity returns an empty trend rather than invented chart values.

No migration is required. The `roles` field is additive and falls back to the existing `role` on old users; existing email indexes and learner progress are preserved. New connections add references to existing `Child` records. Connection-code fields store hashes and expirations only.

## Endpoints

### `POST /api/auth/register`

Create a student, parent, or teacher account. Select the role with `role`; student registration also provides age and grade. An existing email can add another role by registering with its current password. A parent may optionally create a child profile at registration.

```json
{
  "name": "Alex Morgan",
  "email": "alex@example.com",
  "password": "at-least-8-characters",
  "role": "parent",
  "child": {
    "name": "Sam",
    "age": 8,
    "grade": "Grade 3",
    "interests": ["Space", "Animals"]
  }
}
```

Returns `201` with a user summary, optional child profile, and JWT. Passwords are hashed before storage.

### `POST /api/auth/login`

```json
{ "email": "alex@example.com", "password": "at-least-8-characters", "role": "parent" }
```

The selected role must already belong to the account. The response contains a user summary and role-specific JWT; a wrong role returns `403`.

### `POST /api/stories`

Requires a JWT. The caller must own the child profile or be a teacher explicitly assigned to it. This legacy endpoint accepts supplied story text and checkpoint questions; authenticated student story generation is available through `POST /api/student/stories` and uses Gemini on the backend.

```json
{
  "childId": "CHILD_ID",
  "title": "Milo and the Solar System",
  "subject": "Science",
  "topic": "Solar system",
  "interest": "Space",
  "learningObjective": "Explain why Earth can support liquid water.",
  "content": "Story text...",
  "questions": [
    {
      "prompt": "Why can Earth have liquid water?",
      "questionType": "multiple_choice",
      "options": ["It is the right distance from the Sun", "It is the largest planet"],
      "correctAnswer": "It is the right distance from the Sun",
      "acceptedAnswers": ["Earth is not too close or too far from the Sun"],
      "explanation": "Earth is in the Sun's habitable zone.",
      "simplerExplanation": "Earth gets just the right amount of warmth from the Sun.",
      "concept": "Earth's habitable zone",
      "misconceptionOnIncorrect": "A planet's size alone determines whether it has liquid water."
    },
    {
      "prompt": "Explain in your own words why Earth is a good home.",
      "questionType": "explain",
      "concept": "Earth's habitable zone"
    }
  ]
}
```

Supported question types are `multiple_choice`, `true_false`, `application`, and `explain`. Correctness is determined by exact, normalized matching against `correctAnswer` or explicitly authored `acceptedAnswers`; the engine does not guess whether a paraphrase is correct. If neither answer key is provided, the answer is saved as `needs_review` and assessment is left unscored. For incorrect answers, the engine uses `simplerExplanation`, then `explanation`, then a short reminder of the learning objective. A misconception is only reported when the question author supplied `misconceptionOnIncorrect`. This conservative engine does not use an LLM.

### `GET /api/stories/:id`

Requires a JWT and learner access. Returns the story and its questions in display order.

### `POST /api/questions/:id/answer`

Requires a JWT and access to the learner attached to the question's story.

```json
{ "childId": "CHILD_ID", "response": "It is the right distance from the Sun" }
```

Returns a saved answer, assessment decision, and refreshed understanding score, concept mastery, weak concepts, and misconceptions. Assessment decisions include correctness, understanding level, feedback, suspected misconception, next difficulty, whether to explain again, and whether to generate another question. Recent evaluated answers for the same concept inform these decisions. Re-submitting updates that learner's answer for the same question.

Assessment response shape:

```json
{
  "correct": true,
  "understandingLevel": "good",
  "misconception": null,
  "feedback": "Earth is in the Sun's habitable zone.",
  "nextAction": "continue",
  "nextDifficulty": "same",
  "shouldExplainAgain": false,
  "shouldGenerateAnotherQuestion": true
}
```

`understandingLevel` is `strong`, `good`, `developing`, `needs_support`, or `unassessed`. `correct` is `null` for answers without an authored answer key; these get `nextAction: "review_answer"` and do not contribute to scored progress until reviewed/evaluated. Other `nextAction` values are `practice` and `explain_again`. `nextDifficulty` is `simpler`, `same`, or `harder`.

### `GET /api/progress/:childId`

Requires a JWT and learner access. Returns the learner profile summary and progress grouped by subject/topic.

### `GET /api/dashboard/:childId`

Requires a JWT and learner access. Returns overall evaluated-answer score, completed stories, strengths, weak concepts, misconceptions, recommended practice, and recent stories.

## Errors

Errors are returned as JSON with an `error` field. Invalid request or model data returns `400`, missing/invalid authentication returns `401`, inaccessible learner data returns `403`, missing resources return `404`, duplicate records return `409`, and unexpected server failures return `500`.

## Health check

`GET /api/health` returns `{ "status": "ok" }`. It confirms the HTTP app is responding but does not report MongoDB readiness.
