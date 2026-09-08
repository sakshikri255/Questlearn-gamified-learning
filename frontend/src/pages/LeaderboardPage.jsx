import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import INITIAL_LEAGUE_DATA from "../data/leagueData.js";
import {
  loadLeague,
  saveLeague,
  simulateEndOfRound,
  loadProfile,
  saveProfile,
  loadAttempts,
  computeStats,
} from "../data/progress.js";
import "./LeaderboardPage.css";

function getZoneLabel(rank) {
  if (rank <= 15) return { label: "Promoted", className: "zone-pill zone-pill--promoted" };
  if (rank <= 25) return { label: "Stay", className: "zone-pill zone-pill--neutral" };
  return { label: "Relegated", className: "zone-pill zone-pill--relegated" };
}

/** Computes a composite score: accuracy (0-100) weighted 70% + speed (0-100) weighted 30%.
 *  Speed score is derived from average answer time: ≤15s = 100, ≥120s = 0. */
function computeCompositeScore(accuracy, avgMs) {
  const speedScore = avgMs <= 0 ? 0 : Math.max(0, Math.min(100, Math.round(((120000 - avgMs) / 105000) * 100)));
  return Math.round(accuracy * 0.7 + speedScore * 0.3);
}

function LeaderboardPage() {
  const navigate = useNavigate();
  const [league, setLeague] = useState(() => loadLeague(INITIAL_LEAGUE_DATA));
  const [profile, setProfile] = useState(() => loadProfile());
  const [simMessage, setSimMessage] = useState("");

  // Compute the player's composite score from attempt history
  const playerAttempts = loadAttempts();
  const playerStats    = computeStats(playerAttempts);
  const playerScore    = computeCompositeScore(playerStats.accuracy, playerStats.avgMs);

  // Assign a composite score to each league entry.
  // NPCs get a deterministic score based on their coin total (for display).
  const leagueWithScores = league.map((u) => {
    if (u.isPlayer) return { ...u, score: playerScore };
    // NPC score: derived from coins so ranking feels consistent
    const npcAccuracy = Math.min(100, 40 + Math.round((u.coins / 5000) * 60));
    const npcAvgMs    = Math.max(8000, 120000 - u.coins * 20);
    return { ...u, score: computeCompositeScore(npcAccuracy, npcAvgMs) };
  });

  // Sort by score descending, then coins as tiebreaker
  const sorted = [...leagueWithScores].sort((a, b) => b.score - a.score || b.coins - a.coins);

  function handleSimulate() {
    const updated = simulateEndOfRound(league);
    saveLeague(updated);
    setLeague(updated);
    const newProfile = { ...profile, leagueRound: (profile.leagueRound ?? 1) + 1 };
    saveProfile(newProfile);
    setProfile(newProfile);
    setSimMessage(`Round ${profile.leagueRound ?? 1} complete! League levels updated.`);
    setTimeout(() => setSimMessage(""), 4000);
  }

  return (
    <div className="lb-wrapper">
      <div className="lb-inner">

        {/* ── Page header ─────────────────────────────── */}
        <div className="lb-header">
          <button className="back-btn" onClick={() => navigate("/")}>← Back to Home</button>
          <h1 className="lb-title">🏆 Quest League A</h1>
          <p className="lb-subtitle">Round {profile.leagueRound ?? 1} · 30 players</p>
        </div>

        {/* ── Zone legend ──────────────────────────────── */}
        <div className="lb-legend">
          <span className="zone-pill zone-pill--promoted">Rank 1–15: Promoted ↑</span>
          <span className="zone-pill zone-pill--neutral">Rank 16–25: Stay →</span>
          <span className="zone-pill zone-pill--relegated">Rank 26–30: Relegated ↓</span>
        </div>

        {/* ── Leaderboard table ─────────────────────────── */}
        <div className="lb-table-wrap">
          <table className="lb-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Score</th>
                <th>League Level</th>
                <th>Coins</th>
                <th>Zone</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((user, idx) => {
                const rank = idx + 1;
                const zone = getZoneLabel(rank);
                const rowClass = [
                  rank <= 15 ? "lb-row--promoted" : "",
                  rank >= 26 ? "lb-row--relegated" : "",
                  user.isPlayer ? "lb-row--player" : "",
                ].filter(Boolean).join(" ");

                return (
                  <tr key={user.id} className={rowClass}>
                    <td className="lb-rank">
                      {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
                    </td>
                    <td className="lb-name">
                      {user.name}
                      {user.isPlayer && <span className="lb-you-badge">YOU</span>}
                    </td>
                    <td className="lb-score">
                      <span className="lb-score-bar-wrap">
                        <span className="lb-score-bar" style={{ width: `${user.score ?? 0}%` }} />
                      </span>
                      <span className="lb-score-val">{user.score ?? 0}</span>
                    </td>
                    <td className="lb-level">{user.leagueLevel ?? "Beginner"}</td>
                    <td className="lb-coins">{user.coins.toLocaleString()} 🪙</td>
                    <td><span className={zone.className}>{zone.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Simulate end of round ─────────────────────── */}
        <div className="lb-sim-row">
          {simMessage && <p className="lb-sim-msg">{simMessage}</p>}
          <button className="lb-sim-btn" onClick={handleSimulate}>
            ⚡ Simulate End of Round
          </button>
          <p className="lb-sim-note">Demo only — advances league levels based on current rankings.</p>
        </div>

      </div>
    </div>
  );
}

export default LeaderboardPage;
