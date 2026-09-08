const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3001;

// ── Persona definitions (mirrors frontend/src/data/personas.js) ──────────────
const PERSONAS = {
  scientist: { keywords: ["evidence", "because", "therefore", "proves", "data", "fact", "result", "causes", "shows"] },
  detective:  { keywords: ["clue", "suggests", "eliminated", "deduced", "therefore", "ruled out", "process", "conclude", "because"] },
  wizard:     { keywords: ["like", "similar", "imagine", "think of", "as if", "analogy", "compared", "just as", "metaphor"] },
  warrior:    { keywords: ["because", "therefore", "directly", "means", "result", "so", "causes", "leads to"] },
  sage:       { keywords: ["simply", "basically", "means", "think of", "in other words", "example", "like", "so", "because", "this works"] },
};

const PERSONA_MESSAGES = {
  scientist: { success: "🔬 Hypothesis confirmed, Scientist!", chapter: "🔬 Peer-reviewed and approved! Chapter unlocked.", fail: "🔬 Your hypothesis needs more evidence, Scientist." },
  detective:  { success: "🕵️ Case solved, Detective!",          chapter: "🕵️ The mystery is cracked! Chapter unlocked.",    fail: "🕵️ The case remains open. Your deduction needs work." },
  wizard:     { success: "🧙 The spell is cast! Wisdom accepted.", chapter: "🧙 A legendary spell! Chapter unlocked.",        fail: "🧙 Your magic lacks a metaphor. Try an analogy." },
  warrior:    { success: "⚔️ Swift and decisive! Victory is yours.", chapter: "⚔️ A legendary strike! Chapter unlocked.",    fail: "⚔️ Hesitation costs the battle. Try again, Warrior." },
  sage:       { success: "🌿 Beautifully clear! Your student would understand.", chapter: "🌿 Wisdom shared and understood! Chapter unlocked.", fail: "🌿 A true Sage simplifies. Avoid jargon and keep it clear." },
};

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
  const { questionId, selectedOption, explanation, personaId } = req.body;

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

  // --- Explanation quality check ---
  // Merge question-level keywords with persona-specific keywords
  const personaData = PERSONAS[personaId] ?? null;
  const personaMsgs = PERSONA_MESSAGES[personaId] ?? null;

  const questionKeywords = question.keywords ?? [];
  const personaKeywords  = personaData ? personaData.keywords : [];
  // Must satisfy BOTH: at least one question keyword AND at least one persona keyword (if persona is set)
  const allKeywords = [...new Set([...questionKeywords, ...personaKeywords])];

  let chapterUnlocked = false;
  let hint = "";

  if (isCorrect) {
    const trimmed = explanation.trim();
    const lower = trimmed.toLowerCase();

    const longEnough = trimmed.length >= (question.minExplanationLength ?? 20);
    const hasQuestionKeyword = questionKeywords.length === 0 || questionKeywords.some((kw) => lower.includes(kw.toLowerCase()));
    const hasPersonaKeyword  = personaKeywords.length === 0  || personaKeywords.some((kw) => lower.includes(kw.toLowerCase()));

    if (longEnough && hasQuestionKeyword && hasPersonaKeyword) {
      chapterUnlocked = true;
    } else {
      if (!hasPersonaKeyword && personaData) {
        hint = `${personaMsgs?.fail ?? "Good answer!"} Try using words that fit the ${personaId} style (e.g. ${personaKeywords.slice(0, 3).join(", ")}).`;
      } else {
        hint = question.hint || "Great answer! Can you explain a bit more about *why* that is the case?";
      }
    }
  }

  // --- Build feedback message (persona-flavoured) ---
  let feedback;
  if (!isCorrect) {
    feedback = `❌ Not quite. The correct answer was option ${question.correctOption}.`;
  } else if (chapterUnlocked) {
    feedback = personaMsgs ? personaMsgs.chapter : "🎉 Correct! Your explanation unlocked the next chapter!";
  } else {
    feedback = "✅ Correct answer! But your explanation needs a little more depth.";
  }

  res.json({
    correct: isCorrect,
    chapterUnlocked,
    feedback,
    hint,
    explanation: question.explanation,
    personaSuccessMsg: personaMsgs?.success ?? null,
    personaChapterMsg: personaMsgs?.chapter ?? null,
    personaFailMsg:    personaMsgs?.fail    ?? null,
  });
});

// --- Start the server ---
app.listen(PORT, () => {
  console.log(`QuestLearn backend running at http://localhost:${PORT}`);
});
