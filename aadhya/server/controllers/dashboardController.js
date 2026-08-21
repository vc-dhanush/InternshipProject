const ClassModel = require("../models/Class");
const Student = require("../models/Student");
const AttendanceSession = require("../models/AttendanceSession");
const AttendanceRecord = require("../models/AttendanceRecord");
const Test = require("../models/Test");
const Mark = require("../models/Mark");
const CollegeSettings = require("../models/CollegeSettings");
const { percent } = require("../services/statsService");

function activityItem(type, title, at, meta) {
  return { type, title, at, meta };
}

async function getDashboard(req, res, next) {
  try {
    const userId = req.user._id;
    const settings = await CollegeSettings.findOne({ user: userId }).lean();
    const threshold = settings?.minAttendancePercent ?? 75;

    const [classes, students, sessions, tests, marks, records] = await Promise.all([
      ClassModel.find({ user: userId, archived: { $ne: true } }).sort({ createdAt: -1 }).lean(),
      Student.find({ user: userId, archived: { $ne: true } }).select("name class rollNo studentId createdAt").lean(),
      AttendanceSession.find({ user: userId }).sort({ date: 1, createdAt: 1 }).lean(),
      Test.find({ user: userId }).sort({ createdAt: -1 }).select("name subject createdAt class").lean(),
      Mark.find({ user: userId }).populate("test", "totalMarks").lean(),
      AttendanceRecord.find({ user: userId }).select("student status class").lean(),
    ]);

    const classById = new Map(classes.map((c) => [String(c._id), c]));
    const studentCountByClass = {};
    students.forEach((st) => {
      const key = String(st.class);
      studentCountByClass[key] = (studentCountByClass[key] || 0) + 1;
    });

    const sessionStatsByClass = {};
    let presentTotal = 0;
    let absentTotal = 0;
    sessions.forEach((s) => {
      const key = String(s.class);
      if (!sessionStatsByClass[key]) sessionStatsByClass[key] = { conducted: 0, present: 0, absent: 0 };
      sessionStatsByClass[key].conducted += 1;
      sessionStatsByClass[key].present += s.presentCount || 0;
      sessionStatsByClass[key].absent += s.absentCount || 0;
      presentTotal += s.presentCount || 0;
      absentTotal += s.absentCount || 0;
    });

    const byDate = {};
    sessions.forEach((s) => {
      if (!s.date) return;
      if (!byDate[s.date]) byDate[s.date] = { present: 0, absent: 0 };
      byDate[s.date].present += s.presentCount || 0;
      byDate[s.date].absent += s.absentCount || 0;
    });
    const trend = Object.entries(byDate).map(([date, v]) => ({
      date,
      percentage: percent(v.present, v.present + v.absent),
      present: v.present,
      absent: v.absent,
    }));

    const classCards = classes.map((cls) => {
      const id = String(cls._id);
      const att = sessionStatsByClass[id] || { conducted: 0, present: 0, absent: 0 };
      return {
        id: cls._id,
        name: cls.name,
        section: cls.section || "",
        subject: cls.subject,
        semester: cls.semester || "",
        studentCount: studentCountByClass[id] || 0,
        classesConducted: att.conducted,
        attendancePercentage: percent(att.present, att.present + att.absent),
      };
    });

    const byStudent = {};
    records.forEach((r) => {
      const key = String(r.student);
      if (!byStudent[key]) byStudent[key] = { present: 0, total: 0 };
      byStudent[key].total += 1;
      if (r.status === "present") byStudent[key].present += 1;
    });
    const studentById = new Map(students.map((s) => [String(s._id), s]));
    const lowAttendance = [];
    Object.entries(byStudent).forEach(([id, v]) => {
      const pct = percent(v.present, v.total);
      if (v.total > 0 && pct < threshold) {
        const st = studentById.get(id);
        if (!st) return;
        const cls = classById.get(String(st.class));
        lowAttendance.push({
          id: st._id,
          name: st.name,
          rollNo: st.rollNo,
          percentage: pct,
          className: cls?.name || "",
        });
      }
    });
    lowAttendance.sort((a, b) => a.percentage - b.percentage);

    const markPercents = marks
      .filter((m) => m.test?.totalMarks)
      .map((m) => (m.obtainedMarks / m.test.totalMarks) * 100);
    const averageMarks = markPercents.length
      ? Math.round((markPercents.reduce((a, b) => a + b, 0) / markPercents.length) * 10) / 10
      : null;

    const activity = [];
    classes.slice(0, 8).forEach((c) => {
      activity.push(activityItem("class", `Class created: ${c.name}`, c.createdAt, c.subject));
    });
    sessions
      .slice(-8)
      .reverse()
      .forEach((s) => {
        const cls = classById.get(String(s.class));
        activity.push(activityItem("attendance", `Attendance taken${cls ? ` · ${cls.name}` : ""}`, s.createdAt, s.date));
      });
    tests.slice(0, 8).forEach((t) => {
      activity.push(activityItem("test", `Test created: ${t.name}`, t.createdAt, t.subject));
    });
    marks.slice(-8).forEach((m) => {
      activity.push(activityItem("marks", "Marks updated", m.updatedAt || m.createdAt, ""));
    });
    activity.sort((a, b) => new Date(b.at) - new Date(a.at));

    const hasAttendance = sessions.length > 0;
    const hasClasses = classes.length > 0;

    res.json({
      stats: {
        totalClasses: classes.length,
        totalStudents: students.length,
        totalClassesConducted: sessions.length,
        overallAttendance: hasAttendance ? percent(presentTotal, presentTotal + absentTotal) : null,
        totalTests: tests.length,
        averageMarks,
        presentTotal,
        absentTotal,
      },
      threshold,
      hasClasses,
      hasAttendance,
      classes: classCards,
      trend,
      lowAttendance,
      activity: activity.slice(0, 8),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard };
