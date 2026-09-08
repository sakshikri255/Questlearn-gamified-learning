import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getTheme } from "../data/themes.js";
import { getPersona } from "../data/personas.js";
import PersonaResultScreen from "../components/PersonaResultScreen.jsx";
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
import PageTransition from "../components/PageTransition.jsx";
import "./MissionPage.css";

// ── Sage: count "simple" words in explanation ────────────────────────────────
const SIMPLE_WORDS = ["simply", "basically", "means", "like", "so", "example",
  "think of", "in other words", "just", "easy", "clear", "because", "when", "if"];
function simplicityScore(text) {
  if (!text) return 0;
  const lower = text.toLowerCase();
  const hits = SIMPLE_WORDS.filter((w) => lower.includes(w)).length;
  return Math.min(Math.round((hits / 4) * 100), 100);
}

// ── Detective: track which options have been "eliminated" ────────────────────
// (right-click or long-press marks an option as eliminated)

function MissionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = getTheme(searchParams.get("theme"));
  const stageId = searchParams.get("stageId") ?? "beginner";
  const stage = getStage(stageId);
  const persona = getPersona(searchParams.get("persona"));

  const [status, setStatus] = useState("loading");
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState("");
  const [eliminated, setEliminated] = useState([]); // detective mode
  const [explanation, setExplanation] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [chapterUnlocked, setChapterUnlocked] = useState(false);
  const [comparisons, setComparisons] = useState([]);
  const [rewards, setRewards] = useState(null);
  const [timeLeft, setTimeLeft] = useState(persona.timerSeconds ?? null);
  const [shakeCard, setShakeCard] = useState(false); // warrior shake
  const [showSplash, setShowSplash] = useState(false); // persona result splash
  const [splashCorrect, setSplashCorrect] = useState(false);
  const timerRef = useRef(null);
  const questionStartRef = useRef(null);

  // Sage simplicity score (live)
  const sageScore = persona.id === "sage" ? simplicityScore(explanation) : 0;

  useEffect(() => {
    fetch(`/api/question?stageId=${stageId}`)
      .then((res) => res.json())
      .then((data) => {
        setQuestion(data);
        questionStartRef.current = Date.now();
        setStatus("question");
      })
      .catch(() => {
        setError("Could not load the question. Is the backend running?");
        setStatus("question");
      });
  }, [stageId]);

  // Warrior countdown timer
  useEffect(() => {
    if (status !== "question" || !persona.timerSeconds) return;
    setTimeLeft(persona.timerSeconds);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [status, persona.timerSeconds]);

  const handleSubmit = async () => {
    if (!selected) { setError("Please choose an answer before submitting."); return; }
    if (explanation.trim() === "") { setError("Please explain your reasoning before submitting."); return; }
    clearInterval(timerRef.current);
    setError("");
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          selectedOption: selected,
          explanation: explanation.trim(),
          personaId: persona.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }

      const elapsedMs = questionStartRef.current ? Date.now() - questionStartRef.current : 0;
      const isCorrect = data.correct;
      const didUnlock = data.chapterUnlocked === true;

      // Show persona splash first, then reveal result card
      setSplashCorrect(isCorrect);
      setShowSplash(true);

      // Warrior: shake card on wrong answer (after splash)
      if (persona.id === "warrior" && !isCorrect) {
        setTimeout(() => {
          setShakeCard(true);
          setTimeout(() => setShakeCard(false), 600);
        }, 2900);
      }

      setChapterUnlocked(didUnlock);
      setResult(data);

      const league = loadLeague(INITIAL_LEAGUE_DATA);
      const sorted = [...league].sort((a, b) => b.coins - a.coins);
      const playerRank = sorted.findIndex((u) => u.isPlayer) + 1;

      const earned = computeRewards({ correct: isCorrect, elapsedMs, stageId, rank: playerRank || 15 });
      setRewards(earned);

      if (isCorrect && earned.coins > 0) {
        const prof = loadProfile();
        saveProfile({
          ...prof,
          totalCoins: (prof.totalCoins ?? 0) + earned.coins,
          totalXp: (prof.totalXp ?? 0) + earned.xp,
          leagueCoins: (prof.leagueCoins ?? 0) + earned.coins,
          completedStageIds: prof.completedStageIds
            ? prof.completedStageIds.includes(stageId)
              ? prof.completedStageIds
              : [...prof.completedStageIds, stageId]
            : [stageId],
        });
        saveLeague(league.map((u) => u.isPlayer ? { ...u, coins: (u.coins ?? 0) + earned.coins } : u));
      }

      const streak = loadStreak();
      saveStreak(markTodayComplete(streak));

      const updatedAttempts = saveAttempt({
        questionId: question.id, themeId: theme.id, stageId,
        correct: isCorrect, chapterUnlocked: didUnlock, elapsedMs,
        coinsEarned: earned.coins, xpEarned: earned.xp,
      });
      setComparisons(buildComparisons(updatedAttempts));
      // status is set to "result" after splash finishes via handleSplashDone

      if (!isCorrect && question) {
        const selectedOpt = question.options.find((o) => o.id === selected);
        const correctOpt = question.options.find((o) => o.id === question.correctOption);
        const mistake = {
          id: `${question.id}-${selected}-${Date.now()}`,
          questionId: question.id, questionText: question.question,
          selectedOption: selected, selectedText: selectedOpt?.text ?? selected,
          correctOption: question.correctOption, correctText: correctOpt?.text ?? question.correctOption,
          concept: question.concept ?? "Key concept", correction: data.explanation,
          themeId: theme.id, savedAt: new Date().toISOString(),
        };
        const existing = JSON.parse(localStorage.getItem("ql_mistakes") ?? "[]");
        localStorage.setItem("ql_mistakes", JSON.stringify([
          mistake,
          ...existing.filter((m) => !(m.questionId === mistake.questionId && m.selectedOption === mistake.selectedOption)),
        ]));
      }
    } catch {
      setError("Network error — please check your connection.");
    }
  };

  // Detective: toggle elimination on right-click
  const handleOptionRightClick = (e, optId) => {
    if (persona.id !== "detective") return;
    e.preventDefault();
    setEliminated((prev) =>
      prev.includes(optId) ? prev.filter((id) => id !== optId) : [...prev, optId]
    );
  };

  const handleSplashDone = useCallback(() => {
    setShowSplash(false);
    setStatus("result");
  }, []);

  const resetQuestion = () => {
    setSelected(""); setExplanation(""); setResult(null); setError("");
    setChapterUnlocked(false); setRewards(null);
    setTimeLeft(persona.timerSeconds ?? null); setEliminated([]);
    setStatus("question");
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
    return (
      <PageTransition className={`mission-wrapper persona-bg--${persona.id}`}>
        <p className="loading-text">Loading your mission…</p>
      </PageTransition>
    );
  }

  // ── Persona splash screen (shown right after submit) ─────────────────────
  if (showSplash) {
    return <PersonaResultScreen personaId={persona.id} correct={splashCorrect} onDone={handleSplashDone} />;
  }

  // ── WARRIOR: giant timer overlay at top ──────────────────────────────────
  const WarriorTimer = () => {
    if (persona.id !== "warrior" || timeLeft === null) return null;
    const urgent = timeLeft <= 10;
    const pct = Math.round((timeLeft / persona.timerSeconds) * 100);
    return (
      <div className={`warrior-timer-block ${urgent ? "warrior-timer-block--urgent" : ""}`}>
        <div className="warrior-timer-ring">
          <svg viewBox="0 0 56 56" className="warrior-ring-svg">
            <circle cx="28" cy="28" r="24" className="warrior-ring-bg" />
            <circle
              cx="28" cy="28" r="24"
              className="warrior-ring-fill"
              style={{
                strokeDasharray: `${2 * Math.PI * 24}`,
                strokeDashoffset: `${2 * Math.PI * 24 * (1 - pct / 100)}`,
                stroke: urgent ? "#ef4444" : "#f59e0b",
              }}
            />
          </svg>
          <span className="warrior-timer-num">{timeLeft}</span>
        </div>
        <span className="warrior-timer-label">{urgent ? "⚔️ STRIKE NOW!" : "⚔️ Seconds left"}</span>
      </div>
    );
  };

  // ── SAGE: simplicity meter ───────────────────────────────────────────────
  const SageMeter = () => {
    if (persona.id !== "sage") return null;
    const label = sageScore < 25 ? "Too complex" : sageScore < 50 ? "Getting clearer…" : sageScore < 75 ? "Good simplicity!" : "Crystal clear! 🌿";
    return (
      <div className="sage-meter">
        <div className="sage-meter-header">
          <span className="sage-meter-label">🌿 Simplicity Score</span>
          <span className="sage-meter-pct" style={{ color: sageScore >= 75 ? "#34d399" : sageScore >= 50 ? "#a3e635" : "#94a3b8" }}>{sageScore}%</span>
        </div>
        <div className="sage-meter-bar">
          <div className="sage-meter-fill" style={{ width: `${sageScore}%`, background: sageScore >= 75 ? "#34d399" : sageScore >= 50 ? "#a3e635" : "#64748b" }} />
        </div>
        <p className="sage-meter-hint">{label}</p>
      </div>
    );
  };

  // ── RESULT PAGE ───────────────────────────────────────────────────────────
  if (status === "result" && result) {
    return (
      <PageTransition className={`mission-wrapper persona-bg--${persona.id}`}>
        <div className={`card result-card persona-card-theme--${persona.id}`}>
          <StoryHeader />
          <div className="persona-badge" style={{ borderColor: persona.accent, color: persona.accent, background: persona.accentDim }}>
            {persona.emoji} {persona.name} Mode
          </div>
          <h2 className="result-title" style={{ color: persona.accent }}>
            {!result.correct
              ? result.personaFailMsg ?? "Mission Failed"
              : chapterUnlocked
              ? result.personaChapterMsg ?? "Chapter Unlocked! 🔓"
              : result.personaSuccessMsg ?? "Answer Correct!"}
          </h2>
          <p className={`result-feedback ${result.correct ? "correct" : "incorrect"}`}>{result.feedback}</p>

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
              <button className="primary" onClick={resetQuestion}>🔄 Try Again</button>
            )}
            {!result.correct && (<button className="secondary" onClick={() => navigate("/museum")}>🏛️ Visit Museum</button>)}
            <button className="secondary" onClick={() => navigate("/dashboard")}>📊 Dashboard</button>
            {stageId !== "beginner"
              ? <button className="secondary" onClick={() => navigate("/stages")}>🗺️ Stage Map</button>
              : <button className="secondary" onClick={() => navigate("/")}>🏠 Home</button>}
          </div>
        </div>
      </PageTransition>
    );
  }

  // ── QUESTION PAGE ─────────────────────────────────────────────────────────
  return (
    <PageTransition className={`mission-wrapper persona-bg--${persona.id}`}>
      <div className={`card mission-card persona-card-theme--${persona.id} ${shakeCard ? "shake-anim" : ""}`}>
        <button className="back-btn" onClick={() => navigate(stageId !== "beginner" ? "/stages" : "/")}>
          {stageId !== "beginner" ? "← Back to Stage Map" : "← Back to Home"}
        </button>

        {/* ── WARRIOR: giant timer ── */}
        <WarriorTimer />

        {/* ── DETECTIVE: case file header ── */}
        {persona.id === "detective" && (
          <div className="detective-header">
            <span className="detective-stamp">CASE FILE</span>
            <p className="detective-tip">💡 Right-click any option to eliminate it as a suspect</p>
          </div>
        )}

        {/* ── SCIENTIST: lab report header ── */}
        {persona.id === "scientist" && (
          <div className="scientist-header">
            <span className="scientist-tag">🔬 LAB REPORT</span>
            <span className="scientist-id">Experiment #{question?.id ?? "—"}</span>
          </div>
        )}

        {/* ── WIZARD: mystical scroll header ── */}
        {persona.id === "wizard" && (
          <div className="wizard-header">
            <span className="wizard-rune">✦ ✦ ✦</span>
            <span className="wizard-tag">Ancient Scroll of Knowledge</span>
            <span className="wizard-rune">✦ ✦ ✦</span>
          </div>
        )}

        {/* ── Persona banner (non-warrior, non-detective non-scientist non-wizard) ── */}
        {!["warrior","detective","scientist","wizard"].includes(persona.id) && (
          <div className="persona-banner" style={{ borderColor: persona.accent, background: persona.accentDim }}>
            <span className="persona-banner-name" style={{ color: persona.accent }}>{persona.emoji} {persona.name} Mode</span>
            <span className="persona-banner-desc">{persona.description}</span>
          </div>
        )}

        <StoryHeader />
        <h2 className="mission-heading" style={{ color: persona.accent }}>Mission — {stage.name}</h2>

        {/* Question block — styled differently per persona */}
        <p className={`question-text question-text--${persona.id}`}>{question?.question}</p>

        {/* Options */}
        <div className="options-list">
          {question?.options.map((opt) => {
            const isEliminated = eliminated.includes(opt.id);
            const isSelected = selected === opt.id;
            return (
              <button
                key={opt.id}
                className={[
                  "option-btn",
                  isSelected ? "selected" : "",
                  isEliminated ? "option-eliminated" : "",
                  `option-btn--${persona.id}`,
                ].join(" ")}
                onClick={() => !isEliminated && setSelected(opt.id)}
                onContextMenu={(e) => handleOptionRightClick(e, opt.id)}
                disabled={isEliminated && !isSelected}
              >
                {/* Wizard: scroll icon */}
                {persona.id === "wizard" && <span className="wizard-scroll-icon">📜</span>}
                {/* Detective: eliminated marker */}
                {persona.id === "detective" && isEliminated && <span className="detective-eliminated-x">✕</span>}
                <span className={`option-id option-id--${persona.id}`}>{opt.id}</span>
                <span className={`option-text ${isEliminated ? "option-text--eliminated" : ""}`}>{opt.text}</span>
                {/* Scientist: evidence tag */}
                {persona.id === "scientist" && isSelected && <span className="scientist-evidence-tag">◉ Selected as Evidence</span>}
              </button>
            );
          })}
        </div>

        {/* Detective: eliminated count */}
        {persona.id === "detective" && eliminated.length > 0 && (
          <p className="detective-eliminated-count">🕵️ {eliminated.length} suspect{eliminated.length > 1 ? "s" : ""} eliminated — right-click again to restore</p>
        )}

        {/* Explanation input */}
        <label className="explanation-label" htmlFor="explanation" style={{ color: persona.accent }}>
          {persona.promptLabel}
        </label>
        <textarea
          id="explanation"
          className={`explanation-input explanation-input--${persona.id}`}
          rows={4}
          placeholder={persona.placeholder}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          disabled={persona.timerSeconds && timeLeft === 0}
        />

        {/* Sage: live simplicity meter */}
        <SageMeter />

        {persona.timerSeconds && timeLeft === 0 && (
          <p className="persona-timer-expired">⏱ Time's up, Warrior! You can still submit what you have.</p>
        )}
        {error && <p className="error-msg">{error}</p>}
        <button
          className={`primary submit-btn submit-btn--${persona.id}`}
          onClick={handleSubmit}
          disabled={!selected || explanation.trim() === ""}
        >
          {persona.id === "scientist" && "🔬 Submit Hypothesis"}
          {persona.id === "detective" && "🕵️ Close the Case"}
          {persona.id === "wizard"    && "🧙 Cast the Spell"}
          {persona.id === "warrior"   && "⚔️ Strike!"}
          {persona.id === "sage"      && "🌿 Share Wisdom"}
        </button>
      </div>
    </PageTransition>
  );
}

export default MissionPage;
