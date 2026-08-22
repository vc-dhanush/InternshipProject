const ClassModel = require("../models/Class");
const Student = require("../models/Student");
const { HttpError } = require("../utils/httpError");
const { runOcr, extractCandidates, classifyImportRows } = require("../services/ocrService");

async function previewStudents(req, res, next) {
  try {
    if (!req.file) throw new HttpError(400, "Please upload an image of a student list.");
    const classId = req.body.classId || req.query.classId;
    if (!classId) throw new HttpError(400, "Select a class before importing students.");
    const cls = await ClassModel.findOne({ _id: classId, user: req.user._id });
    if (!cls) throw new HttpError(404, "Class not found.");

    let ocr;
    try {
      ocr = await runOcr(req.file.path);
    } catch (err) {
      throw new HttpError(
        err.status || 500,
        "The image could not be read. Try a clearer photo of the student list."
      );
    }

    const text = ocr.text || ocr;
    const confidence = typeof ocr === "object" ? ocr.confidence : null;
    if (!String(text).trim()) {
      throw new HttpError(
        422,
        "No text was detected in this image. Use a well-lit, unblurred photo, then review results before importing."
      );
    }

    const existing = await Student.find({ class: classId, user: req.user._id, archived: { $ne: true } }).lean();
    const extracted = extractCandidates(text);
    const rows = classifyImportRows(extracted, existing, confidence);

    res.json({
      ocrText: text,
      ocrConfidence: confidence,
      rows,
      message: "Review extracted students. Nothing is saved until you import selected rows.",
    });
  } catch (err) {
    next(err);
  }
}

async function importStudents(req, res, next) {
  try {
    const classId = req.body?.classId;
    const rows = req.body?.students;
    if (!classId) throw new HttpError(400, "Class is required.");
    if (!Array.isArray(rows) || !rows.length) {
      throw new HttpError(400, "Select at least one student to import.");
    }
    const cls = await ClassModel.findOne({ _id: classId, user: req.user._id });
    if (!cls) throw new HttpError(404, "Class not found.");

    const existing = await Student.find({ class: classId, user: req.user._id, archived: { $ne: true } }).lean();
    const existingIds = new Set(existing.map((s) => String(s.studentId).toLowerCase()));
    const existingRolls = new Set(existing.map((s) => String(s.rollNo).toLowerCase()));

    const created = [];
    const skipped = [];
    for (const row of rows) {
      if (row.selected === false) {
        skipped.push({ studentId: row.studentId, reason: "deselected" });
        continue;
      }
      const name = String(row.name || "").trim();
      const studentId = String(row.studentId || "").trim();
      if (!name || !studentId) {
        skipped.push({ studentId, reason: "incomplete" });
        continue;
      }
      const key = studentId.toLowerCase();
      if (existingIds.has(key) || existingRolls.has(key)) {
        skipped.push({ studentId, reason: "duplicate" });
        continue;
      }
      try {
        const student = await Student.create({
          user: req.user._id,
          class: classId,
          name,
          studentId,
          rollNo: String(row.rollNo || studentId).trim(),
          archived: false,
        });
        existingIds.add(key);
        existingRolls.add(String(student.rollNo).toLowerCase());
        created.push({ id: student._id, name: student.name, studentId: student.studentId });
      } catch (e) {
        if (e.code === 11000) skipped.push({ studentId, reason: "duplicate" });
        else throw e;
      }
    }

    res.status(201).json({
      imported: created.length,
      skipped: skipped.length,
      students: created,
      skippedRows: skipped,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { previewStudents, importStudents, importFromImage: previewStudents };
