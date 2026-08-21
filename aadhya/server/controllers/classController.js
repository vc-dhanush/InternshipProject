const mongoose = require("mongoose");
const ClassModel = require("../models/Class");
const Student = require("../models/Student");
const AttendanceSession = require("../models/AttendanceSession");
const Test = require("../models/Test");
const { HttpError } = require("../utils/httpError");
const { escapeRegex } = require("../utils/validators");
const { percent } = require("../services/statsService");

function countMap(rows) {
  const map = new Map();
  rows.forEach((r) => map.set(String(r._id), r));
  return map;
}

async function listClasses(req, res, next) {
  try {
    const q = String(req.query.q || "").trim();
    const status = req.query.status || "active";
    const filter = { user: req.user._id };
    if (status === "archived") filter.archived = true;
    else if (status !== "all") filter.archived = false;
    if (q) {
      filter.$or = [
        { name: new RegExp(escapeRegex(q), "i") },
        { subject: new RegExp(escapeRegex(q), "i") },
        { section: new RegExp(escapeRegex(q), "i") },
        { academicYear: new RegExp(escapeRegex(q), "i") },
      ];
    }
    const classes = await ClassModel.find(filter).sort({ createdAt: -1 }).lean();
    const ids = classes.map((c) => c._id);
    if (!ids.length) return res.json({ classes: [] });

    const match = { class: { $in: ids }, user: req.user._id };
    const [studentCounts, sessionAggs, testCounts] = await Promise.all([
      Student.aggregate([
        { $match: { ...match, archived: { $ne: true } } },
        { $group: { _id: "$class", n: { $sum: 1 } } },
      ]),
      AttendanceSession.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$class",
            n: { $sum: 1 },
            present: { $sum: "$presentCount" },
            absent: { $sum: "$absentCount" },
          },
        },
      ]),
      Test.aggregate([{ $match: match }, { $group: { _id: "$class", n: { $sum: 1 } } }]),
    ]);
    const students = countMap(studentCounts);
    const sessions = countMap(sessionAggs);
    const tests = countMap(testCounts);

    res.json({
      classes: classes.map((cls) => {
        const att = sessions.get(String(cls._id));
        return {
          ...cls,
          id: cls._id,
          studentCount: students.get(String(cls._id))?.n || 0,
          classesConducted: att?.n || 0,
          totalClasses: att?.n || 0,
          attendancePercentage: att ? percent(att.present, att.present + att.absent) : null,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
}

async function createClass(req, res, next) {
  try {
    const name = String(req.body?.name || "").trim();
    const subject = String(req.body?.subject || "").trim();
    if (!name || !subject) throw new HttpError(400, "Class name and subject are required.");
    const payload = {
      user: req.user._id,
      name,
      section: String(req.body.section || "").trim(),
      academicYear: String(req.body.academicYear || "").trim(),
      semester: String(req.body.semester || "").trim(),
      subject,
      archived: false,
    };
    try {
      const cls = await ClassModel.create(payload);
      res.status(201).json({
        class: {
          ...cls.toObject(),
          id: cls._id,
          studentCount: 0,
          classesConducted: 0,
          attendancePercentage: null,
        },
      });
    } catch (e) {
      if (e.code === 11000) {
        throw new HttpError(409, "You already have an active class with this name, section, subject, and year.");
      }
      throw e;
    }
  } catch (err) {
    next(err);
  }
}

async function classMeta(cls, userId) {
  const match = { class: cls._id, user: userId };
  const [studentCount, sessions, testCount] = await Promise.all([
    Student.countDocuments({ ...match, archived: { $ne: true } }),
    AttendanceSession.find(match).select("presentCount absentCount").lean(),
    Test.countDocuments(match),
  ]);
  const present = sessions.reduce((s, x) => s + (x.presentCount || 0), 0);
  const absent = sessions.reduce((s, x) => s + (x.absentCount || 0), 0);
  return {
    ...cls,
    id: cls._id,
    studentCount,
    classesConducted: sessions.length,
    totalClasses: sessions.length,
    testCount,
    attendancePercentage: sessions.length ? percent(present, present + absent) : null,
  };
}

async function getClass(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, "Class not found.");
    const cls = await ClassModel.findOne({ _id: req.params.id, user: req.user._id }).lean();
    if (!cls) throw new HttpError(404, "Class not found.");
    res.json({ class: await classMeta(cls, req.user._id) });
  } catch (err) {
    next(err);
  }
}

async function updateClass(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, "Class not found.");
    const cls = await ClassModel.findOne({ _id: req.params.id, user: req.user._id });
    if (!cls) throw new HttpError(404, "Class not found.");
    const fields = ["name", "section", "academicYear", "semester", "subject"];
    fields.forEach((f) => {
      if (req.body[f] != null) cls[f] = String(req.body[f]).trim();
    });
    if (!cls.name || !cls.subject) throw new HttpError(400, "Class name and subject are required.");
    if (req.body.archived === false) cls.archived = false;
    try {
      await cls.save();
    } catch (e) {
      if (e.code === 11000) {
        throw new HttpError(409, "You already have an active class with this name, section, subject, and year.");
      }
      throw e;
    }
    res.json({ class: { ...cls.toObject(), id: cls._id } });
  } catch (err) {
    next(err);
  }
}

async function deleteClass(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, "Class not found.");
    const cls = await ClassModel.findOne({ _id: req.params.id, user: req.user._id });
    if (!cls) throw new HttpError(404, "Class not found.");
    const permanent = String(req.query.permanent || "") === "true";
    if (permanent) {
      const [students, sessions, tests] = await Promise.all([
        Student.countDocuments({ class: cls._id }),
        AttendanceSession.countDocuments({ class: cls._id, user: req.user._id }),
        Test.countDocuments({ class: cls._id, user: req.user._id }),
      ]);
      if (students || sessions || tests) {
        throw new HttpError(
          409,
          "This class has students or academic history. Archive it instead of permanently deleting it."
        );
      }
      await cls.deleteOne();
      return res.json({ message: "Class deleted.", archived: false });
    }
    cls.archived = true;
    await cls.save();
    await Student.updateMany({ class: cls._id, user: req.user._id }, { archived: true });
    res.json({ message: "Class archived. Academic history was kept.", archived: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listClasses, createClass, getClass, updateClass, deleteClass };
