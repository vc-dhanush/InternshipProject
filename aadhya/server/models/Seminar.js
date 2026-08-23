const mongoose = require("mongoose");

const seminarSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "ClassModel", required: true, index: true },
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    date: { type: String, required: true },
    time: { type: String, default: "" },
    venue: { type: String, default: "", trim: true },
    maxMarks: { type: Number, default: 0, min: 0 },
    archived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

seminarSchema.index({ user: 1, class: 1, date: 1 });

module.exports = mongoose.model("Seminar", seminarSchema);
