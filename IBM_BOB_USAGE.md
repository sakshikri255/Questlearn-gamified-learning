# How IBM Bob Was Used in QuestLearn

IBM Bob was used as an AI development assistant throughout the planning, implementation, debugging, validation, and documentation of QuestLearn. Its work was based on the existing QuestLearn codebase and project requirements.

## Project Planning and Code Review

- Broke the product idea into pages, features, APIs, and development tasks.
- Reviewed the frontend and backend structure before suggesting or applying changes.
- Helped identify existing implementation patterns, data flows, limitations, and integration points.
- Supported debugging of UI issues, duplicate navigation bars, API errors, and inconsistent question formats.

## UI and Frontend Development

- Built and refined responsive gamified screens, cards, buttons, navigation, progress displays, feedback states, and quiz flows.
- Used the existing React 18, React Router, Vite, CSS, and Framer Motion stack.
- Created and refined pages for missions, topics, dashboards, daily challenges, stage maps, leaderboards, streaks, the Mistake Museum, and post-quiz results.
- Added persona-specific colors, language, timers, hints, feedback, result states, and animations.
- Improved loading, retry, error, fallback, hint, and explanation states so the interface remains usable during API or AI failures.

## Backend and AI Services

- Built and connected Node.js and Express APIs for quizzes, authentication, progress-related flows, and AI services.
- Connected Google Gemini through the official `@google/genai` SDK.
- Designed prompts for topic-aware, difficulty-aware, and persona-aware question generation.
- Added structured-output validation before generated questions are displayed.
- Added a `questions.json` fallback when Gemini is unavailable, unconfigured, rate-limited, or returns invalid data.
- Added retry handling for temporary Gemini `429` and `503` errors.
- Normalized generated and fallback question formats so the frontend receives a consistent shape.

## Learning Personas

IBM Bob helped create and implement five learning personas:

- **Scientist:** evidence-based reasoning and precise explanations.
- **Detective:** clues, deduction, and elimination.
- **Wizard:** metaphors, analogies, and creative explanations.
- **Warrior:** fast, direct, decisive answers.
- **Sage:** clear explanations suitable for teaching a beginner.

Each persona has its own instructions, vocabulary, visual treatment, timer behavior, hints, feedback, and success or failure presentation.

## Quiz and Learning Logic

- Fixed generated-question ID handling so answers can be submitted successfully.
- Prevented repeated questions by clearing old state, advancing the question index, and using fresh request IDs.
- Added adaptive difficulty progression after five-question accuracy checkpoints.
- Added hints, explanations, answer feedback, and explanation validation.
- Added the Mistake Museum to save incorrect answers with explanations for later review and retry.

## Gamification and Progress

- Connected XP, coins, streaks, rewards, attempts, leaderboards, and daily challenges.
- Developed stage unlocking, XP requirements, completion states, connector paths, and boss rewards for the Stage Map.
- Used browser LocalStorage for attempts, rewards, streaks, and mistake history in the prototype.

## Authentication and Security

- Added signup, login, protected routes, refresh tokens, logout, profile management, and account flows.
- Used JWT, `bcryptjs`, HTTP-only cookies, CORS, `validator`, `dotenv`, and rate limiting.
- Supported password reset, email verification development flows, and two-factor authentication flow handling.
- Kept secrets in environment configuration rather than frontend source code.

## Validation and Documentation

- Performed backend syntax checks, frontend production builds, API-flow checks, and local development validation.
- Tested fallback behavior for missing or unavailable AI configuration.
- Documented setup, architecture, API routes, security notes, limitations, challenges, and validation commands in the project README.

## Scope of IBM Bob's Contribution

IBM Bob supported implementation, debugging, testing, and technical decision-making. The project uses the repository's own code, data, design direction, and requirements; IBM Bob did not copy the user interface from an unrelated application or external template.