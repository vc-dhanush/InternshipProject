const mongoose = require("mongoose");
const ClassModel = require("../models/Class");
const Student = require("../models/Student");
const { HttpError } = require("../utils/httpError");
const { escapeRegex } = require("../utils/validators");
const { publicFileUrl } = require("../middleware/upload");
const AssignmentMark = require("../models/AssignmentMark");
const SeminarRecord = require("../models/SeminarRecord");
const { studentAttendanceSummary, studentMarksSummary, percent } = require("../services/statsService");

async function assertOwnClass(userId, classId) {
  if (!mongoose.isValidObjectId(classId)) throw new HttpError(404, "Class not found.");
  const cls = await ClassModel.findOne({ _id: classId, user: userId });
  if (!cls) throw new HttpError(404, "Class not found.");
  return cls;
}

function applyClassParam(req) {
  if (!req.body) req.body = {};
  if (req.params.id && !req.query.classId && !req.body.classId) {
    req.query.classId = req.params.id;
    req.body.classId = req.params.id;
  }
}

async function listStudents(req, res, next) {
  try {
    applyClassParam(req);
    const { classId, q, sort = "rollNo", dir = "asc", page = 1, limit = 50, status = "active" } = req.query;
    const filter = { user: req.user._id };
    if (classId) {
      await assertOwnClass(req.user._id, classId);
      filter.class = classId;
    }
    if (status === "archived") filter.archived = true;
    else if (status !== "all") filter.archived = false;
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ name: rx }, { rollNo: rx }, { studentId: rx }, { email: rx }];
    }
    const allowedSort = { rollNo: 1, name: 1, studentId: 1, createdAt: 1 };
    const sortField = allowedSort[sort] ? sort : "rollNo";
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(200, Math.max(1, Number(limit) || 50));
    const sortSpec = { [sortField]: dir === "desc" ? -1 : 1 };
    const [items, total] = await Promise.all([
      Student.find(filter)
        .populate("class", "name subject section academicYear semester")
        .sort(sortSpec)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Student.countDocuments(filter),
    ]);
    res.json({
      students: items.map((s) => ({ ...s, id: s._id })),
      total,
      page: pageNum,
      pages: Math.max(1, Math.ceil(total / limitNum)),
    });
  } catch (err) {
    next(err);
  }
}

async function createStudent(req, res, next) {
  try {
    applyClassParam(req);
    const classId = req.body?.classId || req.params.id;
    const rollNo = String(req.body?.rollNo || req.body?.studentId || "").trim();
    const name = String(req.body?.name || "").trim();
    const studentId = String(req.body?.studentId || req.body?.rollNo || "").trim();
    if (!classId) throw new HttpError(400, "Class is required.");
    if (!name || !studentId) throw new HttpError(400, "Student name and student ID are required.");
    await assertOwnClass(req.user._id, classId);
    try {
      const student = await Student.create({
        user: req.user._id,
        class: classId,
        rollNo,
        studentId,
        name,
        email: String(req.body?.email || "").trim().toLowerCase(),
        phone: String(req.body?.phone || "").trim(),
        profilePicture: req.file ? publicFileUrl(req, req.file.path) : "",
        archived: false,
      });
      res.status(201).json({ student: { ...student.toObject(), id: student._id } });
    } catch (e) {
      if (e.code === 11000) {
        throw new HttpError(409, "A student with this roll number or student ID already exists in the class.");
      }
      throw e;
    }
  } catch (err) {
    next(err);
  }
}

async function updateStudent(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, "Student not found.");
    const student = await Student.findOne({ _id: req.params.id, user: req.user._id });
    if (!student) throw new HttpError(404, "Student not found.");
    if (req.body.rollNo != null) student.rollNo = String(req.body.rollNo).trim() || student.studentId;
    if (req.body.studentId != null) student.studentId = String(req.body.studentId).trim() || student.rollNo;
    if (req.body.name != null) student.name = String(req.body.name).trim();
    if (req.body.email != null) student.email = String(req.body.email).trim().toLowerCase();
    if (req.body.phone != null) student.phone = String(req.body.phone).trim();
    if (req.body.archived === false) student.archived = false;
    if (req.body.class) {
      await assertOwnClass(req.user._id, req.body.class);
      student.class = req.body.class;
    }
    if (!student.studentId || !student.name) throw new HttpError(400, "Student name and student ID are required.");
    if (!student.rollNo) student.rollNo = student.studentId;
    if (req.file) student.profilePicture = publicFileUrl(req, req.file.path);
    try {
      await student.save();
    } catch (e) {
      if (e.code === 11000) throw new HttpError(409, "Roll number or student ID must be unique in this class.");
      throw e;
    }
    res.json({ student: { ...student.toObject(), id: student._id } });
  } catch (err) {
    next(err);
  }
}

async function deleteStudent(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, "Student not found.");
    const student = await Student.findOne({ _id: req.params.id, user: req.user._id });
    if (!student) throw new HttpError(404, "Student not found.");
    const permanent = String(req.query.permanent || "") === "true";
    if (permanent) {
      student.archived = true;
      await student.save();
      await student.deleteOne();
      return res.json({ message: "Student removed.", archived: false });
    }
    student.archived = true;
    await student.save();
    res.json({ message: "Student archived. They will no longer appear in the active class list.", archived: true });
  } catch (err) {
    next(err);
  }
}

async function getStudent(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, "Student not found.");
    const student = await Student.findOne({ _id: req.params.id, user: req.user._id })
      .populate("class", "name subject section semester academicYear")
      .lean();
    if (!student) throw new HttpError(404, "Student not found.");
    const [attendance, tests, assignmentMarks, seminarRecords] = await Promise.all([
      studentAttendanceSummary(student._id, student.class?._id, req.user._id),
      studentMarksSummary(student._id, req.user._id),
      AssignmentMark.find({ student: student._id, user: req.user._id })
        .populate("assignment", "title subject dueDate maxMarks")
        .lean(),
      SeminarRecord.find({ student: student._id, user: req.user._id })
        .populate("seminar", "title subject date maxMarks")
        .lean(),
    ]);
    const assignments = {
      count: assignmentMarks.length,
      items: assignmentMarks
        .filter((m) => m.assignment)
        .map((m) => ({
          id: m.assignment._id,
          title: m.assignment.title,
          subject: m.assignment.subject,
          dueDate: m.assignment.dueDate,
          obtainedMarks: m.obtainedMarks,
          maxMarks: m.assignment.maxMarks,
          percentage: percent(m.obtainedMarks, m.assignment.maxMarks),
        })),
    };
    const seminars = {
      count: seminarRecords.length,
      items: seminarRecords
        .filter((r) => r.seminar)
        .map((r) => ({
          id: r.seminar._id,
          title: r.seminar.title,
          subject: r.seminar.subject,
          date: r.seminar.date,
          participation: r.participation,
          obtainedMarks: r.obtainedMarks,
          maxMarks: r.seminar.maxMarks,
          remarks: r.remarks,
        })),
    };
    res.json({
      student: { ...student, id: student._id },
      attendance,
      tests,
      assignments,
      seminars,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listStudents, createStudent, updateStudent, deleteStudent, getStudent };
