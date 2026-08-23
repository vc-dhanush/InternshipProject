const { createApp, ensureDatabase } = require("../server/index");
const env = require("../server/config/env");

const app = createApp();

module.exports = async (req, res) => {
  try {
    await ensureDatabase();
  } catch (err) {
    const missing = !env.mongodbUriFromEnv;
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        message: missing
          ? "MongoDB is not connected. Add MONGODB_URI in Vercel → Settings → Environment Variables, then Redeploy. Use your MongoDB Atlas mongodb+srv:// connection string."
          : "MongoDB URI is set but Atlas rejected the connection. In Atlas: Network Access → Allow 0.0.0.0/0. Check the username/password in MONGODB_URI (URL-encode special characters).",
        detail: err && err.message ? err.message : "connection failed",
      })
    );
    return;
  }
  return app(req, res);
};
