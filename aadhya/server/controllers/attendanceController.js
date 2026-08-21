const AttendanceRecord = require("../models/AttendanceRecord");
const AttendanceSession = require("../models/AttendanceSession");
const ClassModel = require("../models/Class");
const CollegeSettings = require("../models/CollegeSettings");
const Student = require("../models/Student");
const { generateSessionCode } = require("../utils/tokens");
const { HttpError } = require("../utils/httpError");

async function takeSheet(req, res, next) {
  try {
    const classId = req.query.classId;
    if (!classId) throw new HttpError(400, "Select a class to take attendance.");
    const cls = await ClassModel.findOne({ _id: classId, user: req.user._id }).lean();
    if (!cls) throw new HttpError(404, "Class not found.");
    const settings = await CollegeSettings.findOne({ user: req.user._id }).lean();
    const students = await Student.find({ class: classId, user: req.user._id }).sort({ rollNo: 1 }).lean();
    res.json({
      class: { ...cls, id: cls._id },
      college: settings,
      defaultStatus: settings?.defaultAttendanceStatus || "present",
      students: students.map((s) => ({ ...s, id: s._id })),
    });
  } catch (err) {
    next(err);
  }
}

async function saveSession(req, res, next) {
  try {
    const { classId, date, time, subject, records, source } = req.body || {};
    if (!classId || !date || !time || !Array.isArray(records)) {
      throw new HttpError(400, "Class, date, time, and attendance records are required.");
    }
    const cls = await ClassModel.findOne({ _id: classId, user: req.user._id });
    if (!cls) throw new HttpError(404, "Class not found.");
    const students = await Student.find({ class: classId, user: req.user._id });
    const byId = new Map(students.map((s) => [String(s._id), s]));
    const presentCount = records.filter((r) => r.status === "present").length;
    const absentCount = records.filter((r) => r.status === "absent").length;

    const session = await AttendanceSession.create({
      user: req.user._id,
      class: classId,
      subject: subject || cls.subject,
      date,
      time,
      sessionCode: generateSessionCode(),
      presentCount,
      absentCount,
      total: records.length,
      source: source === "ocr" ? "ocr" : "manual",
    });

    const docs = [];
    for (const rec of records) {
      if (!byId.has(String(rec.studentId))) continue;
      if (rec.status !== "present" && rec.status !== "absent") {
        throw new HttpError(400, "Attendance status must be present or absent.");
      }
      docs.push({
        user: req.user._id,
        session: session._id,
        class: classId,
        student: rec.studentId,
        status: rec.status,
      });
    }
    if (docs.length) await AttendanceRecord.insertMany(docs);
    const saved = await AttendanceSession.findById(session._id).lean();
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
    res.json({ sessions: sessions.map((s) => ({ ...s, id: s._id })) });
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
    const records = await AttendanceRecord.find({ session: session._id })
      .populate("student", "name rollNo studentId")
      .lean();
    res.json({
      session: { ...session, id: session._id },
      records: records.map((r) => ({ ...r, id: r._id })),
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
      await AttendanceRecord.updateOne(
        { _id: rec.id, session: session._id, user: req.user._id },
        { status: rec.status }
      );
      if (rec.status === "present") presentCount += 1;
      else absentCount += 1;
    }
    session.presentCount = presentCount;
    session.absentCount = absentCount;
    session.total = records.length;
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
    await AttendanceRecord.deleteMany({ session: session._id });
    await session.deleteOne();
    res.json({ message: "Attendance session deleted." });
  } catch (err) {
    next(err);
  }
}

module.exports = { takeSheet, saveSession, listSessions, getSession, updateSession, deleteSession };
