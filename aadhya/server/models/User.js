const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    staffId: { type: String, required: true, unique: true, index: true },
    dateOfBirth: { type: Date },
    phone: { type: String, trim: true, default: "" },
    subjectsTaught: { type: [String], default: [] },
    department: { type: String, default: "" },
    designation: { type: String, default: "" },
    profilePicture: { type: String, default: "" },
    lastLoginAt: { type: Date },
    onboardingComplete: { type: Boolean, default: false },
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    fullName: this.fullName,
    email: this.email,
    staffId: this.staffId,
    dateOfBirth: this.dateOfBirth,
    phone: this.phone,
    subjectsTaught: this.subjectsTaught,
    department: this.department,
    designation: this.designation,
    profilePicture: this.profilePicture,
    lastLoginAt: this.lastLoginAt,
    onboardingComplete: this.onboardingComplete,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);
