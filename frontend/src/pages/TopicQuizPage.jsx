import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { loadProfile, loadStreak, markTodayComplete, saveAttempt, saveProfile, saveStreak } from "../data/progress.js";
import "./TopicQuizPage.css";

const BATCH_SIZE = 5;
const SECONDS_PER_QUESTION = 30;

function TopicQuizPage() {
  const navigate = useNavigate();
  const { subtopicId } = useParams();
  const { state } = useLocation();
  const subtopicName = state?.subtopicName ?? subtopicId;
  const topicName = state?.topicName ?? "";
  const topicEmoji = state?.topicEmoji ?? "📚";

  const [questions, setQuestions] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [difficulty, setDifficulty] = useState("Beginner");
  const [batchNumber, setBatchNumber] = useState(1);
  const [accuracyHistory, setAccuracyHistory] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [checkpoint, setCheckpoint] = useState(null);
  const [phase, setPhase] = useState("loading");
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(SECONDS_PER_QUESTION);
  const timerRef = useRef(null);

  const loadBatch = useCallback(async (nextDifficulty) => {
    setPhase("loading");
    setError("");
    try {
      const params = new URLSearchParams({ subtopicId, subtopicName, difficulty: nextDifficulty });
      const response = await fetch(`/api/quiz/batch?${params.toString()}`);
      if (!response.ok) throw new Error("Batch request failed");
      const data = await response.json();
      if (!Array.isArray(data.questions) || data.questions.length !== BATCH_SIZE) {
        throw new Error("The API returned an incomplete question batch");
      }
      setQuestions(data.questions);
      setQuestionIndex(0);
      setSelectedIndex(null);
      setAnswers([]);
      setRemaining(SECONDS_PER_QUESTION);
      setDifficulty(data.difficulty || nextDifficulty);
      setPhase("quiz");
    } catch (requestError) {
      setError(requestError.message);
      setPhase("error");
    }
  }, [subtopicId, subtopicName]);

  useEffect(() => {
    loadBatch("Beginner");
    return () => clearInterval(timerRef.current);
  }, [loadBatch]);

  useEffect(() => {
    if (phase !== "quiz") return undefined;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemaining((value) => Math.max(value - 1, 0));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, questionIndex]);

  const finishBatch = (batchAnswers) => {
    const correct = batchAnswers.filter(Boolean).length;
    const accuracy = Math.round((correct / BATCH_SIZE) * 100);
    const nextDifficulty = difficulty === "Beginner" && accuracy > 85
      ? "Medium"
      : difficulty === "Medium" && accuracy > 75
        ? "Hard"
        : difficulty;
    const earnedXp = correct * 10 + (accuracy === 100 ? 25 : 0);
    const earnedCoins = correct * 30;
    const nextStreak = correct === BATCH_SIZE ? streak + 1 : 0;
    const profile = loadProfile();
    saveProfile({
      ...profile,
      totalCoins: (profile.totalCoins ?? 0) + earnedCoins,
      totalXp: (profile.totalXp ?? 0) + earnedXp,
      leagueCoins: (profile.leagueCoins ?? 0) + earnedCoins,
    });
    const updatedStreak = markTodayComplete(loadStreak());
    saveStreak(updatedStreak);
    setAccuracyHistory((history) => [...history, accuracy]);
    setDifficulty(nextDifficulty);
    setXp((value) => value + earnedXp);
    setStreak(nextStreak);
    setCheckpoint({ accuracy, correct, earnedXp, nextDifficulty });
    setPhase("checkpoint");
  };

  const confirmAnswer = () => {
    if (selectedIndex === null) return;
    const currentQuestion = questions[questionIndex];
    const isCorrect = selectedIndex === currentQuestion.correctAnswerIndex;
    const batchAnswers = [...answers, isCorrect];
    saveAttempt({
      questionId: currentQuestion.id,
      themeId: subtopicId,
      correct: isCorrect,
      elapsedMs: (SECONDS_PER_QUESTION - remaining) * 1000,
    });
    if (!isCorrect) {
      const selectedText = currentQuestion.options[selectedIndex];
      const correctText = currentQuestion.options[currentQuestion.correctAnswerIndex];
      const mistakes = JSON.parse(localStorage.getItem("ql_mistakes") ?? "[]");
      mistakes.unshift({
        id: `${currentQuestion.id}-${Date.now()}`,
        questionId: currentQuestion.id,
        questionText: currentQuestion.question,
        selectedOption: String.fromCharCode(65 + selectedIndex),
        selectedText,
        correctOption: String.fromCharCode(65 + currentQuestion.correctAnswerIndex),
        correctText,
        concept: subtopicName,
        correction: currentQuestion.explanation,
        themeId: subtopicId,
        savedAt: new Date().toISOString(),
      });
      localStorage.setItem("ql_mistakes", JSON.stringify(mistakes));
    }
    setAnswers(batchAnswers);
    if (questionIndex === BATCH_SIZE - 1) {
      finishBatch(batchAnswers);
      return;
    }
    setQuestionIndex((index) => index + 1);
    setSelectedIndex(null);
    setRemaining(SECONDS_PER_QUESTION);
  };

  const currentQuestion = questions[questionIndex];
  const timerWarn = remaining <= 10;

  if (phase === "loading") {
    return <div className="tqp-wrapper"><p className="tqp-loading">Generating your {difficulty} quiz...</p></div>;
  }

  if (phase === "error") {
    return <div className="tqp-wrapper"><div className="card tqp-error-card"><p className="tqp-error">{error}</p><button className="secondary" onClick={() => loadBatch(difficulty)}>Try Again</button></div></div>;
  }

  if (phase === "checkpoint") {
    return (
      <div className="tqp-wrapper"><div className="tqp-content"><div className="card tqp-card">
        <div className="tqp-header"><button className="back-btn" onClick={() => navigate("/topics")}>Back to Topics</button><span className="tqp-breadcrumb">{topicEmoji} {subtopicName}</span></div>
        <div className="tqp-checkpoint"><p className="tqp-kicker">Checkpoint {batchNumber} complete</p><h1>{checkpoint.accuracy}% accuracy</h1><p>{checkpoint.correct} of {BATCH_SIZE} correct - +{checkpoint.earnedXp} XP - Streak {streak}</p><p>Next difficulty: <strong>{checkpoint.nextDifficulty}</strong></p><button className="primary" onClick={() => { setBatchNumber((number) => number + 1); loadBatch(checkpoint.nextDifficulty); }}>Start Next Batch</button></div>
      </div></div></div>
    );
  }

  return (
    <div className="tqp-wrapper"><div className="tqp-content"><div className="card tqp-card">
      <div className="tqp-header"><button className="back-btn" onClick={() => navigate("/topics")}>Back to Topics</button><div className="tqp-breadcrumb"><span className="tqp-topic">{topicEmoji} {topicName}</span><span className="tqp-sep">&gt;</span><span className="tqp-subtopic">{subtopicName}</span></div><div className="tqp-header-meta">Batch {batchNumber} · Question {questionIndex + 1}/{BATCH_SIZE} · {difficulty} · {xp} XP</div></div>
      <div className="tqp-progress-track"><div className="tqp-progress-fill" style={{ width: `${((questionIndex + 1) / BATCH_SIZE) * 100}%` }} /></div>
      <div className="tqp-timer-row"><div className={`tqp-timer-wrap ${timerWarn ? "tqp-timer-wrap--warn" : ""}`}><div className="tqp-timer-fill" style={{ width: `${(remaining / SECONDS_PER_QUESTION) * 100}%` }} /></div><span className="tqp-timer-label">{remaining}s</span></div>
      {currentQuestion && <div className="tqp-question-area"><p className="tqp-question-text">{currentQuestion.question}</p><div className="tqp-options">{currentQuestion.options.map((option, index) => <button key={`${currentQuestion.id}-${index}`} className={`option-btn ${selectedIndex === index ? "selected" : ""}`} onClick={() => setSelectedIndex(index)} disabled={selectedIndex !== null}><span className="option-id">{String.fromCharCode(65 + index)}</span><span className="option-text">{option}</span></button>)}</div>{selectedIndex !== null && <div className="tqp-explanation"><strong>{selectedIndex === currentQuestion.correctAnswerIndex ? "Correct" : "Explanation"}</strong><p>{currentQuestion.explanation}</p>{currentQuestion.hint && <small>Hint: {currentQuestion.hint}</small>}</div>}<button className="primary tqp-confirm-btn" onClick={confirmAnswer} disabled={selectedIndex === null}>{questionIndex === BATCH_SIZE - 1 ? "Complete Checkpoint" : "Next Question"}</button></div>}
    </div></div></div>
  );
}

export default TopicQuizPage;
