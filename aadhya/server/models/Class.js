const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    section: { type: String, default: "", trim: true },
    academicYear: { type: String, default: "", trim: true },
    semester: { type: String, default: "", trim: true },
    subject: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

classSchema.index({ user: 1, name: 1, subject: 1 });

module.exports = mongoose.model("ClassModel", classSchema);
