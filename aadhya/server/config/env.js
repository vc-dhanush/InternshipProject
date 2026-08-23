const path = require("path");
const fs = require("fs");

const envPaths = [
  path.join(__dirname, "../../.env"),
  path.join(__dirname, "../.env"),
  path.join(process.cwd(), ".env"),
];
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath });
    break;
  }
}

function requiredInProd(name, fallback) {
  const value = process.env[name] || fallback;
  if (process.env.NODE_ENV === "production" && !process.env[name]) {
    console.warn(`[config] ${name} is not set. Using a development fallback is unsafe in production.`);
  }
  return value;
}

function httpsOrigin(host) {
  if (!host) return "";
  return host.startsWith("http") ? host : `https://${host}`;
}

function vercelOrigin() {
  return (
    httpsOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    httpsOrigin(process.env.VERCEL_URL) ||
    ""
  );
}

const clientUrl =
  process.env.CLIENT_URL || vercelOrigin() || "http://localhost:5173";
const serverUrl =
  process.env.SERVER_URL || vercelOrigin() || "http://localhost:5000";

const corsOrigins = [...new Set([clientUrl, serverUrl, vercelOrigin()].filter(Boolean))];

const onVercel = Boolean(process.env.VERCEL);
const mongodbUriFromEnv =
  process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.MONGO_URI || "";

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  host: process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1"),
  mongodbUri: mongodbUriFromEnv || "mongodb://127.0.0.1:27017/aadhya",
  mongodbUriFromEnv: Boolean(mongodbUriFromEnv),
  jwtSecret: requiredInProd("JWT_SECRET", "dev-only-change-me"),
  jwtSecretFromEnv: Boolean(process.env.JWT_SECRET),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientUrl,
  serverUrl,
  corsOrigins,
  emailHost: process.env.EMAIL_HOST || "",
  emailPort: Number(process.env.EMAIL_PORT) || 587,
  emailUser: process.env.EMAIL_USER || "",
  emailPassword: process.env.EMAIL_PASSWORD || "",
  emailFrom: process.env.EMAIL_FROM || "Aadhya <no-reply@example.com>",
  uploadDir: process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : onVercel
      ? "/tmp/aadhya-uploads"
      : path.join(__dirname, "../uploads"),
};
