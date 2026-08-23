const mongoose = require("mongoose");

const attendanceRecordSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: "AttendanceSession", required: true, index: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "ClassModel", required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    status: { type: String, enum: ["present", "absent"], required: true },
  },
  { timestamps: true }
);

attendanceRecordSchema.index({ session: 1, student: 1 }, { unique: true });
attendanceRecordSchema.index({ student: 1, class: 1 });

module.exports = mongoose.model("AttendanceRecord", attendanceRecordSchema);
