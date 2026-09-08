import React, { useEffect, useState } from "react";
import "./PersonaResultScreen.css";

/**
 * Full-screen animated result splash shown briefly before the result card.
 * Props:
 *   personaId  — "scientist" | "detective" | "wizard" | "warrior" | "sage"
 *   correct    — boolean
 *   onDone     — callback fired after animation completes (~2.8 s)
 */
function PersonaResultScreen({ personaId, correct, onDone }) {
  const [phase, setPhase] = useState("enter"); // "enter" → "exit"

  useEffect(() => {
    // Start exit animation after 2.2 s, call onDone after 2.8 s total
    const exitTimer = setTimeout(() => setPhase("exit"), 2200);
    const doneTimer = setTimeout(onDone, 2800);
    return () => { clearTimeout(exitTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  return (
    <div className={`prs-overlay prs-overlay--${personaId} prs-${phase}`}>
      {personaId === "scientist" && <ScientistScene correct={correct} />}
      {personaId === "detective" && <DetectiveScene correct={correct} />}
      {personaId === "wizard"    && <WizardScene    correct={correct} />}
      {personaId === "warrior"   && <WarriorScene   correct={correct} />}
      {personaId === "sage"      && <SageScene      correct={correct} />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SCIENTIST  🔬
   correct  → rocket launches upward with flame trail
   wrong    → rocket tilts and explodes midway
───────────────────────────────────────────────────────────────── */
function ScientistScene({ correct }) {
  return (
    <div className="prs-scene prs-scene--scientist">
      {/* Stars */}
      {[...Array(18)].map((_, i) => (
        <div key={i} className="sci-star" style={{ left: `${(i * 17 + 5) % 100}%`, top: `${(i * 23 + 8) % 60}%`, animationDelay: `${(i * 0.15) % 1.2}s` }} />
      ))}

      <div className={`sci-rocket ${correct ? "sci-rocket--launch" : "sci-rocket--crash"}`}>
        {/* Rocket body */}
        <div className="sci-rocket-body">
          <div className="sci-rocket-nose" />
          <div className="sci-rocket-window" />
          <div className="sci-rocket-fins">
            <div className="sci-fin sci-fin--left" />
            <div className="sci-fin sci-fin--right" />
          </div>
        </div>
        {/* Flame */}
        {correct && <div className="sci-flame"><div className="sci-flame-inner" /></div>}
        {/* Crash explosion */}
        {!correct && <div className="sci-explosion">💥</div>}
      </div>

      {/* Smoke trail on correct */}
      {correct && (
        <div className="sci-trail">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="sci-trail-puff" style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
      )}

      <div className="prs-label">
        {correct ? "🚀 LAUNCH SUCCESSFUL!" : "💥 MISSION ABORTED"}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   DETECTIVE  🕵️
   correct  → magnifying glass swings in with "FOUND" green stamp
   wrong    → magnifying glass shows "404 NOT FOUND" red stamp
───────────────────────────────────────────────────────────────── */
function DetectiveScene({ correct }) {
  return (
    <div className="prs-scene prs-scene--detective">
      {/* Noir scanlines */}
      <div className="det-scanlines" />

      <div className="det-lens-wrap">
        <div className="det-lens">
          <div className="det-lens-circle">
            <div className="det-lens-glass" />
            <div className={`det-stamp ${correct ? "det-stamp--found" : "det-stamp--404"}`}>
              {correct ? "FOUND" : "404"}
            </div>
          </div>
          <div className="det-handle" />
        </div>
      </div>

      <div className="prs-label" style={{ color: correct ? "#f59e0b" : "#ef4444" }}>
        {correct ? "🕵️ CASE CLOSED" : "🕵️ NOT FOUND"}
      </div>
      {!correct && <div className="det-404-sub">The suspect escaped.</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   WIZARD  🧙
   correct  → witch on broom flies across screen
   wrong    → witch falls off broom mid-flight
───────────────────────────────────────────────────────────────── */
function WizardScene({ correct }) {
  return (
    <div className="prs-scene prs-scene--wizard">
      {/* Magic stars */}
      {[...Array(20)].map((_, i) => (
        <div key={i} className="wiz-sparkle" style={{ left: `${(i * 19 + 3) % 95}%`, top: `${(i * 31 + 10) % 80}%`, animationDelay: `${(i * 0.11) % 1.5}s` }}>✦</div>
      ))}

      <div className={`wiz-witch-wrap ${correct ? "wiz-witch--fly" : "wiz-witch--fall"}`}>
        {/* Witch on broom SVG-style using CSS */}
        <div className="wiz-figure">
          <div className="wiz-hat">
            <div className="wiz-hat-top" />
            <div className="wiz-hat-brim" />
          </div>
          <div className="wiz-head">
            <div className="wiz-face">👩</div>
          </div>
          <div className="wiz-body" />
          <div className="wiz-broom">
            <div className="wiz-broom-stick" />
            <div className="wiz-broom-bristles" />
          </div>
          {/* Trail sparkles */}
          {correct && [...Array(5)].map((_, i) => (
            <div key={i} className="wiz-trail-star" style={{ animationDelay: `${i * 0.15}s` }}>⭐</div>
          ))}
        </div>
      </div>

      <div className="prs-label" style={{ color: "#a78bfa" }}>
        {correct ? "🧙 SPELL CAST PERFECTLY!" : "🧙 SPELL BACKFIRED!"}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   WARRIOR  ⚔️
   correct  → Optimus Prime silhouette in power pose with energy blast
   wrong    → silhouette shatters with debris flying
───────────────────────────────────────────────────────────────── */
function WarriorScene({ correct }) {
  return (
    <div className="prs-scene prs-scene--warrior">
      {/* Energy grid */}
      <div className="war-grid" />

      <div className={`war-prime ${correct ? "war-prime--power" : "war-prime--shatter"}`}>
        {/* Optimus Prime silhouette built from CSS shapes */}
        <div className="war-body-wrap">
          <div className="war-head">
            <div className="war-head-top" />
            <div className="war-visor" />
            <div className="war-face-plate" />
          </div>
          <div className="war-shoulders">
            <div className="war-shoulder war-shoulder--left" />
            <div className="war-shoulder war-shoulder--right" />
          </div>
          <div className="war-chest">
            <div className="war-chest-symbol">⬡</div>
          </div>
          <div className="war-arms">
            <div className={`war-arm war-arm--left ${correct ? "war-arm--raised" : ""}`} />
            <div className={`war-arm war-arm--right ${correct ? "war-arm--raised" : ""}`} />
          </div>
          <div className="war-legs">
            <div className="war-leg war-leg--left" />
            <div className="war-leg war-leg--right" />
          </div>
        </div>

        {/* Power energy blast on correct */}
        {correct && (
          <div className="war-energy">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="war-energy-ray" style={{ transform: `rotate(${i * 45}deg)`, animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>
        )}

        {/* Shatter debris on wrong */}
        {!correct && [...Array(10)].map((_, i) => (
          <div key={i} className="war-debris" style={{
            left: `${40 + Math.sin(i * 36 * Math.PI / 180) * 60}%`,
            top: `${40 + Math.cos(i * 36 * Math.PI / 180) * 60}%`,
            animationDelay: `${i * 0.06}s`,
          }} />
        ))}
      </div>

      <div className="prs-label" style={{ color: correct ? "#ef4444" : "#7f1d1d" }}>
        {correct ? "⚔️ TILL ALL ARE ONE!" : "⚔️ DECEPTICONS WIN…"}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SAGE  🌿
   correct  → monk in lotus pose, glowing aura pulses peacefully
   wrong    → monk's aura shatters, chaos symbols fly around
───────────────────────────────────────────────────────────────── */
function SageScene({ correct }) {
  return (
    <div className="prs-scene prs-scene--sage">
      {/* Floating petals */}
      {[...Array(12)].map((_, i) => (
        <div key={i} className={`sage-petal ${!correct ? "sage-petal--chaos" : ""}`}
          style={{ left: `${(i * 17 + 5) % 90}%`, animationDelay: `${(i * 0.18) % 2}s` }}>🍃</div>
      ))}

      <div className={`sage-monk-wrap ${correct ? "sage-monk--meditate" : "sage-monk--disturbed"}`}>
        {/* Aura rings */}
        {correct && [...Array(3)].map((_, i) => (
          <div key={i} className="sage-aura-ring" style={{ width: `${90 + i * 40}px`, height: `${90 + i * 40}px`, animationDelay: `${i * 0.4}s` }} />
        ))}

        {/* Chaos rings on wrong */}
        {!correct && [...Array(3)].map((_, i) => (
          <div key={i} className="sage-chaos-ring" style={{ width: `${90 + i * 40}px`, height: `${90 + i * 40}px`, animationDelay: `${i * 0.2}s` }} />
        ))}

        {/* Monk figure */}
        <div className="sage-monk">
          <div className="sage-monk-head">🧘</div>
          <div className="sage-monk-body" />
          <div className="sage-monk-legs" />
        </div>

        {/* Disturbance symbols on wrong */}
        {!correct && ["📱", "🔔", "💢", "⚡", "🗣️"].map((sym, i) => (
          <div key={i} className="sage-disturbance" style={{ animationDelay: `${i * 0.15}s`, '--angle': `${i * 72}deg` }}>{sym}</div>
        ))}
      </div>

      <div className="prs-label" style={{ color: correct ? "#34d399" : "#6b7280" }}>
        {correct ? "🌿 INNER PEACE ACHIEVED" : "🌿 FOCUS LOST…"}
      </div>
    </div>
  );
}

export default PersonaResultScreen;
