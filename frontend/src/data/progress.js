// progress.js — localStorage helpers for tracking attempt history.
//
// localStorage key: "ql_attempts"
//
// Each attempt object shape:
//   {
//     id:            string   — unique: questionId + timestamp
//     questionId:    number
//     themeId:       string
//     correct:       boolean
//     chapterUnlocked: boolean
//     elapsedMs:     number   — milliseconds from question load to submit
//     savedAt:       string   — ISO date string
//   }
//
// Accuracy for a session = (correct attempts / total attempts) * 100
// Average time           = mean of elapsedMs across all attempts

const STORAGE_KEY = "ql_attempts";

// ── Read ─────────────────────────────────────────────────────────────────────

/** Returns the full list of saved attempts, newest first. */
export function loadAttempts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

// ── Write ────────────────────────────────────────────────────────────────────

/**
 * Appends a new attempt to the stored list and returns the updated list.
 * @param {object} attempt  — partial attempt (without id / savedAt)
 * @returns {object[]}       — full updated list
 */
export function saveAttempt(attempt) {
  const existing = loadAttempts();
  const entry = {
    ...attempt,
    id: `${attempt.questionId}-${Date.now()}`,
    savedAt: new Date().toISOString(),
  };
  const updated = [entry, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

/** Removes all stored attempts. */
export function clearAttempts() {
  localStorage.removeItem(STORAGE_KEY);
}

// ── Mistake Museum Helpers ────────────────────────────────────────────────────
const MISTAKES_KEY = "ql_mistakes";

/**
 * Normalizes and compares two mistake entries to check if they represent the same question.
 */

function isSameQuestion(a, b) {
  if (!a || !b) return false;

  // Match by questionId if both have valid IDs
  if (a.questionId != null && b.questionId != null && String(a.questionId).trim() !== "" && String(b.questionId).trim() !== "") {
    if (String(a.questionId).trim() === String(b.questionId).trim()) return true;
  }

  // Match by questionText if both have text
  if (a.questionText && b.questionText) {
    const textA = String(a.questionText).toLowerCase().replace(/\s+/g, " ").trim();
    const textB = String(b.questionText).toLowerCase().replace(/\s+/g, " ").trim();
    if (textA && textB && textA === textB) return true;
  }

  return false;
}

export function loadMistakes() {
  try {
    const raw = JSON.parse(localStorage.getItem(MISTAKES_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];

    // Deduplicate existing entries on load (keeping newest timestamp)
    const deduplicated = [];
    for (const item of raw) {
      if (!item) continue;
      const existingIdx = deduplicated.findIndex((existing) => isSameQuestion(existing, item));
      if (existingIdx === -1) {
        deduplicated.push(item);
      } else {
        const existingTime = new Date(deduplicated[existingIdx].savedAt || 0).getTime();
        const itemTime = new Date(item.savedAt || 0).getTime();
        if (itemTime > existingTime) {
          deduplicated[existingIdx] = item;
        }
      }
    }

    if (deduplicated.length !== raw.length) {
      localStorage.setItem(MISTAKES_KEY, JSON.stringify(deduplicated));
    }
    return deduplicated;
  } catch {
    return [];
  }
}

/**
 * Saves or updates a mistake in local storage.
 * Guarantees each question appears ONLY ONCE.
 * If the mistake was already in the museum, it renews it with fresh attempt data.
 */
export function recordMistake(mistake) {
  const existing = loadMistakes();
  const filtered = existing.filter((m) => !isSameQuestion(m, mistake));

  const newEntry = {
    ...mistake,
    id: mistake.id || `${mistake.questionId ?? "m"}-${Date.now()}`,
    savedAt: new Date().toISOString(),
  };

  const updated = [newEntry, ...filtered];
  localStorage.setItem(MISTAKES_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("storage"));
  return updated;
}

/**
 * Removes a mistake from local storage if the user answers the question correctly.
 */
export function removeMistakeIfCorrect(questionId, questionText) {
  const existing = loadMistakes();
  const dummyTarget = { questionId, questionText };
  const updated = existing.filter((m) => !isSameQuestion(m, dummyTarget));

  if (updated.length !== existing.length) {
    localStorage.setItem(MISTAKES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));
  }
  return updated;
}

// ── Aggregate stats ──────────────────────────────────────────────────────────

/**
 * Computes summary statistics from an array of attempts.
 * @param {object[]} attempts
 * @returns {{ total, correct, accuracy, avgMs, fastestMs, slowestMs }}
 */
export function computeStats(attempts) {
  if (!attempts.length) {
    return { total: 0, correct: 0, accuracy: 0, avgMs: 0, fastestMs: 0, slowestMs: 0 };
  }
  const correct = attempts.filter((a) => a.correct).length;
  const accuracy = Math.round((correct / attempts.length) * 100);
  const times = attempts.map((a) => a.elapsedMs);
  const avgMs = Math.round(times.reduce((s, t) => s + t, 0) / times.length);
  const fastestMs = Math.min(...times);
  const slowestMs = Math.max(...times);
  return { total: attempts.length, correct, accuracy, avgMs, fastestMs, slowestMs };
}

// ── Comparison ───────────────────────────────────────────────────────────────

/**
 * Compares the most recent attempt against the one before it.
 * Returns an array of human-readable comparison strings.
 * Returns an empty array if there are fewer than 2 attempts.
 *
 * @param {object[]} attempts  — newest-first list (as returned by loadAttempts / saveAttempt)
 * @returns {string[]}
 */
export function buildComparisons(attempts) {
  if (attempts.length < 2) return [];

  const current  = attempts[0]; // just saved
  const previous = attempts[1]; // the one before

  const messages = [];

  // ── Accuracy improvement (over the last N attempts window) ──────────────
  // We compare the rolling accuracy *before* and *after* this attempt.
  // "Before" = stats of attempts[1..] (all except the newest)
  // "After"  = stats of attempts[0..] (all including the newest)
  const before = computeStats(attempts.slice(1));
  const after  = computeStats(attempts);

  if (before.total > 0) {
    const accuracyDelta = after.accuracy - before.accuracy;
    if (accuracyDelta > 0) {
      messages.push(`📈 You improved your accuracy by ${accuracyDelta}% (now ${after.accuracy}%).`);
    } else if (accuracyDelta < 0) {
      messages.push(`📉 Your accuracy dropped by ${Math.abs(accuracyDelta)}% (now ${after.accuracy}%).`);
    } else {
      messages.push(`➡️ Your accuracy is holding steady at ${after.accuracy}%.`);
    }
  }

  // ── Speed comparison (this attempt vs. previous attempt) ────────────────
  const timeDeltaMs = current.elapsedMs - previous.elapsedMs;
  const timeDeltaSec = Math.round(Math.abs(timeDeltaMs) / 1000);

  if (timeDeltaMs < -2000) {
    // at least 2 s faster
    messages.push(`⚡ You answered ${timeDeltaSec}s faster than last time.`);
  } else if (timeDeltaMs > 2000) {
    messages.push(`🐢 You took ${timeDeltaSec}s longer than last time.`);
  } else {
    messages.push(`⏱️ Your response time was about the same as last time.`);
  }

  // ── Streak ───────────────────────────────────────────────────────────────
  // Count how many consecutive correct answers end the list (newest first).
  let streak = 0;
  for (const a of attempts) {
    if (a.correct) streak++;
    else break;
  }
  if (streak >= 3) {
    messages.push(`🔥 ${streak}-answer winning streak — keep it up!`);
  } else if (streak === 2) {
    messages.push(`✨ Two correct answers in a row!`);
  }

  return messages;
}

// ── Formatting helpers ───────────────────────────────────────────────────────

/** Formats milliseconds to a "Xs" or "Xm Ys" string. */
export function formatMs(ms) {
  if (!ms && ms !== 0) return "—";
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

// ── Profile ───────────────────────────────────────────────────────────────────
const PROFILE_KEY = "ql_profile";
const DEFAULT_PROFILE = {
  totalCoins: 0,
  totalXp: 0,
  currentStageId: "beginner",
  completedStageIds: [],
  leagueCoins: 0,
  leagueRound: 1,
};

export function loadProfile() {
  try {
    return { ...DEFAULT_PROFILE, ...JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "{}") };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

// ── Rewards ───────────────────────────────────────────────────────────────────
export function computeRewards({ correct, elapsedMs, stageId, rank = 15 }) {
  if (!correct) return { coins: 0, xp: 0, breakdown: [] };
  const breakdown = [];
  let coins = 0;
  let xp = 0;

  breakdown.push({ label: "Correct answer", coins: 50, xp: 20 });
  coins += 50;
  xp += 20;

  // Speed bonus
  let speedCoins = 0;
  if (elapsedMs < 15000) speedCoins = 30;
  else if (elapsedMs < 30000) speedCoins = 20;
  else if (elapsedMs < 60000) speedCoins = 10;
  if (speedCoins > 0) {
    breakdown.push({ label: "Speed bonus", coins: speedCoins, xp: 0 });
    coins += speedCoins;
  }

  // Rank bonus
  let rankCoins = 10;
  if (rank === 1) rankCoins = 100;
  else if (rank <= 3) rankCoins = 60;
  else if (rank <= 10) rankCoins = 30;
  breakdown.push({ label: `Rank #${rank} bonus`, coins: rankCoins, xp: 0 });
  coins += rankCoins;

  // Boss bonus
  if (stageId === "boss") {
    breakdown.push({ label: "Boss Level bonus", coins: 150, xp: 75 });
    coins += 150;
    xp += 75;
  }

  return { coins, xp, breakdown };
}

// ── League ────────────────────────────────────────────────────────────────────
const LEAGUE_KEY = "ql_league";

export function loadLeague(initialData) {
  try {
    const stored = JSON.parse(localStorage.getItem(LEAGUE_KEY) ?? "null");
    if (stored && Array.isArray(stored) && stored.length === 30) return stored;
    return initialData;
  } catch {
    return initialData;
  }
}

export function saveLeague(league) {
  localStorage.setItem(LEAGUE_KEY, JSON.stringify(league));
}

export function simulateEndOfRound(league) {
  const LEVELS = ["Beginner", "Explorer", "Challenger", "Expert", "Boss"];
  const sorted = [...league].sort((a, b) => b.coins - a.coins);
  return sorted.map((user, idx) => {
    const rank = idx + 1;
    const currentLevel = user.leagueLevel ?? "Beginner";
    const li = LEVELS.indexOf(currentLevel);
    let newLevel = currentLevel;
    if (rank <= 15 && li < LEVELS.length - 1) newLevel = LEVELS[li + 1];
    else if (rank >= 26 && li > 0) newLevel = LEVELS[li - 1];
    return { ...user, leagueLevel: newLevel };
  });
}

// ── Streak ────────────────────────────────────────────────────────────────────
//
// localStorage key: "ql_streak"
//
// Shape:
//   {
//     currentStreak:    number   — consecutive calendar days with ≥1 quiz completed
//     longestStreak:    number   — all-time high
//     completedDates:   string[] — YYYY-MM-DD strings, one per day quiz was done
//     lastCompletedDate: string|null
//     rescueUsedDate:   string|null — date on which rescue was already used
//     demoMissedDay:    boolean  — demo flag: treat today as incomplete in UI
//   }

const STREAK_KEY = "ql_streak";

const DEFAULT_STREAK = {
  currentStreak: 0,
  longestStreak: 0,
  completedDates: [],
  lastCompletedDate: null,
  rescueUsedDate: null,
  demoMissedDay: false,
};

/** Returns YYYY-MM-DD for today in local time. */
export function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Returns YYYY-MM-DD for yesterday in local time. */
export function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Loads streak from localStorage, merging with defaults. */
export function loadStreak() {
  try {
    return { ...DEFAULT_STREAK, ...JSON.parse(localStorage.getItem(STREAK_KEY) ?? "{}") };
  } catch {
    return { ...DEFAULT_STREAK };
  }
}

/** Persists streak to localStorage. */
export function saveStreak(streak) {
  localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
}

/**
 * Records that the learner completed a quiz today.
 * Idempotent — calling it twice on the same day is safe.
 * Also clears demoMissedDay so a real completion overrides the demo flag.
 * @param {object} streak — current streak object (from loadStreak)
 * @returns {object} updated streak (not yet persisted — caller must saveStreak)
 */
export function markTodayComplete(streak) {
  const today = todayStr();
  const yesterday = yesterdayStr();

  // Idempotent: if today is already marked, just clear the demo flag and return.
  if (streak.completedDates.includes(today)) {
    return { ...streak, demoMissedDay: false };
  }

  const newDates = [...streak.completedDates, today];

  // Extend streak if last completion was yesterday, or this is the first ever day.
  let newCurrent;
  if (streak.lastCompletedDate === yesterday || streak.currentStreak === 0) {
    newCurrent = streak.currentStreak + 1;
  } else {
    // Gap > 1 day — streak was already broken; restart at 1.
    newCurrent = 1;
  }

  const newLongest = Math.max(streak.longestStreak, newCurrent);

  return {
    ...streak,
    currentStreak: newCurrent,
    longestStreak: newLongest,
    completedDates: newDates,
    lastCompletedDate: today,
    demoMissedDay: false,
  };
}

/**
 * Derives the current display state of the streak (pure — no side effects).
 *
 * Returns:
 *   { state, rescueAvailable }
 *
 * state values:
 *   "new"      — no history yet
 *   "active"   — today's quiz is done
 *   "at-risk"  — today not done, but yesterday was (or streak > 0 and still recoverable)
 *   "broken"   — today not done, yesterday not done, streak is 0
 */
export function computeStreakState(streak) {
  const today = todayStr();
  const yesterday = yesterdayStr();

  const todayDone =
    streak.completedDates.includes(today) && !streak.demoMissedDay;

  const yesterdayDone = streak.completedDates.includes(yesterday);

  if (streak.completedDates.length === 0) {
    return { state: "new", rescueAvailable: false };
  }

  if (todayDone) {
    return { state: "active", rescueAvailable: false };
  }

  // Today not done
  const stillRecoverable = yesterdayDone || streak.currentStreak > 0;
  const rescueAlreadyUsed = streak.rescueUsedDate === today;

  if (stillRecoverable) {
    return {
      state: "at-risk",
      rescueAvailable: !rescueAlreadyUsed,
    };
  }

  return { state: "broken", rescueAvailable: false };
}

/**
 * Demo helper — sets demoMissedDay flag so the UI shows the at-risk state.
 * Does NOT touch completedDates or lastCompletedDate.
 * @param {object} streak
 * @returns {object} updated streak (caller must saveStreak)
 */
export function simulateMissedDay(streak) {
  return { ...streak, demoMissedDay: true };
}

/** Removes all streak data from localStorage (demo reset). */
export function resetStreakDemo() {
  localStorage.removeItem(STREAK_KEY);
}

/**
 * Applies a correct rescue answer:
 *   - marks today complete (extends streak)
 *   - marks rescue as used today
 * @param {object} streak
 * @returns {object} updated streak (caller must saveStreak)
 */
export function applyRescueSuccess(streak) {
  const today = todayStr();
  const updated = markTodayComplete(streak);
  return { ...updated, rescueUsedDate: today };
}

/**
 * Applies a wrong rescue answer:
 *   - resets currentStreak to 0
 *   - marks rescue as used today (no second attempt)
 * @param {object} streak
 * @returns {object} updated streak (caller must saveStreak)
 */
export function applyRescueFailure(streak) {
  const today = todayStr();
  return {
    ...streak,
    currentStreak: 0,
    rescueUsedDate: today,
    demoMissedDay: false,
  };
}
