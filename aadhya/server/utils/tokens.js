const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const env = require("../config/env");

function signAuthToken(userId) {
  return jwt.sign({ sub: String(userId) }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

function verifyAuthToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

function createResetToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateStaffId() {
  const n = crypto.randomInt(100000, 999999);
  return `ADH-${n}`;
}

function generateSessionCode() {
  return `SES-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

module.exports = {
  signAuthToken,
  verifyAuthToken,
  createResetToken,
  hashResetToken,
  generateStaffId,
  generateSessionCode,
};
