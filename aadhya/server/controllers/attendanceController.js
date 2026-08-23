const AttendanceRecord = require("../models/AttendanceRecord");
const AttendanceSession = require("../models/AttendanceSession");
const ClassModel = require("../models/Class");
const CollegeSettings = require("../models/CollegeSettings");
const Student = require("../models/Student");
const { generateSessionCode } = require("../utils/tokens");
const { HttpError } = require("../utils/httpError");
const { classAttendanceSummary, studentAttendanceSummary, percent } = require("../services/statsService");

function publicStudent(s) {
  return {
    id: s._id,
    name: s.name,
    studentId: s.studentId,
    rollNo: s.rollNo,
    profilePicture: s.profilePicture || "",
  };
}

async function takeSheet(req, res, next) {
  try {
    const classId = req.query.classId;
    if (!classId) throw new HttpError(400, "Select a class to take attendance.");
    const cls = await ClassModel.findOne({ _id: classId, user: req.user._id }).lean();
    if (!cls) throw new HttpError(404, "Class not found.");
    const settings = await CollegeSettings.findOne({ user: req.user._id }).lean();
    const students = await Student.find({ class: classId, user: req.user._id, archived: { $ne: true } })
      .sort({ studentId: 1, rollNo: 1, name: 1 })
      .lean();
    res.json({
      class: { ...cls, id: cls._id },
      college: settings
        ? {
            collegeName: settings.collegeName,
            collegeLogo: settings.collegeLogo,
            appName: settings.appName,
            defaultAttendanceStatus: settings.defaultAttendanceStatus,
            minAttendancePercent: settings.minAttendancePercent,
          }
        : null,
      defaultStatus: settings?.defaultAttendanceStatus || "present",
      students: students.map(publicStudent),
    });
  } catch (err) {
    next(err);
  }
}

async function saveSession(req, res, next) {
  try {
    const { classId, date, time, subject, records } = req.body || {};
    if (!classId || !date || !time || !Array.isArray(records)) {
      throw new HttpError(400, "Class, date, time, and attendance records are required.");
    }
    const cls = await ClassModel.findOne({ _id: classId, user: req.user._id });
    if (!cls) throw new HttpError(404, "Class not found.");
    const students = await Student.find({ class: classId, user: req.user._id, archived: { $ne: true } });
    if (!students.length) {
      throw new HttpError(400, "Add students to this class before taking attendance.");
    }
    const byId = new Map(students.map((s) => [String(s._id), s]));
    const subjectName = String(subject || cls.subject).trim();
    if (!subjectName) throw new HttpError(400, "Subject is required.");

    const duplicate = await AttendanceSession.findOne({
      user: req.user._id,
      class: classId,
      subject: subjectName,
      date,
      time,
    });
    if (duplicate) {
      throw new HttpError(
        409,
        "An attendance session already exists for this class, subject, date, and time."
      );
    }

    const docs = [];
    for (const rec of records) {
      if (!byId.has(String(rec.studentId))) continue;
      if (rec.status !== "present" && rec.status !== "absent") {
        throw new HttpError(400, "Attendance status must be present or absent.");
      }
      docs.push({
        user: req.user._id,
        student: rec.studentId,
        status: rec.status,
      });
    }
    if (!docs.length) throw new HttpError(400, "Mark attendance for at least one student.");

    const presentCount = docs.filter((r) => r.status === "present").length;
    const absentCount = docs.filter((r) => r.status === "absent").length;

    let session;
    try {
      session = await AttendanceSession.create({
        user: req.user._id,
        class: classId,
        subject: subjectName,
        date,
        time,
        sessionCode: generateSessionCode(),
        presentCount,
        absentCount,
        total: docs.length,
        source: "manual",
      });
    } catch (e) {
      if (e.code === 11000) {
        throw new HttpError(
          409,
          "An attendance session already exists for this class, subject, date, and time."
        );
      }
      throw e;
    }

    await AttendanceRecord.insertMany(
      docs.map((d) => ({
        ...d,
        session: session._id,
        class: classId,
      }))
    );
    const saved = await AttendanceSession.findById(session._id).populate("class", "name subject section").lean();
    res.status(201).json({ session: { ...saved, id: saved._id } });
  } catch (err) {
    next(err);
  }
}

