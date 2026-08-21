const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const env = require("./config/env");
const { connectDb } = require("./config/db");
const { ensureDir } = require("./middleware/upload");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth");
const classRoutes = require("./routes/classes");
const studentRoutes = require("./routes/students");
const attendanceRoutes = require("./routes/attendance");
const testRoutes = require("./routes/tests");
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
      origin: env.clientUrl,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(
    "/api/auth/login",
    rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false })
  );
  app.use(
    "/api/auth/signup",
    rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false })
  );

  ensureDir(env.uploadDir);
  app.use("/uploads", express.static(env.uploadDir));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, app: "Aadhya : attendance tracker" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/classes", classRoutes);
  app.use("/api/students", studentRoutes);
  app.use("/api/attendance", attendanceRoutes);
  app.use("/api/tests", testRoutes);
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

async function start() {
  await connectDb();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Aadhya API running on ${env.serverUrl}`);
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { createApp, start };
