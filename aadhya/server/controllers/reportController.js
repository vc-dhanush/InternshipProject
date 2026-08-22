const AttendanceRecord = require("../models/AttendanceRecord");
const AttendanceSession = require("../models/AttendanceSession");
const ClassModel = require("../models/Class");
const CollegeSettings = require("../models/CollegeSettings");
const Mark = require("../models/Mark");
const Student = require("../models/Student");
const Test = require("../models/Test");
const { HttpError } = require("../utils/httpError");
const { toCsv } = require("../utils/csv");
const { classAttendanceSummary, studentAttendanceSummary, studentMarksSummary, testAnalytics, percent } = require("../services/statsService");

async function classReport(req, res, next) {
  try {
    const classId = req.query.classId;
    if (!classId) throw new HttpError(400, "Class is required.");
    const cls = await ClassModel.findOne({ _id: classId, user: req.user._id });
    if (!cls) throw new HttpError(404, "Class not found.");
    const settings = await CollegeSettings.findOne({ user: req.user._id });
    const threshold = settings?.minAttendancePercent ?? 75;
    const summary = await classAttendanceSummary(classId, req.user._id);
    const studentFilter = { class: classId, user: req.user._id, archived: { $ne: true } };
    const students = await Student.find(studentFilter).sort({ studentId: 1, rollNo: 1 }).lean();
    const sessionFilter = { class: classId, user: req.user._id };
    if (req.query.subject) sessionFilter.subject = new RegExp(req.query.subject, "i");
    if (req.query.from || req.query.to) {
      sessionFilter.date = {};
      if (req.query.from) sessionFilter.date.$gte = req.query.from;
      if (req.query.to) sessionFilter.date.$lte = req.query.to;
    }
    const scopedSessions = await AttendanceSession.find(sessionFilter).select("_id").lean();
    const sessionIds = scopedSessions.map((s) => s._id);
    const rows = [];
    for (const st of students) {
      let att;
      if (req.query.subject || req.query.from || req.query.to) {
        const recs = await AttendanceRecord.find({
          user: req.user._id,
          student: st._id,
          session: { $in: sessionIds },
        }).lean();
        const present = recs.filter((r) => r.status === "present").length;
        att = {
          totalClasses: recs.length,
          present,
          absent: recs.length - present,
          percentage: percent(present, recs.length),
        };
      } else {
        att = await studentAttendanceSummary(st._id, classId, req.user._id);
      }
      rows.push({
        ...st,
        id: st._id,
        ...att,
        lowAttendance: att.totalClasses > 0 && att.percentage < threshold,
      });
    }
    res.json({ class: { ...cls.toObject(), id: cls._id }, summary, threshold, students: rows });
  } catch (err) {
    next(err);
  }
}

async function studentReport(req, res, next) {
  try {
    const student = await Student.findOne({ _id: req.params.studentId, user: req.user._id })
      .populate("class", "name subject")
      .lean();
    if (!student) throw new HttpError(404, "Student not found.");
    const settings = await CollegeSettings.findOne({ user: req.user._id });
    const att = await studentAttendanceSummary(student._id, student.class?._id, req.user._id);
    const marks = await studentMarksSummary(student._id, req.user._id);
    const history = await AttendanceRecord.find({ student: student._id, user: req.user._id })
      .populate("session", "date time subject sessionCode")
      .sort({ createdAt: -1 })
      .lean();
    res.json({
      student: { ...student, id: student._id },
      attendance: att,
      tests: marks,
      history,
      lowAttendance: att.totalClasses > 0 && att.percentage < (settings?.minAttendancePercent ?? 75),
      threshold: settings?.minAttendancePercent ?? 75,
    });
  } catch (err) {
    next(err);
  }
}

async function lowAttendance(req, res, next) {
  try {
    const settings = await CollegeSettings.findOne({ user: req.user._id });
    const threshold = settings?.minAttendancePercent ?? 75;
    const filter = { user: req.user._id };
    if (req.query.classId) filter.class = req.query.classId;
    const students = await Student.find(filter).populate("class", "name subject").lean();
    const flagged = [];
    for (const st of students) {
      const att = await studentAttendanceSummary(st._id, st.class?._id, req.user._id);
      if (att.totalClasses > 0 && att.percentage < threshold) {
        flagged.push({ ...st, id: st._id, ...att });
      }
    }
    res.json({ threshold, students: flagged });
  } catch (err) {
    next(err);
  }
}

