import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./NavBar.css";

const NAV_LINKS = [
  { label: "Home",            path: "/",                emoji: "🏠" },
  { label: "Daily Challenge", path: "/daily-challenge", emoji: "🌟" },
  { label: "Topics",          path: "/topics",           emoji: "📚" },
  { label: "Stage Map",       path: "/stages",           emoji: "🗺️" },
  { label: "Leaderboard",     path: "/leaderboard",      emoji: "🏆" },
  { label: "Streaks",         path: "/streak",           emoji: "🔥" },
  { label: "Dashboard",       path: "/dashboard",        emoji: "📊" },
  { label: "Profile",         path: "/profile",          emoji: "👤" },
];

function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, toggle2FA } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const handleLogout = async () => {
    await logout();
    setProfileDropdownOpen(false);
    navigate("/login");
  };

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

      {/* Auth Actions (Right Side) */}
      <div className="navbar-auth-section">
        {user ? (
          <div className="navbar-user-menu">
            <button
              className="navbar-user-chip"
              onClick={() => setProfileDropdownOpen((o) => !o)}
              aria-expanded={profileDropdownOpen}
              aria-label="User profile menu"
            >
              <span className="navbar-avatar">{user.avatar || "⚔️"}</span>
              <span className="navbar-username">{user.gamerTag || user.name.split(" ")[0]}</span>
              <span className="navbar-xp-tag">Lv.{user.level || 1} • {user.xp || 0} XP</span>
            </button>

            {profileDropdownOpen && (
              <div className="navbar-dropdown-panel" role="menu">
                <div className="dropdown-user-header">
                  <div className="dropdown-header-top">
                    <span className="dropdown-user-name">{user.name}</span>
                    <span className="dropdown-gamer-tag">{user.gamerTag || `@${user.name.replace(/\s+/g, "")}`}</span>
                  </div>
                  <span className="dropdown-user-email">{user.email}</span>
                  <div className="dropdown-badge-row">
                    <span className="dropdown-chip">🔥 {user.streak || 1} Day Streak</span>
                    <span className="dropdown-chip">🪙 {user.coins || 0} Coins</span>
                  </div>
                </div>

                <div className="dropdown-divider" />

                <button
                  className="dropdown-item"
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    navigate("/profile");
                  }}
                  role="menuitem"
                >
                  <span className="dropdown-item-icon">👤</span>
                  <span>Player Profile &amp; Edit</span>
                </button>

                <button
                  className="dropdown-item"
                  onClick={async () => {
                    await toggle2FA();
                  }}
                  role="menuitem"
                >
                  <span className="dropdown-item-icon">🔐</span>
                  <span>{user.twoFactorEnabled ? "Disable 2FA Shield" : "Enable 2FA Shield"}</span>
                </button>

                <button
                  className="dropdown-item dropdown-item--logout"
                  onClick={handleLogout}
                  role="menuitem"
                >
                  <span className="dropdown-item-icon">🚪</span>
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="navbar-guest-actions">
            <button
              className="navbar-profiles-btn"
              onClick={() => navigate("/profile")}
              title="View 5 Hero Profiles"
            >
              <span>👥 Heroes</span>
            </button>
            <button
              className="navbar-signin-btn"
              onClick={() => navigate("/login")}
            >
              <span>Sign In</span>
            </button>
          </div>
        )}
      </div>

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

          {/* Mobile Auth Button */}
          <li className="navbar-mobile-auth-item">
            {user ? (
              <button
                className="navbar-mobile-link navbar-mobile-link--logout"
                onClick={() => { handleLogout(); setMenuOpen(false); }}
              >
                <span>🚪 Sign Out ({user.name})</span>
              </button>
            ) : (
              <button
                className="navbar-mobile-link navbar-mobile-link--signin"
                onClick={() => { navigate("/login"); setMenuOpen(false); }}
              >
                <span>⚔️ Sign In / Register</span>
              </button>
            )}
          </li>
        </ul>
      )}
    </nav>
  );
}

export default NavBar;
