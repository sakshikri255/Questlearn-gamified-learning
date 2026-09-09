const express = require("express");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const {
  getAllUsers,
  saveAllUsers,
  findUserByEmail,
  findUserById,
  sanitizeInput,
  isValidEmail,
  validatePasswordComplexity,
  generateOTP,
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  toPublicUser,
  sendSimulatedEmail,
  simulatedEmailOutbox,
  JWT_ACCESS_SECRET,
} = require("../authService");

const router = express.Router();

// Only expose dev-helper tokens in non-production environments
const isDev = process.env.NODE_ENV !== "production";

// ── Rate Limiters ──────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 10 : 200,
  message: { error: "Too many login attempts from this IP. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many password reset attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper for cookie options
const getCookieOptions = (rememberMe = false) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
  path: "/",
});

// Middleware: Verify Access Token
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({ error: "Access denied. Authentication token required." });
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid or expired access token." });
  }

  const user = findUserById(decoded.id);
  if (!user) {
    return res.status(401).json({ error: "User associated with this token no longer exists." });
  }

  req.user = user;
  next();
}

// ───────────────────────────────────────────────────────────────────────────
// 1. POST /api/auth/signup
// ───────────────────────────────────────────────────────────────────────────
router.post("/signup", generalLimiter, async (req, res) => {
  try {
    let { name, email, password, confirmPassword } = req.body || {};

    name = sanitizeInput(name);
    email = (email || "").trim().toLowerCase();

    const fieldErrors = {};

    if (!name || name.length < 2) {
      fieldErrors.name = "Full name must be at least 2 characters.";
    }
    if (!isValidEmail(email)) {
      fieldErrors.email = "Please provide a valid email address.";
    }
    const pwdCheck = validatePasswordComplexity(password);
    if (!pwdCheck.valid) {
      fieldErrors.password = pwdCheck.message;
    }
    if (password !== confirmPassword) {
      fieldErrors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      return res.status(400).json({
        error: "Validation failed.",
        fieldErrors,
      });
    }

    // Duplicate email check
    const existing = findUserByEmail(email);
    if (existing) {
      return res.status(409).json({
        error: "An account with this email already exists.",
        fieldErrors: { email: "Email already registered." },
      });
    }

    const passwordHash = await hashPassword(password);
    const otp = generateOTP();
    const otpExpires = Date.now() + 15 * 60 * 1000; // 15 mins

    const newUser = {
      id: "user_" + crypto.randomBytes(8).toString("hex"),
      name,
      email,
      passwordHash,
      isVerified: false,
      verificationToken: otp,
      verificationExpires: otpExpires,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      twoFactorEnabled: false,
      twoFactorTempSecret: null,
      twoFactorExpires: null,
      refreshToken: null,
      role: "user",
      avatar: "🛡️",
      xp: 100,
      level: 1,
      streak: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const users = getAllUsers();
    users.push(newUser);
    saveAllUsers(users);

    // Send verification email
    sendSimulatedEmail({
      to: email,
      subject: "⚔️ Verify your QuestLearn Account",
      text: `Welcome to QuestLearn, ${name}! Your 6-digit verification code is: ${otp}. It expires in 15 minutes.`,
      otp,
    });

    res.status(201).json({
      message: "Account created successfully! We sent a 6-digit verification code to your email.",
      email,
      requiresVerification: true,
      ...(isDev && { devOtp: otp }), // only exposed in development
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "An unexpected error occurred during signup." });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// 2. POST /api/auth/verify-email
// ───────────────────────────────────────────────────────────────────────────
router.post("/verify-email", generalLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    const normalizedEmail = (email || "").trim().toLowerCase();

    if (!normalizedEmail || !otp) {
      return res.status(400).json({ error: "Email and OTP code are required." });
    }

    const users = getAllUsers();
    const userIndex = users.findIndex((u) => u.email.toLowerCase() === normalizedEmail);

    if (userIndex === -1) {
      return res.status(404).json({ error: "Account not found." });
    }

    const user = users[userIndex];

    if (user.isVerified) {
      // Already verified, generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user, false);
      res.cookie("refreshToken", refreshToken, getCookieOptions(false));
      return res.json({
        message: "Email is already verified.",
        user: toPublicUser(user),
        accessToken,
      });
    }

    if (!user.verificationToken || user.verificationToken !== otp.toString().trim()) {
      return res.status(400).json({ error: "Invalid verification code. Please double check." });
    }

    if (Date.now() > (user.verificationExpires || 0)) {
      return res.status(400).json({ error: "Verification code has expired. Please request a new one." });
    }

    // Mark verified
    user.isVerified = true;
    user.verificationToken = null;
    user.verificationExpires = null;
    user.updatedAt = new Date().toISOString();

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user, false);
    user.refreshToken = refreshToken;

    users[userIndex] = user;
    saveAllUsers(users);

    res.cookie("refreshToken", refreshToken, getCookieOptions(false));

    res.json({
      message: "Email verified successfully! Welcome aboard, Adventurer.",
      user: toPublicUser(user),
      accessToken,
    });
  } catch (err) {
    console.error("Verify email error:", err);
    res.status(500).json({ error: "Failed to verify email." });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// 3. POST /api/auth/resend-otp
// ───────────────────────────────────────────────────────────────────────────
router.post("/resend-otp", generalLimiter, async (req, res) => {
  try {
    const { email } = req.body || {};
    const normalizedEmail = (email || "").trim().toLowerCase();

    const users = getAllUsers();
    const user = users.find((u) => u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      return res.status(404).json({ error: "Account not found." });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "Account is already verified." });
    }

    const otp = generateOTP();
    user.verificationToken = otp;
    user.verificationExpires = Date.now() + 15 * 60 * 1000;
    saveAllUsers(users);

    sendSimulatedEmail({
      to: user.email,
      subject: "⚔️ New QuestLearn Verification Code",
      text: `Your new 6-digit verification code is: ${otp}. It expires in 15 minutes.`,
      otp,
    });

    res.json({
      message: "A new verification code has been dispatched to your email.",
      ...(isDev && { devOtp: otp }),
    });
  } catch (err) {
    console.error("Resend OTP error:", err);
    res.status(500).json({ error: "Failed to resend code." });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// 4. POST /api/auth/login (with brute-force protection)
// ───────────────────────────────────────────────────────────────────────────
router.post("/login", loginLimiter, async (req, res) => {
  try {
    let { email, username, loginId, password, rememberMe = false } = req.body || {};
    const identifier = (loginId || email || username || "").trim().toLowerCase();
    const cleanTag = identifier.replace(/^@+/, "");

    if (!identifier || !password) {
      return res.status(400).json({
        error: "User ID / Email and password are required.",
        fieldErrors: {
          ...(!identifier && { email: "User ID or Email is required." }),
          ...(!password && { password: "Password is required." }),
        },
      });
    }

    const users = getAllUsers();
    const user = users.find(
      (u) =>
        (u.email && u.email.toLowerCase() === identifier) ||
        (u.username && u.username.toLowerCase() === identifier) ||
        (u.id && u.id.toLowerCase() === identifier) ||
        (u.gamerTag && u.gamerTag.toLowerCase().replace(/^@+/, "") === cleanTag) ||
        (u.name && u.name.toLowerCase() === identifier)
    );

    if (!user) {
      return res.status(401).json({ error: "Invalid user ID / email or password." });
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid user ID / email or password." });
    }

    // Check verification status
    if (!user.isVerified) {
      // Regenerate OTP and request verification
      const otp = generateOTP();
      user.verificationToken = otp;
      user.verificationExpires = Date.now() + 15 * 60 * 1000;
      saveAllUsers(users);

      sendSimulatedEmail({
        to: user.email,
        subject: "⚔️ Verify your QuestLearn Account",
        text: `Your verification code is: ${otp}. It expires in 15 minutes.`,
        otp,
      });

      return res.status(403).json({
        error: "Your email has not been verified yet. We sent a new verification code.",
        requiresVerification: true,
        email: user.email,
        ...(isDev && { devOtp: otp }),
      });
    }

    // Check 2FA
    if (user.twoFactorEnabled) {
      const twoFactorOtp = generateOTP();
      user.twoFactorTempSecret = twoFactorOtp;
      user.twoFactorExpires = Date.now() + 10 * 60 * 1000; // 10 min
      saveAllUsers(users);

      sendSimulatedEmail({
        to: user.email,
        subject: "🔐 QuestLearn Two-Factor Authentication Code",
        text: `Your 2FA security login code is: ${twoFactorOtp}. Expires in 10 minutes.`,
        otp: twoFactorOtp,
      });

      const tempToken = jwt.sign(
        { id: user.id, purpose: "2fa", rememberMe: !!rememberMe },
        JWT_ACCESS_SECRET,
        { expiresIn: "10m" }
      );

      return res.json({
        message: "Two-factor authentication code sent to your email.",
        requires2FA: true,
        tempToken,
        ...(isDev && { devOtp: twoFactorOtp }),
      });
    }

    // Standard successful login
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user, !!rememberMe);
    user.refreshToken = refreshToken;
    saveAllUsers(users);

    res.cookie("refreshToken", refreshToken, getCookieOptions(!!rememberMe));

    res.json({
      message: "Welcome back, adventurer!",
      user: toPublicUser(user),
      accessToken,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "An unexpected error occurred during login." });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// 5. POST /api/auth/verify-2fa
// ───────────────────────────────────────────────────────────────────────────
router.post("/verify-2fa", loginLimiter, async (req, res) => {
  try {
    const { tempToken, otp } = req.body || {};

    if (!tempToken || !otp) {
      return res.status(400).json({ error: "Temporary token and 2FA OTP code are required." });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, JWT_ACCESS_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "2FA session expired. Please log in again." });
    }

    if (decoded.purpose !== "2fa") {
      return res.status(400).json({ error: "Invalid token payload for 2FA." });
    }

    const users = getAllUsers();
    const user = users.find((u) => u.id === decoded.id);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (!user.twoFactorTempSecret || user.twoFactorTempSecret !== otp.toString().trim()) {
      return res.status(400).json({ error: "Invalid 2FA code." });
    }

    if (Date.now() > (user.twoFactorExpires || 0)) {
      return res.status(400).json({ error: "2FA code expired. Please log in again." });
    }

    // Clear 2FA temp secret
    user.twoFactorTempSecret = null;
    user.twoFactorExpires = null;

    const rememberMe = !!decoded.rememberMe;
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user, rememberMe);
    user.refreshToken = refreshToken;
    saveAllUsers(users);

    res.cookie("refreshToken", refreshToken, getCookieOptions(rememberMe));

    res.json({
      message: "2FA verified successfully!",
      user: toPublicUser(user),
      accessToken,
    });
  } catch (err) {
    console.error("Verify 2FA error:", err);
    res.status(500).json({ error: "Failed to verify 2FA." });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// 6. POST /api/auth/refresh
// ───────────────────────────────────────────────────────────────────────────
router.post("/refresh", async (req, res) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!token) {
      return res.status(401).json({ error: "No refresh token provided." });
    }

    const decoded = verifyRefreshToken(token);
    if (!decoded) {
      res.clearCookie("refreshToken", { path: "/" });
      return res.status(401).json({ error: "Refresh token is invalid or expired. Please sign in again." });
    }

    const user = findUserById(decoded.id);
    if (!user) {
      res.clearCookie("refreshToken", { path: "/" });
      return res.status(401).json({ error: "User no longer exists." });
    }

    const newAccessToken = generateAccessToken(user);

    res.json({
      accessToken: newAccessToken,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error("Token refresh error:", err);
    res.status(500).json({ error: "Could not refresh session." });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// 7. POST /api/auth/logout
// ───────────────────────────────────────────────────────────────────────────
router.post("/logout", (req, res) => {
  res.clearCookie("refreshToken", { path: "/" });
  res.json({ message: "Successfully logged out." });
});

// ───────────────────────────────────────────────────────────────────────────
// 8. GET /api/auth/me (current user profile)
// ───────────────────────────────────────────────────────────────────────────
router.get("/me", requireAuth, (req, res) => {
  res.json({
    user: toPublicUser(req.user),
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 9. POST /api/auth/toggle-2fa
// ───────────────────────────────────────────────────────────────────────────
router.post("/toggle-2fa", requireAuth, (req, res) => {
  try {
    const users = getAllUsers();
    const userIndex = users.findIndex((u) => u.id === req.user.id);
    if (userIndex === -1) return res.status(404).json({ error: "User not found" });

    users[userIndex].twoFactorEnabled = !users[userIndex].twoFactorEnabled;
    users[userIndex].updatedAt = new Date().toISOString();
    saveAllUsers(users);

    res.json({
      message: `Two-factor authentication is now ${users[userIndex].twoFactorEnabled ? "enabled" : "disabled"}.`,
      twoFactorEnabled: users[userIndex].twoFactorEnabled,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to toggle 2FA" });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// 10. POST /api/auth/forgot-password (with brute force protection & enumeration guard)
// ───────────────────────────────────────────────────────────────────────────
router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  try {
    let { email } = req.body || {};
    email = (email || "").trim().toLowerCase();

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    const users = getAllUsers();
    const user = users.find((u) => u.email.toLowerCase() === email);

    // To prevent user enumeration, always send generic message
    const genericResponse = {
      message: "If that email address is registered, a password reset link has been dispatched.",
    };

    if (!user) {
      return res.json(genericResponse);
    }

    // Generate secure reset token
    const rawResetToken = crypto.randomBytes(32).toString("hex");
    const hashedResetToken = crypto.createHash("sha256").update(rawResetToken).digest("hex");

    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour expiry
    saveAllUsers(users);

    // Send email with reset token
    sendSimulatedEmail({
      to: user.email,
      subject: "🛡️ Reset your QuestLearn Password",
      text: `You requested a password reset. Token: ${rawResetToken}. This link and token expire in 1 hour.`,
      token: rawResetToken,
    });

    res.json({
      ...genericResponse,
      ...(isDev && { devToken: rawResetToken }),
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Failed to process forgot password request." });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// 11. POST /api/auth/reset-password (one-time use, expiry check)
// ───────────────────────────────────────────────────────────────────────────
router.post("/reset-password", generalLimiter, async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body || {};

    if (!token) {
      return res.status(400).json({ error: "Reset token is required." });
    }

    const pwdCheck = validatePasswordComplexity(newPassword);
    if (!pwdCheck.valid) {
      return res.status(400).json({ error: pwdCheck.message });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match." });
    }

    const hashedInputToken = crypto.createHash("sha256").update(token.trim()).digest("hex");

    const users = getAllUsers();
    const user = users.find(
      (u) =>
        u.resetPasswordToken === hashedInputToken &&
        u.resetPasswordExpires &&
        Date.now() < u.resetPasswordExpires
    );

    if (!user) {
      return res.status(400).json({
        error: "Password reset token is invalid, expired, or has already been used.",
      });
    }

    // Update password and clear reset token for one-time use
    user.passwordHash = await hashPassword(newPassword);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.updatedAt = new Date().toISOString();
    saveAllUsers(users);

    res.json({
      message: "Password reset successfully! You can now log in with your new credentials.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Failed to reset password." });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// 12. POST /api/auth/social-login (OAuth Stubs for Google, GitHub, Apple)
// ───────────────────────────────────────────────────────────────────────────
router.post("/social-login", generalLimiter, async (req, res) => {
  try {
    let { provider, email, name, providerId } = req.body || {};
    provider = (provider || "google").toLowerCase();

    if (!email) {
      // Create mock identifier if stub didn't provide one
      const mockId = crypto.randomBytes(4).toString("hex");
      email = `${provider}_user_${mockId}@social.questlearn.com`;
    }
    if (!name) {
      name = `${provider.toUpperCase()} Adventurer`;
    }

    email = email.trim().toLowerCase();
    const users = getAllUsers();
    let user = users.find((u) => u.email.toLowerCase() === email);

    if (!user) {
      // Auto-register social user
      user = {
        id: "user_social_" + crypto.randomBytes(8).toString("hex"),
        name: sanitizeInput(name),
        email,
        passwordHash: await hashPassword(crypto.randomBytes(16).toString("hex")), // secure random hash
        isVerified: true, // social oauth emails are pre-verified
        verificationToken: null,
        verificationExpires: null,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        twoFactorEnabled: false,
        twoFactorTempSecret: null,
        twoFactorExpires: null,
        refreshToken: null,
        role: "user",
        avatar: provider === "github" ? "🐙" : provider === "google" ? "🌐" : "🍎",
        xp: 150,
        level: 1,
        streak: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      users.push(user);
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user, true);
    user.refreshToken = refreshToken;
    saveAllUsers(users);

    res.cookie("refreshToken", refreshToken, getCookieOptions(true));

    res.json({
      message: `Signed in with ${provider}!`,
      user: toPublicUser(user),
      accessToken,
    });
  } catch (err) {
    console.error("Social login error:", err);
    res.status(500).json({ error: "Social login failed." });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// 14. GET /api/auth/profiles (List all available user profiles)
// ───────────────────────────────────────────────────────────────────────────
router.get("/profiles", (req, res) => {
  try {
    const users = getAllUsers();
    const publicProfiles = users.map((u) => toPublicUser(u));
    res.json({ profiles: publicProfiles });
  } catch (err) {
    console.error("Error fetching profiles:", err);
    res.status(500).json({ error: "Failed to load profiles" });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// 15. POST /api/auth/switch-profile (Instant switch to any of the 5 profiles)
// ───────────────────────────────────────────────────────────────────────────
router.post("/switch-profile", (req, res) => {
  try {
    const { profileId, email } = req.body || {};
    const users = getAllUsers();

    let targetUser = null;
    if (profileId) {
      targetUser = users.find((u) => u.id === profileId);
    } else if (email) {
      targetUser = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    }

    if (!targetUser) {
      return res.status(404).json({ error: "Selected profile not found." });
    }

    const accessToken = generateAccessToken(targetUser);
    const refreshToken = generateRefreshToken(targetUser, true);
    targetUser.refreshToken = refreshToken;
    saveAllUsers(users);

    res.cookie("refreshToken", refreshToken, getCookieOptions(true));

    res.json({
      message: `Switched active profile to ${targetUser.name}!`,
      user: toPublicUser(targetUser),
      accessToken,
    });
  } catch (err) {
    console.error("Profile switch error:", err);
    res.status(500).json({ error: "Failed to switch profile" });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// 16. PUT /api/auth/profile (Update gamer profile details)
// ───────────────────────────────────────────────────────────────────────────
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const users = getAllUsers();
    const userIndex = users.findIndex((u) => u.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ error: "User account not found." });
    }

    const currentUser = users[userIndex];
    let { name, gamerTag, email, avatar, bio, title } = req.body || {};

    const fieldErrors = {};

    // Validate Name
    if (name !== undefined) {
      name = sanitizeInput(name);
      if (!name || name.length < 2) {
        fieldErrors.name = "Full name must be at least 2 characters.";
      } else if (name.length > 50) {
        fieldErrors.name = "Full name must be 50 characters or less.";
      } else {
        currentUser.name = name;
      }
    }

    // Validate Gamer Tag
    if (gamerTag !== undefined) {
      let cleanTag = sanitizeInput(gamerTag).replace(/^@+/, "").trim();
      if (!cleanTag || cleanTag.length < 2) {
        fieldErrors.gamerTag = "Gamer tag must be at least 2 characters.";
      } else if (cleanTag.length > 30) {
        fieldErrors.gamerTag = "Gamer tag must be 30 characters or less.";
      } else if (!/^[a-zA-Z0-9_-]+$/.test(cleanTag)) {
        fieldErrors.gamerTag = "Gamer tag may only contain letters, numbers, dashes, and underscores.";
      } else {
        // Check uniqueness across other users
        const duplicate = users.find(
          (u) =>
            u.id !== currentUser.id &&
            (u.gamerTag || "").toLowerCase().replace(/^@+/, "") === cleanTag.toLowerCase()
        );
        if (duplicate) {
          fieldErrors.gamerTag = "This gamer tag is already claimed by another adventurer.";
        } else {
          currentUser.gamerTag = "@" + cleanTag;
        }
      }
    }

    // Validate Email
    if (email !== undefined) {
      const cleanEmail = (email || "").trim().toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        fieldErrors.email = "Please provide a valid email address.";
      } else {
        // Check email uniqueness
        const duplicate = users.find(
          (u) => u.id !== currentUser.id && u.email.toLowerCase() === cleanEmail
        );
        if (duplicate) {
          fieldErrors.email = "This email is already registered to another account.";
        } else {
          currentUser.email = cleanEmail;
        }
      }
    }

    // Avatar
    if (avatar !== undefined && typeof avatar === "string") {
      currentUser.avatar = sanitizeInput(avatar).slice(0, 50) || "⚔️";
    }

    // Title
    if (title !== undefined && typeof title === "string") {
      currentUser.title = sanitizeInput(title).slice(0, 60) || "Adventurer";
    }

    // Bio
    if (bio !== undefined && typeof bio === "string") {
      currentUser.bio = sanitizeInput(bio).slice(0, 300);
    }

    if (Object.keys(fieldErrors).length > 0) {
      return res.status(400).json({ error: "Validation failed", fieldErrors });
    }

    currentUser.updatedAt = new Date().toISOString();
    saveAllUsers(users);

    const updatedPublicUser = toPublicUser(currentUser);
    const newAccessToken = generateAccessToken(currentUser);

    res.json({
      message: "Profile updated successfully!",
      user: updatedPublicUser,
      accessToken: newAccessToken,
    });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ error: "Could not update profile details." });
  }
});

module.exports = router;

