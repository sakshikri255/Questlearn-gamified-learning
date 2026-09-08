const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3001;

// --- Middleware ---
// Allow the Vite dev server (port 5173) to call this API
app.use(cors({ origin: "http://localhost:5173" }));
// Parse incoming JSON request bodies
app.use(express.json());

// --- Load question data from the JSON file ---
const questions = require("./data/questions.json");

// -------------------------------------------------------
// GET /api/question
// Returns the first question (id: 1) for the mission page.
// -------------------------------------------------------
app.get("/api/question", (req, res) => {
  const { stageId } = req.query;
  let pool = stageId ? questions.filter((q) => q.stageId === stageId) : [];
  if (!pool.length) pool = [questions[0]];
  const question = pool[Math.floor(Math.random() * pool.length)];
  if (!question) {
    return res.status(404).json({ error: "No question found." });
  }
  res.json(question);
});

app.get("/api/questions/stage/:stageId", (req, res) => {
  const { stageId } = req.params;
  const result = questions
    .filter((q) => q.stageId === stageId)
    .map(({ id, question, concept }) => ({ id, question, concept }));
  if (!result.length) {
    return res.status(404).json({ error: "No questions found for that stage." });
  }
  res.json(result);
});

// -------------------------------------------------------
// POST /api/submit
// Body: { questionId, selectedOption, explanation }
//
// Returns:
//   {
//     correct:          boolean  — did the user pick the right option?
//     chapterUnlocked:  boolean  — true only when correct AND explanation passes quality checks
//     feedback:         string   — primary result message shown to the user
//     hint:             string   — non-empty only when correct but chapter not unlocked
//     explanation:      string   — the canonical explanation from the question bank
//   }
//
// Explanation quality rules (all stored per-question in questions.json):
//   1. Length must be >= minExplanationLength characters.
//   2. At least one keyword from the `keywords` array must appear in the text
//      (case-insensitive).
// -------------------------------------------------------
app.post("/api/submit", (req, res) => {
  const { questionId, selectedOption, explanation } = req.body;

  // Basic validation
  if (!questionId || !selectedOption || !explanation || explanation.trim() === "") {
    return res.status(400).json({ error: "Please fill in all fields before submitting." });
  }

  // Find the question by id
  const question = questions.find((q) => q.id === Number(questionId));
  if (!question) {
    return res.status(404).json({ error: "Question not found." });
  }

  const isCorrect = selectedOption === question.correctOption;

  // --- Explanation quality check (only relevant when the answer is correct) ---
  let chapterUnlocked = false;
  let hint = "";

  if (isCorrect) {
    const trimmed = explanation.trim();
    const lower = trimmed.toLowerCase();

    const longEnough = trimmed.length >= (question.minExplanationLength ?? 20);
    const hasKeyword = (question.keywords ?? []).some((kw) => lower.includes(kw.toLowerCase()));

    if (longEnough && hasKeyword) {
      chapterUnlocked = true;
    } else {
      // Use the question's own hint, falling back to a generic message
      hint = question.hint || "Great answer! Can you explain a bit more about *why* that is the case?";
    }
  }

  // --- Build feedback message ---
  let feedback;
  if (!isCorrect) {
    feedback = `❌ Not quite. The correct answer was option ${question.correctOption}.`;
  } else if (chapterUnlocked) {
    feedback = "🎉 Correct! Your explanation unlocked the next chapter!";
  } else {
    feedback = "✅ Correct answer! But your explanation needs a little more depth.";
  }

  res.json({
    correct: isCorrect,
    chapterUnlocked,
    feedback,
    hint,
    explanation: question.explanation,
  });
});

// --- Start the server ---
app.listen(PORT, () => {
  console.log(`QuestLearn backend running at http://localhost:${PORT}`);
});
