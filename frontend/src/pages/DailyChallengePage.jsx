import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar.jsx";
import {
  loadDailyChallenge,
  saveDailyChallenge,
  hasDoneToday,
  lifelinesUsedToday,
  useLifeline,
  computeDailyChallengeReward,
  markDailyChallengeComplete,
  resetDailyChallengeDemo,
} from "../data/dailyChallenge.js";
import { loadProfile, saveProfile } from "../data/progress.js";
import "./DailyChallengePage.css";

const TIMER_SECONDS = 30;
const MAX_LIFELINES = 2;

// ── Countdown timer hook ─────────────────────────────────────────────────────
function useCountdown(initialSeconds, active) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const intervalRef = useRef(null);

  const reset = useCallback(() => {
    clearInterval(intervalRef.current);
    setRemaining(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (!active) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setRemaining((r) => (r <= 1 ? 0 : r - 1));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [active]);

  return { remaining, reset };
}

// ── DailyChallengePage ───────────────────────────────────────────────────────
function DailyChallengePage() {
  const navigate = useNavigate();

  // Data state
  const [dc, setDc] = useState(() => loadDailyChallenge());
  const [questions, setQuestions]   = useState([]);
  const [challengeDate, setChallengeDate] = useState("");
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState("");

  // Quiz progress
  const [qIndex, setQIndex]     = useState(0);
  const [answers, setAnswers]   = useState({}); // { questionId: selectedOption }
  const [selected, setSelected] = useState("");
  const [hintVisible, setHintVisible] = useState(false);
  const [skipped, setSkipped]   = useState(new Set()); // questionIds skipped via lifeline
  const [timedOut, setTimedOut] = useState(false);

  // Screen: "challenge" | "already-done" | "finished"
  const [screen, setScreen] = useState("challenge");
  const [reward, setReward] = useState(null);

  const alreadyDone = hasDoneToday(dc);
  const linesUsed   = lifelinesUsedToday(dc);
  const canLifeline = linesUsed < MAX_LIFELINES;

  // Timer — active only on challenge screen and not already done
  const timerActive = screen === "challenge" && !alreadyDone && !timedOut && questions.length > 0;
  const { remaining, reset: resetTimer } = useCountdown(TIMER_SECONDS, timerActive);

  // Auto-advance when timer hits 0
  useEffect(() => {
    if (timerActive && remaining === 0) {
      handleTimedOut();
    }
  }, [remaining, timerActive]);

  // Fetch questions
  useEffect(() => {
    if (alreadyDone) { setLoading(false); setScreen("already-done"); return; }
    fetch("/api/daily-challenge")
      .then((r) => r.json())
      .then(({ date, questions: qs }) => {
        setQuestions(qs);
        setChallengeDate(date);
        setLoading(false);
      })
      .catch(() => {
        setFetchError("Could not load the daily challenge. Is the backend running?");
        setLoading(false);
      });
  }, [alreadyDone]);

  const currentQ = questions[qIndex];

  const handleTimedOut = () => {
    setTimedOut(true);
    // Record no answer (treat as wrong)
    advanceOrFinish({ skipAnswer: true });
  };

  const handleSelectOption = (optId) => {
    if (selected) return; // already answered this question
    setSelected(optId);
  };

  const handleConfirmAnswer = () => {
    if (!selected) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: selected }));
    advanceOrFinish({ skipAnswer: false });
  };

  const advanceOrFinish = ({ skipAnswer }) => {
    setSelected("");
    setHintVisible(false);
    setTimedOut(false);
    resetTimer();

    const nextIndex = qIndex + 1;
    if (nextIndex >= questions.length) {
      finishChallenge();
    } else {
      setQIndex(nextIndex);
    }
  };

  // Lifeline: Hint — show hint text, costs 1 lifeline
  const handleHintLifeline = () => {
    if (!canLifeline) return;
    const updated = useLifeline(dc);
    setDc(updated);
    saveDailyChallenge(updated);
    setHintVisible(true);
  };

  // Lifeline: Skip — move to next question, costs 1 lifeline
  const handleSkipLifeline = () => {
    if (!canLifeline) return;
    const updated = useLifeline(dc);
    setDc(updated);
    saveDailyChallenge(updated);
    setSkipped((prev) => new Set([...prev, currentQ.id]));
    advanceOrFinish({ skipAnswer: true });
  };

  const finishChallenge = () => {
    // Count correct answers (skipped/timed-out count as wrong)
    const correctCount = questions.filter(
      (q) => answers[q.id] === q.correctOption
    ).length;

    const streakAfter = dc.streak + 1; // tentative — markDailyChallengeComplete recomputes
    const earned = computeDailyChallengeReward(
      correctCount,
      questions.length,
      dc.streak + 1,
      lifelinesUsedToday(dc)
    );

    // Persist daily challenge
    const updatedDc = markDailyChallengeComplete(dc, earned.coins);
    setDc(updatedDc);
    saveDailyChallenge(updatedDc);

    // Award coins + XP to profile
    const profile = loadProfile();
    saveProfile({
      ...profile,
      totalCoins: (profile.totalCoins ?? 0) + earned.coins,
      totalXp:    (profile.totalXp ?? 0) + correctCount * 10,
      leagueCoins: (profile.leagueCoins ?? 0) + earned.coins,
    });

    setReward({ ...earned, correctCount, total: questions.length });
    setScreen("finished");
  };

  // ── Already done screen ──────────────────────────────────────────────────
  if (screen === "already-done") {
    return (
      <div className="dc-page">
        <NavBar />
        <div className="dc-content">
          <div className="dc-card card">
            <div className="dc-done-banner">
              <p className="dc-done-icon">🎉</p>
              <h2 className="dc-done-title">Challenge Complete!</h2>
              <p className="dc-done-sub">You've already completed today's daily challenge.</p>
              <div className="dc-streak-badge">
                🔥 {dc.streak}-day streak
              </div>
              <p className="dc-done-coins">Total Daily Challenge Coins: {dc.coinBank} 🪙</p>
              <p className="dc-done-next">Come back tomorrow for a new set of questions!</p>
              <div className="dc-done-actions">
                <button className="primary" onClick={() => navigate("/topics")}>📚 Explore Topics</button>
                <button className="secondary" onClick={() => navigate("/dashboard")}>📊 Dashboard</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Finished screen ──────────────────────────────────────────────────────
  if (screen === "finished" && reward) {
    return (
      <div className="dc-page">
        <NavBar />
        <div className="dc-content">
          <div className="dc-card card">
            <div className="dc-result-header">
              <p className="dc-result-icon">
                {reward.correctCount === reward.total ? "🏆" : reward.correctCount >= reward.total / 2 ? "⭐" : "💪"}
              </p>
              <h2 className="dc-result-title">Daily Challenge Done!</h2>
              <p className="dc-result-score">
                {reward.correctCount} / {reward.total} correct
              </p>
              <div className="dc-streak-badge">🔥 {dc.streak}-day streak</div>
            </div>

            <div className="dc-reward-panel">
              <p className="dc-reward-label">🪙 BobCoins Earned</p>
              <ul className="dc-reward-list">
                {reward.breakdown.map((item, i) => (
                  <li key={i} className={`dc-reward-item ${item.coins < 0 ? "dc-reward-item--penalty" : ""}`}>
                    <span>{item.label}</span>
                    <span className="dc-reward-coins">
                      {item.coins >= 0 ? `+${item.coins}` : item.coins} 🪙
                    </span>
                  </li>
                ))}
              </ul>
              <div className="dc-reward-total">
                Total: <strong>{reward.coins} 🪙</strong>
              </div>
            </div>

            <div className="dc-result-actions">
              <button className="primary" onClick={() => navigate("/topics")}>📚 Practice Topics</button>
              <button className="secondary" onClick={() => navigate("/dashboard")}>📊 Dashboard</button>
              <button className="secondary" onClick={() => navigate("/")}>🏠 Home</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="dc-page">
        <NavBar />
        <div className="dc-content">
          <p className="dc-loading">Loading today's challenge…</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="dc-page">
        <NavBar />
        <div className="dc-content">
          <div className="dc-card card">
            <p className="dc-error">{fetchError}</p>
            <button className="secondary" onClick={() => navigate("/")}>← Back</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Active challenge ─────────────────────────────────────────────────────
  const pct = ((qIndex) / questions.length) * 100;
  const timerPct = (remaining / TIMER_SECONDS) * 100;
  const timerWarn = remaining <= 10;

  return (
    <div className="dc-page">
      <NavBar />
      <div className="dc-content">
        <div className="dc-card card">

          {/* Header */}
          <div className="dc-header">
            <div className="dc-header-left">
              <h2 className="dc-title">🌟 Daily Challenge</h2>
              <p className="dc-date">{challengeDate}</p>
            </div>
            <div className="dc-header-right">
              <div className="dc-streak-badge">🔥 {dc.streak}-day streak</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="dc-progress-row">
            <span className="dc-progress-label">Question {qIndex + 1} of {questions.length}</span>
          </div>
          <div className="dc-progress-track">
            <div className="dc-progress-fill" style={{ width: `${pct}%` }} />
          </div>

          {/* Timer */}
          <div className="dc-timer-row">
            <div className={`dc-timer-bar-wrap ${timerWarn ? "dc-timer-bar-wrap--warn" : ""}`}>
              <div
                className={`dc-timer-bar-fill ${timerWarn ? "dc-timer-bar-fill--warn" : ""}`}
                style={{ width: `${timerPct}%` }}
              />
            </div>
            <span className={`dc-timer-label ${timerWarn ? "dc-timer-label--warn" : ""}`}>
              ⏱ {remaining}s
            </span>
          </div>

          {/* Lifelines */}
          <div className="dc-lifelines-row">
            <span className="dc-lifelines-label">
              Lifelines: {MAX_LIFELINES - linesUsed} remaining
            </span>
            <button
              className="dc-lifeline-btn"
              disabled={!canLifeline || hintVisible || !!selected}
              onClick={handleHintLifeline}
              title="Use a lifeline to reveal a hint"
            >
              💡 Hint
            </button>
            <button
              className="dc-lifeline-btn"
              disabled={!canLifeline || !!selected}
              onClick={handleSkipLifeline}
              title="Use a lifeline to skip this question"
            >
              ⏭ Skip
            </button>
          </div>

          {/* Question */}
          {currentQ && (
            <div className="dc-question-area">
              <p className="dc-question-text">{currentQ.question}</p>

              {hintVisible && (
                <div className="dc-hint-box">
                  <p className="dc-hint-label">💡 Hint</p>
                  <p className="dc-hint-text">{currentQ.hint}</p>
                </div>
              )}

              <div className="dc-options">
                {currentQ.options.map((opt) => (
                  <button
                    key={opt.id}
                    className={`option-btn ${selected === opt.id ? "selected" : ""}`}
                    onClick={() => handleSelectOption(opt.id)}
                    disabled={!!selected}
                  >
                    <span className="option-id">{opt.id}</span>
                    <span className="option-text">{opt.text}</span>
                  </button>
                ))}
              </div>

              {timedOut && (
                <p className="dc-timeout-msg">⏰ Time's up! Moving on…</p>
              )}

              <button
                className="primary dc-confirm-btn"
                onClick={handleConfirmAnswer}
                disabled={!selected}
              >
                Confirm Answer →
              </button>
            </div>
          )}
        </div>

        {/* Demo reset */}
        <div className="dc-demo-row">
          <button className="demo-btn demo-btn--reset" onClick={() => {
            resetDailyChallengeDemo();
            setDc(loadDailyChallenge());
            setScreen("challenge");
            setQIndex(0);
            setAnswers({});
            setSelected("");
            setHintVisible(false);
            setSkipped(new Set());
          }}>
            🗑 Reset Demo Data
          </button>
        </div>
      </div>
    </div>
  );
}

export default DailyChallengePage;
