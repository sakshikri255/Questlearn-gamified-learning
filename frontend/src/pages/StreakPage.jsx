import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  loadStreak,
  saveStreak,
  computeStreakState,
  simulateMissedDay,
  resetStreakDemo,
  applyRescueSuccess,
  applyRescueFailure,
  todayStr,
  loadProfile,
  saveProfile,
  recordMistake,
  removeMistakeIfCorrect,
} from "../data/progress.js";
import PageTransition from "../components/PageTransition.jsx";
import "./StreakPage.css";

// StreakPage — monthly calendar + rescue quiz + demo controls
//
// Sections:
//   1. Streak header (current count, longest, state badge)
//   2. Monthly calendar (completed days in green, today highlighted)
//   3. At-risk warning + "Save My Streak" rescue quiz
//   4. Demo controls (Simulate Missed Day, Reset Demo Data)

// ── Calendar helpers ────────────────────────────────────────────────────────

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

function buildCalendar(year, month, completedDates, demoMissedDay) {
  const today = todayStr();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month); // 0–6
  const cells = [];

  // Leading empty cells
  for (let i = 0; i < firstDay; i++) {
    cells.push({ type: "empty", key: `e-${i}` });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isToday = dateStr === today;
    const isDone = completedDates.includes(dateStr) && !(isToday && demoMissedDay);
    const isFuture = dateStr > today;
    cells.push({ type: "day", key: dateStr, day: d, dateStr, isToday, isDone, isFuture });
  }

  return cells;
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ── Rescue quiz component ───────────────────────────────────────────────────

