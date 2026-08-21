const mongoose = require("mongoose");

const attendanceSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "ClassModel", required: true, index: true },
    subject: { type: String, required: true, trim: true },
    date: { type: String, required: true, index: true },
    time: { type: String, required: true },
    sessionCode: { type: String, required: true, unique: true, index: true },
    presentCount: { type: Number, default: 0 },
    absentCount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    source: { type: String, enum: ["manual", "ocr"], default: "manual" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

attendanceSessionSchema.index({ user: 1, class: 1, date: 1 });

module.exports = mongoose.model("AttendanceSession", attendanceSessionSchema);
