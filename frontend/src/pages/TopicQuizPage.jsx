import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import NavBar from "../components/NavBar.jsx";
import { saveQuizResults } from "../data/quizResults.js";
import { loadProfile, saveProfile, loadLeague, saveLeague } from "../data/progress.js";
import INITIAL_LEAGUE_DATA from "../data/leagueData.js";
import "./TopicQuizPage.css";

const SECONDS_PER_QUESTION = 30;

// ── Countdown hook ───────────────────────────────────────────────────────────
function useCountdown(initial, active, onExpire) {
  const [remaining, setRemaining] = useState(initial);
  const ref = useRef(null);

  const reset = useCallback(() => {
    clearInterval(ref.current);
    setRemaining(initial);
  }, [initial]);

  useEffect(() => {
    if (!active) { clearInterval(ref.current); return; }
    ref.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { clearInterval(ref.current); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, [active]);

  useEffect(() => {
    if (remaining === 0 && active) onExpire();
  }, [remaining, active]);

  return { remaining, reset };
}

// ── TopicQuizPage ─────────────────────────────────────────────────────────────
function TopicQuizPage() {
  const navigate    = useNavigate();
  const { subtopicId } = useParams();
  const { state }   = useLocation();

  const subtopicName = state?.subtopicName ?? subtopicId;
  const topicName    = state?.topicName    ?? "";
  const topicEmoji   = state?.topicEmoji   ?? "📚";
  const topicId      = state?.topicId      ?? "";

  const [questions, setQuestions]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState("");

  // Quiz state
  const [qIndex, setQIndex]   = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: selectedOption }
  const [selected, setSelected] = useState("");
  const [phase, setPhase]     = useState("loading"); // "loading" | "quiz" | "submitting"

  const startMs = useRef(Date.now());
  const timerActive = phase === "quiz";

  const handleExpire = useCallback(() => {
    // Time expired — move to next or finish without recording an answer
    goNext(true);
  }, [qIndex, questions.length, answers]);

  const { remaining, reset: resetTimer } = useCountdown(
    SECONDS_PER_QUESTION,
    timerActive,
    handleExpire
  );

  useEffect(() => {
    fetch(`/api/quiz/${subtopicId}`)
      .then((r) => r.json())
      .then((qs) => {
        if (!Array.isArray(qs)) throw new Error("bad");
        setQuestions(qs);
        startMs.current = Date.now();
        setPhase("quiz");
        setLoading(false);
      })
      .catch(() => {
        setFetchError("Could not load quiz questions. Is the backend running?");
        setLoading(false);
      });
  }, [subtopicId]);

  const currentQ = questions[qIndex];

  const goNext = (expired = false) => {
    setSelected("");
    resetTimer();
    const nextIdx = qIndex + 1;
    if (nextIdx >= questions.length) {
      submitQuiz();
    } else {
      setQIndex(nextIdx);
    }
  };

  const handleSelect = (optId) => {
    if (selected) return;
    setSelected(optId);
  };

  const handleConfirm = () => {
    if (!selected) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: selected }));
    goNext(false);
  };

  const submitQuiz = async () => {
    setPhase("submitting");
    const elapsedMs = Date.now() - startMs.current;

    // Build answers array (include all questions; unanswered = "")
    const answersArr = questions.map((q) => ({
      questionId: q.id,
      selectedOption: answers[q.id] ?? "",
    }));

    try {
      const res = await fetch("/api/quiz/submit-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersArr }),
      });
      const data = await res.json();

      // Attach subtopic metadata to each result
      const enriched = {
        ...data,
        elapsedMs,
        subtopicId,
        subtopicName,
        topicId,
        topicName,
      };
      saveQuizResults(enriched);

      // Award coins + XP for correct answers
      const coinsEarned = data.correct * 30;
      const xpEarned    = data.correct * 15;
      if (coinsEarned > 0) {
        const profile = loadProfile();
        const league  = loadLeague(INITIAL_LEAGUE_DATA);
        saveProfile({
          ...profile,
          totalCoins:  (profile.totalCoins ?? 0)  + coinsEarned,
          totalXp:     (profile.totalXp ?? 0)     + xpEarned,
          leagueCoins: (profile.leagueCoins ?? 0) + coinsEarned,
        });
        const updatedLeague = league.map((u) =>
          u.isPlayer ? { ...u, coins: (u.coins ?? 0) + coinsEarned } : u
        );
        saveLeague(updatedLeague);
      }

      navigate("/quiz-results");
    } catch {
      setFetchError("Submission failed — please check your connection.");
      setPhase("quiz");
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="tqp-wrapper">
        <NavBar />
        <p className="tqp-loading">Loading quiz…</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="tqp-wrapper">
        <NavBar />
        <div className="card tqp-error-card">
          <p className="tqp-error">{fetchError}</p>
          <button className="secondary" onClick={() => navigate("/topics")}>← Back to Topics</button>
        </div>
      </div>
    );
  }

  if (phase === "submitting") {
    return (
      <div className="tqp-wrapper">
        <NavBar />
        <p className="tqp-loading">Submitting your answers…</p>
      </div>
    );
  }

  // ── Active quiz ──────────────────────────────────────────────────────────
  const progressPct = (qIndex / questions.length) * 100;
  const timerPct    = (remaining / SECONDS_PER_QUESTION) * 100;
  const timerWarn   = remaining <= 10;

  return (
    <div className="tqp-wrapper">
      <NavBar />
      <div className="tqp-content">
        <div className="card tqp-card">

          {/* Header */}
          <div className="tqp-header">
            <button className="back-btn" onClick={() => navigate("/topics")}>← Topics</button>
            <div className="tqp-breadcrumb">
              <span className="tqp-topic">{topicEmoji} {topicName}</span>
              <span className="tqp-sep">›</span>
              <span className="tqp-subtopic">{subtopicName}</span>
            </div>
          </div>

          {/* Progress */}
          <div className="tqp-progress-row">
            <span className="tqp-progress-label">
              Question {qIndex + 1} of {questions.length}
            </span>
          </div>
          <div className="tqp-progress-track">
            <div className="tqp-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>

          {/* Timer */}
          <div className="tqp-timer-row">
            <div className={`tqp-timer-wrap ${timerWarn ? "tqp-timer-wrap--warn" : ""}`}>
              <div
                className={`tqp-timer-fill ${timerWarn ? "tqp-timer-fill--warn" : ""}`}
                style={{ width: `${timerPct}%` }}
              />
            </div>
            <span className={`tqp-timer-label ${timerWarn ? "tqp-timer-label--warn" : ""}`}>
              ⏱ {remaining}s
            </span>
          </div>

          {/* Question */}
          {currentQ && (
            <div className="tqp-question-area">
              <p className="tqp-question-text">{currentQ.question}</p>

              <div className="tqp-options">
                {currentQ.options.map((opt) => (
                  <button
                    key={opt.id}
                    className={`option-btn ${selected === opt.id ? "selected" : ""}`}
                    onClick={() => handleSelect(opt.id)}
                    disabled={!!selected}
                  >
                    <span className="option-id">{opt.id}</span>
                    <span className="option-text">{opt.text}</span>
                  </button>
                ))}
              </div>

              <button
                className="primary tqp-confirm-btn"
                onClick={handleConfirm}
                disabled={!selected}
              >
                {qIndex + 1 < questions.length ? "Next Question →" : "Finish Quiz ✓"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TopicQuizPage;
