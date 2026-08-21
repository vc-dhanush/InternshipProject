const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "ClassModel", required: true, index: true },
    rollNo: { type: String, required: true, trim: true },
    studentId: { type: String, required: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    phone: { type: String, default: "", trim: true },
    profilePicture: { type: String, default: "" },
  },
  { timestamps: true }
);

studentSchema.index({ class: 1, rollNo: 1 }, { unique: true });
studentSchema.index({ class: 1, studentId: 1 }, { unique: true });
studentSchema.index({ user: 1, name: 1 });

module.exports = mongoose.model("Student", studentSchema);
