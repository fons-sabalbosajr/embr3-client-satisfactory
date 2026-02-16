import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  privilege: { type: String, default: "viewer" }, // Add privilege field
  permissions: {
    type: {
      canCreate: { type: Boolean, default: false },
      canEdit: { type: Boolean, default: false },
      canDelete: { type: Boolean, default: false },
  canManageUsers: { type: Boolean, default: false },
  canManageAnnouncements: { type: Boolean, default: false },
    },
    default: {},
  },
  position: { type: String },
  verificationToken: { type: String, select: false },
  isVerified: { type: Boolean, default: false },
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false },
  preferences: {
    type: Object,
    default: {},
  },
});

export default mongoose.model("User", userSchema);
