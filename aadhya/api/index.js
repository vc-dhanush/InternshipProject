const { createApp, ensureDatabase } = require("../server/index");

const app = createApp();

module.exports = async (req, res) => {
  try {
    await ensureDatabase();
  } catch {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        message:
          "MongoDB is not connected. Set MONGODB_URI in Vercel to your MongoDB Atlas connection string, and allow 0.0.0.0/0 in Atlas Network Access.",
      })
    );
    return;
  }
  return app(req, res);
};
