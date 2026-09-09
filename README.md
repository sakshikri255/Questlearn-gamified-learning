# QuestLearn

QuestLearn is a gamified learning platform that turns programming practice into story-driven missions. Learners choose a topic, a persona, and a learning path, then answer questions, explain their reasoning, earn rewards, build streaks, and review mistakes.

## What Makes QuestLearn Different

QuestLearn combines quiz practice with role-based learning. The same topic can feel different depending on the selected persona:

- **Scientist**: evidence-based reasoning and precise explanations.
- **Detective**: clues, deduction, and elimination.
- **Wizard**: metaphors, analogies, and creative explanations.
- **Warrior**: fast, direct, decisive answers.
- **Sage**: clear explanations suitable for teaching a beginner.

Questions are generated dynamically for the selected topic or subtopic. This keeps the experience fresh while the local question bank ensures the app remains usable when AI is unavailable.

## Technology Used

QuestLearn is built with the following technologies:

- **React 18** for the interactive learning experience.
- **React Router** for missions, topics, dashboards, challenges, and profile navigation.
- **Vite** for fast frontend development and API proxying.
- **CSS** for the responsive game interface, persona themes, timers, progress indicators, and feedback states.
- **Node.js and Express** for the backend API and quiz services.
- **Google Gemini AI** through the official `@google/genai` SDK for dynamic, topic-aware and persona-aware question generation.
- **JSON question storage** for seeded content and reliable offline-style fallback behavior.
- **LocalStorage** for browser-side attempts, XP, coins, streaks, rewards, and mistake history.
- **JWT and bcrypt** for authentication and password security.
- **HTTP-only cookies** for refresh-token handling.
- **Express rate limiting** for protected authentication and password-reset routes.
- **dotenv** for local environment configuration.

## How IBM Bob Helped

- Reviewing the existing application and its earlier implementation before making changes.
- Connecting the backend to Google Gemini for dynamic question generation.
- Designing persona-aware prompts for Scientist, Detective, Wizard, Warrior, and Sage modes.
- Defining and validating structured AI JSON responses.
- Building a reliable `questions.json` fallback so learners can continue when Gemini is unavailable, rate-limited, misconfigured, or returns invalid data.
- Adding retry handling for temporary Gemini `429` and `503` responses.
- Fixing generated-question ID lookup so AI questions can be submitted without `Question not found` errors.
- Adding adaptive difficulty progression based on five-question accuracy checkpoints.
- Connecting XP, coins, streaks, attempts, and mistake tracking to the quiz experience.
- Fixing repeated-question behavior by clearing state, advancing the question index, and sending fresh request identifiers.
- Removing duplicate navigation bars and improving quiz, Topics, and Daily Challenge layouts.
- Adding loading, error, retry, fallback, hint, and explanation states.
- Creating project documentation covering setup, architecture, security, limitations, and engineering challenges.

IBM Bob’s role was to support implementation, debugging, testing, and technical decision-making while keeping the experience focused on learning through play.

## Main Features

## Prototype Feature Audit

### Completed

The current prototype includes the following game-layer features:

- **Stage progression:** Beginner, Explorer, Challenger, Expert, and Boss stages are defined with XP requirements, locked/unlocked states, completion states, connector paths, and a Boss reward bonus.
- **Stage unlocking:** Completing a stage records its ID and unlocks the next stage through the Stage Map.
- **Persona-based quizzes:** Scientist, Detective, Wizard, Warrior, and Sage each use different instructions, vocabulary, colors, prompts, timers, and answer feedback.
- **Different correct and incorrect experiences:** Every persona has separate success and failure presentation. Correct answers and incorrect answers trigger different visual outcomes.
- **Unique persona animations:**
	- Scientist: rocket launch for success and rocket crash/explosion for failure.
	- Detective: `FOUND` case-closed stamp for success and `404 NOT FOUND` case failure for incorrect answers.
	- Wizard: flying witch and magic trail for success and falling witch animation for failure.
	- Warrior: power pose and energy blast for success and shattering/debris animation for failure.
	- Sage: calm meditation and aura for success and disturbed/chaotic aura for failure.
