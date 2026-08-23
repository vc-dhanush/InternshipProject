const ClassModel = require("../models/Class");
const Mark = require("../models/Mark");
const Student = require("../models/Student");
const Test = require("../models/Test");
const { HttpError } = require("../utils/httpError");
const { testAnalytics } = require("../services/statsService");
const { escapeRegex } = require("../utils/validators");

async function listTests(req, res, next) {
  try {
    const filter = { user: req.user._id };
    if (req.query.classId) filter.class = req.query.classId;
    if (req.query.subject) filter.subject = new RegExp(escapeRegex(req.query.subject), "i");
    if (req.query.date) filter.date = req.query.date;
    if (req.query.q) filter.name = new RegExp(escapeRegex(req.query.q), "i");
    const tests = await Test.find(filter)
      .populate("class", "name subject section")
      .sort({ date: -1, createdAt: -1 })
      .lean();
    res.json({ tests: tests.map((t) => ({ ...t, id: t._id })) });
  } catch (err) {
    next(err);
  }
}

async function createTest(req, res, next) {
  try {
    const { name, subject, date, totalMarks, classId, passPercent } = req.body || {};
    if (!name || !subject || !date || !totalMarks || !classId) {
      throw new HttpError(400, "Test name, subject, date, total marks, and class are required.");
    }
    const cls = await ClassModel.findOne({ _id: classId, user: req.user._id });
    if (!cls) throw new HttpError(404, "Class not found.");
    const total = Number(totalMarks);
    if (!Number.isFinite(total) || total <= 0) throw new HttpError(400, "Total marks must be greater than 0.");
    const test = await Test.create({
      user: req.user._id,
      class: classId,
      name: String(name).trim(),
      subject: String(subject).trim(),
      date,
      totalMarks: total,
      passPercent: passPercent == null ? 40 : Number(passPercent),
    });
    const students = await Student.find({ class: classId, user: req.user._id, archived: { $ne: true } }).sort({ studentId: 1, rollNo: 1 }).lean();
    res.status(201).json({
      test: { ...test.toObject(), id: test._id },
      students: students.map((s) => ({ ...s, id: s._id })),
    });
  } catch (err) {
    next(err);
  }
}

async function getTest(req, res, next) {
  try {
    const test = await Test.findOne({ _id: req.params.id, user: req.user._id })
      .populate("class", "name subject section")
      .lean();
    if (!test) throw new HttpError(404, "Test not found.");
    const students = await Student.find({ class: test.class._id || test.class, user: req.user._id, archived: { $ne: true } })
      .sort({ studentId: 1, rollNo: 1 })
      .lean();
    const marks = await Mark.find({ test: test._id, user: req.user._id }).lean();
    const byStudent = new Map(marks.map((m) => [String(m.student), m]));
    const rows = students.map((s) => ({
      student: { ...s, id: s._id },
      obtainedMarks: byStudent.has(String(s._id)) ? byStudent.get(String(s._id)).obtainedMarks : "",
      markId: byStudent.get(String(s._id))?._id || null,
    }));
    const analytics = await testAnalytics(test._id);
    res.json({ test: { ...test, id: test._id }, rows, analytics });
  } catch (err) {
    next(err);
  }
}

async function saveMarks(req, res, next) {
  try {
    const test = await Test.findOne({ _id: req.params.id, user: req.user._id });
    if (!test) throw new HttpError(404, "Test not found.");
    const entries = req.body?.marks;
    if (!Array.isArray(entries)) throw new HttpError(400, "Marks list is required.");
    for (const entry of entries) {
      if (entry.obtainedMarks === "" || entry.obtainedMarks == null) continue;
      const value = Number(entry.obtainedMarks);
      if (!Number.isFinite(value) || value < 0) {
        throw new HttpError(400, "Obtained marks must be a valid number.");
      }
      if (value > test.totalMarks) {
        throw new HttpError(400, "Obtained marks cannot exceed total marks.");
      }
      const student = await Student.findOne({ _id: entry.studentId, user: req.user._id, class: test.class });
      if (!student) throw new HttpError(404, "Student not found in this class.");
      await Mark.findOneAndUpdate(
        { test: test._id, student: entry.studentId, user: req.user._id },
        {
          test: test._id,
          student: entry.studentId,
          user: req.user._id,
          class: test.class,
          obtainedMarks: value,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    const analytics = await testAnalytics(test._id);
    res.json({ message: "Marks saved.", analytics });
  } catch (err) {
    next(err);
  }
}

async function updateTest(req, res, next) {
  try {
    const test = await Test.findOne({ _id: req.params.id, user: req.user._id });
    if (!test) throw new HttpError(404, "Test not found.");
    ["name", "subject", "date", "totalMarks", "passPercent"].forEach((f) => {
      if (req.body[f] != null) test[f] = req.body[f];
    });
    await test.save();
    res.json({ test: { ...test.toObject(), id: test._id } });
  } catch (err) {
    next(err);
  }
}

async function deleteTest(req, res, next) {
  try {
    const test = await Test.findOne({ _id: req.params.id, user: req.user._id });
    if (!test) throw new HttpError(404, "Test not found.");
    await Mark.deleteMany({ test: test._id });
    await test.deleteOne();
    res.json({ message: "Test deleted." });
  } catch (err) {
    next(err);
  }
}

module.exports = { listTests, createTest, getTest, saveMarks, updateTest, deleteTest };
