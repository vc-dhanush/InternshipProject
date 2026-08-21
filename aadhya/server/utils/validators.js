function isGmail(email) {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim().toLowerCase();
  const basic = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  return basic && trimmed.endsWith("@gmail.com");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function asObjectIdString(value) {
  return value ? String(value) : "";
}

module.exports = { isGmail, normalizeEmail, escapeRegex, asObjectIdString };