- **Question feedback:** Persona-specific hints, explanation prompts, explanation validation, and result feedback are displayed after answering.
- **Authentication:** Login, signup, email verification, logout, refresh tokens, protected routes, profile loading, and authentication-required quiz access are implemented.
- **Account security flows:** Password complexity validation, password reset token handling, rate limiting, two-factor authentication flow, and profile switching are implemented.
- **Profile experience:** Users can update their name, gamer tag, email, avatar, title, and biography. Multiple profile choices and quick profile switching are available.
- **Progress systems:** XP, coins, attempts, streaks, daily challenges, league levels, dashboard statistics, and mistake history are implemented.

### Remaining or Prototype Limitations

- **Current stage indicator:** Stage unlocking works from `completedStageIds`, but `currentStageId` is not automatically moved to the next stage after completion. The current-stage display may continue to show Beginner until this is connected.
- **Real email delivery:** Signup verification and forgot-password messages currently use a simulated email outbox and development tokens. They are logged by the backend rather than delivered to a real mailbox. A production email provider still needs to be connected.
- **Persistent account progress:** Some quiz rewards, attempts, streaks, and mistakes are stored in browser LocalStorage rather than a user database, so cross-device synchronization is not complete.
- **Production storage:** User records currently use JSON storage. A production deployment should use a database with migrations and concurrent-write protection.
- **Automated coverage:** The main flows work through live API and build checks, but a complete automated test suite for authentication, stage progression, AI failure, and rewards is still recommended.

### Dynamic AI Quizzes

- Generates five-question batches with Google Gemini.
- Sends the selected topic, subtopic, difficulty, and persona context to Gemini.
- Requires structured JSON containing questions, options, correct answer indexes, hints, and explanations.
- Shows an explanation immediately after an answer is selected.
- Supports a `Next Question` flow that requests a fresh question instead of reusing the previous object.

### Adaptive Difficulty

Difficulty is evaluated after every five-question checkpoint:

- Beginner to Medium when accuracy is above 85%.
- Medium to Hard when accuracy is above 75%.
- The next Gemini request receives the updated difficulty.

### Rewards and Progress

- XP and coins are calculated locally in the frontend.
- Correct answers, speed, stage, rank, and boss-level bonuses can contribute to rewards.
- Quiz attempts and accuracy statistics are saved in browser local storage.
- Daily streaks track completed days and support streak recovery flows.
- Leaderboard and dashboard views display progress and reward totals.

### Mistake Review

Incorrect answers are saved to the Mistake Museum. Each saved mistake includes the question, selected answer, correct answer, explanation, topic, and date. Learners can review, retry, or remove mistakes.

### Daily Challenge

The Daily Challenge provides a separate timed activity with lifelines, streak tracking, daily rewards, and a completion state.

### Learning Views

The frontend includes routes for:

- Home and persona selection
- Mission quiz
- Topics and subtopics
- AI topic quiz
- Daily Challenge
- Dashboard
- Stage Map
- Leaderboard
- Streaks
- Mistake Museum
- Post-quiz results

## AI and Fallback Architecture

The backend uses the official `@google/genai` SDK through `backend/adaptiveQuizService.js`.

The normal flow is:

1. The frontend sends the selected topic, subtopic, persona, and difficulty.
2. Express calls the Gemini service.
3. Gemini returns structured JSON.
4. The backend cleans markdown code fences and validates the response.
5. A valid response is returned to the frontend with `source: "gemini"`.
6. If Gemini is unavailable, invalid, blocked, rate-limited, or not configured, the backend selects matching questions from `backend/data/questions.json`.
7. The fallback still returns a usable question in the same frontend-compatible shape.

The fallback is intentionally part of the product design, not an afterthought. Learners can continue practicing during quota exhaustion, network errors, model outages, malformed AI responses, or local development without an API key.

## Error Handling

The backend handles:

- Missing `GEMINI_API_KEY` at startup.
- Gemini HTTP 429 quota errors.
- Gemini HTTP 503 temporary service errors.
- Exponential retry delays with jitter.
- Safety, recitation, blocklist, and prohibited-content finish reasons.
- Empty or malformed Gemini response content.
- Markdown-wrapped JSON responses.
- Invalid question schemas.
- Generated AI question IDs during answer submission.

The frontend handles:

- Loading states while a question is generated.
- Retry actions when a request fails.
- Empty or incomplete batches.
- Safe optional rendering of hints and explanations.
- Local persistence for attempts, rewards, streaks, and mistakes.

## Environment Setup

Create `backend/.env` locally. Never commit this file or expose its contents.

```env
GEMINI_API_KEY=your-real-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
CLIENT_ORIGIN=http://localhost:5173
```

