import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./TeamPage.css";

// Fixed member list — names never change, only roles rotate.
const MEMBERS = [
  { id: 1, name: "Alex",  avatar: "🧑‍💻" },
  { id: 2, name: "Jordan", avatar: "👩‍🔬" },
  { id: 3, name: "Sam",   avatar: "🧑‍🎨" },
  { id: 4, name: "Riley", avatar: "👩‍💼" },
];

const ROLES = ["Researcher", "Coder", "Reviewer", "Presenter"];

// Returns a role assignment array that is guaranteed to be different from
// the current one (no member keeps their existing role).
function rotateRoles(current) {
  // Collect indices of the current assignment
  const n = current.length; // always 4
  let next;
  let attempts = 0;
  do {
    // Fisher-Yates shuffle
    next = [...current];
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    attempts++;
    // Retry if any member ended up with their existing role (derangement check).
    // Bounded by attempts to avoid an infinite loop in the astronomically unlikely
    // case of repeated identical shuffles.
  } while (next.some((role, i) => role === current[i]) && attempts < 100);
  return next;
}

// ROLE_META maps each role name to a colour accent and an icon.
const ROLE_META = {
  Researcher: { color: "#38bdf8", icon: "🔍" },
  Coder:      { color: "#a78bfa", icon: "💻" },
  Reviewer:   { color: "#34d399", icon: "✅" },
  Presenter:  { color: "#fb923c", icon: "🎤" },
};

function TeamPage() {
  const navigate = useNavigate();

  // Each index corresponds to the member at MEMBERS[index].
  // Initial assignment: member 0 → role 0, member 1 → role 1, …
  const [roleAssignment, setRoleAssignment] = useState([...ROLES]);

  const handleRotate = () => {
    setRoleAssignment((prev) => rotateRoles(prev));
  };

  return (
    <div className="team-wrapper">
      <div className="card team-card">
        {/* Back link */}
        <button className="back-btn" onClick={() => navigate("/")}>
          ← Back to Home
        </button>

        {/* Header */}
        <span className="badge">👥 Team Mission</span>
        <h1 className="team-title">Team Roles</h1>
        <p className="team-subtitle">
          Every mission needs the right person in the right seat.
        </p>

        {/* Member cards grid */}
        <div className="team-grid">
          {MEMBERS.map((member, index) => {
            const roleName = roleAssignment[index];
            const meta = ROLE_META[roleName];
            return (
              <div
                key={member.id}
                className="member-card"
                style={{ borderColor: meta.color }}
              >
                <span className="member-avatar">{member.avatar}</span>
                <p className="member-name">{member.name}</p>
                <span
                  className="role-badge"
                  style={{ backgroundColor: meta.color + "22", color: meta.color, borderColor: meta.color }}
                >
                  {meta.icon} {roleName}
                </span>
              </div>
            );
          })}
        </div>

        {/* Rotate button */}
        <button className="primary rotate-btn" onClick={handleRotate}>
          🔀 Rotate Roles
        </button>
      </div>
    </div>
  );
}

export default TeamPage;
