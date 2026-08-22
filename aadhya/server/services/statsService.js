const AttendanceRecord = require("../models/AttendanceRecord");
const AttendanceSession = require("../models/AttendanceSession");
const ClassModel = require("../models/Class");
const Mark = require("../models/Mark");
const Student = require("../models/Student");
const Test = require("../models/Test");

function percent(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

async function studentAttendanceSummary(studentId, classId, userId) {
  const filter = { student: studentId };
  if (classId) filter.class = classId;
  if (userId) filter.user = userId;
  const records = await AttendanceRecord.find(filter).lean();
  const total = records.length;
  const present = records.filter((r) => r.status === "present").length;
  const absent = total - present;
  return {
    totalClasses: total,
    present,
    absent,
    percentage: percent(present, total),
  };
}

async function classAttendanceSummary(classId, userId) {
  const sessions = await AttendanceSession.find({ class: classId, user: userId }).lean();
  const totalSessions = sessions.length;
  const present = sessions.reduce((s, x) => s + (x.presentCount || 0), 0);
  const absent = sessions.reduce((s, x) => s + (x.absentCount || 0), 0);
  const totalMarks = present + absent;
  return {
    totalClasses: totalSessions,
    totalPresent: present,
    totalAbsent: absent,
    attendancePercentage: percent(present, totalMarks),
  };
}

async function dashboardStats(userId) {
  const [classes, students, sessions, tests, marks] = await Promise.all([
    ClassModel.countDocuments({ user: userId }),
    Student.countDocuments({ user: userId }),
    AttendanceSession.find({ user: userId }).lean(),
    Test.countDocuments({ user: userId }),
    Mark.find({ user: userId }).populate("test", "totalMarks").lean(),
  ]);

  const present = sessions.reduce((s, x) => s + (x.presentCount || 0), 0);
  const absent = sessions.reduce((s, x) => s + (x.absentCount || 0), 0);
  const markValues = marks.map((m) => {
    const total = m.test?.totalMarks || 0;
    return total ? (m.obtainedMarks / total) * 100 : 0;
  });
  const avgMarks = markValues.length
    ? Math.round((markValues.reduce((a, b) => a + b, 0) / markValues.length) * 10) / 10
    : 0;

  return {
    totalClasses: classes,
    totalStudents: students,
    totalClassesConducted: sessions.length,
    overallAttendance: percent(present, present + absent),
    totalTests: tests,
    averageMarks: avgMarks,
  };
}

async function testAnalytics(testId) {
  const test = await Test.findById(testId).lean();
  if (!test) return null;
  const marks = await Mark.find({ test: testId }).lean();
  const scores = marks.map((m) => m.obtainedMarks);
  const passMark = (test.passPercent / 100) * test.totalMarks;
  const passCount = scores.filter((s) => s >= passMark).length;
  const failCount = scores.length - passCount;
  const highest = scores.length ? Math.max(...scores) : 0;
  const lowest = scores.length ? Math.min(...scores) : 0;
  const average = scores.length
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : 0;
  const buckets = { "0-39": 0, "40-59": 0, "60-79": 0, "80-100": 0 };
  scores.forEach((score) => {
    const p = percent(score, test.totalMarks);
    if (p < 40) buckets["0-39"] += 1;
    else if (p < 60) buckets["40-59"] += 1;
    else if (p < 80) buckets["60-79"] += 1;
    else buckets["80-100"] += 1;
  });
  const avgPercent = scores.length ? percent(average, test.totalMarks) : 0;
  return {
    highest,
    lowest,
    average,
    averagePercent: avgPercent,
    passCount,
    failCount,
    distribution: buckets,
    attempted: scores.length,
    totalMarks: test.totalMarks,
  };
}

async function studentMarksSummary(studentId, userId) {
  const filter = { student: studentId };
  if (userId) filter.user = userId;
  const marks = await Mark.find(filter).populate("test", "name subject date totalMarks passPercent").lean();
  const scores = marks
    .filter((m) => m.test)
    .map((m) => ({
      obtained: m.obtainedMarks,
      total: m.test.totalMarks,
      percent: percent(m.obtainedMarks, m.test.totalMarks),
      test: m.test,
    }));
  const percents = scores.map((s) => s.percent);
  const obtained = scores.map((s) => s.obtained);
  return {
    testsTaken: scores.length,
    averageMarks: obtained.length
      ? Math.round((obtained.reduce((a, b) => a + b, 0) / obtained.length) * 10) / 10
      : null,
    highest: obtained.length ? Math.max(...obtained) : null,
    lowest: obtained.length ? Math.min(...obtained) : null,
    overallPercentage: percents.length
      ? Math.round((percents.reduce((a, b) => a + b, 0) / percents.length) * 10) / 10
      : null,
    tests: scores.map((s) => ({
      id: s.test._id,
      name: s.test.name,
      subject: s.test.subject,
      date: s.test.date,
      obtainedMarks: s.obtained,
      totalMarks: s.total,
      percentage: s.percent,
    })),
  };
}

module.exports = {
  percent,
  studentAttendanceSummary,
  classAttendanceSummary,
  dashboardStats,
  testAnalytics,
  studentMarksSummary,
};
