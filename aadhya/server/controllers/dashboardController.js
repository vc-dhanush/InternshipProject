const ClassModel = require("../models/Class");
const Student = require("../models/Student");
const { dashboardStats, classAttendanceSummary } = require("../services/statsService");

async function getDashboard(req, res, next) {
  try {
    const stats = await dashboardStats(req.user._id);
    const classes = await ClassModel.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    const classCards = await Promise.all(
      classes.map(async (cls) => {
        const studentCount = await Student.countDocuments({ class: cls._id });
        const att = await classAttendanceSummary(cls._id, req.user._id);
        return {
          ...cls,
          id: cls._id,
          studentCount,
          ...att,
        };
      })
    );
    res.json({ stats, classes: classCards });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard };
