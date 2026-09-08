import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getTheme } from "../data/themes.js";
import {
  saveAttempt,
  buildComparisons,
  computeRewards,
  loadProfile,
  saveProfile,
  loadLeague,
  saveLeague,
  loadStreak,
  saveStreak,
  markTodayComplete,
} from "../data/progress.js";
import { getStage } from "../data/stages.js";
import INITIAL_LEAGUE_DATA from "../data/leagueData.js";
import "./MissionPage.css";

const MISSION_TIMER_SECONDS = 90;

function MissionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = getTheme(searchParams.get("theme"));
  const stageId = searchParams.get("stageId") ?? "beginner";
  const stage = getStage(stageId);

  const [status, setStatus] = useState("loading");
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState("");
  const [explanation, setExplanation] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [chapterUnlocked, setChapterUnlocked] = useState(false);
  const [comparisons, setComparisons] = useState([]);
  const [rewards, setRewards] = useState(null);
  const [timerRemaining, setTimerRemaining] = useState(MISSION_TIMER_SECONDS);
  const [timerActive, setTimerActive] = useState(false);
  const questionStartRef = useRef(null);
  const timerRef = useRef(null);

  // Start/stop the countdown timer
  const startTimer = useCallback(() => {
    setTimerRemaining(MISSION_TIMER_SECONDS);
    setTimerActive(true);
  }, []);

  const stopTimer = useCallback(() => {
    setTimerActive(false);
    clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (!timerActive) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setTimerRemaining((r) => {
        if (r <= 1) { clearInterval(timerRef.current); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerActive]);

  useEffect(() => {
    fetch(`/api/question?stageId=${stageId}`)
      .then((res) => res.json())
      .then((data) => {
        setQuestion(data);
        questionStartRef.current = Date.now();
        setStatus("question");
        startTimer();
      })
      .catch(() => {
        setError("Could not load the question. Is the backend running?");
        setStatus("question");
      });
  }, [stageId]);

  const handleSubmit = async () => {
    if (!selected) { setError("Please choose an answer before submitting."); return; }
    if (explanation.trim() === "") { setError("Please explain your reasoning before submitting."); return; }
    setError("");
    stopTimer();
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, selectedOption: selected, explanation: explanation.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      const elapsedMs = questionStartRef.current ? Date.now() - questionStartRef.current : 0;
      const isCorrect = data.correct;
      const didUnlock = data.chapterUnlocked === true;
      setChapterUnlocked(didUnlock);
      setResult(data);

      // ── Compute rewards ──────────────────────────────────────────────────
      // Derive player's current league rank to calculate rank bonus
      const league = loadLeague(INITIAL_LEAGUE_DATA);
      const playerEntry = league.find((u) => u.isPlayer);
      const sorted = [...league].sort((a, b) => b.coins - a.coins);
      const playerRank = sorted.findIndex((u) => u.isPlayer) + 1;

      const earned = computeRewards({
        correct: isCorrect,
        elapsedMs,
        stageId,
        rank: playerRank || 15,
      });
      setRewards(earned);

      // ── Persist rewards to profile ───────────────────────────────────────
      if (isCorrect && earned.coins > 0) {
        const profile = loadProfile();
        const updatedProfile = {
          ...profile,
          totalCoins: (profile.totalCoins ?? 0) + earned.coins,
          totalXp: (profile.totalXp ?? 0) + earned.xp,
          leagueCoins: (profile.leagueCoins ?? 0) + earned.coins,
          completedStageIds: profile.completedStageIds
            ? profile.completedStageIds.includes(stageId)
              ? profile.completedStageIds
              : [...profile.completedStageIds, stageId]
            : [stageId],
        };
        saveProfile(updatedProfile);

        // Update player coins in league
        const updatedLeague = league.map((u) =>
          u.isPlayer ? { ...u, coins: (u.coins ?? 0) + earned.coins } : u
        );
        saveLeague(updatedLeague);
      }

      // ── Mark today's quiz done (streak) ─────────────────────────────────
      const streak = loadStreak();
      const updatedStreak = markTodayComplete(streak);
      saveStreak(updatedStreak);

      // ── Persist attempt ──────────────────────────────────────────────────
      const updatedAttempts = saveAttempt({
        questionId: question.id,
        themeId: theme.id,
        stageId,
        correct: isCorrect,
        chapterUnlocked: didUnlock,
        elapsedMs,
        coinsEarned: earned.coins,
        xpEarned: earned.xp,
      });
      setComparisons(buildComparisons(updatedAttempts));
      setTimerActive(false);
      setStatus("result");

      // ── Persist mistake ──────────────────────────────────────────────────
      if (!isCorrect && question) {
        const selectedOpt = question.options.find((o) => o.id === selected);
        const correctOpt = question.options.find((o) => o.id === question.correctOption);
        const mistake = {
          id: `${question.id}-${selected}-${Date.now()}`,
          questionId: question.id,
          questionText: question.question,
          selectedOption: selected,
          selectedText: selectedOpt?.text ?? selected,
          correctOption: question.correctOption,
          correctText: correctOpt?.text ?? question.correctOption,
          concept: question.concept ?? "Key concept",
          correction: data.explanation,
          themeId: theme.id,
          savedAt: new Date().toISOString(),
        };
        const existing = JSON.parse(localStorage.getItem("ql_mistakes") ?? "[]");
        const deduped = existing.filter(
          (m) => !(m.questionId === mistake.questionId && m.selectedOption === mistake.selectedOption)
        );
        localStorage.setItem("ql_mistakes", JSON.stringify([mistake, ...deduped]));
      }
    } catch {
      setError("Network error — please check your connection.");
    }
  };

  const activeChapter = chapterUnlocked ? 1 : 0;

  const StoryHeader = () => (
    <div className="story-header" style={{ borderColor: theme.accent, backgroundColor: theme.accentDim }}>
      <p className="story-theme-label" style={{ color: theme.accent }}>{theme.emoji} {theme.name}</p>
      <p className="story-text">{theme.story}</p>
      <div className="chapter-bar">
        {theme.chapters.map((title, index) => {
          const isActive = index === activeChapter;
          const isDone = index < activeChapter;
          return (
            <div key={title} className={`chapter-step ${isActive ? "chapter-step--active" : ""} ${isDone ? "chapter-step--done" : ""}`}>
              <div className="chapter-dot" style={isDone ? { backgroundColor: theme.accent } : isActive ? { backgroundColor: theme.accent, boxShadow: `0 0 0 3px ${theme.accentDim}` } : {}} />
              {index < theme.chapters.length - 1 && (<div className="chapter-line" style={isDone ? { backgroundColor: theme.accent } : {}} />)}
              <span className="chapter-label" style={isActive || isDone ? { color: theme.accent } : {}}>{isDone ? "✓ " : ""}Ch.{index + 1} {title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (status === "loading") {
    return (<div className="mission-wrapper"><p className="loading-text">Loading your mission…</p></div>);
  }

  if (status === "result" && result) {
    return (
      <div className="mission-wrapper">
        <div className="card result-card">
          <StoryHeader />
          <h2 className="result-title">
            {!result.correct
              ? "Mission Failed"
              : chapterUnlocked
              ? "Chapter Unlocked! 🔓"
              : "Answer Correct!"}
          </h2>
          <p className={`result-feedback ${result.correct ? "correct" : "incorrect"}`}>{result.feedback}</p>

          {/* ── Reward breakdown panel ─────────────────────────────────── */}
          {rewards && rewards.breakdown.length > 0 && (
            <div className="reward-panel">
              <p className="reward-panel-label">🏆 Rewards Earned</p>
              <ul className="reward-breakdown-list">
                {rewards.breakdown.map((line, i) => (
                  <li key={i} className="reward-breakdown-item">
                    <span className="reward-breakdown-desc">{line.label}</span>
                    <span className="reward-breakdown-coins">+{line.coins} 🪙</span>
                    {line.xp > 0 && <span className="reward-breakdown-xp">+{line.xp} XP</span>}
                  </li>
                ))}
              </ul>
              <div className="reward-totals">
                <span className="reward-total-coins">Total: {rewards.coins} 🪙</span>
                {rewards.xp > 0 && <span className="reward-total-xp">{rewards.xp} XP</span>}
              </div>
            </div>
          )}
          {rewards && !result.correct && (
            <div className="reward-panel reward-panel--zero">
              <p className="reward-panel-label">💔 No Rewards</p>
              <p className="reward-zero-msg">Answer correctly to earn coins and XP.</p>
            </div>
          )}

          {result.correct && !chapterUnlocked && result.hint && (
            <div className="hint-box">
              <p className="hint-label">💡 Hint</p>
              <p className="hint-text">{result.hint}</p>
              <button className="primary hint-retry-btn" onClick={() => { setExplanation(""); setResult(null); setError(""); setRewards(null); setStatus("question"); }}>✏️ Improve My Explanation</button>
            </div>
          )}
          {comparisons.length > 0 && (
            <div className="comparisons-box">
              <p className="comparisons-label">📊 Progress Update</p>
              <ul className="comparisons-list">{comparisons.map((msg, i) => (<li key={i} className="comparisons-item">{msg}</li>))}</ul>
              <button className="secondary comparisons-dashboard-btn" onClick={() => navigate("/dashboard")}>View Full Dashboard →</button>
            </div>
          )}
          <div className="result-explanation"><h3>Explanation</h3><p>{result.explanation}</p></div>
          <div className="result-actions">
            {!result.correct && (
              <button className="primary" onClick={() => { setSelected(""); setExplanation(""); setResult(null); setError(""); setChapterUnlocked(false); setRewards(null); setStatus("question"); }}>
                🔄 Try Again
              </button>
            )}
            {!result.correct && (<button className="secondary" onClick={() => navigate("/museum")}>🏛️ Visit Museum</button>)}
            <button className="secondary" onClick={() => navigate("/dashboard")}>📊 Dashboard</button>
            {stageId !== "beginner" ? (
              <button className="secondary" onClick={() => navigate("/stages")}>🗺️ Stage Map</button>
            ) : (
              <button className="secondary" onClick={() => navigate("/")}>🏠 Home</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const timerPct  = (timerRemaining / MISSION_TIMER_SECONDS) * 100;
  const timerWarn = timerRemaining <= 20;

  return (
    <div className="mission-wrapper">
      <div className="card mission-card">
        <button className="back-btn" onClick={() => navigate(stageId !== "beginner" ? "/stages" : "/")}>
          {stageId !== "beginner" ? "← Back to Stage Map" : "← Back to Home"}
        </button>
        <StoryHeader />
        <h2 className="mission-heading">Mission — {stage.name}</h2>

        {/* ── Timer bar ─────────────────────────────────────────── */}
        <div className="mission-timer-row">
          <div className={`mission-timer-track ${timerWarn ? "mission-timer-track--warn" : ""}`}>
            <div
              className={`mission-timer-fill ${timerWarn ? "mission-timer-fill--warn" : ""}`}
              style={{ width: `${timerPct}%`, transition: "width 1s linear" }}
            />
          </div>
          <span className={`mission-timer-label ${timerWarn ? "mission-timer-label--warn" : ""}`}>
            ⏱ {timerRemaining}s
          </span>
        </div>

        {timerRemaining === 0 && (
          <p className="mission-timer-expired">⏰ Time expired — you can still submit!</p>
        )}

        <p className="question-text">{question?.question}</p>
        <div className="options-list">
          {question?.options.map((opt) => (
            <button key={opt.id} className={`option-btn ${selected === opt.id ? "selected" : ""}`} onClick={() => setSelected(opt.id)}>
              <span className="option-id">{opt.id}</span>
              <span className="option-text">{opt.text}</span>
            </button>
          ))}
        </div>
        <label className="explanation-label" htmlFor="explanation">Why did you choose that answer?</label>
        <textarea
          id="explanation"
          className="explanation-input"
          rows={4}
          placeholder="Type your reasoning here…"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
        />
        {error && <p className="error-msg">{error}</p>}
        <button className="primary submit-btn" onClick={handleSubmit} disabled={!selected || explanation.trim() === ""}>
          ✅ Submit Answer
        </button>
      </div>
    </div>
  );
}

export default MissionPage;
