import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Prefer explicit SMTP config if provided; fallback to Gmail SMTP if EMAIL_USER/PASS are set
function getTransport() {
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
      pool: true,
      maxConnections: Number(process.env.SMTP_MAX_CONNECTIONS || 3),
      maxMessages: Number(process.env.SMTP_MAX_MESSAGES || 100),
      connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 20000),
      socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 20000),
      greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 20000),
      logger: (String(process.env.SMTP_DEBUG || "").toLowerCase() === "true") || (String(process.env.EMAIL_DEBUG || "").toLowerCase() === "true"),
    });
  }
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    const isGmail = /@gmail\.com$|@googlemail\.com$/i.test(process.env.EMAIL_USER || "");
    const host = process.env.SMTP_HOST || (isGmail ? "smtp.gmail.com" : "smtp.gmail.com");
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
      },
      pool: true,
      maxConnections: Number(process.env.SMTP_MAX_CONNECTIONS || 3),
      maxMessages: Number(process.env.SMTP_MAX_MESSAGES || 100),
      connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 20000),
      socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 20000),
      greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 20000),
      logger: (String(process.env.SMTP_DEBUG || "").toLowerCase() === "true") || (String(process.env.EMAIL_DEBUG || "").toLowerCase() === "true"),
    });
  }
  console.warn("Email transport is not configured: missing EMAIL_USER/EMAIL_PASS or SMTP_HOST.");
  return nodemailer.createTransport({ jsonTransport: true });
}

const transporter = getTransport();

// Unified send helper that uses SMTP unless explicitly configured to use API providers
async function sendMailUnified({ to, subject, html, from }) {
  const sender = from || `${process.env.EMAIL_FROM || "EMB Region III Online CSM Portal"} <${process.env.EMAIL_USER}>`;
  const sgKey = process.env.SENDGRID_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const forceSmtp = String(process.env.FORCE_SMTP || "").toLowerCase() === "true";
  const hasSmtpHints = !!(process.env.SMTP_HOST || process.env.SMTP_PORT || process.env.SMTP_SECURE);

  if (!forceSmtp && !hasSmtpHints && sgKey) {
    const payload = {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER || "no-reply@example.com", name: process.env.EMAIL_FROM || "EMB Region III Online CSM Portal" },
      subject,
      content: [{ type: "text/html", value: html }],
    };
    const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sgKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`SendGrid send failed: ${resp.status} ${resp.statusText} ${text}`);
    }
    return { provider: "sendgrid" };
  }

  if (!forceSmtp && !hasSmtpHints && resendKey) {
    const payload = {
      from: process.env.RESEND_FROM || process.env.EMAIL_USER || "no-reply@example.com",
      to: [to],
      subject,
      html,
    };
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Resend send failed: ${resp.status} ${resp.statusText} ${text}`);
    }
    return { provider: "resend" };
  }

  // SMTP path
  return transporter.sendMail({
    from: sender,
    to,
    subject,
    html,
  });
}

let lastVerify = { ok: false, error: "not-verified" };
(async () => {
  try {
    const forceSmtp = String(process.env.FORCE_SMTP || "").toLowerCase() === "true";
    const hasSmtpHints = !!(process.env.SMTP_HOST || process.env.SMTP_PORT || process.env.SMTP_SECURE || process.env.EMAIL_USER);
    if (!forceSmtp && !hasSmtpHints && (process.env.SENDGRID_API_KEY || process.env.RESEND_API_KEY)) {
      lastVerify = { ok: true };
      console.log("Mail provider configured (API). Ready to send.");
    } else {
      await transporter.verify();
      lastVerify = { ok: true };
      const dbg = (String(process.env.SMTP_DEBUG || "").toLowerCase() === "true") || (String(process.env.EMAIL_DEBUG || "").toLowerCase() === "true");
      if (dbg) {
        console.log(`Mail transporter verified (SMTP): host=${transporter.options.host} port=${transporter.options.port} secure=${transporter.options.secure}`);
      } else {
        console.log("Mail transporter verified and ready (SMTP).");
      }
    }
  } catch (err) {
    lastVerify = { ok: false, error: err?.message || String(err) };
    console.error("Mail transporter verification failed:", err?.message || err);
  }
})();

export const getEmailHealth = async () => {
  try {
    const forceSmtp = String(process.env.FORCE_SMTP || "").toLowerCase() === "true";
    const hasSmtpHints = !!(process.env.SMTP_HOST || process.env.SMTP_PORT || process.env.SMTP_SECURE || process.env.EMAIL_USER);
    if (!forceSmtp && !hasSmtpHints && (process.env.SENDGRID_API_KEY || process.env.RESEND_API_KEY)) {
      lastVerify = { ok: true };
    } else {
      await transporter.verify();
      lastVerify = { ok: true };
    }
  } catch (err) {
    lastVerify = { ok: false, error: err?.message || String(err) };
  }
  return lastVerify;
};

export const sendVerificationEmail = async (to, name, link) => {
  const html = `
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
    `;
  return sendMailUnified({ to, subject: "Verify your email address", html });
};

export const sendResetPasswordEmail = async (to, name, resetLink) => {
  const html = `
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
    `;
  return sendMailUnified({ to, subject: "Password Reset Request", html });
};
