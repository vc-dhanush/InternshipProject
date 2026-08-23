const ClassModel = require("../models/Class");
const Student = require("../models/Student");
const Seminar = require("../models/Seminar");
const SeminarRecord = require("../models/SeminarRecord");
const { HttpError } = require("../utils/httpError");
const { percent } = require("../services/statsService");
const { seminarStatus, markAnalytics } = require("../utils/academicStatus");

function publicStudent(s) {
  return { id: s._id, name: s.name, studentId: s.studentId, rollNo: s.rollNo };
}

async function listSeminars(req, res, next) {
  try {
    const filter = { user: req.user._id, archived: { $ne: true } };
    if (req.query.classId) filter.class = req.query.classId;
    if (req.query.subject) filter.subject = new RegExp(req.query.subject, "i");
    const items = await Seminar.find(filter).populate("class", "name subject section").sort({ date: -1, createdAt: -1 }).lean();
    res.json({
      seminars: items.map((s) => ({ ...s, id: s._id, status: seminarStatus(s) })),
    });
  } catch (err) {
    next(err);
  }
}

async function createSeminar(req, res, next) {
  try {
    const { title, topic, subject, classId, description, date, time, venue, maxMarks } = req.body || {};
    const name = String(title || topic || "").trim();
    if (!name) throw new HttpError(400, "Seminar topic is required.");
    if (!classId) throw new HttpError(400, "Class is required.");
    if (!subject || !String(subject).trim()) throw new HttpError(400, "Subject is required.");
    if (!date) throw new HttpError(400, "Date is required.");
    const cls = await ClassModel.findOne({ _id: classId, user: req.user._id });
    if (!cls) throw new HttpError(404, "Class not found.");
    const marks = maxMarks == null || maxMarks === "" ? 0 : Number(maxMarks);
    if (!Number.isFinite(marks) || marks < 0) throw new HttpError(400, "Maximum marks must be 0 or greater.");
    const seminar = await Seminar.create({
      user: req.user._id,
      class: classId,
      title: name,
      subject: String(subject).trim(),
      description: String(description || "").trim(),
      date,
      time: String(time || "").trim(),
      venue: String(venue || "").trim(),
      maxMarks: marks,
    });
    res.status(201).json({ seminar: { ...seminar.toObject(), id: seminar._id, status: seminarStatus(seminar) } });
  } catch (err) {
    next(err);
  }
}

async function getSeminar(req, res, next) {
  try {
    const seminar = await Seminar.findOne({ _id: req.params.id, user: req.user._id })
      .populate("class", "name subject section")
      .lean();
    if (!seminar) throw new HttpError(404, "Seminar not found.");
    const students = await Student.find({
      class: seminar.class._id || seminar.class,
      user: req.user._id,
      archived: { $ne: true },
    })
      .sort({ studentId: 1, name: 1 })
      .lean();
    const records = await SeminarRecord.find({ seminar: seminar._id, user: req.user._id }).lean();
    const byStudent = new Map(records.map((r) => [String(r.student), r]));
    const rows = students.map((s) => {
      const rec = byStudent.get(String(s._id));
      const obtained = rec && rec.obtainedMarks != null ? rec.obtainedMarks : "";
      return {
        student: publicStudent(s),
        participation: rec?.participation || "",
        obtainedMarks: obtained,
        remarks: rec?.remarks || "",
        percentage: obtained === "" || !seminar.maxMarks ? "" : percent(obtained, seminar.maxMarks),
      };
    });
    const scores = records.map((r) => r.obtainedMarks).filter((n) => n != null);
    res.json({
      seminar: { ...seminar, id: seminar._id, status: seminarStatus(seminar) },
      rows,
      analytics: seminar.maxMarks ? markAnalytics(scores, seminar.maxMarks) : { evaluated: records.length },
    });
  } catch (err) {
    next(err);
  }
}

async function updateSeminar(req, res, next) {
  try {
    const seminar = await Seminar.findOne({ _id: req.params.id, user: req.user._id });
    if (!seminar) throw new HttpError(404, "Seminar not found.");
    if (req.body.title != null || req.body.topic != null) seminar.title = String(req.body.title || req.body.topic).trim();
    ["subject", "description", "date", "time", "venue", "maxMarks"].forEach((f) => {
      if (req.body[f] != null) seminar[f] = req.body[f];
    });
    if (!seminar.title || !seminar.subject || !seminar.date) {
      throw new HttpError(400, "Topic, subject, and date are required.");
    }
    await seminar.save();
    res.json({ seminar: { ...seminar.toObject(), id: seminar._id, status: seminarStatus(seminar) } });
  } catch (err) {
    next(err);
  }
}

async function saveRecords(req, res, next) {
  try {
    const seminar = await Seminar.findOne({ _id: req.params.id, user: req.user._id });
    if (!seminar) throw new HttpError(404, "Seminar not found.");
    const entries = req.body?.records;
    if (!Array.isArray(entries)) throw new HttpError(400, "Student records are required.");
    for (const entry of entries) {
      const student = await Student.findOne({ _id: entry.studentId, user: req.user._id, class: seminar.class });
      if (!student) throw new HttpError(404, "Student not found in this class.");
      let obtained = null;
      if (entry.obtainedMarks !== "" && entry.obtainedMarks != null) {
        obtained = Number(entry.obtainedMarks);
        if (!Number.isFinite(obtained) || obtained < 0) throw new HttpError(400, "Obtained marks must be 0 or greater.");
        if (seminar.maxMarks && obtained > seminar.maxMarks) {
          throw new HttpError(400, "Obtained marks cannot exceed maximum marks.");
        }
      }
      const participation = ["yes", "no", "partial", ""].includes(entry.participation) ? entry.participation : "";
      await SeminarRecord.findOneAndUpdate(
        { seminar: seminar._id, student: student._id, user: req.user._id },
        {
          seminar: seminar._id,
          student: student._id,
          user: req.user._id,
          class: seminar.class,
          participation,
          obtainedMarks: obtained,
          remarks: String(entry.remarks || "").trim(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    res.json({ message: "Seminar records saved." });
  } catch (err) {
    next(err);
  }
}

async function deleteSeminar(req, res, next) {
  try {
    const seminar = await Seminar.findOne({ _id: req.params.id, user: req.user._id });
    if (!seminar) throw new HttpError(404, "Seminar not found.");
    seminar.archived = true;
    await seminar.save();
    res.json({ message: "Seminar archived.", archived: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listSeminars,
  createSeminar,
  getSeminar,
  updateSeminar,
  saveRecords,
  deleteSeminar,
};
