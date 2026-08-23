const mongoose = require("mongoose");

const assignmentMarkSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", required: true, index: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "ClassModel", required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    obtainedMarks: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

assignmentMarkSchema.index({ assignment: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("AssignmentMark", assignmentMarkSchema);
