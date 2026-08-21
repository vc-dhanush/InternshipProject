const env = require("../config/env");
const CollegeSettings = require("../models/CollegeSettings");
const User = require("../models/User");
const { sendPasswordResetEmail } = require("../services/emailService");
const { HttpError } = require("../utils/httpError");
const {
  comparePassword,
  hashPassword,
  isStrongPassword,
  getPasswordIssues,
} = require("../utils/password");
const {
  createResetToken,
  generateStaffId,
  hashResetToken,
  signAuthToken,
} = require("../utils/tokens");
const { isGmail, normalizeEmail } = require("../utils/validators");

function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

async function signup(req, res, next) {
  try {
    const { fullName, email, password, confirmPassword } = req.body || {};
    if (!fullName || !String(fullName).trim()) {
      throw new HttpError(400, "Full name is required.");
    }
    const normalized = normalizeEmail(email);
    if (!normalized) throw new HttpError(400, "Email is required.");
    if (!isGmail(normalized)) {
      throw new HttpError(400, "Please use a valid Gmail address ending with @gmail.com.");
    }
    if (password !== confirmPassword) {
      throw new HttpError(400, "Password and confirm password do not match.");
    }
    if (!isStrongPassword(password)) {
      throw new HttpError(400, "Password does not meet the security requirements.", getPasswordIssues(password));
    }
    const exists = await User.findOne({ email: normalized });
    if (exists) throw new HttpError(409, "An account with this email already exists.");

    const user = await User.create({
      fullName: String(fullName).trim(),
      email: normalized,
      passwordHash: await hashPassword(password),
      staffId: generateStaffId(),
    });
    await CollegeSettings.create({ user: user._id });
    const token = signAuthToken(user._id);
    user.lastLoginAt = new Date();
    await user.save();
    setAuthCookie(res, token);
    res.status(201).json({
      token,
      user: user.toSafeJSON(),
      loginTime: user.lastLoginAt,
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    const normalized = normalizeEmail(email);
    if (!normalized || !password) {
      throw new HttpError(400, "Email and password are required.");
    }
    if (!isGmail(normalized)) {
      throw new HttpError(400, "Please use a valid Gmail address ending with @gmail.com.");
    }
    const user = await User.findOne({ email: normalized }).select("+passwordHash");
    if (!user) throw new HttpError(401, "Incorrect email or password.");
    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) throw new HttpError(401, "Incorrect email or password.");
    user.lastLoginAt = new Date();
    await user.save();
    const token = signAuthToken(user._id);
    setAuthCookie(res, token);
    res.json({ token, user: user.toSafeJSON(), loginTime: user.lastLoginAt });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.json({ user: req.user.toSafeJSON(), loginTime: req.user.lastLoginAt });
}

async function logout(_req, res) {
  res.clearCookie("token");
  res.json({ message: "Signed out." });
}

async function forgotPassword(req, res, next) {
  try {
    const normalized = normalizeEmail(req.body?.email);
    if (!isGmail(normalized)) {
      throw new HttpError(400, "Please use a valid Gmail address ending with @gmail.com.");
    }
    const user = await User.findOne({ email: normalized });
    const payload = {
      message: "If that account exists, a password reset link has been sent.",
    };
    if (user) {
      const { token, hash } = createResetToken();
      user.resetTokenHash = hash;
      user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      const resetUrl = `${env.clientUrl}/reset-password?token=${token}`;
      const result = await sendPasswordResetEmail(user.email, resetUrl);
      if (!result.sent && env.nodeEnv !== "production") {
        payload.devResetUrl = resetUrl;
      }
    }
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password, confirmPassword } = req.body || {};
    if (!token) throw new HttpError(400, "Reset token is missing.");
    if (password !== confirmPassword) {
      throw new HttpError(400, "Password and confirm password do not match.");
    }
    if (!isStrongPassword(password)) {
      throw new HttpError(400, "Password does not meet the security requirements.", getPasswordIssues(password));
    }
    const hash = hashResetToken(token);
    const user = await User.findOne({
      resetTokenHash: hash,
      resetTokenExpires: { $gt: new Date() },
    }).select("+resetTokenHash +resetTokenExpires +passwordHash");
    if (!user) throw new HttpError(400, "This reset link is invalid or has expired.");
    user.passwordHash = await hashPassword(password);
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    await user.save();
    res.json({ message: "Password updated. You can sign in with your new password." });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, password, confirmPassword } = req.body || {};
    const user = await User.findById(req.user._id).select("+passwordHash");
    if (!currentPassword || !(await comparePassword(currentPassword, user.passwordHash))) {
      throw new HttpError(400, "Current password is incorrect.");
    }
    if (password !== confirmPassword) {
      throw new HttpError(400, "Password and confirm password do not match.");
    }
    if (!isStrongPassword(password)) {
      throw new HttpError(400, "Password does not meet the security requirements.", getPasswordIssues(password));
    }
    user.passwordHash = await hashPassword(password);
    await user.save();
    res.json({ message: "Password changed." });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  signup,
  login,
  me,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
};
