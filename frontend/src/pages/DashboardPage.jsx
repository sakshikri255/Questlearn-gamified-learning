import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  loadAttempts,
  clearAttempts,
  computeStats,
  buildComparisons,
  formatMs,
  loadProfile,
  loadStreak,
  computeStreakState,
} from "../data/progress.js";
import { getTheme } from "../data/themes.js";
import STAGES, { getStage } from "../data/stages.js";
import NavBar from "../components/NavBar.jsx";
import "./DashboardPage.css";

// DashboardPage — shows a learner's full attempt history and aggregate stats.
//
// Sections:
//   0. NavBar + Welcome banner
//   1. Summary stat cards  (total, accuracy, avg time, streak)
//   2. Last-attempt comparison messages (same as result screen)
//   3. Attempt history table (newest first)
//   4. Clear all button

function DashboardPage() {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [streak, setStreak] = useState(null);

  useEffect(() => {
    setAttempts(loadAttempts());
    setProfile(loadProfile());
    setStreak(loadStreak());
  }, []);

  const stats = computeStats(attempts);

  // Comparisons are relative to the two most recent attempts
  const comparisons = buildComparisons(attempts);

  // Answer win-streak (consecutive correct answers from the top of the list)
  // Named "answerStreak" to avoid conflict with the daily streak state variable.
  let answerStreak = 0;
  for (const a of attempts) {
    if (a.correct) answerStreak++;
    else break;
  }

  const handleClear = () => {
    clearAttempts();
    setAttempts([]);
  };

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  // ── Derived dashboard data ────────────────────────────────────────────────
  const currentStage = profile ? getStage(profile.currentStageId ?? "beginner") : STAGES[0];
  const streakInfo = streak ? computeStreakState(streak) : null;
  const isStreakAtRisk = streakInfo?.state === "at-risk";
  const mistakeCount = JSON.parse(localStorage.getItem("ql_mistakes") ?? "[]").length;
  const currentStageIndex = STAGES.findIndex((s) => s.id === currentStage?.id);

  // ── Empty state ──────────────────────────────────────────────────────────
  if (attempts.length === 0) {
    return (
      <div className="dash-page">
        <NavBar />
        <div className="dash-content">
          <div className="card dash-empty-card">
            <button className="back-btn" onClick={() => navigate("/")}>
              ← Back to Home
            </button>
            <div className="dash-empty">
              <p className="dash-empty-icon">📊</p>
              <h2 className="dash-empty-title">No Attempts Yet</h2>
              <p className="dash-empty-sub">
                Complete a mission and your progress will appear here.
              </p>
              <button className="primary" onClick={() => navigate("/")}>
                Start a Mission
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main dashboard ───────────────────────────────────────────────────────
  return (
    <div className="dash-page">
      <NavBar />
      <div className="dash-content">

        {/* ── Welcome Banner ─────────────────────────────────── */}
        <div className="dash-welcome">
          <div className="dash-welcome-left">
            <h1 className="dash-welcome-title">
              Welcome back, <span className="dash-welcome-name">Explorer</span>
            </h1>
            <p className="dash-welcome-stage">
              {currentStage?.emoji} {currentStage?.name} Stage
            </p>
          </div>
          <div className="dash-welcome-stats">
            <div className="dash-welcome-stat dash-welcome-stat--gold">
              🪙 {profile?.totalCoins ?? 0} coins
            </div>
            <div className="dash-welcome-stat dash-welcome-stat--cyan">
              {profile?.totalXp ?? 0} XP
            </div>
            <div className="dash-welcome-stat dash-welcome-stat--orange">
              🔥 {streak?.currentStreak ?? 0} day streak
            </div>
          </div>
        </div>

        {/* ── Primary row — Continue Mission + League ─────────── */}
        <div className="dash-primary-row">
          <div className="dash-mission-card card-glass">
            <p className="dash-card-label">Continue Your Mission</p>
            <h2 className="dash-mission-title">
              {currentStage?.emoji} {currentStage?.name}
            </h2>
            <p className="dash-mission-sub">
              Stage {currentStageIndex + 1} of {STAGES.length}
            </p>
            <button className="primary" onClick={() => navigate("/stages")}>
              ▶ Go to Stage Map
            </button>
          </div>
          <div className="dash-league-card card-glass">
            <p className="dash-card-label">Your League Position</p>
            <h2 className="dash-league-rank">Quest League A</h2>
            <p className="dash-league-sub">Compete against 30 players</p>
            <button className="secondary" onClick={() => navigate("/leaderboard")}>
              View Leaderboard →
            </button>
          </div>
        </div>

        {/* ── Secondary row — Streak + Museum ─────────────────── */}
        <div className="dash-secondary-row">
          <div
            className={`dash-streak-card card-glass ${isStreakAtRisk ? "dash-streak-card--risk" : ""}`}
          >
            <p className="dash-card-label">Daily Streak</p>
            <p className="dash-streak-count">{streak?.currentStreak ?? 0}🔥</p>
            {isStreakAtRisk && (
              <p className="dash-streak-risk-msg">⚠️ Streak at risk!</p>
            )}
            <button
              className={isStreakAtRisk ? "primary" : "secondary"}
              onClick={() => navigate("/streak")}
            >
              {isStreakAtRisk ? "🛡️ Save My Streak" : "View Calendar"}
            </button>
          </div>
          <div className="dash-museum-card card-glass">
            <p className="dash-card-label">Mistake Museum</p>
            <p className="dash-museum-count">
              {mistakeCount} concept{mistakeCount !== 1 ? "s" : ""} to revisit
            </p>
            <button className="secondary" onClick={() => navigate("/museum")}>
              🏛️ Review Mistakes →
            </button>
          </div>
        </div>

        {/* ── Stage Journey bar ────────────────────────────────── */}
        <div className="dash-stage-journey card-glass">
          <p className="dash-card-label">Stage Journey</p>
          <div className="dash-stages-row">
            {STAGES.map((s) => {
              const done = profile?.completedStageIds?.includes(s.id);
              const current = profile?.currentStageId === s.id;
              return (
                <div
                  key={s.id}
                  className={`dash-stage-node ${done ? "done" : ""} ${current ? "current" : ""}`}
                >
                  <div
                    className="dash-stage-dot"
                    style={
                      done || current
                        ? {
                            borderColor: s.color,
                            backgroundColor: done ? s.color : "transparent",
                          }
                        : {}
                    }
                  >
                    {done ? "✓" : s.emoji}
                  </div>
                  <span className="dash-stage-name">{s.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Page header ───────────────────────────────────── */}
        <div className="dash-header">
          <button className="back-btn" onClick={() => navigate("/")}>
            ← Back to Home
          </button>
          <h1 className="dash-title">📊 Progress Dashboard</h1>
          <p className="dash-subtitle">
            Your learning history at a glance — {attempts.length} attempt{attempts.length !== 1 ? "s" : ""} recorded.
          </p>
        </div>

        {/* ── Summary stat cards ─────────────────────────────── */}
        <div className="stat-grid">
          <div className="stat-card">
            <p className="stat-value">{stats.total}</p>
            <p className="stat-label">Total Attempts</p>
          </div>
          <div className="stat-card stat-card--accent">
            <p className="stat-value">{stats.accuracy}%</p>
            <p className="stat-label">Accuracy</p>
          </div>
          <div className="stat-card">
            <p className="stat-value">{formatMs(stats.avgMs)}</p>
            <p className="stat-label">Avg. Time</p>
          </div>
          <div className={`stat-card ${answerStreak >= 2 ? "stat-card--streak" : ""}`}>
            <p className="stat-value">{answerStreak === 0 ? "—" : `${answerStreak}🔥`}</p>
            <p className="stat-label">Answer Streak</p>
          </div>
          <div className="stat-card stat-card--coins">
            <p className="stat-value">{(profile?.totalCoins ?? 0).toLocaleString()} 🪙</p>
            <p className="stat-label">Total Coins</p>
          </div>
          <div className="stat-card stat-card--xp">
            <p className="stat-value">{(profile?.totalXp ?? 0).toLocaleString()} XP</p>
            <p className="stat-label">Total XP</p>
          </div>
          <div
            className={`stat-card stat-card--streak-daily ${streak && computeStreakState(streak).state === "at-risk" ? "stat-card--streak-risk" : ""}`}
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/streak")}
            title="View streak calendar"
          >
            <p className="stat-value">
              {(streak?.currentStreak ?? 0) > 0
                ? `${streak.currentStreak}🔥`
                : "—"}
            </p>
            <p className="stat-label">Daily Streak</p>
          </div>
        </div>

        {/* ── Streak calendar link ─────────────────────────────── */}
        <div className="streak-dash-link-row">
          <button className="streak-dash-link" onClick={() => navigate("/streak")}>
            🔥 View Streak Calendar &amp; Rescue Quiz →
          </button>
        </div>

        {/* ── Accuracy bar ───────────────────────────────────── */}
        <div className="accuracy-section">
          <div className="accuracy-bar-row">
            <span className="accuracy-bar-label">Accuracy</span>
            <span className="accuracy-bar-pct">{stats.accuracy}%</span>
          </div>
          <div className="accuracy-track">
            <div
              className="accuracy-fill"
              style={{ width: `${stats.accuracy}%` }}
            />
          </div>
          <p className="accuracy-sub">
            {stats.correct} correct out of {stats.total} attempts
            {stats.fastestMs > 0 && (
              <> · fastest {formatMs(stats.fastestMs)} · slowest {formatMs(stats.slowestMs)}</>
            )}
          </p>
        </div>

        {/* ── Last-attempt comparison messages ───────────────── */}
        {comparisons.length > 0 && (
          <div className="comparisons-panel">
            <p className="comparisons-panel-label">Latest Comparison</p>
            <ul className="comparisons-panel-list">
              {comparisons.map((msg, i) => (
                <li key={i} className="comparisons-panel-item">{msg}</li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Attempt history table ───────────────────────────── */}
        <div className="history-section">
          <h2 className="history-title">Attempt History</h2>
          <div className="history-table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Result</th>
                  <th>Chapter</th>
                  <th>Theme</th>
                  <th>Time</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a, index) => {
                  const theme = getTheme(a.themeId);
                  const num = attempts.length - index; // descending counter
                  return (
                    <tr key={a.id} className={index === 0 ? "history-row--latest" : ""}>
                      <td className="history-num">{num}</td>
                      <td>
                        <span className={`result-pill ${a.correct ? "result-pill--correct" : "result-pill--wrong"}`}>
                          {a.correct ? "✓ Correct" : "✗ Wrong"}
                        </span>
                      </td>
                      <td>
                        <span className={`chapter-pill ${a.chapterUnlocked ? "chapter-pill--unlocked" : ""}`}>
                          {a.chapterUnlocked ? "🔓 Unlocked" : "—"}
                        </span>
                      </td>
                      <td>
                        <span className="theme-pill" style={{ color: theme.accent }}>
                          {theme.emoji} {theme.name}
                        </span>
                      </td>
                      <td className="history-time">{formatMs(a.elapsedMs)}</td>
                      <td className="history-date">{formatDate(a.savedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Clear history ───────────────────────────────────── */}
        <div className="dash-clear-row">
          <button className="clear-all-btn" onClick={handleClear}>
            🗑 Clear All History
          </button>
        </div>

      </div>
    </div>
  );
}

export default DashboardPage;
