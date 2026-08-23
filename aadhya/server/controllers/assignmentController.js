const ClassModel = require("../models/Class");
const Student = require("../models/Student");
const Assignment = require("../models/Assignment");
const AssignmentMark = require("../models/AssignmentMark");
const { HttpError } = require("../utils/httpError");
const { percent } = require("../services/statsService");
const { assignmentStatus, markAnalytics } = require("../utils/academicStatus");

function publicStudent(s) {
  return {
    id: s._id,
    name: s.name,
    studentId: s.studentId,
    rollNo: s.rollNo,
  };
}

async function ownClass(userId, classId) {
  const cls = await ClassModel.findOne({ _id: classId, user: userId });
  if (!cls) throw new HttpError(404, "Class not found.");
  return cls;
}

async function listAssignments(req, res, next) {
  try {
    const filter = { user: req.user._id, archived: { $ne: true } };
    if (req.query.classId) filter.class = req.query.classId;
    if (req.query.subject) filter.subject = new RegExp(req.query.subject, "i");
    const items = await Assignment.find(filter).populate("class", "name subject section").sort({ dueDate: 1, createdAt: -1 }).lean();
    res.json({
      assignments: items.map((a) => ({
        ...a,
        id: a._id,
        status: assignmentStatus(a),
      })),
    });
  } catch (err) {
    next(err);
  }
}

async function createAssignment(req, res, next) {
  try {
    const { title, subject, classId, description, assignedDate, dueDate, maxMarks } = req.body || {};
    if (!title || !String(title).trim()) throw new HttpError(400, "Assignment title is required.");
    if (!classId) throw new HttpError(400, "Class is required.");
    if (!subject || !String(subject).trim()) throw new HttpError(400, "Subject is required.");
    if (!assignedDate || !dueDate) throw new HttpError(400, "Assigned date and due date are required.");
    if (dueDate < assignedDate) throw new HttpError(400, "Due date cannot be before the assigned date.");
    const marks = Number(maxMarks);
    if (!Number.isFinite(marks) || marks < 0) throw new HttpError(400, "Maximum marks must be 0 or greater.");
    const cls = await ownClass(req.user._id, classId);
    const assignment = await Assignment.create({
      user: req.user._id,
      class: classId,
      title: String(title).trim(),
      subject: String(subject).trim() || cls.subject,
      description: String(description || "").trim(),
      assignedDate,
      dueDate,
      maxMarks: marks,
    });
    res.status(201).json({ assignment: { ...assignment.toObject(), id: assignment._id, status: assignmentStatus(assignment) } });
  } catch (err) {
    next(err);
  }
}

async function getAssignment(req, res, next) {
  try {
    const assignment = await Assignment.findOne({ _id: req.params.id, user: req.user._id })
      .populate("class", "name subject section")
      .lean();
    if (!assignment) throw new HttpError(404, "Assignment not found.");
    const students = await Student.find({
      class: assignment.class._id || assignment.class,
      user: req.user._id,
      archived: { $ne: true },
    })
      .sort({ studentId: 1, name: 1 })
      .lean();
    const marks = await AssignmentMark.find({ assignment: assignment._id, user: req.user._id }).lean();
    const byStudent = new Map(marks.map((m) => [String(m.student), m]));
    const rows = students.map((s) => {
      const obtained = byStudent.has(String(s._id)) ? byStudent.get(String(s._id)).obtainedMarks : "";
      return {
        student: publicStudent(s),
        obtainedMarks: obtained,
        percentage: obtained === "" ? "" : percent(obtained, assignment.maxMarks),
      };
    });
    const scores = marks.map((m) => m.obtainedMarks);
    res.json({
      assignment: { ...assignment, id: assignment._id, status: assignmentStatus(assignment) },
      rows,
      analytics: markAnalytics(scores, assignment.maxMarks),
    });
  } catch (err) {
    next(err);
  }
}

async function updateAssignment(req, res, next) {
  try {
    const assignment = await Assignment.findOne({ _id: req.params.id, user: req.user._id });
    if (!assignment) throw new HttpError(404, "Assignment not found.");
    ["title", "subject", "description", "assignedDate", "dueDate", "maxMarks", "completed"].forEach((f) => {
      if (req.body[f] != null) assignment[f] = req.body[f];
    });
    if (!assignment.title || !assignment.subject) throw new HttpError(400, "Title and subject are required.");
    if (assignment.dueDate < assignment.assignedDate) {
      throw new HttpError(400, "Due date cannot be before the assigned date.");
    }
    if (Number(assignment.maxMarks) < 0) throw new HttpError(400, "Maximum marks must be 0 or greater.");
    await assignment.save();
    res.json({ assignment: { ...assignment.toObject(), id: assignment._id, status: assignmentStatus(assignment) } });
  } catch (err) {
    next(err);
  }
}

async function saveMarks(req, res, next) {
  try {
    const assignment = await Assignment.findOne({ _id: req.params.id, user: req.user._id });
    if (!assignment) throw new HttpError(404, "Assignment not found.");
    const entries = req.body?.marks;
    if (!Array.isArray(entries)) throw new HttpError(400, "Marks list is required.");
    for (const entry of entries) {
      if (entry.obtainedMarks === "" || entry.obtainedMarks == null) continue;
      const value = Number(entry.obtainedMarks);
      if (!Number.isFinite(value) || value < 0) throw new HttpError(400, "Obtained marks must be 0 or greater.");
      if (value > assignment.maxMarks) throw new HttpError(400, "Obtained marks cannot exceed maximum marks.");
      const student = await Student.findOne({ _id: entry.studentId, user: req.user._id, class: assignment.class });
      if (!student) throw new HttpError(404, "Student not found in this class.");
      await AssignmentMark.findOneAndUpdate(
        { assignment: assignment._id, student: student._id, user: req.user._id },
        {
          assignment: assignment._id,
          student: student._id,
          user: req.user._id,
          class: assignment.class,
          obtainedMarks: value,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    const marks = await AssignmentMark.find({ assignment: assignment._id, user: req.user._id }).lean();
    res.json({ message: "Assignment marks saved.", analytics: markAnalytics(marks.map((m) => m.obtainedMarks), assignment.maxMarks) });
  } catch (err) {
    next(err);
  }
}

async function deleteAssignment(req, res, next) {
  try {
    const assignment = await Assignment.findOne({ _id: req.params.id, user: req.user._id });
    if (!assignment) throw new HttpError(404, "Assignment not found.");
    assignment.archived = true;
    await assignment.save();
    res.json({ message: "Assignment archived.", archived: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listAssignments,
  createAssignment,
  getAssignment,
  updateAssignment,
  saveMarks,
  deleteAssignment,
};
