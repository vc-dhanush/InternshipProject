const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const env = require("./config/env");
const mongoose = require("mongoose");
const { connectDb, isConnected, disconnectDb } = require("./config/db");
const { ensureDir } = require("./middleware/upload");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth");
const classRoutes = require("./routes/classes");
const studentRoutes = require("./routes/students");
const attendanceRoutes = require("./routes/attendance");
const testRoutes = require("./routes/tests");
const assignmentRoutes = require("./routes/assignments");
const seminarRoutes = require("./routes/seminars");
const reportRoutes = require("./routes/reports");
const appRoutes = require("./routes/app");

function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      res.setHeader("Cache-Control", "no-store");
    }
    next();
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many attempts. Please wait and try again." },
  });
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/signup", authLimiter);
  app.use("/api/auth/forgot-password", authLimiter);
  app.use("/api/auth/reset-password", authLimiter);

  ensureDir(env.uploadDir);
  app.use("/uploads", express.static(env.uploadDir));
  app.use("/api/uploads", express.static(env.uploadDir));

  app.get("/api/health", (_req, res) => {
    const states = ["disconnected", "connected", "connecting", "disconnecting"];
    res.json({
      ok: true,
      app: "Aadhya : attendance tracker",
      api: "started",
      mongodb: states[mongoose.connection.readyState] || "unknown",
      mongodbConnected: isConnected(),
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/classes", classRoutes);
  app.use("/api/students", studentRoutes);
  app.use("/api/attendance", attendanceRoutes);
  app.use("/api/tests", testRoutes);
  app.use("/api/assignments", assignmentRoutes);
  app.use("/api/seminars", seminarRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api", appRoutes);

  const clientDist = path.join(__dirname, "../client/dist");
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) return next();
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

function listen(app) {
  const host = env.host;
  return new Promise((resolve, reject) => {
    const server = app.listen(env.port, host, () => {
      console.log("API started");
      console.log(`Aadhya API listening on http://127.0.0.1:${env.port}`);
      resolve(server);
    });
    server.on("error", (err) => {
      if (err && err.code === "EADDRINUSE") {
        console.error(`Port ${env.port} is already in use.`);
        console.error("Another Aadhya API process may already be running.");
        console.error("Stop the other process, or run a single `npm run dev` from the aadhya folder.");
        process.exit(1);
      }
      reject(err);
    });
  });
}

let httpServer = null;
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[process] ${signal} received. Shutting down…`);
  try {
    if (httpServer) {
      await new Promise((resolve) => {
        httpServer.close(() => resolve());
        setTimeout(resolve, 4000).unref();
      });
    }
    await disconnectDb();
  } catch (err) {
    console.error("[process] Shutdown error:", err && err.message ? err.message : err);
  }
  process.exit(0);
}

async function ensureDatabase() {
  if (isConnected()) return;
  await connectDb();
}

async function start() {
  process.on("unhandledRejection", (err) => {
    console.error("[process] Unhandled promise rejection:", err && err.message ? err.message : err);
  });
  process.on("uncaughtException", (err) => {
    console.error("[process] Uncaught exception:", err && err.message ? err.message : err);
  });
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  try {
    await connectDb();
  } catch {
    console.error("[db] MongoDB is required. The API was not started.");
    process.exit(1);
  }

  const app = createApp();
  httpServer = await listen(app);
}

if (require.main === module) {
  start().catch((err) => {
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  });
}

module.exports = { createApp, start, ensureDatabase };