async function listSessions(req, res, next) {
  try {
    const filter = { user: req.user._id };
    if (req.query.classId) filter.class = req.query.classId;
    if (req.query.subject) filter.subject = new RegExp(req.query.subject, "i");
    if (req.query.date) filter.date = req.query.date;
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = req.query.from;
      if (req.query.to) filter.date.$lte = req.query.to;
    }
    const sessions = await AttendanceSession.find(filter)
      .populate("class", "name subject section")
      .sort({ date: -1, createdAt: -1 })
      .limit(200)
      .lean();
    res.json({
      sessions: sessions.map((s) => ({
        ...s,
        id: s._id,
        percentage: percent(s.presentCount, s.total || s.presentCount + s.absentCount),
      })),
    });
  } catch (err) {
    next(err);
  }
}

async function getSession(req, res, next) {
  try {
    const session = await AttendanceSession.findOne({ _id: req.params.id, user: req.user._id })
      .populate("class", "name subject section")
      .lean();
    if (!session) throw new HttpError(404, "Attendance session not found.");
    const records = await AttendanceRecord.find({ session: session._id, user: req.user._id })
      .populate("student", "name rollNo studentId")
      .lean();
    const settings = await CollegeSettings.findOne({ user: req.user._id }).lean();
    res.json({
      session: {
        ...session,
        id: session._id,
        percentage: percent(session.presentCount, session.total || session.presentCount + session.absentCount),
      },
      records: records.map((r) => ({ ...r, id: r._id })),
      college: settings
        ? { collegeName: settings.collegeName, collegeLogo: settings.collegeLogo, appName: settings.appName }
        : null,
    });
  } catch (err) {
    next(err);
  }
}

async function updateSession(req, res, next) {
  try {
    const session = await AttendanceSession.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) throw new HttpError(404, "Attendance session not found.");
    const records = req.body?.records;
    if (!Array.isArray(records)) throw new HttpError(400, "Attendance records are required.");
    let presentCount = 0;
    let absentCount = 0;
    for (const rec of records) {
      if (rec.status !== "present" && rec.status !== "absent") {
        throw new HttpError(400, "Attendance status must be present or absent.");
      }
      const updated = await AttendanceRecord.updateOne(
        { _id: rec.id, session: session._id, user: req.user._id },
        { status: rec.status }
      );
      if (!updated.matchedCount) continue;
      if (rec.status === "present") presentCount += 1;
      else absentCount += 1;
    }
    session.presentCount = presentCount;
    session.absentCount = absentCount;
    session.total = presentCount + absentCount;
    await session.save();
    res.json({ session: { ...session.toObject(), id: session._id } });
  } catch (err) {
    next(err);
  }
}

async function deleteSession(req, res, next) {
  try {
    const session = await AttendanceSession.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) throw new HttpError(404, "Attendance session not found.");
    await AttendanceRecord.deleteMany({ session: session._id, user: req.user._id });
    await session.deleteOne();
    res.json({ message: "Attendance session deleted." });
  } catch (err) {
    next(err);
  }
}

async function analytics(req, res, next) {
  try {
    const classId = req.query.classId;
    if (!classId) throw new HttpError(400, "Class is required.");
    const cls = await ClassModel.findOne({ _id: classId, user: req.user._id }).lean();
    if (!cls) throw new HttpError(404, "Class not found.");
    const settings = await CollegeSettings.findOne({ user: req.user._id }).lean();
    const threshold = settings?.minAttendancePercent ?? 75;
    const summary = await classAttendanceSummary(classId, req.user._id);
    const students = await Student.find({ class: classId, user: req.user._id, archived: { $ne: true } })
      .sort({ studentId: 1 })
      .lean();
    const rows = [];
    for (const st of students) {
      const att = await studentAttendanceSummary(st._id, classId, req.user._id);
      rows.push({
        id: st._id,
        name: st.name,
        studentId: st.studentId,
        ...att,
        belowThreshold: att.totalClasses > 0 && att.percentage < threshold,
      });
    }
    res.json({ class: { ...cls, id: cls._id }, summary, threshold, students: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  takeSheet,
  saveSession,
  listSessions,
  getSession,
  updateSession,
  deleteSession,
  analytics,
};
