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

## Main Features

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
GEMINI_MODEL=gemini-3.6-flash
```

The repository includes `backend/.env.example` as a safe template only.

## Running the Application

Open two terminals from the repository root.

### Backend

```powershell
cd backend
npm install
npm run dev
```

The backend runs at `http://localhost:3001`.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies `/api` requests to the backend.

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
cd backend
node --check adaptiveQuizService.js
node --check server.js

cd ..\frontend
npm run build
```

A live batch request should return five questions and identify its source as either `gemini` or `fallback`.
