const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

function requiredInProd(name, fallback) {
  const value = process.env[name] || fallback;
  if (process.env.NODE_ENV === "production" && !process.env[name]) {
    console.warn(`[config] ${name} is not set. Using a development fallback is unsafe in production.`);
  }
  return value;
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  mongodbUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/aadhya",
  jwtSecret: requiredInProd("JWT_SECRET", "dev-only-change-me"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  serverUrl: process.env.SERVER_URL || "http://localhost:5000",
  emailHost: process.env.EMAIL_HOST || "",
  emailPort: Number(process.env.EMAIL_PORT) || 587,
  emailUser: process.env.EMAIL_USER || "",
  emailPassword: process.env.EMAIL_PASSWORD || "",
  emailFrom: process.env.EMAIL_FROM || "Aadhya <no-reply@example.com>",
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, "../uploads"),
};
