const mongoose = require("mongoose");

const collegeSettingsSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    collegeName: { type: String, default: "YOUR COLLEGE NAME" },
    collegeLogo: { type: String, default: "" },
    collegeAddress: { type: String, default: "" },
    appName: { type: String, default: "Aadhya : attendance tracker" },
    minAttendancePercent: { type: Number, default: 75, min: 0, max: 100 },
    defaultAttendanceStatus: { type: String, enum: ["present", "absent"], default: "present" },
    theme: { type: String, enum: ["light", "dark", "system"], default: "light" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CollegeSettings", collegeSettingsSchema);