The repository includes `backend/.env.example` as a safe template only.

## Deploying to Vercel

QuestLearn is configured for one-click Vercel deployment. The frontend is served from Vercel's CDN and the backend runs as a serverless function — both in the same project.

### Steps

1. Push your repository to GitHub (make sure `backend/.env` is **not** committed).
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo.
3. Vercel will auto-detect `vercel.json` — no build settings need changing.
4. In **Settings → Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `GEMINI_API_KEY` | Your Gemini API key |
| `GEMINI_MODEL` | `gemini-2.0-flash` |
| `JWT_SECRET` | A long random secret string |
| `JWT_REFRESH_SECRET` | A different long random secret string |
| `CLIENT_ORIGIN` | `https://your-app.vercel.app` |

5. Click **Deploy**. Both the frontend and `/api/*` routes will be live at `https://your-app.vercel.app`.

> **Note**: The Vite proxy (`/api → localhost:3001`) is only active during local development. On Vercel, routing is handled by `vercel.json` — no changes needed in your React fetch calls.

## Running the Application

### First-time setup (install all dependencies in one command)

```powershell
npm run install:all
```

This installs packages for the root, backend, and frontend in one go. Only needed once.

### Start both servers with a single command

```powershell
npm run dev
```

This starts the Express backend on `http://localhost:3001` and the Vite frontend on `http://localhost:5173` simultaneously using `concurrently`. The browser opens automatically. Logs from both servers are colour-coded in the same terminal window.

| Colour  | Server   |
|---------|----------|
| Cyan    | Backend  |
| Magenta | Frontend |

Press `Ctrl + C` once to stop both servers together.

### Manual two-terminal alternative

If you prefer separate terminals:

**Terminal 1 — Backend**
```powershell
cd backend
npm run dev
```

**Terminal 2 — Frontend**
```powershell
cd frontend
npm run dev
```

### Production start

```powershell
npm start
```

Runs the backend with `node` (no auto-reload) and the frontend with Vite's dev server.

## Useful API Routes

- `GET /api/topics` - Returns topics and subtopics.
- `GET /api/quiz/batch` - Generates a five-question topic batch or returns fallback questions.
- `POST /api/question` - Generates one persona-aware mission question or returns a fallback question.
- `POST /api/submit` - Evaluates a mission answer and explanation.
- `GET /api/daily-challenge` - Returns the daily challenge questions.
- `POST /api/quiz/submit-batch` - Evaluates a traditional quiz batch.

## Challenges Faced and How They Were Solved

### Model availability and free-tier limits

Some model names were unavailable for particular Google AI Studio accounts, and valid models could still return quota or high-demand errors. The service now keeps the model configurable through `.env`, logs the provider response, retries temporary 429/503 failures, and falls back to local questions.

### AI schema versus legacy question schema

The original static questions used option objects such as `{ id, text }` and `correctOption`, while the new AI quiz uses option strings and `correctAnswerIndex`. The backend normalizes generated and fallback data so each active quiz receives one consistent shape.

### AI question IDs and submission lookup

Generated questions do not use numeric IDs from `questions.json`. Submissions originally failed with `Question not found` because the server searched only the static file. Generated questions are now registered in memory and resolved by their generated IDs.

### Repeated Next Question results

A request could appear to reuse the previous question when the old state was retained or fallback always selected the first static item. The current flow clears the question state, increments a question index, sends a unique request ID, asks Gemini for a fresh question, and rotates fallback questions when necessary.

### Duplicate navigation headers

The global navbar is rendered by `App.jsx`. Page-level navbars on quiz, Topics, and Daily Challenge views caused duplicate headers, so those local renders were removed while keeping page-specific back buttons where needed.

### Local progress and AI availability

AI generation is not required for the core learning loop. Rewards, streaks, attempts, and mistake review are stored locally, allowing the learner to continue using the app even when the external provider is temporarily unavailable.

## Security Notes

- Keep the real Gemini key only in `backend/.env`.
- Do not put the real key in `.env.example`, source files, frontend code, screenshots, or commit messages.
- If a key is ever exposed, revoke it and create a replacement in Google AI Studio.
- Backend logs include request metadata and provider errors but do not print the API key.

## Validation

The project has been validated with:

```powershell
# Syntax check the backend
cd backend
node --check adaptiveQuizService.js
node --check server.js

# Production build check (also validates chunk splitting)
cd ..
npm run build
```

