import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getTheme } from "../data/themes.js";
import PageTransition from "../components/PageTransition.jsx";
import {
  loadMistakes,
  recordMistake,
  removeMistakeIfCorrect,
  loadProfile,
  saveProfile,
} from "../data/progress.js";
import "./MuseumPage.css";

// MuseumPage — displays all incorrectly-answered questions saved in localStorage.
// Features:
// - Automatic deduplication on load & save (never creates double cards for the same question)
// - Interactive Inline Retry: Retrying tests the exact mistake question
// - Correct retry -> Clears mistake from Museum & awards +30 Coins & +15 XP!
// - Incorrect retry -> Renews mistake timestamp & selection without duplicating card

function MuseumPage() {
  const navigate = useNavigate();
  const [mistakes, setMistakes] = useState([]);
  const [activeRetry, setActiveRetry] = useState(null); // mistake object being retried
  const [selectedOption, setSelectedOption] = useState("");
  const [retryResult, setRetryResult] = useState(null); // { correct: boolean, msg: string }

  // Load mistakes on mount and sync on storage events
  const syncMistakes = () => {
    setMistakes(loadMistakes());
  };

  useEffect(() => {
    syncMistakes();
    window.addEventListener("storage", syncMistakes);
    return () => window.removeEventListener("storage", syncMistakes);
  }, []);

  // Remove a single mistake by id
  const handleDelete = (id, questionId, questionText) => {
    removeMistakeIfCorrect(questionId, questionText);
    syncMistakes();
  };

  // Clear all mistakes
  const handleClearAll = () => {
    setMistakes([]);
    localStorage.removeItem("ql_mistakes");
    window.dispatchEvent(new Event("storage"));
  };

  // Open Retry modal for a specific mistake
  const handleStartRetry = (mistake) => {
    setActiveRetry(mistake);
    setSelectedOption("");
    setRetryResult(null);
  };

  // Close Retry modal
  const handleCloseRetry = () => {
    setActiveRetry(null);
    setSelectedOption("");
    setRetryResult(null);
  };

  // Submit retry answer
  const handleSubmitRetry = () => {
    if (!activeRetry || !selectedOption) return;

    // Check correctness: either matches correctOption letter or correctText
    const isCorrect =
      selectedOption === activeRetry.correctOption ||
      selectedOption === activeRetry.correctText;

    if (isCorrect) {
      // 1. Remove mistake from Museum
      removeMistakeIfCorrect(activeRetry.questionId, activeRetry.questionText);

      // 2. Award coins & XP
      const profile = loadProfile();
      saveProfile({
        ...profile,
        totalCoins: (profile.totalCoins ?? 0) + 30,
        totalXp: (profile.totalXp ?? 0) + 15,
        leagueCoins: (profile.leagueCoins ?? 0) + 30,
      });

      setRetryResult({
        correct: true,
        msg: "🎉 Correct! Mistake cleared from Museum! (+30 🪙  +15 XP)",
      });

      syncMistakes();
    } else {
      // Renew mistake entry with new timestamp & latest wrong answer (no duplicate cards)
      const selectedOptObj = activeRetry.options?.find((o) => o.id === selectedOption);
      const renewed = recordMistake({
        ...activeRetry,
        selectedOption,
        selectedText: selectedOptObj?.text ?? selectedOption,
      });

      setRetryResult({
        correct: false,
        msg: "❌ Still incorrect. Mistake entry renewed for further practice.",
      });

      syncMistakes();
    }
  };

  // Helper to format ISO date string
  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  // ── Helper to derive options array for retrying ─────────────────────────────
  const getRetryOptions = (mistake) => {
    if (Array.isArray(mistake.options) && mistake.options.length > 0) {
      return mistake.options;
    }
    // Fallback options if missing from legacy records
    const opts = [];
    if (mistake.selectedOption && mistake.selectedText) {
      opts.push({ id: mistake.selectedOption, text: mistake.selectedText });
    }
    if (mistake.correctOption && mistake.correctText && mistake.correctOption !== mistake.selectedOption) {
      opts.push({ id: mistake.correctOption, text: mistake.correctText });
    }
    if (opts.length < 4) {
      const dummies = [
        { id: "A", text: "Alternative option A" },
        { id: "B", text: "Alternative option B" },
        { id: "C", text: "Alternative option C" },
        { id: "D", text: "Alternative option D" },
      ];
      dummies.forEach((d) => {
        if (!opts.some((o) => o.id === d.id)) opts.push(d);
      });
    }
    return opts.sort((a, b) => a.id.localeCompare(b.id));
  };

  // ── Render: Empty State ─────────────────────────────────────────────────────
  if (mistakes.length === 0 && !activeRetry) {
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
              No active mistakes saved! When you answer a question incorrectly in missions or quizzes,
              it will appear here for review and retry.
            </p>
            <button className="primary" onClick={() => navigate("/")}>
              Start a Mission
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  // ── Render: Main Museum ─────────────────────────────────────────────────────
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
            <span className="museum-count">
              {mistakes.length} unique mistake{mistakes.length !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="museum-subtitle">
            Every mistake is a lesson. Review past errors, attempt instant retries, and clear items as you master them.
          </p>
        </div>

        {/* Mistake cards */}
        <div className="mistake-list">
          {mistakes.map((mistake) => {
            const theme = getTheme(mistake.themeId);
            return (
              <div key={mistake.id} className="mistake-card">
                {/* Card header */}
                <div className="mistake-card-header">
                  <div className="mistake-concept">
                    <span className="mistake-concept-icon">🧠</span>
                    <span className="mistake-concept-text">{mistake.concept}</span>
                  </div>
                  <span
                    className="mistake-theme-badge"
                    style={{
                      color: theme.accent,
                      borderColor: theme.accentDim,
                      backgroundColor: theme.accentDim,
                    }}
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
                    <span className="answer-pill answer-pill--wrong">
                      {mistake.selectedOption}
                    </span>
                    <span className="answer-detail">
                      <span className="answer-detail-label">Last Answer</span>
                      <span className="answer-detail-value">{mistake.selectedText}</span>
                    </span>
                  </div>
                  <div className="mistake-answer mistake-answer--correct">
                    <span className="answer-pill answer-pill--correct">
                      {mistake.correctOption}
                    </span>
                    <span className="answer-detail">
                      <span className="answer-detail-label">Correct Answer</span>
                      <span className="answer-detail-value">{mistake.correctText}</span>
                    </span>
                  </div>
                </div>

                {/* Correction explanation */}
                <div className="mistake-correction">
                  <p className="mistake-correction-label">Correction & Explanation</p>
                  <p className="mistake-correction-text">{mistake.correction}</p>
                </div>

                {/* Footer: date + actions */}
                <div className="mistake-footer">
                  <span className="mistake-date">
                    Last missed: {formatDate(mistake.savedAt)}
                  </span>
                  <div className="mistake-actions">
                    <button
                      className="primary retry-btn"
                      onClick={() => handleStartRetry(mistake)}
                    >
                      🔁 Retry Now
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(mistake.id, mistake.questionId, mistake.questionText)}
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

        {/* ── Interactive Retry Modal ───────────────────────────────────────── */}
        {activeRetry && (
          <div className="retry-modal-backdrop" onClick={handleCloseRetry}>
            <div className="retry-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="retry-modal-header">
                <h3>🔁 Retry Question — {activeRetry.concept}</h3>
                <button className="retry-modal-close" onClick={handleCloseRetry}>
                  ✕
                </button>
              </div>

              <p className="retry-modal-question">{activeRetry.questionText}</p>

              {/* Options list */}
              <div className="retry-modal-options">
                {getRetryOptions(activeRetry).map((opt) => (
                  <button
                    key={opt.id}
                    className={`retry-option-btn ${selectedOption === opt.id ? "selected" : ""}`}
                    onClick={() => !retryResult?.correct && setSelectedOption(opt.id)}
                    disabled={retryResult?.correct}
                  >
                    <span className="retry-option-id">{opt.id}</span>
                    <span className="retry-option-text">{opt.text}</span>
                  </button>
                ))}
              </div>

              {/* Result Feedback */}
              {retryResult && (
                <div className={`retry-result-banner ${retryResult.correct ? "success" : "failure"}`}>
                  <p>{retryResult.msg}</p>
                </div>
              )}

              {/* Modal Actions */}
              <div className="retry-modal-actions">
                {!retryResult?.correct ? (
                  <button
                    className="primary"
                    onClick={handleSubmitRetry}
                    disabled={!selectedOption}
                  >
                    Submit Answer
                  </button>
                ) : (
                  <button className="primary" onClick={handleCloseRetry}>
                    Done & Close
                  </button>
                )}
                <button className="secondary" onClick={handleCloseRetry}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}

export default MuseumPage;
