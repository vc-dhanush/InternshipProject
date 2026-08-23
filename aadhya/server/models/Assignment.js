const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "ClassModel", required: true, index: true },
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    assignedDate: { type: String, required: true },
    dueDate: { type: String, required: true },
    maxMarks: { type: Number, required: true, min: 0 },
    completed: { type: Boolean, default: false },
    archived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

assignmentSchema.index({ user: 1, class: 1, dueDate: 1 });

module.exports = mongoose.model("Assignment", assignmentSchema);
