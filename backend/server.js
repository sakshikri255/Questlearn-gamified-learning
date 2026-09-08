const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3001;

// --- Middleware ---
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// --- Load question data from the JSON file ---
const questions = require("./data/questions.json");

// -------------------------------------------------------
// GET /api/question
// Returns a random question from the given stageId pool.
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

// -------------------------------------------------------
// GET /api/questions/stage/:stageId
// -------------------------------------------------------
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
// GET /api/topics
// Returns all topics with their subtopics (no questions).
// -------------------------------------------------------
app.get("/api/topics", (req, res) => {
  const topicMap = {};
  for (const q of questions) {
    if (!q.topicId) continue;
    if (!topicMap[q.topicId]) {
      topicMap[q.topicId] = {
        id: q.topicId,
        name: q.topicName ?? q.topicId,
        emoji: q.topicEmoji ?? "📚",
        subtopics: {},
      };
    }
    if (!q.subtopicId) continue;
    if (!topicMap[q.topicId].subtopics[q.subtopicId]) {
      topicMap[q.topicId].subtopics[q.subtopicId] = {
        id: q.subtopicId,
        name: q.subtopicName ?? q.subtopicId,
        questionCount: 0,
      };
    }
    topicMap[q.topicId].subtopics[q.subtopicId].questionCount++;
  }
  // Convert subtopics object to array
  const result = Object.values(topicMap).map((t) => ({
    ...t,
    subtopics: Object.values(t.subtopics),
  }));
  res.json(result);
});

// -------------------------------------------------------
// GET /api/quiz/:subtopicId
// Returns all questions for a given subtopic (full data).
// -------------------------------------------------------
app.get("/api/quiz/:subtopicId", (req, res) => {
  const { subtopicId } = req.params;
  const pool = questions.filter((q) => q.subtopicId === subtopicId);
  if (!pool.length) {
    return res.status(404).json({ error: "No questions found for that subtopic." });
  }
  res.json(pool);
});

// -------------------------------------------------------
// GET /api/daily-challenge
// Returns up to 5 questions for today's daily challenge.
// The selection is deterministic for the calendar day so
// the same questions are shown until midnight.
// -------------------------------------------------------
app.get("/api/daily-challenge", (req, res) => {
  const today = new Date();
  const seed =
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate();

  // Simple deterministic shuffle using seed
  const shuffled = [...questions].sort((a, b) => {
    const ha = ((a.id * 2654435761 + seed) >>> 0) % 100000;
    const hb = ((b.id * 2654435761 + seed) >>> 0) % 100000;
    return ha - hb;
  });

  const daily = shuffled.slice(0, 5);
  res.json({ date: today.toISOString().slice(0, 10), questions: daily });
});

// -------------------------------------------------------
// POST /api/submit
// Body: { questionId, selectedOption, explanation }
// -------------------------------------------------------
app.post("/api/submit", (req, res) => {
  const { questionId, selectedOption, explanation } = req.body;

  if (!questionId || !selectedOption || !explanation || explanation.trim() === "") {
    return res.status(400).json({ error: "Please fill in all fields before submitting." });
  }

  const question = questions.find((q) => q.id === Number(questionId));
  if (!question) {
    return res.status(404).json({ error: "Question not found." });
  }

  const isCorrect = selectedOption === question.correctOption;

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
      hint = question.hint || "Great answer! Can you explain a bit more about *why* that is the case?";
    }
  }

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
    correctOption: question.correctOption,
  });
});

// -------------------------------------------------------
// POST /api/quiz/submit-batch
// Body: { answers: [{ questionId, selectedOption }] }
// Returns per-question results + aggregate score.
// Used by the timed topic quiz flow.
// -------------------------------------------------------
app.post("/api/quiz/submit-batch", (req, res) => {
  const { answers } = req.body;
  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: "answers array required." });
  }

  const results = answers.map(({ questionId, selectedOption }) => {
    const q = questions.find((qq) => qq.id === Number(questionId));
    if (!q) return { questionId, error: "not found" };
    const correct = selectedOption === q.correctOption;
    return {
      questionId: q.id,
      question: q.question,
      options: q.options,
      selectedOption,
      correctOption: q.correctOption,
      correct,
      explanation: q.explanation,
      concept: q.concept,
      topicId: q.topicId ?? null,
      subtopicId: q.subtopicId ?? null,
      subtopicName: q.subtopicName ?? null,
    };
  });

  const correct = results.filter((r) => r.correct).length;
  const total = results.length;
  const score = Math.round((correct / total) * 100);

  res.json({ results, correct, total, score });
});

// --- Start the server ---
app.listen(PORT, () => {
  console.log(`QuestLearn backend running at http://localhost:${PORT}`);
});
