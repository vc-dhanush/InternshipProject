const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    section: { type: String, default: "", trim: true },
    academicYear: { type: String, default: "", trim: true },
    semester: { type: String, default: "", trim: true },
    subject: { type: String, required: true, trim: true },
    archived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

classSchema.index({ user: 1, archived: 1, createdAt: -1 });
classSchema.index(
  { user: 1, name: 1, section: 1, subject: 1, academicYear: 1 },
  { unique: true, partialFilterExpression: { archived: false } }
);

module.exports = mongoose.model("ClassModel", classSchema);
