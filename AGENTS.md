# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Stack
- **Frontend**: React 18 + Vite 5, React Router v6 — lives in `frontend/`
- **Backend**: Node.js + Express 4 — lives in `backend/`
- **Data**: `backend/data/questions.json` (flat JSON array, no database)

## Commands

### First-time setup (all packages in one go)
```bash
npm run install:all
```

### Start (single command from repo root — recommended)
```bash
npm run dev   # starts both backend (port 3001) and frontend (port 5173) together
```

### Backend only
```bash
cd backend
npm install        # first time only
npm run dev        # starts Express on http://localhost:3001  (uses nodemon for auto-reload)
npm start          # production start (no auto-reload)
```

### Frontend only
```bash
cd frontend
npm install        # first time only
npm run dev        # starts Vite dev server on http://localhost:5173
```


## API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/question` | Returns `questions[0]` from the JSON file |
| POST | `/api/submit` | Body: `{ questionId, selectedOption, explanation }` → returns `{ correct, feedback, explanation }` |

## Key Patterns
- **Vite proxy**: `frontend/vite.config.js` proxies `/api` → `http://localhost:3001`. Always use relative `/api/…` paths in `fetch()` calls, never `http://localhost:3001`.
- **Three-state page**: `MissionPage.jsx` uses a `status` variable (`"loading"` → `"question"` → `"result"`) to control which UI is rendered.
- **CSS co-location**: Each page has its own `.css` file next to the `.jsx` file (e.g. `HomePage.css` alongside `HomePage.jsx`). Global styles are in `frontend/src/index.css`.
- **Adding questions**: Append objects to `backend/data/questions.json` following the existing schema (`id`, `question`, `options[]`, `correctOption`, `explanation`). The backend uses `questions[0]` — update `server.js` to look up by id if you add more.
- **Button variants**: Two CSS utility classes exist globally — `button.primary` (filled indigo) and `button.secondary` (ghost). Apply via `className="primary"` or `className="secondary"` on any `<button>`.