function RescueQuiz({ onSuccess, onFailure }) {
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch("/api/question?stageId=beginner")
      .then((r) => r.json())
      .then((data) => { setQuestion(data); setLoading(false); })
      .catch(() => { setError("Could not load rescue question. Is the backend running?"); setLoading(false); });
  }, []);

  const handleSubmit = async () => {
    if (!selected) return;
    setError("");
    setSubmitted(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          selectedOption: selected,
          // rescue quiz requires no explanation; send a minimal placeholder
          explanation: "rescue attempt",
        }),
      });
      const data = await res.json();

      if (data.correct) {
        onSuccess(question, selected, data);
      } else {
        onFailure(question, selected, data);
      }
    } catch {
      setError("Network error — please check your connection.");
      setSubmitted(false);
    }
  };

  if (loading) return <p className="rescue-loading">Loading rescue question…</p>;
  if (error && !question) return <p className="rescue-error">{error}</p>;

  return (
    <div className="rescue-quiz">
      <p className="rescue-question-text">{question?.question}</p>
      <div className="rescue-options">
        {question?.options.map((opt) => (
          <button
            key={opt.id}
            className={`option-btn ${selected === opt.id ? "selected" : ""}`}
            onClick={() => !submitted && setSelected(opt.id)}
            disabled={submitted}
          >
            <span className="option-id">{opt.id}</span>
            <span className="option-text">{opt.text}</span>
          </button>
        ))}
      </div>
      {error && <p className="rescue-error">{error}</p>}
      <button
        className="primary rescue-submit-btn"
        onClick={handleSubmit}
        disabled={!selected || submitted}
      >
        🛡️ Submit Rescue Answer
      </button>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

function StreakPage() {
  const navigate = useNavigate();
  const [streak, setStreak] = useState(loadStreak);
  const [showRescue, setShowRescue] = useState(false);
  const [rescueOutcome, setRescueOutcome] = useState(null); // null | "success" | "failure"
  const [rescueMsg, setRescueMsg] = useState("");

  // Calendar nav
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  const { state, rescueAvailable } = computeStreakState(streak);
  const today = todayStr();

  const calendar = buildCalendar(calYear, calMonth, streak.completedDates, streak.demoMissedDay);

  // ── Demo: simulate missed day ──────────────────────────────────────────────
  const handleSimulateMissed = () => {
    let targetStreak = streak;
    if (streak.completedDates.length === 0) {
      targetStreak = {
        ...streak,
        completedDates: [yesterdayStr()],
        lastCompletedDate: yesterdayStr(),
        currentStreak: 1,
        longestStreak: 1
      };
    }
    const updated = simulateMissedDay(targetStreak);
    saveStreak(updated);
    setStreak(updated);
    setShowRescue(false);
    setRescueOutcome(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Demo: reset streak data ────────────────────────────────────────────────
  const handleReset = () => {
    resetStreakDemo();
    setStreak(loadStreak());
    setShowRescue(false);
    setRescueOutcome(null);
    setRescueMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Rescue: success ────────────────────────────────────────────────────────
  const handleRescueSuccess = (question, selected, data) => {
    const updated = applyRescueSuccess(streak);
    saveStreak(updated);
    setStreak(updated);

    // Award +25 coins, +10 XP to profile
    const profile = loadProfile();
    saveProfile({
      ...profile,
      totalCoins: (profile.totalCoins ?? 0) + 25,
      totalXp: (profile.totalXp ?? 0) + 10,
      leagueCoins: (profile.leagueCoins ?? 0) + 25,
    });

    if (question) {
      removeMistakeIfCorrect(question.id, question.question);
    }

    setRescueOutcome("success");
    setRescueMsg("🛡️ Streak saved! Your dedication paid off. +25 🪙  +10 XP");
    setShowRescue(false);
  };

  // ── Rescue: failure ────────────────────────────────────────────────────────
  const handleRescueFailure = (question, selected, data) => {
    const updated = applyRescueFailure(streak);
    saveStreak(updated);
    setStreak(updated);

    // Save/renew mistake to Museum
    if (question) {
      const selectedOpt = question.options.find((o) => o.id === selected);
      const correctOpt  = question.options.find((o) => o.id === question.correctOption);
      recordMistake({
        questionId:     question.id,
        questionText:   question.question,
        options:        question.options,
        selectedOption: selected,
        selectedText:   selectedOpt?.text ?? selected,
        correctOption:  question.correctOption,
        correctText:    correctOpt?.text ?? question.correctOption,
        concept:        question.concept ?? "Rescue question",
        correction:     data.explanation,
        themeId:        "cyber",
      });
    }

    setRescueOutcome("failure");
    setRescueMsg(
      "Keep going — a miss today just means a fresh start tomorrow! 💪\n\n" +
      "⚠️ Prototype rule: In this demo, a wrong rescue answer resets the streak. " +
      "In a real app you would get a grace period."
    );
    setShowRescue(false);
  };

  // ── Calendar nav ───────────────────────────────────────────────────────────
  const handlePrevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const handleNextMonth = () => {
    const nowD = new Date();
    if (calYear > nowD.getFullYear() || (calYear === nowD.getFullYear() && calMonth >= nowD.getMonth())) return;
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };
  const isNextDisabled = (() => {
    const n = new Date();
    return calYear > n.getFullYear() || (calYear === n.getFullYear() && calMonth >= n.getMonth());
  })();

  // ── State display helpers ──────────────────────────────────────────────────
  const stateLabel = {
    new:      { emoji: "🌱", text: "No streak yet — start today!", cls: "streak-state--new" },
    active:   { emoji: "🔥", text: "Streak active — great work!",  cls: "streak-state--active" },
    "at-risk":{ emoji: "⚠️", text: "Streak at risk — complete a quiz or rescue it!", cls: "streak-state--risk" },
    broken:   { emoji: "💔", text: "Streak ended — start a new one today!", cls: "streak-state--broken" },
  }[state];

  return (
    <PageTransition className="streak-wrapper">
      <div className="streak-inner">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="streak-header">
          <button className="back-btn" onClick={() => navigate("/")}>← Back to Home</button>
          <h1 className="streak-title">🔥 Daily Streak</h1>
          <p className="streak-subtitle">Complete at least one quiz every day to keep your streak alive.</p>
        </div>

        {/* ── Stat row ───────────────────────────────────────────── */}
        <div className="streak-stat-row">
          <div className="streak-stat-card streak-stat-card--current">
            <p className="streak-stat-value">{streak.currentStreak}🔥</p>
            <p className="streak-stat-label">Current Streak</p>
          </div>
          <div className="streak-stat-card">
            <p className="streak-stat-value">{streak.longestStreak}</p>
            <p className="streak-stat-label">Longest Streak</p>
          </div>
          <div className="streak-stat-card">
            <p className="streak-stat-value">{streak.completedDates.length}</p>
            <p className="streak-stat-label">Total Active Days</p>
          </div>
        </div>

        {/* ── State badge ────────────────────────────────────────── */}
        <div className={`streak-state-badge ${stateLabel.cls}`}>
          <span>{stateLabel.emoji}</span>
          <span>{stateLabel.text}</span>
        </div>

        {/* ── At-risk warning + rescue ────────────────────────────── */}
        {state === "at-risk" && rescueOutcome === null && (
          <div className="rescue-panel">
            <p className="rescue-panel-title">⚠️ Your streak is at risk!</p>
            <p className="rescue-panel-sub">
              Complete a rescue question to save it — one attempt only.
            </p>
            {rescueAvailable ? (
              !showRescue ? (
                <button className="primary rescue-open-btn" onClick={() => setShowRescue(true)}>
                  🛡️ Save My Streak
                </button>
              ) : (
                <RescueQuiz onSuccess={handleRescueSuccess} onFailure={handleRescueFailure} />
              )
            ) : (
              <p className="rescue-used-msg">
                ✅ You have already used your rescue attempt for today.
              </p>
            )}
          </div>
        )}

        {/* ── Rescue outcome message ──────────────────────────────── */}
        {rescueOutcome !== null && (
          <div className={`rescue-outcome rescue-outcome--${rescueOutcome}`}>
            <p className="rescue-outcome-msg">{rescueMsg}</p>
            {rescueOutcome === "failure" && (
              <button className="secondary" onClick={() => navigate("/museum")} style={{ marginTop: "0.75rem" }}>
                🏛️ Review in Mistake Museum
              </button>
            )}
          </div>
        )}

        {/* ── Calendar ───────────────────────────────────────────── */}
        <div className="cal-section">
          <div className="cal-nav">
            <button className="cal-nav-btn" onClick={handlePrevMonth}>‹</button>
            <span className="cal-month-label">{MONTH_NAMES[calMonth]} {calYear}</span>
            <button className="cal-nav-btn" onClick={handleNextMonth} disabled={isNextDisabled}>›</button>
          </div>

          <div className="cal-day-names">
            {DAY_NAMES.map((d) => <span key={d} className="cal-day-name">{d}</span>)}
          </div>

          <div className="cal-grid">
            {calendar.map((cell) => {
              if (cell.type === "empty") {
                return <div key={cell.key} className="cal-cell cal-cell--empty" />;
              }
              const cls = [
                "cal-cell",
                cell.isDone    ? "cal-cell--done"    : "",
                cell.isToday   ? "cal-cell--today"   : "",
                cell.isFuture  ? "cal-cell--future"  : "",
              ].filter(Boolean).join(" ");
              return (
                <div key={cell.key} className={cls}>
                  <span className="cal-day-num">{cell.day}</span>
                  {cell.isDone && <span className="cal-done-dot" />}
                  {cell.isToday && !cell.isDone && (
                    <span className="cal-today-label">today</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="cal-legend">
            <span className="cal-legend-item"><span className="cal-legend-dot cal-legend-dot--done" />Completed</span>
            <span className="cal-legend-item"><span className="cal-legend-dot cal-legend-dot--today" />Today</span>
            <span className="cal-legend-item"><span className="cal-legend-dot cal-legend-dot--empty" />Incomplete</span>
          </div>
        </div>

        {/* ── Demo controls ──────────────────────────────────────── */}
        <div className="demo-controls">
          <p className="demo-controls-label">🧪 Hackathon Demo Controls</p>
          <div className="demo-controls-row">
            <button className="demo-btn demo-btn--miss" onClick={handleSimulateMissed}>
              📅 Simulate Missed Day
            </button>
            <button className="demo-btn demo-btn--reset" onClick={handleReset}>
              🗑 Reset Demo Streak Data
            </button>
          </div>
          <p className="demo-controls-note">
            These buttons are for demonstration only and do not affect the real calendar date.
          </p>
        </div>

      </div>
    </PageTransition>
  );
}

export default StreakPage;
