import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getTheme } from "../data/themes.js";
import PageTransition from "../components/PageTransition.jsx";
import "./MuseumPage.css";

// MuseumPage — displays all incorrectly-answered questions saved in localStorage.
//
// localStorage key: "ql_mistakes"
// Each entry shape:
//   { id, questionId, questionText, selectedOption, selectedText,
//     correctOption, correctText, concept, correction, themeId, savedAt }
//
// Actions per card:
//   Retry  — navigates back to /mission with the same theme that was active
//   Delete — removes just this mistake from localStorage

function MuseumPage() {
  const navigate = useNavigate();
  const [mistakes, setMistakes] = useState([]);

  // Load mistakes from localStorage on mount
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("ql_mistakes") ?? "[]");
    setMistakes(saved);
  }, []);

  // Remove a single mistake by id
  const handleDelete = (id) => {
    const updated = mistakes.filter((m) => m.id !== id);
    setMistakes(updated);
    localStorage.setItem("ql_mistakes", JSON.stringify(updated));
  };

  // Clear all mistakes
  const handleClearAll = () => {
    setMistakes([]);
    localStorage.removeItem("ql_mistakes");
  };

  // Retry navigates to the mission with the theme that was active when the mistake was made
  const handleRetry = (mistake) => {
    navigate(`/mission?theme=${mistake.themeId ?? "cyber"}`);
  };

  // Format the savedAt ISO string into a readable date
  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return iso;
    }
  };

  // ── Render: empty state ──────────────────────────────────
  if (mistakes.length === 0) {
    return (
      <PageTransition className="museum-wrapper">
        <div className="card museum-empty-card">
          <button className="back-btn" onClick={() => navigate("/")}>
            ← Back to Home
          </button>
          <div className="museum-empty">
            <p className="museum-empty-icon">🏛️</p>
            <h2 className="museum-empty-title">The Museum is Empty</h2>
            <p className="museum-empty-sub">
              No mistakes saved yet. Answer a question incorrectly on the mission
              page and it will appear here for review.
            </p>
            <button className="primary" onClick={() => navigate("/")}>
              Start a Mission
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  // ── Render: mistake cards ────────────────────────────────
  return (
    <PageTransition className="museum-wrapper">
      <div className="museum-inner">
        {/* Header */}
        <div className="museum-header">
          <button className="back-btn" onClick={() => navigate("/")}>
            ← Back to Home
          </button>
          <div className="museum-title-row">
            <h1 className="museum-title">🏛️ Mistake Museum</h1>
            <span className="museum-count">{mistakes.length} mistake{mistakes.length !== 1 ? "s" : ""}</span>
          </div>
          <p className="museum-subtitle">
            Every mistake is a lesson. Review what went wrong and retry when you're ready.
          </p>
        </div>

        {/* Mistake cards */}
        <div className="mistake-list">
          {mistakes.map((mistake) => {
            const theme = getTheme(mistake.themeId);
            return (
              <div key={mistake.id} className="mistake-card">
                {/* Card header: concept title + theme badge */}
                <div className="mistake-card-header">
                  <div className="mistake-concept">
                    <span className="mistake-concept-icon">🧠</span>
                    <span className="mistake-concept-text">{mistake.concept}</span>
                  </div>
                  <span
                    className="mistake-theme-badge"
                    style={{ color: theme.accent, borderColor: theme.accentDim, backgroundColor: theme.accentDim }}
                  >
                    {theme.emoji} {theme.name}
                  </span>
                </div>

                {/* Question text */}
                <p className="mistake-question-label">Question</p>
                <p className="mistake-question-text">{mistake.questionText}</p>

                {/* Answer comparison */}
                <div className="mistake-answers">
                  <div className="mistake-answer mistake-answer--wrong">
                    <span className="answer-pill answer-pill--wrong">{mistake.selectedOption}</span>
                    <span className="answer-detail">
                      <span className="answer-detail-label">You answered</span>
                      <span className="answer-detail-value">{mistake.selectedText}</span>
                    </span>
                  </div>
                  <div className="mistake-answer mistake-answer--correct">
                    <span className="answer-pill answer-pill--correct">{mistake.correctOption}</span>
                    <span className="answer-detail">
                      <span className="answer-detail-label">Correct answer</span>
                      <span className="answer-detail-value">{mistake.correctText}</span>
                    </span>
                  </div>
                </div>

                {/* Correction explanation */}
                <div className="mistake-correction">
                  <p className="mistake-correction-label">Correction</p>
                  <p className="mistake-correction-text">{mistake.correction}</p>
                </div>

                {/* Footer: date + actions */}
                <div className="mistake-footer">
                  <span className="mistake-date">Saved {formatDate(mistake.savedAt)}</span>
                  <div className="mistake-actions">
                    <button
                      className="primary retry-btn"
                      onClick={() => handleRetry(mistake)}
                    >
                      🔁 Retry
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(mistake.id)}
                      title="Remove from museum"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Clear all */}
        {mistakes.length > 1 && (
          <div className="museum-clear-row">
            <button className="clear-all-btn" onClick={handleClearAll}>
              🗑 Clear All Mistakes
            </button>
          </div>
        )}
      </div>
    </PageTransition>
  );
}

export default MuseumPage;
