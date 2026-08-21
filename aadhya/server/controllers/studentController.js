const ClassModel = require("../models/Class");
const Student = require("../models/Student");
const AttendanceRecord = require("../models/AttendanceRecord");
const Mark = require("../models/Mark");
const { HttpError } = require("../utils/httpError");
const { escapeRegex } = require("../utils/validators");
const { publicFileUrl } = require("../middleware/upload");
const { studentAttendanceSummary } = require("../services/statsService");

async function assertClass(userId, classId) {
  const cls = await ClassModel.findOne({ _id: classId, user: userId });
  if (!cls) throw new HttpError(404, "Class not found.");
  return cls;
}

async function listStudents(req, res, next) {
  try {
    const { classId, q, sort = "rollNo", dir = "asc", page = 1, limit = 50 } = req.query;
    const filter = { user: req.user._id };
    if (classId) filter.class = classId;
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ name: rx }, { rollNo: rx }, { studentId: rx }, { email: rx }];
    }
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(200, Math.max(1, Number(limit) || 50));
    const sortSpec = { [sort]: dir === "desc" ? -1 : 1 };
    const [items, total] = await Promise.all([
      Student.find(filter)
        .populate("class", "name subject section")
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
      pages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
}

async function createStudent(req, res, next) {
  try {
    const { classId, rollNo, studentId, name, email, phone } = req.body || {};
    if (!classId || !rollNo || !studentId || !name) {
      throw new HttpError(400, "Class, roll number, student ID, and name are required.");
    }
    await assertClass(req.user._id, classId);
    const dup = await Student.findOne({
      class: classId,
      $or: [{ rollNo: String(rollNo).trim() }, { studentId: String(studentId).trim() }],
    });
    if (dup) throw new HttpError(409, "A student with this roll number or ID already exists in the class.");
    const student = await Student.create({
      user: req.user._id,
      class: classId,
      rollNo: String(rollNo).trim(),
      studentId: String(studentId).trim(),
      name: String(name).trim(),
      email: email || "",
      phone: phone || "",
      profilePicture: req.file ? publicFileUrl(req, req.file.path) : "",
    });
    res.status(201).json({ student: { ...student.toObject(), id: student._id } });
  } catch (err) {
    next(err);
  }
}

async function updateStudent(req, res, next) {
  try {
    const student = await Student.findOne({ _id: req.params.id, user: req.user._id });
    if (!student) throw new HttpError(404, "Student not found.");
    const fields = ["rollNo", "studentId", "name", "email", "phone", "class"];
    for (const f of fields) {
      if (req.body[f] != null) student[f] = req.body[f];
    }
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
    const student = await Student.findOne({ _id: req.params.id, user: req.user._id });
    if (!student) throw new HttpError(404, "Student not found.");
    await AttendanceRecord.deleteMany({ student: student._id });
    await Mark.deleteMany({ student: student._id });
    await student.deleteOne();
    res.json({ message: "Student removed." });
  } catch (err) {
    next(err);
  }
}

async function getStudent(req, res, next) {
  try {
    const student = await Student.findOne({ _id: req.params.id, user: req.user._id })
      .populate("class", "name subject section semester academicYear")
      .lean();
    if (!student) throw new HttpError(404, "Student not found.");
    const attendance = await studentAttendanceSummary(student._id, student.class?._id);
    const history = await AttendanceRecord.find({ student: student._id })
      .populate("session", "date time subject sessionCode")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const marks = await Mark.find({ student: student._id }).populate("test", "name subject date totalMarks").lean();
    const attempted = marks.length;
    const percents = marks
      .filter((m) => m.test?.totalMarks)
      .map((m) => (m.obtainedMarks / m.test.totalMarks) * 100);
    const avg = percents.length ? Math.round((percents.reduce((a, b) => a + b, 0) / percents.length) * 10) / 10 : 0;
    const highest = percents.length ? Math.round(Math.max(...percents) * 10) / 10 : 0;
    const lowest = percents.length ? Math.round(Math.min(...percents) * 10) / 10 : 0;
    res.json({
      student: { ...student, id: student._id },
      attendance,
      history,
      marks,
      academic: {
        testsAttempted: attempted,
        averageMarks: avg,
        highestMarks: highest,
        lowestMarks: lowest,
        overallPercentage: avg,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listStudents, createStudent, updateStudent, deleteStudent, getStudent };
