const ClassModel = require("../models/Class");
const AttendanceSession = require("../models/AttendanceSession");
const Student = require("../models/Student");
const Test = require("../models/Test");
const { publicFileUrl } = require("../middleware/upload");

async function getStaff(req, res, next) {
  try {
    const [totalClasses, totalStudents, totalSessions, totalTests] = await Promise.all([
      ClassModel.countDocuments({ user: req.user._id }),
      Student.countDocuments({ user: req.user._id }),
      AttendanceSession.countDocuments({ user: req.user._id }),
      Test.countDocuments({ user: req.user._id }),
    ]);
    const classes = await ClassModel.find({ user: req.user._id }).select("name subject").lean();
    res.json({
      user: req.user.toSafeJSON(),
      stats: {
        totalClassesHandled: totalClasses,
        totalStudents,
        totalAttendanceSessions: totalSessions,
        totalTestsConducted: totalTests,
      },
      classesTaught: classes,
    });
  } catch (err) {
    next(err);
  }
}

async function updateStaff(req, res, next) {
  try {
    const fields = ["fullName", "dateOfBirth", "phone", "department", "designation"];
    fields.forEach((f) => {
      if (req.body[f] != null) req.user[f] = req.body[f];
    });
    if (req.body.subjectsTaught != null) {
      const list = Array.isArray(req.body.subjectsTaught)
        ? req.body.subjectsTaught
        : String(req.body.subjectsTaught)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
      req.user.subjectsTaught = list;
    }
    if (req.file) req.user.profilePicture = publicFileUrl(req, req.file.path);
    await req.user.save();
    res.json({ user: req.user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

module.exports = { getStaff, updateStaff };
