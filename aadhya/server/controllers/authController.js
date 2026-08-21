const env = require("../config/env");
const User = require("../models/User");
const { sendPasswordResetEmail, canSendMail } = require("../services/emailService");
const { HttpError } = require("../utils/httpError");
const {
  comparePassword,
  hashPassword,
  isStrongPassword,
  getPasswordIssues,
} = require("../utils/password");
const { createResetToken, hashResetToken, signAuthToken } = require("../utils/tokens");
const { isGmail, isValidStaffId, normalizeEmail, normalizeStaffId } = require("../utils/validators");

const COOKIE_NAME = "token";
const LOGIN_ERROR = "Invalid email or password";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function cookieOptions(rememberMe) {
  const options = {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    path: "/",
  };
  if (rememberMe !== false) options.maxAge = WEEK_MS;
  return options;
}

function setAuthCookie(res, token, rememberMe) {
  res.cookie(COOKIE_NAME, token, cookieOptions(rememberMe));
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    path: "/",
  });
}

function publicUser(user) {
  return user.toSafeJSON();
}

async function signup(req, res, next) {
  try {
    const { fullName, email, password, confirmPassword, staffId } = req.body || {};
    if (!fullName || !String(fullName).trim()) {
      throw new HttpError(400, "Full name is required.");
    }
    const normalized = normalizeEmail(email);
    if (!normalized) throw new HttpError(400, "Email is required.");
    if (!isGmail(normalized)) {
      throw new HttpError(400, "Please use a valid Gmail address ending with @gmail.com.");
    }
    const staff = normalizeStaffId(staffId);
    if (!staff) throw new HttpError(400, "Staff ID is required.");
    if (!isValidStaffId(staff)) {
      throw new HttpError(400, "Staff ID must be 3–32 characters and use letters, numbers, dots, underscores, or hyphens.");
    }
    if (password !== confirmPassword) {
      throw new HttpError(400, "Password and confirm password do not match.");
    }
    if (!isStrongPassword(password)) {
      throw new HttpError(400, "Password does not meet the security requirements.", getPasswordIssues(password));
    }

    const emailTaken = await User.findOne({ email: normalized });
    if (emailTaken) throw new HttpError(409, "An account with this email already exists.");
    const staffTaken = await User.findOne({ staffId: staff });
    if (staffTaken) throw new HttpError(409, "This Staff ID is already in use.");

    const user = await User.create({
      fullName: String(fullName).trim(),
      email: normalized,
      staffId: staff,
      passwordHash: await hashPassword(password),
      onboardingComplete: false,
    });
    const token = signAuthToken(user._id);
    user.lastLoginAt = new Date();
    await user.save();
    setAuthCookie(res, token, true);
    res.status(201).json({
      user: publicUser(user),
      loginTime: user.lastLoginAt,
      needsCollegeSetup: true,
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password, rememberMe } = req.body || {};
    const normalized = normalizeEmail(email);
    if (!normalized || !password) {
      throw new HttpError(400, "Email and password are required.");
    }
    const user = await User.findOne({ email: normalized }).select("+passwordHash");
    if (!user) throw new HttpError(401, LOGIN_ERROR);
    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) throw new HttpError(401, LOGIN_ERROR);
    user.lastLoginAt = new Date();
    await user.save();
    const token = signAuthToken(user._id);
    setAuthCookie(res, token, rememberMe !== false);
    const safe = publicUser(user);
    res.json({
      user: safe,
      loginTime: user.lastLoginAt,
      needsCollegeSetup: !user.onboardingComplete,
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.json({
    user: publicUser(req.user),
    loginTime: req.user.lastLoginAt,
    needsCollegeSetup: !req.user.onboardingComplete,
  });
}

async function logout(_req, res) {
  clearAuthCookie(res);
  res.json({ message: "Signed out." });
}

async function forgotPassword(req, res, next) {
  try {
    const normalized = normalizeEmail(req.body?.email);
    if (!normalized) throw new HttpError(400, "Email is required.");
    if (!isGmail(normalized)) {
      throw new HttpError(400, "Please use a valid Gmail address ending with @gmail.com.");
    }

    const user = await User.findOne({ email: normalized });
    const emailConfigured = canSendMail();
    const payload = {
      emailConfigured,
      developmentMode: !emailConfigured,
    };

    if (!user) {
      payload.message = emailConfigured
        ? "If that account exists, a password reset email has been sent."
        : "Email delivery is not configured (development mode). If this Gmail has an account, a reset link is written to the server log — it is not sent by email.";
      return res.json(payload);
    }

    const { token, hash } = createResetToken();
    user.resetTokenHash = hash;
    user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    const resetUrl = `${env.clientUrl}/reset-password/${token}`;

    if (!emailConfigured) {
      console.log(`[email] EMAIL_USER / EMAIL_PASSWORD are not set. Development reset link for ${user.email}: ${resetUrl}`);
      payload.message =
        "Email delivery is not configured (development mode). A reset email was not sent. Use the development reset link below if you requested this for a real account.";
      if (env.nodeEnv !== "production") payload.developmentResetUrl = resetUrl;
      return res.json(payload);
    }

    await sendPasswordResetEmail(user.email, resetUrl);
    payload.message = "If that account exists, a password reset email has been sent.";
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const token = req.body?.token || req.params?.token;
    const { password, confirmPassword } = req.body || {};
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
    clearAuthCookie(res);
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
