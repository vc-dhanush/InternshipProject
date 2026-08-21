const mongoose = require("mongoose");

const testSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "ClassModel", required: true, index: true },
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    totalMarks: { type: Number, required: true, min: 1 },
    passPercent: { type: Number, default: 40, min: 0, max: 100 },
  },
  { timestamps: true }
);

testSchema.index({ user: 1, class: 1, date: 1 });

module.exports = mongoose.model("Test", testSchema);
