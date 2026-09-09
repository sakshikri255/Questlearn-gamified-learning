import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadQuizResults, computeAreas, buildRecommendations } from "../data/quizResults.js";
import { formatMs } from "../data/progress.js";
import "./PostQuizResultsPage.css";

// PostQuizResultsPage
//
// Shows after a TopicQuiz is submitted via /api/quiz/submit-batch.
// Sections:
//   1. Score summary card (score %, correct/total, time taken)
//   2. Per-question results with full explanation
//   3. Weak Areas vs Strong Areas breakdown
//   4. Personalised recommendations
//   5. Action buttons (retry, other topics, dashboard)

function PostQuizResultsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    const saved = loadQuizResults();
    if (!saved) {
      navigate("/topics");
    } else {
      setData(saved);
    }
  }, [navigate]);

  if (!data) {
    return (
      <div className="pqr-wrapper">
        <p className="pqr-loading">Loading results…</p>
      </div>
    );
  }

  const { results, correct, total, score, elapsedMs, subtopicName, topicName, topicId, subtopicId } = data;
  const areas = computeAreas(results);
  const recommendations = buildRecommendations(areas);

  const grade =
    score >= 90 ? { label: "Outstanding!", emoji: "🏆", cls: "grade--gold" }
    : score >= 70 ? { label: "Great job!", emoji: "⭐", cls: "grade--blue" }
    : score >= 50 ? { label: "Good effort!", emoji: "💪", cls: "grade--orange" }
    : { label: "Keep practising!", emoji: "📚", cls: "grade--red" };

  return (
    <div className="pqr-wrapper">
      <div className="pqr-content">

        {/* ── Score Summary ─────────────────────────────── */}
        <div className={`pqr-score-card card ${grade.cls}`}>
          <p className="pqr-grade-emoji">{grade.emoji}</p>
          <h1 className="pqr-score-pct">{score}%</h1>
          <p className="pqr-grade-label">{grade.label}</p>
          <p className="pqr-score-meta">
            {correct} / {total} correct · {formatMs(elapsedMs)} total
          </p>
          <p className="pqr-breadcrumb">
            {topicName} › {subtopicName}
          </p>
        </div>

        {/* ── Weak / Strong Areas ───────────────────────── */}
        <div className="pqr-areas-row">
          <div className="pqr-areas-panel pqr-areas-panel--strong">
            <h2 className="pqr-areas-title">✅ Strong Areas</h2>
            {areas.strong.length === 0 ? (
              <p className="pqr-areas-empty">No strong areas yet — keep going!</p>
            ) : (
              <ul className="pqr-areas-list">
                {areas.strong.map((a) => (
                  <li key={a.id} className="pqr-area-item">
                    <span className="pqr-area-name">{a.name}</span>
                    <span className="pqr-area-pct pqr-area-pct--strong">{a.accuracy}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="pqr-areas-panel pqr-areas-panel--weak">
            <h2 className="pqr-areas-title">⚠️ Weak Areas</h2>
            {areas.weak.length === 0 ? (
              <p className="pqr-areas-empty">No weak areas — excellent!</p>
            ) : (
              <ul className="pqr-areas-list">
                {areas.weak.map((a) => (
                  <li key={a.id} className="pqr-area-item">
                    <span className="pqr-area-name">{a.name}</span>
                    <span className="pqr-area-pct pqr-area-pct--weak">{a.accuracy}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Recommendations ───────────────────────────── */}
        <div className="pqr-recs card-glass">
          <h2 className="pqr-recs-title">💡 Recommendations</h2>
          <ul className="pqr-recs-list">
            {recommendations.map((rec, i) => (
              <li key={i} className="pqr-rec-item">{rec}</li>
            ))}
          </ul>
        </div>

        {/* ── Per-question breakdown ────────────────────── */}
        <div className="pqr-breakdown">
          <h2 className="pqr-breakdown-title">📋 Question-by-Question Review</h2>
          <div className="pqr-questions">
            {results.map((r, idx) => {
              const userOpt  = r.options?.find((o) => o.id === r.selectedOption);
              const corrOpt  = r.options?.find((o) => o.id === r.correctOption);
              return (
                <div
                  key={r.questionId ?? idx}
                  className={`pqr-q-card card-glass ${r.correct ? "pqr-q-card--correct" : "pqr-q-card--wrong"}`}
                >
                  <div className="pqr-q-header">
                    <span className={`pqr-q-badge ${r.correct ? "pqr-q-badge--correct" : "pqr-q-badge--wrong"}`}>
                      {r.correct ? "✓ Correct" : "✗ Wrong"}
                    </span>
                    <span className="pqr-q-num">Q{idx + 1}</span>
                  </div>
                  <p className="pqr-q-text">{r.question}</p>
                  {!r.correct && (
                    <div className="pqr-q-answers">
                      {r.selectedOption ? (
                        <p className="pqr-q-wrong-ans">
                          ✗ Your answer: <strong>{r.selectedOption}. {userOpt?.text}</strong>
                        </p>
                      ) : (
                        <p className="pqr-q-wrong-ans">✗ Not answered (time ran out)</p>
                      )}
                      <p className="pqr-q-correct-ans">
                        ✓ Correct: <strong>{r.correctOption}. {corrOpt?.text}</strong>
                      </p>
                    </div>
                  )}
                  <div className="pqr-q-explanation">
                    <p className="pqr-q-exp-label">📖 Explanation</p>
                    <p className="pqr-q-exp-text">{r.explanation}</p>
                  </div>
                  {r.concept && (
                    <p className="pqr-q-concept">🧠 Concept: <em>{r.concept}</em></p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Actions ──────────────────────────────────── */}
        <div className="pqr-actions">
          <button className="primary" onClick={() => navigate(`/quiz/${subtopicId}`, {
            state: { subtopicName, topicName, topicId },
          })}>
            🔄 Retry This Quiz
          </button>
          <button className="secondary" onClick={() => navigate("/topics")}>
            📚 All Topics
          </button>
          <button className="secondary" onClick={() => navigate("/daily-challenge")}>
            🌟 Daily Challenge
          </button>
          <button className="secondary" onClick={() => navigate("/dashboard")}>
            📊 Dashboard
          </button>
        </div>

      </div>
    </div>
  );
}

export default PostQuizResultsPage;
