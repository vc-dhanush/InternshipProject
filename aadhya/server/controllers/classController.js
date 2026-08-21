const ClassModel = require("../models/Class");
const Student = require("../models/Student");
const AttendanceSession = require("../models/AttendanceSession");
const AttendanceRecord = require("../models/AttendanceRecord");
const Test = require("../models/Test");
const Mark = require("../models/Mark");
const { HttpError } = require("../utils/httpError");
const { escapeRegex } = require("../utils/validators");
const { classAttendanceSummary } = require("../services/statsService");

async function listClasses(req, res, next) {
  try {
    const q = String(req.query.q || "").trim();
    const filter = { user: req.user._id };
    if (q) {
      filter.$or = [
        { name: new RegExp(escapeRegex(q), "i") },
        { subject: new RegExp(escapeRegex(q), "i") },
        { section: new RegExp(escapeRegex(q), "i") },
      ];
    }
    const classes = await ClassModel.find(filter).sort({ createdAt: -1 }).lean();
    const withMeta = await Promise.all(
      classes.map(async (cls) => {
        const studentCount = await Student.countDocuments({ class: cls._id });
        const att = await classAttendanceSummary(cls._id, req.user._id);
        return { ...cls, id: cls._id, studentCount, ...att };
      })
    );
    res.json({ classes: withMeta });
  } catch (err) {
    next(err);
  }
}

async function createClass(req, res, next) {
  try {
    const { name, section, academicYear, semester, subject } = req.body || {};
    if (!name || !subject) throw new HttpError(400, "Class name and subject are required.");
    const cls = await ClassModel.create({
      user: req.user._id,
      name: String(name).trim(),
      section: section || "",
      academicYear: academicYear || "",
      semester: semester || "",
      subject: String(subject).trim(),
    });
    res.status(201).json({ class: { ...cls.toObject(), id: cls._id, studentCount: 0 } });
  } catch (err) {
    next(err);
  }
}

async function getClass(req, res, next) {
  try {
    const cls = await ClassModel.findOne({ _id: req.params.id, user: req.user._id }).lean();
    if (!cls) throw new HttpError(404, "Class not found.");
    const studentCount = await Student.countDocuments({ class: cls._id });
    const att = await classAttendanceSummary(cls._id, req.user._id);
    res.json({ class: { ...cls, id: cls._id, studentCount, ...att } });
  } catch (err) {
    next(err);
  }
}

async function updateClass(req, res, next) {
  try {
    const cls = await ClassModel.findOne({ _id: req.params.id, user: req.user._id });
    if (!cls) throw new HttpError(404, "Class not found.");
    const fields = ["name", "section", "academicYear", "semester", "subject"];
    fields.forEach((f) => {
      if (req.body[f] != null) cls[f] = req.body[f];
    });
    await cls.save();
    res.json({ class: { ...cls.toObject(), id: cls._id } });
  } catch (err) {
    next(err);
  }
}

async function deleteClass(req, res, next) {
  try {
    const cls = await ClassModel.findOne({ _id: req.params.id, user: req.user._id });
    if (!cls) throw new HttpError(404, "Class not found.");
    const classId = cls._id;
    await Promise.all([
      Student.deleteMany({ class: classId }),
      AttendanceRecord.deleteMany({ class: classId }),
      AttendanceSession.deleteMany({ class: classId }),
      Mark.deleteMany({ class: classId }),
      Test.deleteMany({ class: classId }),
      cls.deleteOne(),
    ]);
    res.json({ message: "Class deleted." });
  } catch (err) {
    next(err);
  }
}

module.exports = { listClasses, createClass, getClass, updateClass, deleteClass };
