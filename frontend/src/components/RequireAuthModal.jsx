import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./RequireAuthModal.css";

export default function RequireAuthModal({ title = "Adventurer Sign-In Required", message }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, switchProfile, getProfiles } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [switchingId, setSwitchingId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    getProfiles()
      .then((data) => {
        if (isMounted) {
          // Exclude demo user from quick-choice highlight if we have the 5 named profiles
          setProfiles(data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [getProfiles]);

  if (loading || user) {
    return null;
  }

  const handleQuickSwitch = async (profileId) => {
    try {
      setSwitchingId(profileId);
      await switchProfile(profileId);
    } catch (err) {
      console.error("Quick profile error", err);
    } finally {
      setSwitchingId(null);
    }
  };

  const currentRedirect = encodeURIComponent(location.pathname + location.search);

  return (
    <div className="auth-gate-overlay" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <div className="auth-gate-card">
        <div className="auth-gate-shield-icon">🛡️</div>
        
        <h2 id="gate-title" className="auth-gate-title">{title}</h2>
        <p className="auth-gate-desc">
          {message ||
            "You must be signed in to embark on quests, test your knowledge, earn XP, and rank on the Quest League!"}
        </p>

        <div className="auth-gate-actions">
          <button
            className="gate-btn gate-btn--primary"
            onClick={() => navigate(`/login?redirect=${currentRedirect}`)}
          >
            🔑 Sign In to Your Account
          </button>
          <button
            className="gate-btn gate-btn--secondary"
            onClick={() => navigate(`/signup?redirect=${currentRedirect}`)}
          >
            ✨ Create Free Account
          </button>
        </div>

        <div className="auth-gate-divider">
          <span>OR SIGN IN AS ONE OF THE 5 USERS</span>
        </div>

        <div className="auth-gate-profiles-grid">
          {profiles.slice(0, 5).map((p) => (
            <button
              key={p.id}
              className="gate-profile-chip"
              onClick={() => handleQuickSwitch(p.id)}
              disabled={switchingId === p.id}
              title={`Play as ${p.name}`}
            >
              <span className="gate-profile-avatar">{p.avatar}</span>
              <div className="gate-profile-info">
                <span className="gate-profile-name">{p.name}</span>
                <span className="gate-profile-tag">{p.gamerTag}</span>
              </div>
              <span className="gate-profile-lv">Lv.{p.level}</span>
            </button>
          ))}
        </div>

        <div className="auth-gate-footer">
          <button className="gate-cancel-btn" onClick={() => navigate("/")}>
            ← Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}
