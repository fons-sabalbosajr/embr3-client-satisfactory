import express from "express";
import User from "../models/User.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { sendVerificationEmail } from "../utils/email.js";

const router = express.Router();
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

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

    const verificationLink = `${frontendUrl}/verify?token=${verificationToken}&email=${email}`;

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
  console.log("Verification request:", { token, email });

  try {
    const user = await User.findOne({ email });
    console.log("User found:", user);

    if (!user) {
      return res.status(400).send("Invalid verification link");
    }

    if (user.isVerified) {
      // Already verified, redirect to admin-auth
      return res.redirect(`${process.env.FRONTEND_URL}/admin-auth`);
    }

    if (user.verificationToken !== token) {
      return res.status(400).send("Invalid verification token");
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    // Redirect to admin-auth after successful verification
    return res.redirect(`${process.env.FRONTEND_URL}/admin-auth`);
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
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
