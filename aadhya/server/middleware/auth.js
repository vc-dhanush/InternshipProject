const User = require("../models/User");
const { HttpError } = require("../utils/httpError");
const { verifyAuthToken } = require("../utils/tokens");

async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const bearer = header.startsWith("Bearer ") ? header.slice(7) : null;
    const token = bearer || req.cookies?.token;
    if (!token) {
      throw new HttpError(401, "Please sign in to continue.");
    }
    const payload = verifyAuthToken(token);
    const user = await User.findById(payload.sub);
    if (!user) {
      throw new HttpError(401, "Please sign in to continue.");
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth };
