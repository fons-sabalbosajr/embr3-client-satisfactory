import express from "express";
import User from "../models/User.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken"; 
import { sendVerificationEmail } from "../utils/email.js";

const router = express.Router();

router.post("/signup", async (req, res) => {
  const { fullname, email, password } = req.body;

  try {
    const existing = await User.findOne({ email });

    if (existing && existing.isVerified) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const newUser = await User.create({
      fullname,
      email,
      password: hashedPassword,
      verificationToken,
    });

    const verificationLink = `http://localhost:5173/verify?token=${verificationToken}&email=${email}`;

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

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid verification link" });
    }

    if (user.isVerified) {
      return res.status(200).json({ message: "Email already verified" });
    }

    if (user.verificationToken !== token) {
      return res.status(400).json({ message: "Invalid verification token" });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    return res.status(200).json({ message: "Email verified successfully" });
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });

    if (!user.isVerified)
      return res.status(403).json({ message: "Please verify your email first." });

    // Optional: Add JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fullname: user.fullname,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


export default router;
