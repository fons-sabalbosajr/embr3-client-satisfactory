import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Prefer explicit SMTP config if provided; fallback to Gmail service
const getTransport = () => {
  if (process.env.SMTP_HOST) {
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
      },
    });
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const transporter = getTransport();

export const sendVerificationEmail = async (to, name, link) => {
  return transporter.sendMail({
    from: `"EMB Region III Online CSM Portal" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Verify your email address",
    html: `
      <div style="font-family: Poppins, Arial, sans-serif; background:#f6f8fb; padding:24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.08);overflow:hidden;">
          <tr>
            <td style="background:#0b5cab;padding:20px 24px;color:#ffffff;">
              <h1 style="margin:0;font-size:20px;letter-spacing:.3px;">EMB Region III • Online CSM Portal</h1>
              <p style="margin:4px 0 0;opacity:.9;font-size:12px;">Environmental Management Bureau – Region III</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 24px 8px;color:#1a1a1a;">
              <h2 style="margin:0 0 12px;font-size:18px;">Hello, ${name}</h2>
              <p style="margin:0 0 12px;line-height:1.6;">
                Thank you for registering to the <strong>Online Customer Satisfaction Measurement (Admin Portal)</strong>.
                Please confirm your email address to activate your account.
              </p>
              <div style="text-align:center;margin:24px 0;">
                <a href="${link}" style="display:inline-block;background:#1677ff;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Verify Email</a>
              </div>
              <p style="margin:0 0 8px;font-size:12px;color:#595959;">If the button doesn’t work, copy and paste this link into your browser:</p>
              <p style="word-break:break-all;font-size:12px;color:#1677ff;"><a href="${link}" style="color:#1677ff;text-decoration:none;">${link}</a></p>
              <p style="margin:16px 0 0;font-size:12px;color:#8c8c8c;">If you did not initiate this request, please disregard this message.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#fafafa;border-top:1px solid #f0f0f0;padding:16px 24px;color:#8c8c8c;font-size:12px;">
              © ${new Date().getFullYear()} Environmental Management Bureau – Region III. All rights reserved.
            </td>
          </tr>
        </table>
      </div>
    `,
  });
};

export const sendResetPasswordEmail = async (to, name, resetLink) => {
  return transporter.sendMail({
    from: `"EMB Region III Online CSM Portal" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Password Reset Request",
    html: `
      <div style="font-family: Poppins, Arial, sans-serif; background:#f6f8fb; padding:24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.08);overflow:hidden;">
          <tr>
            <td style="background:#d46b08;padding:20px 24px;color:#ffffff;">
              <h1 style="margin:0;font-size:20px;letter-spacing:.3px;">EMB Region III • Online CSM Portal</h1>
              <p style="margin:4px 0 0;opacity:.9;font-size:12px;">Password Security Notification</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 24px 8px;color:#1a1a1a;">
              <h2 style="margin:0 0 12px;font-size:18px;">Hello, ${name}</h2>
              <p style="margin:0 0 12px;line-height:1.6;">
                We received a request to reset your password. If you made this request, please proceed using the button below. This link will expire in 1 hour.
              </p>
              <div style="text-align:center;margin:24px 0;">
                <a href="${resetLink}" style="display:inline-block;background:#1677ff;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Reset Password</a>
              </div>
              <p style="margin:0 0 8px;font-size:12px;color:#595959;">If the button doesn’t work, copy and paste this link into your browser:</p>
              <p style="word-break:break-all;font-size:12px;color:#1677ff;"><a href="${resetLink}" style="color:#1677ff;text-decoration:none;">${resetLink}</a></p>
              <p style="margin:16px 0 0;font-size:12px;color:#8c8c8c;">If you did not request this change, no action is needed.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#fafafa;border-top:1px solid #f0f0f0;padding:16px 24px;color:#8c8c8c;font-size:12px;">
              © ${new Date().getFullYear()} Environmental Management Bureau – Region III. All rights reserved.
            </td>
          </tr>
        </table>
      </div>
    `,
  });
};
