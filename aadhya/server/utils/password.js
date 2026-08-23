const bcrypt = require("bcryptjs");

const MIN_LENGTH = 8;

function getPasswordIssues(password) {
  const issues = [];
  if (!password || password.length < MIN_LENGTH) {
    issues.push(`At least ${MIN_LENGTH} characters`);
  }
  if (!/[A-Z]/.test(password || "")) issues.push("One uppercase letter");
  if (!/[a-z]/.test(password || "")) issues.push("One lowercase letter");
  if (!/[0-9]/.test(password || "")) issues.push("One number");
  if (!/[^A-Za-z0-9]/.test(password || "")) issues.push("One special character");
  return issues;
}

function isStrongPassword(password) {
  return getPasswordIssues(password).length === 0;
}

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = {
  MIN_LENGTH,
  getPasswordIssues,
  isStrongPassword,
  hashPassword,
  comparePassword,
};
