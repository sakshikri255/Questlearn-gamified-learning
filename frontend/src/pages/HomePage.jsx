import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import THEMES from "../data/themes.js";
import STAGES from "../data/stages.js";
import PERSONAS from "../data/personas.js";
import {
  loadAttempts,
  loadProfile,
  loadStreak,
  computeStreakState,
} from "../data/progress.js";
import "./HomePage.css";

const FEATURES = [
  {
    emoji: "📖",
    title: "Story Missions",
    description:
      "Answer code questions wrapped in narrative adventures. Every correct answer pushes your story forward.",
    color: "#6366f1",
  },
  {
    emoji: "🔐",
    title: "Explain to Unlock",
    description:
      "Unlock the next chapter by typing a natural-language explanation of your answer. Solidify your understanding.",
    color: "#22d3ee",
  },
  {
    emoji: "🏛️",
    title: "Mistake Museum",
    description:
      "Every wrong answer is archived for review. Revisit your mistakes and turn them into strengths.",
    color: "#a78bfa",
  },
  {
    emoji: "🏆",
    title: "League Battles",
    description:
      "Compete across 30-player leagues. Earn coins, climb ranks, and defend your position.",
    color: "#facc15",
  },
  {
    emoji: "🔥",
    title: "Daily Streaks",
    description:
      "Log in every day to maintain your streak. Miss a day? Use a Rescue Quiz to save it.",
    color: "#fb923c",
  },
];

