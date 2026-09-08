// quizResults.js — helpers for computing quiz results, weak/strong areas,
// and post-quiz recommendations.
//
// Used by: TopicQuizPage → PostQuizResultsPage
//
// quizResultsShape:
//   {
//     results:    QuestionResult[]
//     correct:    number
//     total:      number
//     score:      number   (0–100)
//     elapsedMs:  number
//     subtopicId: string
//     subtopicName: string
//     topicId:    string
//     topicName:  string
//   }
//
// QuestionResult (from API):
//   { questionId, question, options, selectedOption,
//     correctOption, correct, explanation, concept,
//     topicId, subtopicId, subtopicName }

const RESULTS_KEY = "ql_quiz_results";

/** Saves the most recent quiz results for the post-quiz page. */
export function saveQuizResults(results) {
  localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
}

/** Loads the last saved quiz results, or null. */
export function loadQuizResults() {
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Derives weak and strong areas from a list of QuestionResult objects.
 *
 * Groups by subtopicName. A subtopic is "strong" if accuracy >= 70%,
 * "weak" if accuracy < 70%.
 *
 * @param {object[]} results — QuestionResult array
 * @returns {{ strong: SubtopicSummary[], weak: SubtopicSummary[] }}
 */
export function computeAreas(results) {
  const map = {};
  for (const r of results) {
    const key = r.subtopicId ?? r.topicId ?? "unknown";
    if (!map[key]) {
      map[key] = {
        id: key,
        name: r.subtopicName ?? r.topicId ?? "Unknown",
        topicName: r.topicName ?? "",
        correct: 0,
        total: 0,
      };
    }
    map[key].total++;
    if (r.correct) map[key].correct++;
  }

  const summaries = Object.values(map).map((s) => ({
    ...s,
    accuracy: Math.round((s.correct / s.total) * 100),
  }));

  return {
    strong: summaries.filter((s) => s.accuracy >= 70).sort((a, b) => b.accuracy - a.accuracy),
    weak:   summaries.filter((s) => s.accuracy < 70).sort((a, b) => a.accuracy - b.accuracy),
  };
}

/**
 * Generates recommended next actions based on weak areas.
 *
 * @param {{ strong, weak }} areas — from computeAreas
 * @returns {string[]} — list of recommendation strings
 */
export function buildRecommendations(areas) {
  const recs = [];

  if (areas.weak.length === 0 && areas.strong.length > 0) {
    recs.push("🏆 Excellent work! You've mastered all subtopics in this quiz.");
    recs.push("💡 Try the next difficulty level or attempt a Boss-level mission.");
    return recs;
  }

  for (const w of areas.weak) {
    recs.push(`📚 Revise "${w.name}" — you scored ${w.accuracy}%. Practice this subtopic again to strengthen your understanding.`);
  }

  if (areas.strong.length > 0) {
    const topStrong = areas.strong[0];
    recs.push(`✅ Your strongest area is "${topStrong.name}" at ${topStrong.accuracy}%. Keep it up!`);
  }

  recs.push("🔥 Complete the Daily Challenge today to maintain your learning streak.");

  return recs;
}
