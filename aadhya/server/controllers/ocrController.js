const ClassModel = require("../models/Class");
const Student = require("../models/Student");
const { HttpError } = require("../utils/httpError");
const { runOcr, extractCandidates, matchStudents } = require("../services/ocrService");

async function importFromImage(req, res, next) {
  try {
    if (!req.file) throw new HttpError(400, "Please upload an attendance sheet image.");
    const classId = req.body.classId || req.query.classId;
    if (!classId) throw new HttpError(400, "Select a class before importing attendance from an image.");
    const cls = await ClassModel.findOne({ _id: classId, user: req.user._id });
    if (!cls) throw new HttpError(404, "Class not found.");
    const students = await Student.find({ class: classId, user: req.user._id }).lean();
    if (!students.length) {
      throw new HttpError(400, "Add students to this class before importing attendance from an image.");
    }

    let text = "";
    try {
      text = await runOcr(req.file.path);
    } catch (err) {
      throw new HttpError(
        err.status || 500,
        "The image could not be read. Try a clearer photo of the attendance sheet, or enter attendance manually."
      );
    }

    if (!String(text).trim()) {
      throw new HttpError(
        422,
        "No text was detected in this image. Use a well-lit, unblurred photo of the sheet, then review results before saving."
      );
    }

    const extracted = extractCandidates(text);
    const matches = matchStudents(extracted, students);
    res.json({
      ocrText: text,
      rows: matches,
      message: "Review the detected students. Nothing is saved until you confirm attendance.",
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { importFromImage };
