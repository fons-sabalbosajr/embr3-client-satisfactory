import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendVerificationEmail = async (to, name, link) => {
  return transporter.sendMail({
    from: `"EMB Region III Online CSM Portal" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Verify your email address",
    html: `
      <h2>Hello, ${name}</h2>
      <p>Thank you for signing up for the <strong>EMB Region III Online Customer Satisfaction Measurement (Admin Portal)</strong>.</p>
      <p>Please verify your email by clicking the button below:</p>
      <p style="text-align: center;">
        <a href="${link}" style="
          padding: 10px 20px;
          background-color: #1890ff;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          font-weight: bold;
        ">Verify Email</a>
      </p>
      <p>If you didn’t request this, you can ignore this email.</p>
    `,
  });
};

export const sendResetPasswordEmail = async (to, name, resetLink) => {
  return transporter.sendMail({
    from: `"EMB Region III Online CSM Portal" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Password Reset Request",
    html: `
      <p>Hi ${name},</p>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <p style="text-align: center;">
        <a href="${resetLink}" style="
          padding: 10px 20px;
          background-color: #1890ff;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          font-weight: bold;
        ">Reset Password</a>
      </p>
      <p>If you didn’t request this, just ignore this email.</p>
    `,
  });
};
