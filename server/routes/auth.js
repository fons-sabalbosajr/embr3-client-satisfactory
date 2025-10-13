import express from "express";
import User from "../models/User.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import {
  sendVerificationEmail,
  sendResetPasswordEmail,
} from "../utils/email.js";
import { requirePermission } from "../middleware/permission.js";

const router = express.Router();

function getFrontendUrl(req) {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  // Use the caller's origin (e.g., Vite dev server) as best-effort default
  const origin = req.headers.origin;
  if (origin) return origin;
  // Fallback to common dev port
  return "http://localhost:5174";
}

// Middleware to verify JWT
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Authentication invalid, no token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, username: payload.username };
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Authentication invalid, token is invalid" });
  }
};

// Get all users (for admin/accounts management)
router.get("/users", authMiddleware, async (req, res) => {
  try {
    const users = await User.find(
      {},
      "_id fullname username email privilege permissions"
    );
    res.json({ data: users });
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/signup", async (req, res) => {
  const { fullname, username, email, password } = req.body;

  try {
    const existing = await User.findOne({ $or: [{ email }, { username }] });

    if (existing && existing.isVerified) {
      return res
        .status(400)
        .json({ message: "Email or username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const newUser = await User.create({
      fullname,
      username,
      email,
      password: hashedPassword,
      verificationToken,
    });

    const verificationLink = `${getFrontendUrl(
      req
    )}/verify?token=${verificationToken}&email=${email}`;

    try {
      await sendVerificationEmail(email, fullname, verificationLink);

      return res.status(201).json({
        message: "Verification email sent. Please check your inbox.",
      });
    } catch (emailErr) {
      console.error("❌ Email sending failed:", emailErr);
      return res.status(500).json({
        message: "User created, but failed to send verification email.",
      });
    }
  } catch (err) {
    console.error("❌ Signup failed:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Email verification
router.get("/verify", async (req, res) => {
  const { token, email } = req.query;
  // console.log("Verification request:", { token, email });

  try {
    const user = await User.findOne({ email });
    // console.log("User found:", user);

    if (!user) {
      return res.status(400).send("Invalid verification link");
    }

    if (user.isVerified) {
      // Already verified, redirect to admin-auth
      return res.redirect(`${getFrontendUrl(req)}/admin-auth`);
    }

    if (user.verificationToken !== token) {
      return res.status(400).send("Invalid verification token");
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    // Redirect to admin-auth after successful verification
    return res.redirect(`${getFrontendUrl(req)}/admin-auth`);
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).send("Server error");
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body; // <-- use username

  try {
    const user = await User.findOne({ username }); // <-- find by username

    if (!user)
      return res.status(400).json({ message: "Invalid username or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid username or password" });

    if (!user.isVerified)
      return res
        .status(403)
        .json({ message: "Please verify your email first." });

    // Optional: Add JWT
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fullname: user.fullname,
        username: user.username,
        email: user.email,
        position: user.position,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({ message: "No account with that email." });

    const token = crypto.randomBytes(32).toString("hex");
    const expiration = Date.now() + 3600000; // 1 hour

    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(expiration);
    await user.save();

    const resetLink = `${getFrontendUrl(
      req
    )}/reset-password?token=${token}&email=${email}`;
    await sendResetPasswordEmail(email, user.fullname, resetLink);

    res.status(200).json({
      message: "Password reset email sent. Please check your inbox.",
    });
  } catch (err) {
    console.error("Forgot Password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/reset-password", async (req, res) => {
  const { email, token, newPassword } = req.body;

  try {
    // Basic server-side validation (defense-in-depth)
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters." });
    }
    // Optional: add simple complexity check (letter and number)
    const hasLetter = /[A-Za-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    if (!(hasLetter && hasNumber)) {
      return res
        .status(400)
        .json({ message: "Password must include letters and numbers." });
    }

    const user = await User.findOne({
      email,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }, // not expired
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful." });
  } catch (err) {
    console.error("Reset Password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update user (admin/accounts management)
router.put(
  "/users/:id",
  authMiddleware,
  requirePermission("canManageUsers"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { fullname, username, privilege } = req.body;
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      user.fullname = fullname ?? user.fullname;
      user.username = username ?? user.username;
      user.privilege = privilege ?? user.privilege;
      // Accept permissions object
      if (req.body.permissions) {
        user.permissions = {
          canCreate: !!req.body.permissions.canCreate,
          canEdit: !!req.body.permissions.canEdit,
          canDelete: !!req.body.permissions.canDelete,
          canManageUsers: !!req.body.permissions.canManageUsers,
          canManageAnnouncements: !!req.body.permissions.canManageAnnouncements,
        };
      }
      await user.save();
      res.json({ message: "User updated successfully", user });
    } catch (err) {
      console.error("Update user error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get current user's preferences
router.get("/preferences", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id, "preferences");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ preferences: user.preferences || {} });
  } catch (err) {
    console.error("Get preferences error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update current user's preferences
router.put("/preferences", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Merge preferences shallowly
    user.preferences = { ...(user.preferences || {}), ...(req.body || {}) };
    await user.save();
    res.json({ preferences: user.preferences });
  } catch (err) {
    console.error("Update preferences error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
