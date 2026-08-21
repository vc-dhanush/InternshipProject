const mongoose = require("mongoose");

const markSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    test: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true, index: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "ClassModel", required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    obtainedMarks: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

markSchema.index({ test: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("Mark", markSchema);
