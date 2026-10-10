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

For the backend, open `server/.env`. Set `MONGODB_URI`, a private `JWT_SECRET` of at least 32 characters, and `GEMINI_API_KEY`; `GEMINI_MODEL` defaults to `gemini-3.1-flash-lite`. For local MongoDB, use `mongodb://127.0.0.1:27017/storylearn_ai`. For Atlas, use the `mongodb+srv://` connection string described below. This file is private and ignored by Git. Then run `npm install` and `npm start` from `server/`; the API listens on port `5000`. Run `npm test` in `server/` for assessment-engine tests. Never put database or Gemini credentials in the frontend.

## Deploy the API to Render

The root-level `render.yaml` defines the Express API as a Render Web Service. In Render, create a **Blueprint Instance** from this repository and use the Blueprint defaults. The service builds from `server/` with `npm ci`, starts with `npm start`, and uses `/api/health` for its health check.

During Blueprint setup, provide:

- `MONGODB_URI`: the MongoDB Atlas Node.js connection string. Use the `mongodb+srv://` URI, keep the database name `storylearn_ai`, and URL-encode reserved characters in the username and password.
- `GEMINI_API_KEY`: your private Gemini API key. The server can start without it, but AI story features need it.
- `CORS_ORIGIN`: the exact browser origin of the frontend, with no trailing slash (for example, `https://prompt-war-dusky.vercel.app`). For multiple frontends, separate origins with commas.

Render generates `JWT_SECRET` for the service. Do not put any production secrets in `render.yaml`, source control, or frontend build variables. In MongoDB Atlas **Network Access**, allow the Render service's outbound IP addresses; find the current addresses in the Render service settings. Avoid broad public database access where possible.

This Blueprint deploys the **API only**. If the frontend remains on Vercel, set the frontend's build variable `VITE_API_URL` to `https://<your-render-service>.onrender.com/api`, then rebuild and redeploy the frontend. The Render API's `CORS_ORIGIN` must match the deployed frontend origin. The `free` plan in `render.yaml` may spin down when idle; change the service plan in Render if you need it to remain always on.

After deployment, verify `https://<your-render-service>.onrender.com/api/health` returns HTTP 200 and `{"status":"ok","database":"connected"}`. A 503 means the API cannot connect to MongoDB; check the Render logs, connection string, Atlas database user, and Atlas Network Access.

## MongoDB Atlas and Vercel deployment

1. In MongoDB Atlas, create a database user with a strong password and read/write access only to the StoryLearn database. Copy the cluster's **Drivers / Node.js** connection string.
2. Replace the username, password, and cluster host in the URI. URL-encode reserved characters in the username/password (for example `@` becomes `%40`); do not include the angle-bracket placeholders. Keep the database name `storylearn_ai`, for example:

   ```text
   mongodb+srv://DB_USER:URL_ENCODED_PASSWORD@cluster-name.example.mongodb.net/storylearn_ai?retryWrites=true&w=majority&appName=StoryLearnAI
   ```

3. For local testing, put that URI on `MONGODB_URI=` in `server/.env`. For the deployed API, add it as the **server's** `MONGODB_URI` environment variable in the deployment platform's project settings, for Preview and Production as needed. Do not commit the URI, paste it into React, or expose it as a `VITE_` variable.
4. Add server environment variables `JWT_SECRET` (new random secret, at least 32 characters), `GEMINI_API_KEY`, and `CORS_ORIGIN=https://prompt-war-dusky.vercel.app`. Keep `PORT` platform-provided/defaulted. Use `MONGODB_MAX_POOL_SIZE=5` and `MONGODB_SERVER_SELECTION_TIMEOUT_MS=10000` for the Vercel function deployment.
5. In Atlas **Network Access**, allow the API host's outbound IP address/range. Serverless hosts may use changing outbound IPs; prefer a static-egress option or a private network. If you temporarily allow `0.0.0.0/0` for a test deployment, use a strong database password and a database user restricted to this app's database, and replace the wide rule with a restricted range when possible.
6. The Vercel project must use the **repository root** as its Root Directory so it deploys both the React app and `api/[...path].js`. Set `VITE_API_URL=https://prompt-war-dusky.vercel.app/api` as a frontend build variable. Redeploy after configuring all environment variables.
7. Verify `https://prompt-war-dusky.vercel.app/api/health` returns HTTP 200 and `{"status":"ok","database":"connected"}`. A 503 means the function cannot connect to Atlas; check Vercel function logs, URI encoding, Atlas database-user credentials, and Atlas Network Access. Never post connection strings, passwords, JWT secrets, or API keys into chat or logs.

MongoDB connection pools are bounded, and concurrent startup requests reuse the same connection attempt. The health endpoint checks database readiness rather than only confirming that the HTTP process is alive.

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
