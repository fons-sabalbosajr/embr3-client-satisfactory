import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Safe accessors to avoid stray whitespace from .env copy/paste
const envStr = (name, fallback = undefined) => {
  const v = process.env[name];
  if (typeof v !== "string" || v.length === 0) return fallback;
  return v.trim();
};

// Prefer explicit SMTP config if provided; fallback to Gmail SMTP if EMAIL_USER/PASS are set
function getTransport() {
  if (envStr("SMTP_HOST")) {
    const port = Number(envStr("SMTP_PORT", 587));
    const secure = String(envStr("SMTP_SECURE", "false")).toLowerCase() === "true";
    return nodemailer.createTransport({
      host: envStr("SMTP_HOST"),
      port,
      secure,
      auth: {
        user: envStr("SMTP_USER") || envStr("EMAIL_USER"),
        pass: envStr("SMTP_PASS") || envStr("EMAIL_PASS"),
      },
      pool: true,
      maxConnections: Number(envStr("SMTP_MAX_CONNECTIONS", 3)),
      maxMessages: Number(envStr("SMTP_MAX_MESSAGES", 100)),
      connectionTimeout: Number(envStr("SMTP_CONNECTION_TIMEOUT", 20000)),
      socketTimeout: Number(envStr("SMTP_SOCKET_TIMEOUT", 20000)),
      greetingTimeout: Number(envStr("SMTP_GREETING_TIMEOUT", 20000)),
      logger: (String(envStr("SMTP_DEBUG", "")).toLowerCase() === "true") || (String(envStr("EMAIL_DEBUG", "")).toLowerCase() === "true"),
    });
  }
  if (envStr("EMAIL_USER") && envStr("EMAIL_PASS")) {
    const isGmail = /@gmail\.com$|@googlemail\.com$/i.test(envStr("EMAIL_USER") || "");
    const host = envStr("SMTP_HOST") || (isGmail ? "smtp.gmail.com" : "smtp.gmail.com");
    const port = Number(envStr("SMTP_PORT", 587));
    const secure = String(envStr("SMTP_SECURE", "false")).toLowerCase() === "true";
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: envStr("SMTP_USER") || envStr("EMAIL_USER"),
        pass: envStr("SMTP_PASS") || envStr("EMAIL_PASS"),
      },
      pool: true,
      maxConnections: Number(envStr("SMTP_MAX_CONNECTIONS", 3)),
      maxMessages: Number(envStr("SMTP_MAX_MESSAGES", 100)),
      connectionTimeout: Number(envStr("SMTP_CONNECTION_TIMEOUT", 20000)),
      socketTimeout: Number(envStr("SMTP_SOCKET_TIMEOUT", 20000)),
      greetingTimeout: Number(envStr("SMTP_GREETING_TIMEOUT", 20000)),
      logger: (String(envStr("SMTP_DEBUG", "")).toLowerCase() === "true") || (String(envStr("EMAIL_DEBUG", "")).toLowerCase() === "true"),
    });
  }
  console.warn("Email transport is not configured: missing EMAIL_USER/EMAIL_PASS or SMTP_HOST.");
  return nodemailer.createTransport({ jsonTransport: true });
}

const transporter = getTransport();

// Unified send helper that uses SMTP unless explicitly configured to use API providers
async function sendMailUnified({ to, subject, html, from }) {
  const sender = from || `${envStr("EMAIL_FROM", "EMB Region III Online CSM Portal")} <${envStr("EMAIL_USER")}>`;
  const sgKey = envStr("SENDGRID_API_KEY");
  const resendKey = envStr("RESEND_API_KEY");
  const forceSmtp = String(envStr("FORCE_SMTP", "")).toLowerCase() === "true";
  const hasSmtpHints = !!(envStr("SMTP_HOST") || envStr("SMTP_PORT") || envStr("SMTP_SECURE"));

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
    const forceSmtp = String(envStr("FORCE_SMTP", "")).toLowerCase() === "true";
    const hasSmtpHints = !!(envStr("SMTP_HOST") || envStr("SMTP_PORT") || envStr("SMTP_SECURE") || envStr("EMAIL_USER"));
    if (!forceSmtp && !hasSmtpHints && (envStr("SENDGRID_API_KEY") || envStr("RESEND_API_KEY"))) {
      lastVerify = { ok: true };
      console.log("Mail provider configured (API). Ready to send.");
    } else {
      // Quick sanity checks for Gmail App Password usage
      const u = envStr("SMTP_USER") || envStr("EMAIL_USER") || "";
      const p = envStr("SMTP_PASS") || envStr("EMAIL_PASS") || "";
      if (/@gmail\.com$|@googlemail\.com$/i.test(u)) {
        if (p && p.length !== 16) {
          console.warn("EMAIL_PASS length is not 16 characters. For Gmail App Passwords, it should be exactly 16.");
        }
      }
      await transporter.verify();
      lastVerify = { ok: true };
      const dbg = (String(envStr("SMTP_DEBUG", "")).toLowerCase() === "true") || (String(envStr("EMAIL_DEBUG", "")).toLowerCase() === "true");
      if (dbg) {
        console.log(`Mail transporter verified (SMTP): host=${transporter.options.host} port=${transporter.options.port} secure=${transporter.options.secure}`);
      } else {
        console.log("Mail transporter verified and ready (SMTP).");
      }
    }
  } catch (err) {
    lastVerify = { ok: false, error: err?.message || String(err) };
    console.error("Mail transporter verification failed:", err?.message || err);
    try {
      const isGmailUser = /@gmail\.com$|@googlemail\.com$/i.test(envStr("EMAIL_USER") || "");
      const msg = String(err?.message || "");
      const code = err?.responseCode || err?.code;
      if (isGmailUser && (code === 535 || /Username and Password not accepted/i.test(msg))) {
        console.warn(
          [
            "Gmail SMTP authentication failed. Action items:",
            " - Ensure 2‑Step Verification is ENABLED for the account.",
            " - Create a Gmail App Password (Security > App passwords) and use it as EMAIL_PASS.",
            " - Remove any spaces/quotes; the app password is 16 characters.",
            " - If recently changed, visit https://accounts.google.com/DisplayUnlockCaptcha to unlock new SMTP access and retry within 10 minutes.",
            " - If on Google Workspace, your admin may need to allow app passwords or set up SMTP relay (smtp-relay.gmail.com).",
          ].join("\n")
        );
      }
    } catch (_) {
      // best-effort guidance only
    }
  }
})();

export const getEmailHealth = async () => {
  try {
    const forceSmtp = String(envStr("FORCE_SMTP", "")).toLowerCase() === "true";
    const hasSmtpHints = !!(envStr("SMTP_HOST") || envStr("SMTP_PORT") || envStr("SMTP_SECURE") || envStr("EMAIL_USER"));
    if (!forceSmtp && !hasSmtpHints && (envStr("SENDGRID_API_KEY") || envStr("RESEND_API_KEY"))) {
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
