const CollegeSettings = require("../models/CollegeSettings");
const { publicFileUrl } = require("../middleware/upload");
const { isGmail, normalizeEmail } = require("../utils/validators");
const { HttpError } = require("../utils/httpError");

async function getSettings(req, res, next) {
  try {
    const settings = await CollegeSettings.findOne({ user: req.user._id });
    res.json({
      settings: settings || null,
      needsCollegeSetup: !req.user.onboardingComplete || !settings,
    });
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    let settings = await CollegeSettings.findOne({ user: req.user._id });
    if (!settings) settings = await CollegeSettings.create({ user: req.user._id });
    const fields = [
      "collegeName",
      "collegeAddress",
      "appName",
      "minAttendancePercent",
      "defaultAttendanceStatus",
      "theme",
    ];
    fields.forEach((f) => {
      if (req.body[f] != null) settings[f] = req.body[f];
    });
    if (req.file) settings.collegeLogo = publicFileUrl(req, req.file.path);
    await settings.save();
    if (req.body.fullName || req.body.email) {
      if (req.body.fullName) req.user.fullName = req.body.fullName;
      if (req.body.email) {
        const email = normalizeEmail(req.body.email);
        if (!isGmail(email)) throw new HttpError(400, "Please use a valid Gmail address ending with @gmail.com.");
        req.user.email = email;
      }
      await req.user.save();
    }
    res.json({ settings, user: req.user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

async function completeOnboarding(req, res, next) {
  try {
    let settings = await CollegeSettings.findOne({ user: req.user._id });
    if (!settings) settings = await CollegeSettings.create({ user: req.user._id });
    const collegeName = String(req.body.collegeName || "").trim();
    if (!collegeName) throw new HttpError(400, "College name is required.");
    settings.collegeName = collegeName;
    settings.collegeAddress = req.body.collegeAddress || "";
    if (req.file) settings.collegeLogo = publicFileUrl(req, req.file.path);
    await settings.save();
    req.user.onboardingComplete = true;
    await req.user.save();
    res.json({ settings, user: req.user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSettings, updateSettings, completeOnboarding };
