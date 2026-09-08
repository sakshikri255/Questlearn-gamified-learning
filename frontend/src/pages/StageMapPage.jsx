import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import STAGES from "../data/stages.js";
import PERSONAS from "../data/personas.js";
import { loadProfile } from "../data/progress.js";
import { motion } from "framer-motion";
import PageTransition from "../components/PageTransition.jsx";
import "./StageMapPage.css";

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

function StageMapPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState(null);
  const [selectedPersona, setSelectedPersona] = useState(
    searchParams.get("persona") ?? PERSONAS[0].id
  );

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  if (!profile) {
    return (
      <PageTransition className="stagemap-wrapper">
        <p className="loading-text">Loading…</p>
      </PageTransition>
    );
  }

  const completedIds = profile.completedStageIds ?? [];
  const currentStageId = profile.currentStageId ?? "beginner";

  function isUnlocked(stage) {
    if (stage.unlockAfter === null) return true;
    return completedIds.includes(stage.unlockAfter);
  }

  function isCompleted(stage) {
    return completedIds.includes(stage.id);
  }

  function handleLaunch(stage) {
    navigate(`/mission?stageId=${stage.id}&persona=${selectedPersona}`);
  }

  return (
    <PageTransition className="stagemap-wrapper">
      <div className="card stagemap-card">
        <button className="back-btn" onClick={() => navigate("/")}>← Back to Home</button>
        <h1 className="stagemap-title">🗺️ Stage Map</h1>
        <p className="stagemap-subtitle">Complete stages to unlock new challenges.</p>

        {/* Persona selector on stage map */}
        <div className="stagemap-persona-row">
          <span className="stagemap-persona-label">Playing as:</span>
          <div className="stagemap-persona-chips">
            {PERSONAS.map((p) => {
              const active = selectedPersona === p.id;
              return (
                <button
                  key={p.id}
                  className={`stagemap-persona-chip ${active ? "stagemap-persona-chip--active" : ""}`}
                  style={active ? { borderColor: p.accent, color: p.accent } : {}}
                  onClick={() => setSelectedPersona(p.id)}
                >
                  {p.emoji} {p.name}
                </button>
              );
            })}
          </div>
        </div>

        <motion.div 
          className="stagemap-path"
          variants={listVariants}
          initial="hidden"
          animate="show"
        >
          {STAGES.map((stage, idx) => {
            const unlocked = isUnlocked(stage);
            const completed = isCompleted(stage);
            const isCurrent = stage.id === currentStageId && !completed;

            return (
              <motion.div key={stage.id} className="stagemap-row" variants={itemVariants}>
                {/* Connector line above (except first) */}
                {idx > 0 && <div className="stagemap-connector" />}

                <button
                  className={[
                    "stagemap-node",
                    unlocked ? "stagemap-node--unlocked" : "stagemap-node--locked",
                    completed ? "stagemap-node--completed" : "",
                    isCurrent ? "stagemap-node--current" : "",
                  ].join(" ")}
                  style={
                    unlocked
                      ? { borderColor: stage.color, backgroundColor: stage.dimColor }
                      : {}
                  }
                  onClick={() => unlocked && handleLaunch(stage)}
                  disabled={!unlocked}
                  aria-label={`${stage.name} stage — ${unlocked ? (completed ? "completed" : "start") : "locked"}`}
                >
                  <div className="stagemap-node-left">
                    <span className="stagemap-node-emoji" style={unlocked ? { color: stage.color } : {}}>
                      {completed ? "✅" : unlocked ? stage.emoji : "🔒"}
                    </span>
                    <div className="stagemap-node-info">
                      <span className="stagemap-node-name" style={unlocked ? { color: stage.color } : {}}>
                        {stage.name}
                      </span>
                      <span className="stagemap-node-xp">
                        {stage.xpRequired > 0 ? `${stage.xpRequired} XP required` : "Starting stage"}
                      </span>
                      {stage.bossBonus && (
                        <span className="stagemap-node-boss-tag">⚡ Boss bonus rewards</span>
                      )}
                    </div>
                  </div>
                  <span className="stagemap-node-arrow">
                    {completed
                      ? "✓ Done"
                      : unlocked
                      ? "▶ Play"
                      : "🔒 Locked"}
                  </span>
                </button>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="stagemap-footer">
          <p className="stagemap-footer-xp">Your XP: <strong>{profile.totalXp ?? 0}</strong></p>
          <p className="stagemap-footer-coins">Your Coins: <strong>{profile.totalCoins ?? 0} 🪙</strong></p>
        </div>
      </div>
    </PageTransition>
  );
}

export default StageMapPage;
