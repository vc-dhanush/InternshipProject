const { HttpError } = require("../utils/httpError");

function notFound(_req, res) {
  res.status(404).json({ message: "The requested resource was not found." });
}

function isMongoUnavailable(err) {
  const name = err && err.name;
  return (
    name === "MongoServerSelectionError" ||
    name === "MongooseServerSelectionError" ||
    name === "MongoNetworkError" ||
    name === "MongoNotConnectedError" ||
    name === "MongoExpiredSessionError" ||
    (typeof err.message === "string" && /buffering timed out|ECONNREFUSED|topology was destroyed/i.test(err.message))
  );
}

function errorHandler(err, _req, res, _next) {
  try {
    if (!err) {
      err = new Error("Unknown error");
    }
    if (res.headersSent) {
      console.error("[http] Error after headers sent:", err.message || err);
      return;
    }

    if (err instanceof HttpError) {
      return res.status(err.status).json({
        message: err.message,
        details: err.details,
      });
    }

    if (err.name === "ValidationError") {
      const details = Object.values(err.errors || {}).map((e) => e.message);
      return res.status(400).json({
        message: "Please check the information you submitted.",
        details,
      });
    }

    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "field";
      return res.status(409).json({
        message: `A record with this ${field} already exists.`,
      });
    }

    if (err.name === "CastError") {
      return res.status(404).json({ message: "The requested record was not found." });
    }

    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Your session has expired. Please sign in again." });
    }

    if (err.name === "MulterError") {
      return res.status(400).json({ message: "The uploaded file could not be processed." });
    }

    if (err instanceof SyntaxError && "body" in err) {
      return res.status(400).json({ message: "Invalid JSON in request body." });
    }

    if (isMongoUnavailable(err)) {
      console.error("[db] Request failed because MongoDB is unavailable:", err.message);
      return res.status(503).json({
        message: "Database is unavailable. Start MongoDB and try again.",
      });
    }

    console.error(err);
    return res.status(500).json({
      message: "Something went wrong. Please try again.",
    });
  } catch (handlerErr) {
    console.error("[http] Error handler failed:", handlerErr);
    if (!res.headersSent) {
      return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  }
}

module.exports = { notFound, errorHandler };
