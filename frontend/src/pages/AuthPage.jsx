import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import "./AuthPage.css";

// ── Icons (Pure Inline SVGs for crisp rendering & zero dependency bloat) ──
function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="auth-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <circle className="spinner-track" cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" />
      <path className="spinner-head" d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" />
    </svg>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, login, signup, verifyEmail, resendOtp, verify2FA, forgotPassword, resetPassword } = useAuth();

  // Mode: 'login' | 'signup' | 'verify' | 'forgot' | 'reset' | '2fa'
  const initialMode = searchParams.get("mode") || "login";
  const [mode, setMode] = useState(initialMode);
  // Redirect destination after login (e.g. /profile, /dashboard)
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (user && mode !== "verify" && mode !== "2fa") {
      navigate("/dashboard");
    }
  }, [user, navigate, mode]);

  // Sync mode with URL search params
  const switchMode = (newMode) => {
    setMode(newMode);
    setSearchParams({ mode: newMode });
    setGeneralError(null);
    setSuccessMessage(null);
  };

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP Verification state
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [pendingEmail, setPendingEmail] = useState("");
  const [devOtpPreview, setDevOtpPreview] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // 2FA state
  const [twoFactorToken, setTwoFactorToken] = useState(null);

  // Password Reset state
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // Validation & UI State
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // OTP input refs
  const otpRefs = useRef([]);

  // Countdown for resend OTP
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // ── Real-Time Password Strength Calculation ──────────────────────────────
  const calculatePasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: "Empty", color: "#6b7280", checks: {} };

    const checks = {
      length: pwd.length >= 8,
      upper: /[A-Z]/.test(pwd),
      lower: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd),
    };

    const passedCount = Object.values(checks).filter(Boolean).length;
    let score = (passedCount / 5) * 100;
    let label = "Very Weak";
    let color = "#ef4444";

    if (passedCount === 2) {
      label = "Weak";
      color = "#f97316";
    } else if (passedCount === 3) {
      label = "Moderate";
      color = "#eab308";
    } else if (passedCount === 4) {
      label = "Strong";
      color = "#10b981";
    } else if (passedCount === 5) {
      label = "Legendary ⚔️";
      color = "#f59e0b";
    }

    return { score, label, color, checks };
  };

  const pwdStrength = calculatePasswordStrength(mode === "reset" ? newPassword : password);

  // Live client validation check
  const validateField = (field, value) => {
    const errs = { ...fieldErrors };
    if (field === "email") {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!value) {
        errs.email = mode === "login" ? "User ID, Gamer Tag, or Email is required" : "Email is required";
      } else if (mode !== "login" && !emailRe.test(value)) {
        errs.email = "Invalid email format";
      } else {
        delete errs.email;
      }
    } else if (field === "name" && mode === "signup") {
      if (!value || value.trim().length < 2) {
        errs.name = "Full name must be at least 2 characters";
      } else {
        delete errs.name;
      }
    } else if (field === "password") {
      if (!value) {
        errs.password = "Password is required";
      } else if (mode === "signup" && value.length < 8) {
        errs.password = "Must be at least 8 characters";
      } else {
        delete errs.password;
      }
    } else if (field === "confirmPassword" && mode === "signup") {
      if (value !== password) {
        errs.confirmPassword = "Passwords do not match";
      } else {
        delete errs.confirmPassword;
      }
    }
    setFieldErrors(errs);
  };

  // ── Form Submissions ─────────────────────────────────────────────────────

  // Handle Sign In
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setGeneralError(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setFieldErrors({
        email: !email ? "Email is required" : undefined,
        password: !password ? "Password is required" : undefined,
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await login({ email, password, rememberMe });

      if (result.requires2FA) {
        setTwoFactorToken(result.tempToken);
        setPendingEmail(email);
        setDevOtpPreview(result.devOtp);
        switchMode("2fa");
        return;
      }

      setSuccessMessage("Welcome back to QuestLearn!");
      setTimeout(() => navigate(redirectTo), 500);
    } catch (err) {
      if (err.requiresVerification) {
        setPendingEmail(err.email || email);
        setDevOtpPreview(err.devOtp);
        switchMode("verify");
        setGeneralError("Please enter the verification code sent to your email.");
      } else {
        setGeneralError(err.message || "Failed to sign in. Please verify your credentials.");
        if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Sign Up
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setGeneralError(null);
    setSuccessMessage(null);

    const errs = {};
    if (!name || name.trim().length < 2) errs.name = "Full name must be at least 2 characters";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Please enter a valid email address";
    if (pwdStrength.score < 60) errs.password = "Password does not meet minimum strength requirements";
    if (password !== confirmPassword) errs.confirmPassword = "Passwords do not match";

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const result = await signup({ name, email, password, confirmPassword });
      setPendingEmail(email);
      setDevOtpPreview(result.devOtp);
      setSuccessMessage("Account created! Enter the 6-digit verification code sent to your email.");
      setResendCooldown(60);
      switchMode("verify");
    } catch (err) {
      setGeneralError(err.message || "Registration failed. Please try again.");
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle OTP digit input change
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-advance to next input
    if (value && index < 5 && otpRefs.current[index + 1]) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0 && otpRefs.current[index - 1]) {
      otpRefs.current[index - 1].focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim().slice(0, 6);
    if (/^\d+$/.test(pasted)) {
      const digits = pasted.split("");
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(digits.length, 5);
      if (otpRefs.current[nextIndex]) otpRefs.current[nextIndex].focus();
    }
  };

  // Submit OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      setGeneralError("Please enter all 6 digits of the code.");
      return;
    }

    setSubmitting(true);
    setGeneralError(null);
    try {
      await verifyEmail({ email: pendingEmail, otp: code });
      setSuccessMessage("Email verified! Welcome to QuestLearn!");
      setTimeout(() => navigate(redirectTo), 800);
    } catch (err) {
      setGeneralError(err.message || "Invalid or expired verification code.");
    } finally {
      setSubmitting(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      const res = await resendOtp(pendingEmail);
      setDevOtpPreview(res.devOtp);
      setResendCooldown(60);
      setSuccessMessage("A fresh verification code has been dispatched!");
    } catch (err) {
      setGeneralError(err.message || "Failed to resend code.");
    }
  };

  // Handle 2FA submission
  const handle2FASubmit = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      setGeneralError("Please enter the complete 6-digit code.");
      return;
    }

    setSubmitting(true);
    setGeneralError(null);
    try {
      await verify2FA({ tempToken: twoFactorToken, otp: code });
      setSuccessMessage("2FA verification successful! Redirecting...");
      setTimeout(() => navigate(redirectTo), 600);
    } catch (err) {
      setGeneralError(err.message || "Invalid 2FA code.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Forgot Password Request
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldErrors({ email: "Please enter a valid email address" });
      return;
    }

    setSubmitting(true);
    setGeneralError(null);
    try {
      const res = await forgotPassword(email);
      setSuccessMessage(res.message || "Password reset token sent to your email.");
      if (res.devToken) {
        setResetToken(res.devToken);
      }
      switchMode("reset");
    } catch (err) {
      setGeneralError(err.message || "Could not process password reset.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Reset Password Submit
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!resetToken) errs.resetToken = "Reset token is required";
    if (calculatePasswordStrength(newPassword).score < 60) {
      errs.newPassword = "Password does not meet complexity requirements";
    }
    if (newPassword !== confirmNewPassword) {
      errs.confirmNewPassword = "Passwords do not match";
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setSubmitting(true);
    setGeneralError(null);
    try {
      const res = await resetPassword({
        token: resetToken,
        newPassword,
        confirmPassword: confirmNewPassword,
      });
      setSuccessMessage(res.message || "Password reset successful! You can now log in.");
      setPassword("");
      setTimeout(() => switchMode("login"), 1200);
    } catch (err) {
      setGeneralError(err.message || "Failed to reset password.");
    } finally {
      setSubmitting(false);
    }
  };

  // Social Login — not yet implemented, show informational message
  const handleSocial = (provider) => {
    setGeneralError(
      `${provider.charAt(0).toUpperCase() + provider.slice(1)} login is coming soon! ` +
      "Please use email and password or one of the demo accounts for now."
    );
  };

  return (
    <div className="auth-page">
      {/* Background ambient lighting */}
      <div className="auth-ambient-glow" aria-hidden="true" />

      <motion.div
        className={`auth-card ${mode === "login" || mode === "signup" ? "auth-card--wide" : ""}`}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        {/* Header Branding */}
        <div className="auth-header">
          <div className="auth-badge">
            <span className="auth-badge-icon">⚔️</span>
            <span className="auth-badge-text">QuestLearn Guild</span>
          </div>
          <h1 className="auth-title">
            {mode === "login" && "Enter the Realm"}
            {mode === "signup" && "Begin Your Journey"}
            {mode === "verify" && "Verify Your Identity"}
            {mode === "forgot" && "Recover Your Relic"}
            {mode === "reset" && "Forge New Password"}
            {mode === "2fa" && "Two-Factor Shield"}
          </h1>
          <p className="auth-subtitle">
            {mode === "login" && "Sign in to resume your quests, track your streaks, and claim trophies."}
            {mode === "signup" && "Create your adventurer persona and unlock gamified knowledge."}
            {mode === "verify" && `We sent a 6-digit confirmation code to ${pendingEmail || "your email"}.`}
            {mode === "forgot" && "Enter your email and we'll dispatch a secure recovery token."}
            {mode === "reset" && "Set a powerful, uncrackable passcode for your adventurer account."}
            {mode === "2fa" && "Enter the verification code from your authenticator or email."}
          </p>
        </div>

        {/* Global Alert Banners */}
        {generalError && (
          <motion.div
            className="auth-alert auth-alert--error"
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
          >
            <AlertCircleIcon />
            <span>{generalError}</span>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            className="auth-alert auth-alert--success"
            role="status"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
          >
            <CheckIcon />
            <span>{successMessage}</span>
          </motion.div>
        )}

        {/* Dev OTP / Token Auto-Fill Helper (Seamless Local Testing) */}
        {devOtpPreview && (mode === "verify" || mode === "2fa") && (
          <div className="auth-dev-helper">
            <span className="dev-helper-label">🧪 Dev Preview Code:</span>
            <span className="dev-helper-code">{devOtpPreview}</span>
            <button
              type="button"
              className="dev-helper-btn"
              onClick={() => {
                const digits = devOtpPreview.toString().split("");
                setOtp(digits);
              }}
            >
              Auto-Fill
            </button>
          </div>
        )}

        {/* Tabs for Login & Sign Up */}
        {(mode === "login" || mode === "signup") && (
          <div className="auth-tabs" role="tablist" aria-label="Authentication modes">
            <button
              role="tab"
              aria-selected={mode === "login"}
              className={`auth-tab ${mode === "login" ? "auth-tab--active" : ""}`}
              onClick={() => switchMode("login")}
            >
              Sign In
            </button>
            <button
              role="tab"
              aria-selected={mode === "signup"}
              className={`auth-tab ${mode === "signup" ? "auth-tab--active" : ""}`}
              onClick={() => switchMode("signup")}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* ── MODE 1: LOGIN FORM ── */}
        {mode === "login" && (
          <div className="auth-split-container">
            {/* Left Column: Direct Access Form */}
            <form className="auth-form auth-form--split" onSubmit={handleLoginSubmit} noValidate>
              {/* Email / User ID Field */}
              <div className="auth-field">
                <label htmlFor="login-email" className="auth-label">
                  User ID, Gamer Tag, or Email
                </label>
                <div className={`auth-input-wrap ${fieldErrors.email ? "has-error" : ""}`}>
                  <input
                    id="login-email"
                    type="text"
                    className="auth-input"
                    placeholder="e.g. rohan, amank, or user@questlearn.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      validateField("email", e.target.value);
                    }}
                    required
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
                  />
                </div>
                {fieldErrors.email && (
                  <p id="login-email-error" className="auth-field-error" role="alert">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="auth-field">
                <div className="auth-label-row">
                  <label htmlFor="login-password" className="auth-label">
                    Password
                  </label>
                  <button
                    type="button"
                    className="auth-forgot-link"
                    onClick={() => switchMode("forgot")}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className={`auth-input-wrap ${fieldErrors.password ? "has-error" : ""}`}>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    className="auth-input auth-input--with-icon"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      validateField("password", e.target.value);
                    }}
                    required
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? "login-pwd-error" : undefined}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p id="login-pwd-error" className="auth-field-error" role="alert">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* Remember Me */}
              <div className="auth-options-row">
                <label className="auth-checkbox-label">
                  <input
                    type="checkbox"
                    className="auth-checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me for 30 days</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="auth-submit-btn"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Spinner />
                    <span>Signing in...</span>
                  </>
                ) : (
                  "Sign In to QuestLearn"
                )}
              </button>

              {/* Social Logins */}
              <div className="auth-divider">
                <span>or sign in with</span>
              </div>
              <div className="auth-social-row">
                <button
                  type="button"
                  className="auth-social-btn"
                  onClick={() => handleSocial("google")}
                  aria-label="Sign in with Google (coming soon)"
                  title="Coming Soon"
                >
                  <GoogleIcon />
                  <span>Google</span>
                </button>
                <button
                  type="button"
                  className="auth-social-btn"
                  onClick={() => handleSocial("github")}
                  aria-label="Sign in with GitHub (coming soon)"
                  title="Coming Soon"
                >
                  <GitHubIcon />
                  <span>GitHub</span>
                </button>
              </div>
            </form>

            {/* Right Column: 5 Registered Demo Accounts Panel */}
            <div className="auth-roster-panel">
              <div className="auth-roster-header">
                <div className="auth-roster-badge-row">
                  <span className="auth-roster-badge">⚡ Quick Access</span>
                  <span className="auth-roster-count">5 Accounts</span>
                </div>
                <h3 className="auth-roster-title">
                  🔑 5 Registered User Accounts
                </h3>
                <p className="auth-roster-subtitle">
                  Click to auto-fill credentials &amp; sign in:
                </p>
              </div>

              <div className="auth-roster-list">
                {[
                  { name: "Amank", id: "amank", pwd: "Amank@123", icon: "🧙‍♂️", tag: "@AmankStorm", role: "Sage Master" },
                  { name: "Soumya", id: "soumya", pwd: "Soumya@123", icon: "⚡", tag: "@SoumyaBlade", role: "Storm Blade" },
                  { name: "Tanya", id: "tanya", pwd: "Tanya@123", icon: "🏹", tag: "@TanyaCyber", role: "Cyber Archer" },
                  { name: "Sakshi", id: "sakshi", pwd: "Sakshi@123", icon: "🛡️", tag: "@SakshiValkyrie", role: "Valkyrie Shield" },
                  { name: "Rohan", id: "rohan", pwd: "Rohan@123", icon: "🐉", tag: "@RohanTitan", role: "Dragon Titan" },
                ].map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    className={`auth-roster-item ${email === acc.id ? "auth-roster-item--active" : ""}`}
                    onClick={() => {
                      setEmail(acc.id);
                      setPassword(acc.pwd);
                      setFieldErrors({});
                    }}
                    title={`Click to fill credentials: User ID: ${acc.id} / Password: ${acc.pwd}`}
                  >
                    <div className="auth-roster-icon-wrap">
                      <span className="auth-roster-icon">{acc.icon}</span>
                    </div>
                    <div className="auth-roster-details">
                      <div className="auth-roster-top">
                        <span className="auth-roster-name">{acc.name}</span>
                        <span className="auth-roster-role">{acc.role}</span>
                      </div>
                      <span className="auth-roster-tag">{acc.tag}</span>
                    </div>
                    <div className="auth-roster-action">
                      <span className="auth-roster-fill-pill">Fill ⚡</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── MODE 2: SIGN UP FORM ── */}
        {mode === "signup" && (
          <form className="auth-signup-split" onSubmit={handleSignupSubmit} noValidate>
            {/* Left Column: Adventurer Credentials */}
            <div className="auth-signup-col">
              {/* Full Name */}
              <div className="auth-field">
                <label htmlFor="signup-name" className="auth-label">
                  Full Name / Adventurer Tag
                </label>
                <div className={`auth-input-wrap ${fieldErrors.name ? "has-error" : ""}`}>
                  <input
                    id="signup-name"
                    type="text"
                    className="auth-input"
                    placeholder="Sir Lancelot"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      validateField("name", e.target.value);
                    }}
                    required
                    aria-invalid={!!fieldErrors.name}
                    aria-describedby={fieldErrors.name ? "signup-name-error" : undefined}
                  />
                </div>
                {fieldErrors.name && (
                  <p id="signup-name-error" className="auth-field-error" role="alert">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              {/* Email Field */}
              <div className="auth-field">
                <label htmlFor="signup-email" className="auth-label">
                  Email Address
                </label>
                <div className={`auth-input-wrap ${fieldErrors.email ? "has-error" : ""}`}>
                  <input
                    id="signup-email"
                    type="email"
                    className="auth-input"
                    placeholder="lancelot@questlearn.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      validateField("email", e.target.value);
                    }}
                    required
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? "signup-email-error" : undefined}
                  />
                </div>
                {fieldErrors.email && (
                  <p id="signup-email-error" className="auth-field-error" role="alert">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="auth-field">
                <label htmlFor="signup-password" className="auth-label">
                  Password
                </label>
                <div className={`auth-input-wrap ${fieldErrors.password ? "has-error" : ""}`}>
                  <input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    className="auth-input auth-input--with-icon"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      validateField("password", e.target.value);
                    }}
                    required
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby="password-strength-checklist"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="auth-field-error" role="alert">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="auth-field">
                <label htmlFor="signup-confirm-password" className="auth-label">
                  Confirm Password
                </label>
                <div className={`auth-input-wrap ${fieldErrors.confirmPassword ? "has-error" : ""}`}>
                  <input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    className="auth-input auth-input--with-icon"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      validateField("confirmPassword", e.target.value);
                    }}
                    required
                    aria-invalid={!!fieldErrors.confirmPassword}
                    aria-describedby={fieldErrors.confirmPassword ? "signup-cpwd-error" : undefined}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p id="signup-cpwd-error" className="auth-field-error" role="alert">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: Sentinel Shield, Live Checklist & Submit */}
            <div className="auth-signup-col auth-signup-col--sentinel">
              {/* Password Strength Meter & Interactive Checklist */}
              <div className="auth-sentinel-box" id="password-strength-checklist">
                <div className="auth-sentinel-header">
                  <span className="auth-sentinel-badge">🛡️ Passcode Sentinel</span>
                  <span className="strength-status" style={{ color: pwdStrength.color }}>
                    {pwdStrength.label}
                  </span>
                </div>

                <div className="strength-track">
                  <motion.div
                    className="strength-fill"
                    style={{
                      width: `${pwdStrength.score}%`,
                      backgroundColor: pwdStrength.color,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pwdStrength.score}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>

                {/* Visual Criteria Checklist */}
                <div className="strength-criteria">
                  <span className={`criteria-item ${pwdStrength.checks.length ? "met" : ""}`}>
                    <CheckIcon /> 8+ chars
                  </span>
                  <span className={`criteria-item ${pwdStrength.checks.upper ? "met" : ""}`}>
                    <CheckIcon /> Uppercase
                  </span>
                  <span className={`criteria-item ${pwdStrength.checks.lower ? "met" : ""}`}>
                    <CheckIcon /> Lowercase
                  </span>
                  <span className={`criteria-item ${pwdStrength.checks.number ? "met" : ""}`}>
                    <CheckIcon /> Number
                  </span>
                  <span className={`criteria-item ${pwdStrength.checks.special ? "met" : ""}`}>
                    <CheckIcon /> Symbol
                  </span>
                </div>

                {/* Password Match Status */}
                {confirmPassword.length > 0 && (
                  <div className={`auth-match-indicator ${password === confirmPassword ? "matched" : "mismatched"}`}>
                    <CheckIcon />
                    <span>{password === confirmPassword ? "Passwords match perfectly" : "Passwords do not match yet"}</span>
                  </div>
                )}

                {/* Guild Perks Badge */}
                <div className="auth-guild-perks">
                  <span className="auth-guild-perks-title">✨ Adventurer Perks</span>
                  <div className="auth-perks-tags">
                    <span className="perk-tag">⚡ +100 Starter XP</span>
                    <span className="perk-tag">🏆 Bronze League</span>
                    <span className="perk-tag">🏛️ Mistake Museum</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="auth-submit-btn"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Spinner />
                    <span>Forging Account...</span>
                  </>
                ) : (
                  "Create Adventurer Account"
                )}
              </button>

              {/* Social Logins */}
              <div className="auth-divider">
                <span>or sign up with</span>
              </div>
              <div className="auth-social-row">
                <button
                  type="button"
                  className="auth-social-btn"
                  onClick={() => handleSocial("google")}
                  aria-label="Sign up with Google (coming soon)"
                  title="Coming Soon"
                >
                  <GoogleIcon />
                  <span>Google</span>
                </button>
                <button
                  type="button"
                  className="auth-social-btn"
                  onClick={() => handleSocial("github")}
                  aria-label="Sign up with GitHub (coming soon)"
                  title="Coming Soon"
                >
                  <GitHubIcon />
                  <span>GitHub</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ── MODE 3: EMAIL VERIFICATION (OTP) ── */}
        {mode === "verify" && (
          <form className="auth-form" onSubmit={handleVerifyOtp}>
            <div className="auth-otp-group" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (otpRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className="auth-otp-box"
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  aria-label={`Digit ${i + 1}`}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={submitting || otp.join("").length < 6}
            >
              {submitting ? (
                <>
                  <Spinner />
                  <span>Verifying Code...</span>
                </>
              ) : (
                "Confirm & Unlock Access"
              )}
            </button>

            <div className="auth-resend-row">
              <span>Didn't receive the code?</span>
              <button
                type="button"
                className="auth-resend-btn"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
              </button>
            </div>

            <button
              type="button"
              className="auth-back-btn"
              onClick={() => switchMode("login")}
            >
              ← Back to Sign In
            </button>
          </form>
        )}

        {/* ── MODE 4: 2FA VERIFICATION ── */}
        {mode === "2fa" && (
          <form className="auth-form" onSubmit={handle2FASubmit}>
            <div className="auth-otp-group" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (otpRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className="auth-otp-box"
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  aria-label={`2FA Digit ${i + 1}`}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={submitting || otp.join("").length < 6}
            >
              {submitting ? (
                <>
                  <Spinner />
                  <span>Authenticating 2FA...</span>
                </>
              ) : (
                "Verify Shield & Enter"
              )}
            </button>

            <button
              type="button"
              className="auth-back-btn"
              onClick={() => switchMode("login")}
            >
              ← Cancel and Return
            </button>
          </form>
        )}

        {/* ── MODE 5: FORGOT PASSWORD ── */}
        {mode === "forgot" && (
          <form className="auth-form" onSubmit={handleForgotPasswordSubmit} noValidate>
            <div className="auth-field">
              <label htmlFor="forgot-email" className="auth-label">
                Account Email Address
              </label>
              <div className={`auth-input-wrap ${fieldErrors.email ? "has-error" : ""}`}>
                <input
                  id="forgot-email"
                  type="email"
                  className="auth-input"
                  placeholder="adventurer@questlearn.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {fieldErrors.email && (
                <p className="auth-field-error" role="alert">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Spinner />
                  <span>Sending Recovery Token...</span>
                </>
              ) : (
                "Send Password Reset Token"
              )}
            </button>

            <button
              type="button"
              className="auth-back-btn"
              onClick={() => switchMode("login")}
            >
              ← Back to Sign In
            </button>
          </form>
        )}

        {/* ── MODE 6: RESET PASSWORD ── */}
        {mode === "reset" && (
          <form className="auth-form" onSubmit={handleResetPasswordSubmit} noValidate>
            <div className="auth-field">
              <label htmlFor="reset-token-input" className="auth-label">
                Recovery Token
              </label>
              <div className={`auth-input-wrap ${fieldErrors.resetToken ? "has-error" : ""}`}>
                <input
                  id="reset-token-input"
                  type="text"
                  className="auth-input"
                  placeholder="Paste secure token"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  required
                />
              </div>
              {fieldErrors.resetToken && (
                <p className="auth-field-error" role="alert">
                  {fieldErrors.resetToken}
                </p>
              )}
            </div>

            <div className="auth-field">
              <label htmlFor="new-password" className="auth-label">
                New Password
              </label>
              <div className={`auth-input-wrap ${fieldErrors.newPassword ? "has-error" : ""}`}>
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  className="auth-input auth-input--with-icon"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>

              {/* Password strength */}
              {newPassword.length > 0 && (
                <div className="auth-strength-meter">
                  <div className="strength-header">
                    <span className="strength-label-text">Strength:</span>
                    <span className="strength-status" style={{ color: pwdStrength.color }}>
                      {pwdStrength.label}
                    </span>
                  </div>
                  <div className="strength-track">
                    <div
                      className="strength-fill"
                      style={{
                        width: `${pwdStrength.score}%`,
                        backgroundColor: pwdStrength.color,
                      }}
                    />
                  </div>
                </div>
              )}
              {fieldErrors.newPassword && (
                <p className="auth-field-error" role="alert">
                  {fieldErrors.newPassword}
                </p>
              )}
            </div>

            <div className="auth-field">
              <label htmlFor="confirm-new-password" className="auth-label">
                Confirm New Password
              </label>
              <div className={`auth-input-wrap ${fieldErrors.confirmNewPassword ? "has-error" : ""}`}>
                <input
                  id="confirm-new-password"
                  type={showConfirmPassword ? "text" : "password"}
                  className="auth-input auth-input--with-icon"
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {fieldErrors.confirmNewPassword && (
                <p className="auth-field-error" role="alert">
                  {fieldErrors.confirmNewPassword}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Spinner />
                  <span>Updating Passcode...</span>
                </>
              ) : (
                "Update Password & Return to Sign In"
              )}
            </button>

            <button
              type="button"
              className="auth-back-btn"
              onClick={() => switchMode("login")}
            >
              ← Back to Sign In
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
