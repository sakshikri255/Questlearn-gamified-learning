import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import INITIAL_LEAGUE_DATA from "../data/leagueData.js";
import {
  loadLeague,
  saveLeague,
  simulateEndOfRound,
  loadProfile,
  saveProfile,
} from "../data/progress.js";
import { motion } from "framer-motion";
import PageTransition from "../components/PageTransition.jsx";
import "./LeaderboardPage.css";

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

function getZoneLabel(rank) {
  if (rank <= 15) return { label: "Promoted", className: "zone-pill zone-pill--promoted" };
  if (rank <= 25) return { label: "Stay", className: "zone-pill zone-pill--neutral" };
  return { label: "Relegated", className: "zone-pill zone-pill--relegated" };
}

function LeaderboardPage() {
  const navigate = useNavigate();
  const [league, setLeague] = useState(() => loadLeague(INITIAL_LEAGUE_DATA));
  const [profile, setProfile] = useState(() => loadProfile());
  const [simMessage, setSimMessage] = useState("");

  // Sort by coins descending
  const sorted = [...league].sort((a, b) => b.coins - a.coins);

  function handleSimulate() {
    const updated = simulateEndOfRound(league);
    saveLeague(updated);
    setLeague(updated);
    const newProfile = { ...profile, leagueRound: (profile.leagueRound ?? 1) + 1 };
    saveProfile(newProfile);
    setProfile(newProfile);
    setSimMessage(`Round ${profile.leagueRound ?? 1} complete! League levels updated.`);
    setTimeout(() => setSimMessage(""), 4000);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <PageTransition className="lb-wrapper">
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
                <th>League Level</th>
                <th>Coins</th>
                <th>Zone</th>
              </tr>
            </thead>
            <motion.tbody variants={listVariants} initial="hidden" animate="show">
              {sorted.map((user, idx) => {
                const rank = idx + 1;
                const zone = getZoneLabel(rank);
                const rowClass = [
                  rank <= 15 ? "lb-row--promoted" : "",
                  rank >= 26 ? "lb-row--relegated" : "",
                  user.isPlayer ? "lb-row--player" : "",
                ].filter(Boolean).join(" ");

                return (
                  <motion.tr key={user.id} className={rowClass} variants={itemVariants}>
                    <td className="lb-rank">
                      {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
                    </td>
                    <td className="lb-name">
                      {user.name}
                      {user.isPlayer && <span className="lb-you-badge">YOU</span>}
                    </td>
                    <td className="lb-level">{user.leagueLevel ?? "Beginner"}</td>
                    <td className="lb-coins">{user.coins.toLocaleString()} 🪙</td>
                    <td><span className={zone.className}>{zone.label}</span></td>
                  </motion.tr>
                );
              })}
            </motion.tbody>
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
    </PageTransition>
  );
}

export default LeaderboardPage;