function HomePage() {
  const navigate = useNavigate();
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0].id);
  const [selectedPersona, setSelectedPersona] = useState(PERSONAS[0].id);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [profile, setProfile] = useState(null);
  const [streak, setStreak] = useState(null);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("ql_mistakes") ?? "[]");
    setMistakeCount(saved.length);
    setAttemptCount(loadAttempts().length);
    setProfile(loadProfile());
    setStreak(loadStreak());
  }, []);

  const handleStart = () => {
    navigate(`/mission?theme=${selectedTheme}&persona=${selectedPersona}`);
  };

  // Derive live XP bar values from profile
  const maxXp = 450; // roughly 1.5× the highest stage xpRequired (300)
  const totalXp = profile?.totalXp ?? 0;
  const xpPct = Math.min(Math.round((totalXp / maxXp) * 100), 100);

  // Derive current stage label
  const currentStage =
    STAGES.find((s) => s.id === (profile?.currentStageId ?? "beginner")) ?? STAGES[0];

  // Streak state derived from loaded streak
  const streakState = streak ? computeStreakState(streak) : null;
  const currentStreakCount = streak?.currentStreak ?? 0;
  const isAtRisk = streakState?.state === "at-risk";

  return (
    <div className="ql-home">

      {/* ═══════════════════════════════ HERO SECTION ══════════════════════════ */}
      <section className="hero">
        {/* CSS-only animated background */}
        <div className="hero-bg" aria-hidden="true">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
          <div className="hero-grid" />
        </div>

        <div className="hero-content">
          {/* ── Left column ──────────────────────────────── */}
          <div className="hero-left">
            <div className="hero-eyebrow">⚔️ Cyber Quest</div>

            <h1 className="hero-title">
              Turn Every Lesson Into Your<br />
              <span className="hero-title-accent">Next Quest</span>
            </h1>

            <p className="hero-sub">
              Complete missions, earn coins and XP, protect your daily streak,
              and learn from every mistake — one quest at a time.
            </p>

            {/* Streak at-risk banner */}
            {isAtRisk && (
              <div className="hero-risk-banner">
                ⚠️ Your streak is at risk —{" "}
                <button onClick={() => navigate("/streak")}>Save it now</button>
              </div>
            )}

            {/* Theme selector */}
            <div className="hero-theme-row">
              <span className="hero-theme-label">Choose theme:</span>
              <div className="hero-theme-chips">
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    className={`theme-chip ${selectedTheme === theme.id ? "theme-chip--active" : ""}`}
                    style={
                      selectedTheme === theme.id
                        ? { borderColor: theme.accent, color: theme.accent }
                        : {}
                    }
                    onClick={() => setSelectedTheme(theme.id)}
                  >
                    {theme.emoji} {theme.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Persona selector */}
            <div className="hero-theme-row">
              <span className="hero-theme-label">Choose your persona:</span>
              <div className="hero-persona-grid">
                {PERSONAS.map((persona) => {
                  const active = selectedPersona === persona.id;
                  return (
                    <button
                      key={persona.id}
                      className={`persona-card ${active ? "persona-card--active" : ""}`}
                      style={active ? { borderColor: persona.accent, boxShadow: `0 0 14px ${persona.accentDim}` } : {}}
                      onClick={() => setSelectedPersona(persona.id)}
                    >
                      <span className="persona-card-emoji">{persona.emoji}</span>
                      <span className="persona-card-name" style={active ? { color: persona.accent } : {}}>{persona.name}</span>
                      <span className="persona-card-tag">{persona.tagline}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary CTAs */}
            <div className="hero-cta-row">
              <button className="btn-hero-primary" onClick={handleStart}>
                ⚡ Start Your Quest
              </button>
              <a className="btn-hero-secondary" href="#features">
                Explore Features
              </a>
            </div>

            {/* Three stat chips */}
            <div className="hero-stat-chips">
              <div className="hero-stat-chip">
                <span className="hero-stat-num">5</span>
                <span>Learning Stages</span>
              </div>
              <div className="hero-stat-chip">
                <span className="hero-stat-num">30</span>
                <span>Player Leagues</span>
              </div>
              <div className="hero-stat-chip">
                <span className="hero-stat-num">🔥</span>
                <span>Daily Streaks</span>
              </div>
            </div>
          </div>

          {/* ── Right column: mock game panel ──────────── */}
          <div className="hero-right">
            <div className="mock-panel">
              <div className="mock-panel-header">
                <div className="mock-avatar">🧑‍💻</div>
                <div>
                  <p className="mock-name">Explorer</p>
                  <p className="mock-stage">
                    {currentStage.emoji} {currentStage.name}
                  </p>
                </div>
              </div>

              <div className="mock-xp-row">
                <span>XP</span>
                <div className="mock-xp-bar">
                  <div className="mock-xp-fill" style={{ width: `${xpPct}%` }} />
                </div>
                <span>
                  {totalXp}/{maxXp}
                </span>
              </div>

              <div className="mock-chips">
                <div className="mock-chip mock-chip--gold">
                  🪙 {profile?.totalCoins ?? 0} coins
                </div>
                <div className="mock-chip mock-chip--orange">
                  🔥 {currentStreakCount} day streak
                </div>
              </div>

              <div className="mock-next-mission">
                <p className="mock-next-label">Next Mission</p>
                <p className="mock-next-title">
                  {currentStage.emoji} {currentStage.name}
                </p>
                <button className="mock-next-btn" onClick={handleStart}>
                  {PERSONAS.find((p) => p.id === selectedPersona)?.emoji} Continue as {PERSONAS.find((p) => p.id === selectedPersona)?.name}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════ FEATURE SECTION ═══════════════════════ */}
      <section className="features" id="features">
        <h2 className="features-title">Everything You Need to Master Code</h2>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.title}>
              <div
                className="feature-card-icon"
                style={{ background: `${f.color}22`, border: `1px solid ${f.color}44` }}
              >
                <span style={{ fontSize: "1.6rem" }}>{f.emoji}</span>
              </div>
              <h3 className="feature-card-title">{f.title}</h3>
              <p className="feature-card-desc">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════ CTA SECTION ═══════════════════════════ */}
      <section className="home-cta">
        <h2 className="home-cta-title">Ready to level up your learning?</h2>
        <button className="btn-hero-primary" onClick={handleStart}>
          ⚡ Start Your Quest
        </button>
      </section>

      {/* ═══════════════════════════════ FOOTER ════════════════════════════════ */}
      <footer className="home-footer">
        <p className="footer-copy">QuestLearn — Learn. Play. Level Up. © 2025</p>
      </footer>
    </div>
  );
}

export default HomePage;
