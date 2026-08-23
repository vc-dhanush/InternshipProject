const mongoose = require("mongoose");

const seminarRecordSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    seminar: { type: mongoose.Schema.Types.ObjectId, ref: "Seminar", required: true, index: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "ClassModel", required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    participation: { type: String, enum: ["yes", "no", "partial", ""], default: "" },
    obtainedMarks: { type: Number, default: null },
    remarks: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

seminarRecordSchema.index({ seminar: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("SeminarRecord", seminarRecordSchema);
