// dailyChallenge.js — localStorage helpers for the Daily Challenge feature.
//
// localStorage key: "ql_daily_challenge"
//
// Shape:
//   {
//     date:             string   — YYYY-MM-DD of the last completed challenge
//     streak:           number   — consecutive days the challenge was completed
//     longestStreak:    number   — all-time high streak
//     completedDates:   string[] — every YYYY-MM-DD the challenge was completed
//     coinBank:         number   — total BobCoins earned through daily challenges
//     lifelinesUsed:    { [date]: number } — lifelines used per day (max 2/day)
//   }

import { todayStr } from "./progress.js";

const DC_KEY = "ql_daily_challenge";

const DEFAULT_DC = {
  date: null,
  streak: 0,
  longestStreak: 0,
  completedDates: [],
  coinBank: 0,
  lifelinesUsed: {},
};

export function loadDailyChallenge() {
  try {
    return { ...DEFAULT_DC, ...JSON.parse(localStorage.getItem(DC_KEY) ?? "{}") };
  } catch {
    return { ...DEFAULT_DC };
  }
}

export function saveDailyChallenge(dc) {
  localStorage.setItem(DC_KEY, JSON.stringify(dc));
}

/** Returns true if the user has already completed today's challenge. */
export function hasDoneToday(dc) {
  return dc.completedDates.includes(todayStr());
}

/** How many lifelines have been used today (max 2 per day). */
export function lifelinesUsedToday(dc) {
  return dc.lifelinesUsed[todayStr()] ?? 0;
}

/**
 * Records a completed daily challenge for today.
 * @param {object} dc        — current daily challenge state
 * @param {number} coinsEarned — coins to award
 * @returns {object} updated state (caller must saveDailyChallenge)
 */
export function markDailyChallengeComplete(dc, coinsEarned = 0) {
  const today = todayStr();
  if (dc.completedDates.includes(today)) return dc; // idempotent

  // Compute streak: if last completion was yesterday, extend; else restart
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const newStreak =
    dc.date === yesterday ? dc.streak + 1 : 1;
  const newLongest = Math.max(dc.longestStreak, newStreak);

  return {
    ...dc,
    date: today,
    streak: newStreak,
    longestStreak: newLongest,
    completedDates: [...dc.completedDates, today],
    coinBank: dc.coinBank + coinsEarned,
  };
}

/**
 * Records a lifeline use for today.
 * @param {object} dc
 * @returns {object} updated state (caller must saveDailyChallenge)
 */
export function useLifeline(dc) {
  const today = todayStr();
  const used = dc.lifelinesUsed[today] ?? 0;
  return {
    ...dc,
    lifelinesUsed: { ...dc.lifelinesUsed, [today]: used + 1 },
  };
}

/**
 * Computes the BobCoin reward for a daily challenge.
 * Base reward + streak bonus.
 * @param {number} correctCount
 * @param {number} totalCount
 * @param {number} streak
 * @param {number} lifelinesUsedCount
 * @returns {{ coins: number, breakdown: { label: string, coins: number }[] }}
 */
export function computeDailyChallengeReward(correctCount, totalCount, streak, lifelinesUsedCount) {
  const breakdown = [];
  let coins = 0;

  // Base: 20 coins per correct answer
  const base = correctCount * 20;
  if (base > 0) {
    breakdown.push({ label: `${correctCount} correct answers`, coins: base });
    coins += base;
  }

  // Perfect score bonus
  if (correctCount === totalCount) {
    breakdown.push({ label: "Perfect score bonus", coins: 50 });
    coins += 50;
  }

  // Streak bonus (multiplicative tiers)
  let streakBonus = 0;
  if (streak >= 7) streakBonus = 100;
  else if (streak >= 3) streakBonus = 50;
  else if (streak >= 2) streakBonus = 25;
  if (streakBonus > 0) {
    breakdown.push({ label: `${streak}-day streak bonus`, coins: streakBonus });
    coins += streakBonus;
  }

  // Lifeline penalty: -15 coins per lifeline used
  const penalty = lifelinesUsedCount * 15;
  if (penalty > 0) {
    breakdown.push({ label: `Lifeline penalty (×${lifelinesUsedCount})`, coins: -penalty });
    coins = Math.max(0, coins - penalty);
  }

  return { coins, breakdown };
}

/** Resets daily challenge demo data. */
export function resetDailyChallengeDemo() {
  localStorage.removeItem(DC_KEY);
}
