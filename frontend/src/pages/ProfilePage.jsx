import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageTransition from "../components/PageTransition.jsx";
import "./ProfilePage.css";

const AVATAR_OPTIONS = [
  { emoji: "🧙‍♂️", label: "Mage" },
  { emoji: "⚡", label: "Bolt" },
  { emoji: "🏹", label: "Archer" },
  { emoji: "🛡️", label: "Paladin" },
  { emoji: "🐉", label: "Dragon" },
  { emoji: "⚔️", label: "Warrior" },
  { emoji: "🦊", label: "Fox" },
  { emoji: "👾", label: "Invader" },
  { emoji: "👑", label: "Monarch" },
  { emoji: "🎯", label: "Sniper" },
  { emoji: "🚀", label: "Astronaut" },
  { emoji: "💎", label: "Diamond" },
  { emoji: "🔮", label: "Mystic" },
  { emoji: "🐱", label: "Shadow Cat" },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateProfile, switchProfile, getProfiles, loading } = useAuth();

  const [profilesList, setProfilesList] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [switchingId, setSwitchingId] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Edit form state
  const [formData, setFormData] = useState({
    name: "",
    gamerTag: "",
    email: "",
    avatar: "⚔️",
    title: "",
    bio: "",
  });

  // Load profiles list
  useEffect(() => {
    let isMounted = true;
    getProfiles()
      .then((data) => {
        if (isMounted) setProfilesList(data);
      })
      .catch((err) => console.error("Could not fetch profiles:", err));
    return () => {
      isMounted = false;
    };
  }, [getProfiles, user]);

  // Sync form data when user changes or edit mode opens
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        gamerTag: (user.gamerTag || "").replace(/^@+/, ""),
        email: user.email || "",
        avatar: user.avatar || "⚔️",
        title: user.title || "Code Adventurer",
        bio: user.bio || "",
      });
    }
  }, [user]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleProfileSwitch = async (profileId) => {
    try {
      setSwitchingId(profileId);
      setSaveSuccess("");
      setSaveError("");
      setIsEditing(false);
      const res = await switchProfile(profileId);
      setSaveSuccess(`Switched active profile to ${res.user?.name || "Adventurer"}!`);
      setTimeout(() => setSaveSuccess(""), 4000);
    } catch (err) {
      setSaveError(err.message || "Failed to switch profile");
    } finally {
      setSwitchingId(null);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveError("");
    setSaveSuccess("");
    setFieldErrors({});
    setSubmitting(true);

    try {
      const res = await updateProfile({
        name: formData.name,
        gamerTag: formData.gamerTag,
        email: formData.email,
        avatar: formData.avatar,
        title: formData.title,
        bio: formData.bio,
      });

      setSaveSuccess(res.message || "Profile updated successfully!");
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(""), 4500);

      // Refresh profiles list
      const refreshed = await getProfiles();
      setProfilesList(refreshed);
    } catch (err) {
      setSaveError(err.message || "Failed to save profile");
      if (err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageTransition className="profile-page-wrapper">
        <div className="profile-loading">
          <span className="profile-loading-spinner">🛡️</span>
          <p>Loading adventurer profiles…</p>
        </div>
      </PageTransition>
    );
  }

  if (!user) {
    return (
      <PageTransition className="profile-page-wrapper">
        <div className="profile-page-card card">
          <div className="profile-unauth-state">
            <span className="unauth-icon">🔒</span>
            <h2>Adventurer Profile Locked</h2>
            <p>Please sign in or select one of the available character profiles below to view your stats and customize your gear.</p>
            <div className="unauth-actions">
              <button className="primary" onClick={() => navigate("/login?redirect=/profile")}>
                Sign In
              </button>
              <button className="secondary" onClick={() => navigate("/signup?redirect=/profile")}>
                Create Account
              </button>
            </div>

            <div className="profile-switch-divider">
              <span>OR CHOOSE A CHARACTER PROFILE</span>
            </div>

            <div className="profiles-roster-grid">
              {profilesList.slice(0, 5).map((p) => (
                <div key={p.id} className="roster-card" onClick={() => handleProfileSwitch(p.id)}>
                  <span className="roster-avatar">{p.avatar}</span>
                  <div className="roster-info">
                    <span className="roster-name">{p.name}</span>
                    <span className="roster-tag">{p.gamerTag}</span>
                    <span className="roster-title">{p.title}</span>
                  </div>
                  <button className="roster-switch-btn primary">Play</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="profile-page-wrapper">
      <div className="profile-page-container">
        
        {/* Navigation Bar Header */}
        <div className="profile-nav-row">
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <div className="profile-breadcrumbs">
            <span>QuestLearn</span>
            <span>/</span>
            <span className="current">Player Profile</span>
          </div>
          <button className="secondary dash-shortcut-btn" onClick={() => navigate("/dashboard")}>
            📊 View Dashboard
          </button>
        </div>

        {/* Feedback Alert Banners */}
        {saveSuccess && (
          <div className="profile-toast profile-toast--success">
            <span>✅ {saveSuccess}</span>
          </div>
        )}
        {saveError && (
          <div className="profile-toast profile-toast--error">
            <span>⚠️ {saveError}</span>
          </div>
        )}

        {/* Hero Gamer Profile Card */}
        <div className="profile-hero-card card">
          <div className="profile-hero-backdrop" />
          <div className="profile-hero-content">
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar-bubble">
                <span className="profile-avatar-emoji">{user.avatar || "⚔️"}</span>
              </div>
              <span className="profile-level-badge">Lv.{user.level || 1}</span>
            </div>

            <div className="profile-main-meta">
              <div className="profile-name-row">
                <h1 className="profile-display-name">{user.name}</h1>
                <span className="profile-tag-pill">{user.gamerTag || `@${user.name.replace(/\s+/g, "")}`}</span>
                {user.isVerified && <span className="profile-verified-badge" title="Verified Adventurer">✓ Verified</span>}
                {user.role === "admin" && <span className="profile-role-badge">Admin</span>}
              </div>

              <p className="profile-title-text">{user.title || "Code Adventurer"}</p>
              <p className="profile-email-sub">{user.email}</p>

              {user.bio ? (
                <p className="profile-bio-text">"{user.bio}"</p>
              ) : (
                <p className="profile-bio-text profile-bio-empty">No player motto set yet. Click Edit Profile to add your bio!</p>
              )}
            </div>

            <div className="profile-action-col">
              <button
                className={`profile-edit-toggle-btn ${isEditing ? "active" : "primary"}`}
                onClick={() => {
                  setIsEditing((prev) => !prev);
                  setSaveError("");
                  setSaveSuccess("");
                }}
              >
                {isEditing ? "✕ Close Editor" : "✏️ Edit Profile"}
              </button>
            </div>
          </div>

          {/* Player Stats Ribbon */}
          <div className="profile-stats-ribbon">
            <div className="stat-pill">
              <span className="stat-icon">⚡</span>
              <div className="stat-data">
                <span className="stat-value">{user.xp || 0}</span>
                <span className="stat-label">Total XP</span>
              </div>
            </div>
            <div className="stat-pill">
              <span className="stat-icon">🪙</span>
              <div className="stat-data">
                <span className="stat-value">{user.coins || 0}</span>
                <span className="stat-label">BobCoins</span>
              </div>
            </div>
            <div className="stat-pill">
              <span className="stat-icon">🔥</span>
              <div className="stat-data">
                <span className="stat-value">{user.streak || 1} Days</span>
                <span className="stat-label">Active Streak</span>
              </div>
            </div>
            <div className="stat-pill">
              <span className="stat-icon">🛡️</span>
              <div className="stat-data">
                <span className="stat-value">{user.twoFactorEnabled ? "Protected" : "Standard"}</span>
                <span className="stat-label">2FA Shield</span>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Profile Panel */}
        {isEditing && (
          <div className="profile-editor-card card">
            <div className="editor-header">
              <h2>⚙️ Edit Profile Details</h2>
              <p>Customize how you appear across leaderboards, missions, and community challenges.</p>
            </div>

            <form onSubmit={handleSaveProfile} className="profile-editor-form">
              <div className="form-grid">
                {/* Full Name */}
                <div className="form-group">
                  <label htmlFor="edit-name">Full Name</label>
                  <input
                    id="edit-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter your name"
                    className={fieldErrors.name ? "input-error" : ""}
                    required
                  />
                  {fieldErrors.name && <span className="field-error-text">{fieldErrors.name}</span>}
                </div>

                {/* Gamer Tag */}
                <div className="form-group">
                  <label htmlFor="edit-gamertag">Gamer Tag / Handle</label>
                  <div className="gamertag-input-wrap">
                    <span className="gamertag-prefix">@</span>
                    <input
                      id="edit-gamertag"
                      type="text"
                      value={formData.gamerTag}
                      onChange={(e) => handleInputChange("gamerTag", e.target.value)}
                      placeholder="GamerTag"
                      className={fieldErrors.gamerTag ? "input-error" : ""}
                      required
                    />
                  </div>
                  {fieldErrors.gamerTag ? (
                    <span className="field-error-text">{fieldErrors.gamerTag}</span>
                  ) : (
                    <span className="field-helper-text">Unique handle displayed in leaderboards & quizzes</span>
                  )}
                </div>

                {/* Email Address */}
                <div className="form-group">
                  <label htmlFor="edit-email">Email Address</label>
                  <input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="name@questlearn.com"
                    className={fieldErrors.email ? "input-error" : ""}
                    required
                  />
                  {fieldErrors.email && <span className="field-error-text">{fieldErrors.email}</span>}
                </div>

                {/* Title */}
                <div className="form-group">
                  <label htmlFor="edit-title">Adventurer Title</label>
                  <input
                    id="edit-title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="e.g. Spellbound Coder, Pixel Ranger"
                  />
                </div>
              </div>

              {/* Avatar Selector */}
              <div className="form-group avatar-selection-group">
                <label>Choose Avatar Icon</label>
                <div className="avatar-options-grid">
                  {AVATAR_OPTIONS.map((opt) => (
                    <button
                      key={opt.emoji}
                      type="button"
                      className={`avatar-option-btn ${formData.avatar === opt.emoji ? "selected" : ""}`}
                      onClick={() => handleInputChange("avatar", opt.emoji)}
                      title={opt.label}
                    >
                      <span className="avatar-opt-emoji">{opt.emoji}</span>
                      <span className="avatar-opt-label">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bio / Tagline */}
              <div className="form-group">
                <div className="label-counter-row">
                  <label htmlFor="edit-bio">Player Motto / Bio</label>
                  <span className="char-counter">{formData.bio.length}/300</span>
                </div>
                <textarea
                  id="edit-bio"
                  rows={3}
                  value={formData.bio}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  placeholder="Share your quest philosophy or favorite programming lore..."
                  maxLength={300}
                />
              </div>

              {/* Form Action Buttons */}
              <div className="form-actions-row">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setFieldErrors({});
                  }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="primary save-submit-btn" disabled={submitting}>
                  {submitting ? "Saving Changes…" : "💾 Save Profile Details"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 5 Distinct User Accounts */}
        <div className="profiles-roster-section">
          <div className="roster-section-header">
            <div>
              <h2 className="roster-section-title">👥 The 5 Registered User Accounts</h2>
              <p className="roster-section-subtitle">
                Each person has their own distinct login ID, password, progress, and customizable profile settings.
              </p>
            </div>
          </div>

          <div className="roster-cards-grid">
            {profilesList
              .filter((p) => ["user_amank_001", "user_soumya_002", "user_tanya_003", "user_sakshi_004", "user_rohan_005"].includes(p.id))
              .map((profile) => {
                const isActive = user.id === profile.id;
                const userLoginId = profile.username || profile.id.replace("user_", "").replace(/_[0-9]+/, "");
                return (
                  <div
                    key={profile.id}
                    className={`hero-profile-card card ${isActive ? "hero-profile-card--active" : ""}`}
                  >
                    {isActive && <div className="active-badge">ACTIVE USER</div>}
                    <div className="hero-card-header">
                      <div className="hero-avatar">{profile.avatar}</div>
                      <div className="hero-identity">
                        <h3 className="hero-name">{profile.name}</h3>
                        <span className="hero-tag">{profile.gamerTag}</span>
                      </div>
                      <span className="hero-level">Lv.{profile.level}</span>
                    </div>



                    <p className="hero-title">{profile.title}</p>
                    <p className="hero-bio">"{profile.bio}"</p>

                    <div className="hero-meta-row">
                      <span>⚡ {profile.xp} XP</span>
                      <span>🪙 {profile.coins || 0} Coins</span>
                      <span>🔥 {profile.streak} Days</span>
                    </div>

                    <div className="hero-card-footer">
                      {isActive ? (
                        <button
                          className="secondary current-btn"
                          onClick={() => {
                            setIsEditing(true);
                            window.scrollTo({ top: 120, behavior: "smooth" });
                          }}
                        >
                          ✏️ Edit This Profile
                        </button>
                      ) : (
                        <button
                          className="primary switch-btn"
                          onClick={() => handleProfileSwitch(profile.id)}
                          disabled={switchingId === profile.id}
                        >
                          {switchingId === profile.id ? "Switching…" : `⚡ Switch to ${profile.name.split(" ")[0]}'s Account`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

      </div>
    </PageTransition>
  );
}
