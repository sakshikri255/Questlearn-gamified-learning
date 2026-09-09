const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const USERS_FILE = path.join(__dirname, "data", "users.json");

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) {
  // Intentionally crash — running with no secrets is a critical security risk
  throw new Error(
    "FATAL: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set as environment variables. " +
    "Copy .env.example to .env and fill in strong, random values."
  );
}
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";
const REFRESH_TOKEN_EXTENDED_EXPIRY = "30d";

// ── In-memory Outbox for dev/testing email preview ──
const simulatedEmailOutbox = [];

/**
 * Ensures data/users.json exists with seed demo user
 */
function initializeUsersStore() {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(USERS_FILE)) {
    const demoPasswordHash = bcrypt.hashSync("Quest123!", 10);
    const initialUsers = [
      {
        id: "user_demo_001",
        name: "Quest Adventurer",
        email: "demo@questlearn.com",
        passwordHash: demoPasswordHash,
        isVerified: true,
        verificationToken: null,
        verificationExpires: null,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        twoFactorEnabled: false,
        twoFactorTempSecret: null,
        twoFactorExpires: null,
        refreshToken: null,
        role: "user",
        avatar: "⚔️",
        xp: 120,
        level: 1,
        streak: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(initialUsers, null, 2), "utf8");
  }
}

initializeUsersStore();

/**
 * Read all users from data/users.json
 */
function getAllUsers() {
  try {
    initializeUsersStore();
    const data = fs.readFileSync(USERS_FILE, "utf8");
    return JSON.parse(data || "[]");
  } catch (err) {
    console.error("Error reading users file:", err);
    return [];
  }
}

/**
 * Write users to data/users.json safely
 */
function saveAllUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Error saving users file:", err);
    return false;
  }
}

/**
 * Find user by email (case-insensitive)
 */
function findUserByEmail(email) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  const users = getAllUsers();
  return users.find((u) => u.email.toLowerCase() === normalized) || null;
}

/**
 * Find user by ID
 */
function findUserById(id) {
  if (!id) return null;
  const users = getAllUsers();
  return users.find((u) => u.id === id) || null;
}

/**
 * Input sanitization (XSS and control chars)
 */
function sanitizeInput(str) {
  if (typeof str !== "string") return "";
  return str
    .trim()
    .replace(/[<>]/g, "") // strip angle brackets
    .slice(0, 255);
}

/**
 * Email validation regex
 */
function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email.trim());
}

/**
 * Password complexity validation:
 * Minimum 8 characters, at least one uppercase letter, one lowercase letter, one number, and one special character.
 */
function validatePasswordComplexity(password) {
  if (!password || typeof password !== "string") {
    return { valid: false, message: "Password is required." };
  }
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter." };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one lowercase letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one number." };
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return { valid: false, message: "Password must contain at least one special character." };
  }
  return { valid: true };
}

/**
 * Generate 6-digit cryptographically secure OTP
 */
function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hash string (token or password)
 */
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * JWT Tokens
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function generateRefreshToken(user, rememberMe = false) {
  return jwt.sign(
    {
      id: user.id,
      tokenVersion: user.updatedAt || "v1",
    },
    JWT_REFRESH_SECRET,
    { expiresIn: rememberMe ? REFRESH_TOKEN_EXTENDED_EXPIRY : REFRESH_TOKEN_EXPIRY }
  );
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET);
  } catch (err) {
    return null;
  }
}

function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Sanitized public profile (never expose passwordHash, tokens, secrets)
 */
function toPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username || user.id.replace("user_", "").replace(/_[0-9]+/, ""),
    name: user.name,
    gamerTag: user.gamerTag || ("@" + (user.name || "Adventurer").replace(/[^a-zA-Z0-9]/g, "")),
    email: user.email,
    isVerified: user.isVerified,
    role: user.role || "user",
    avatar: user.avatar || "⚔️",
    title: user.title || "Code Adventurer",
    bio: user.bio || "",
    xp: user.xp || 0,
    level: user.level || 1,
    streak: user.streak || 1,
    coins: user.coins ?? 100,
    twoFactorEnabled: !!user.twoFactorEnabled,
    createdAt: user.createdAt,
  };
}

/**
 * Send simulated email (logs to console and stores in dev outbox)
 */
function sendSimulatedEmail({ to, subject, html, text, otp, token }) {
  const entry = {
    id: crypto.randomUUID(),
    to,
    subject,
    text,
    otp: otp || null,
    token: token || null,
    timestamp: new Date().toISOString(),
  };
  simulatedEmailOutbox.push(entry);
  if (simulatedEmailOutbox.length > 50) simulatedEmailOutbox.shift();

  console.log(`\n📧 [EMAIL DISPATCHED] To: ${to} | Subject: "${subject}"`);
  if (otp) console.log(`👉 VERIFICATION OTP: [ ${otp} ] (Expires in 15 mins)`);
  if (token) console.log(`🔗 RESET TOKEN: [ ${token} ]`);
  console.log("───────────────────────────────────────────────────────\n");

  return entry;
}

module.exports = {
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
  JWT_REFRESH_SECRET,
};
