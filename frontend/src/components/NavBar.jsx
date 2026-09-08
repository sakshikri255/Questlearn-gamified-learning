import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./NavBar.css";

const NAV_LINKS = [
  { label: "Home",        path: "/",            emoji: "🏠" },
  { label: "Stage Map",   path: "/stages",       emoji: "🗺️" },
  { label: "Dashboard",   path: "/dashboard",    emoji: "📊" },
  { label: "Leaderboard", path: "/leaderboard",  emoji: "🏆" },
  { label: "Streaks",     path: "/streak",       emoji: "🔥" },
  { label: "Museum",      path: "/museum",       emoji: "🏛️" },
  { label: "Team",        path: "/team",         emoji: "👥" },
];

function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      {/* Logo */}
      <button
        className="navbar-logo"
        onClick={() => { navigate("/"); setMenuOpen(false); }}
        aria-label="QuestLearn home"
      >
        <span className="navbar-logo-icon">⚔️</span>
        <span className="navbar-logo-text">QuestLearn</span>
      </button>

      {/* Desktop links */}
      <ul className="navbar-links" role="list">
        {NAV_LINKS.map(({ label, path, emoji }) => (
          <li key={path}>
            <button
              className={`navbar-link ${isActive(path) ? "navbar-link--active" : ""}`}
              onClick={() => navigate(path)}
              aria-current={isActive(path) ? "page" : undefined}
            >
              <span className="navbar-link-emoji" aria-hidden="true">{emoji}</span>
              <span className="navbar-link-label">{label}</span>
            </button>
          </li>
        ))}
      </ul>

      {/* Mobile hamburger */}
      <button
        className={`navbar-hamburger ${menuOpen ? "navbar-hamburger--open" : ""}`}
        onClick={() => setMenuOpen((o) => !o)}
        aria-expanded={menuOpen}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
      >
        <span className="hamburger-line" />
        <span className="hamburger-line" />
        <span className="hamburger-line" />
      </button>

      {/* Mobile dropdown */}
      {menuOpen && (
        <ul className="navbar-mobile-menu" role="list">
          {NAV_LINKS.map(({ label, path, emoji }) => (
            <li key={path}>
              <button
                className={`navbar-mobile-link ${isActive(path) ? "navbar-mobile-link--active" : ""}`}
                onClick={() => { navigate(path); setMenuOpen(false); }}
                aria-current={isActive(path) ? "page" : undefined}
              >
                <span aria-hidden="true">{emoji}</span>
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}

export default NavBar;