async function exportAttendanceCsv(req, res, next) {
  try {
    const classId = req.query.classId;
    if (!classId) throw new HttpError(400, "Class is required.");
    const cls = await ClassModel.findOne({ _id: classId, user: req.user._id });
    if (!cls) throw new HttpError(404, "Class not found.");
    const students = await Student.find({ class: classId, user: req.user._id }).sort({ rollNo: 1 }).lean();
    const rows = [];
    for (const st of students) {
      const att = await studentAttendanceSummary(st._id, classId, req.user._id);
      rows.push({
        rollNo: st.rollNo,
        studentId: st.studentId,
        name: st.name,
        totalClasses: att.totalClasses,
        present: att.present,
        absent: att.absent,
        percentage: att.percentage,
      });
    }
    const csv = toCsv(["rollNo", "studentId", "name", "totalClasses", "present", "absent", "percentage"], rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=attendance-report.csv");
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

async function exportMarksCsv(req, res, next) {
  try {
    const test = await Test.findOne({ _id: req.query.testId, user: req.user._id });
    if (!test) throw new HttpError(404, "Test not found.");
    const marks = await Mark.find({ test: test._id, user: req.user._id }).populate("student", "name rollNo studentId").lean();
    const rows = marks.map((m) => ({
      rollNo: m.student?.rollNo,
      studentId: m.student?.studentId,
      name: m.student?.name,
      totalMarks: test.totalMarks,
      obtainedMarks: m.obtainedMarks,
      percentage: percent(m.obtainedMarks, test.totalMarks),
    }));
    const csv = toCsv(["rollNo", "studentId", "name", "totalMarks", "obtainedMarks", "percentage"], rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${test.name.replace(/\s+/g, "-")}-marks.csv`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

async function exportAttendancePdf(req, res, next) {
  try {
    const PDFDocument = require("pdfkit");
    const classId = req.query.classId;
    const cls = await ClassModel.findOne({ _id: classId, user: req.user._id });
    if (!cls) throw new HttpError(404, "Class not found.");
    const students = await Student.find({ class: classId, user: req.user._id }).sort({ rollNo: 1 }).lean();
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=attendance-report.pdf");
    doc.pipe(res);
    doc.fontSize(18).text("Aadhya : attendance tracker", { align: "left" });
    doc.moveDown(0.3);
    doc.fontSize(12).fillColor("#444").text(`Class: ${cls.name}  •  Subject: ${cls.subject}`);
    doc.moveDown();
    doc.fillColor("#000").fontSize(10);
    doc.text("Roll  ID  Name  Present  Absent  %");
    doc.moveDown(0.4);
    for (const st of students) {
      const att = await studentAttendanceSummary(st._id, classId, req.user._id);
      doc.text(
        `${st.rollNo}  ${st.studentId}  ${st.name}  ${att.present}  ${att.absent}  ${att.percentage}%`
      );
    }
    doc.end();
  } catch (err) {
    next(err);
  }
}

async function testReport(req, res, next) {
  try {
    const filter = { user: req.user._id };
    if (req.query.classId) filter.class = req.query.classId;
    if (req.query.subject) filter.subject = new RegExp(req.query.subject, "i");
    const tests = await Test.find(filter).populate("class", "name subject section").sort({ date: -1 }).lean();
    const rows = [];
    for (const t of tests) {
      const analytics = await testAnalytics(t._id);
      rows.push({
        ...t,
        id: t._id,
        analytics,
      });
    }
    res.json({ tests: rows });
  } catch (err) {
    next(err);
  }
}

async function overview(req, res, next) {
  try {
    const sessions = await AttendanceSession.find({ user: req.user._id }).sort({ date: 1 }).lean();
    const byDate = {};
    sessions.forEach((s) => {
      if (!byDate[s.date]) byDate[s.date] = { present: 0, absent: 0 };
      byDate[s.date].present += s.presentCount;
      byDate[s.date].absent += s.absentCount;
    });
    res.json({
      trend: Object.entries(byDate).map(([date, v]) => ({
        date,
        percentage: percent(v.present, v.present + v.absent),
      })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  classReport,
  studentReport,
  lowAttendance,
  exportAttendanceCsv,
  exportMarksCsv,
  exportAttendancePdf,
  overview,
  testReport,
};
