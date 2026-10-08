# StoryLearn AI

StoryLearn AI helps children learn school concepts through age-appropriate stories, interactive questions, and progress reports.

## Project architecture

The frontend is a runnable React application in `client/`; student, parent, and teacher sign-in, role-specific dashboards, learner links, stories, quiz answers, and progress connect to the Express/Mongoose API in `server/`.

```text
storylearn-ai/
├── README.md
├── client/
│   ├── package.json
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── components/
│       │   ├── common/
│       │   └── layout/
│       ├── features/
│       │   ├── auth/
│       │   ├── checkpoint/
│       │   ├── home/
│       │   ├── learner/
│       │   ├── report/
│       │   └── story/
│       └── styles.css
├── server/
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       └── services/
├── shared/
│   ├── constants/
│   └── schemas/
└── docs/
```

## What each folder is for

### Root

- `README.md` — this guide: it describes the architecture and the purpose of each area.
- `client/` — the React application children, parents, and teachers use in a browser.
- `server/` — the Node.js and Express API. It handles authentication, MongoDB persistence, checkpoint evaluation, and reports.
- `shared/` — definitions used by both the browser and API, so they agree on things such as question types and request shapes.
- `docs/` — design notes and API documentation for developers.

### `client/`

- `package.json` — frontend dependencies and Vite development/build commands.
- `index.html` — the browser page into which React loads.
- `src/main.jsx` — starts React and the browser router.
- `src/App.jsx` — maps the ten screen URLs to their page components.
- `src/styles.css` — shared visual theme, layout, and responsive styles.
- `src/components/` — reusable interface pieces.
- `src/components/common/` — small shared controls such as buttons, fields, and loading indicators.
- `src/components/layout/` — shared navigation, page frame, and learner profile shortcut.
- `src/features/` — screens grouped by purpose:
  - `home/` — learner welcome page, learning stats, and recent stories.
  - `auth/` — sign-in and registration screens.
  - `learner/` — child profile and learning setup (name, age, class, subject, topic, and interests).
  - `story/` — story setup and the interactive reading page.
  - `checkpoint/` — interactive quiz questions.
  - `report/` — results, parent report, and teacher classroom dashboard.

### `server/`

- `package.json` — Express, Mongoose, JWT, password hashing dependencies, and server commands.
- `.env.example` — names of required environment settings with a replaceable local-only secret placeholder.
- `src/server.js` — connects to MongoDB and starts the HTTP server.
- `src/app.js` — configures Express, CORS, security headers, JSON parsing, and API routes.
- `src/config/` — validated environment settings and the MongoDB connection.
- `src/models/` — Mongoose models for users, children, stories, questions, answers, and learning progress.
- `src/routes/` — URL-to-controller mappings for authentication, stories, answers, progress, and dashboards.
- `src/controllers/` — validate requests, enforce access, call services, and format API responses.
- `src/services/` — reusable account, learning-assessment, and Gemini AI integration logic.
- `src/middleware/` — JWT authentication, learner access checks, async route handling, and centralized errors.
- `tests/` — reserved for backend automated tests.

### `shared/` and `docs/`

- `shared/constants/` — shared fixed values, such as supported question and interest categories.
- `shared/schemas/` — shared request/response shapes and validation rules, where compatible with both apps.
- `docs/` — developer-facing design decisions, endpoint descriptions, and operating notes.

## API notes

The API endpoint shapes and local setup are described in [`docs/api.md`](./docs/api.md). Student stories, questions, answer assessment, misconception detection, and adaptive explanations use Gemini through the backend. Parent and teacher dashboards read stored learning records and are restricted to verified linked learners. Students join a teacher's class with a short-lived class code.

## Intended learning flow

1. A child and an adult provide the learner's age, class, subject, topic, and story interest.
2. The API validates the request and asks the LLM service for a story tied to a specific learning objective.
3. The story includes typed checkpoints: multiple choice, true/false, application, and explain-in-your-own-words.
4. The API evaluates answers, records learning evidence, and calculates understanding and concept mastery.
5. When understanding is low, the AI service can provide a simpler explanation and another example.
6. The report module summarizes topics, scores, strengths, weak concepts, misconceptions, and recommended practice for the parent or teacher.

The server owns secrets, JWT verification, MongoDB access, and authoritative evaluation. The frontend presents the learning experience and reports; it does not store provider credentials or decide final scores.

## Current scope

Student accounts, stories, quiz answers, and progress use MongoDB. Parent and teacher dashboards read the same saved records and only show students linked to the authenticated parent or assigned to the authenticated teacher. Existing users keep their current email and role; one account can gain additional roles by registering the same email with its current password. No database reset or data migration is required.

Run the frontend and backend in separate terminals from their own folders. For the frontend, run `npm install` and then `npm start` from `client/` (or use `npm run dev`). Vite serves the UI at `http://localhost:5173`. Run `npm run build` there to create a production build.

For the backend, first make sure MongoDB is running and open `server/.env`. Set `MONGODB_URI`, a private `JWT_SECRET` of at least 32 characters, and `GEMINI_API_KEY`; `GEMINI_MODEL` defaults to `gemini-3.1-flash-lite`. This file is private and ignored by Git. Then run `npm install` and `npm start` from `server/`; the API listens on port `5000`. Run `npm test` in `server/` for assessment-engine tests. Never put these values in the frontend.

Example local commands from PowerShell:

```powershell
cd D:\prompt_war\client
npm install
npm start
```

In a second terminal:

```powershell
cd D:\prompt_war\server
npm install
npm start
```
