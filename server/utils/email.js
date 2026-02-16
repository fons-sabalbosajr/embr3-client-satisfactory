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
    const host = envStr("SMTP_HOST") || (isGmail ? "smtp.gmail.com" : "smtp.office365.com");
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

// Retry helper for transient failures
async function withRetry(fn, retries = 2, delayMs = 2000) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const code = err?.responseCode || err?.code;
      // Don't retry on permanent failures (auth, bad address, etc.)
      if (code === 535 || code === 550 || code === 553 || code === 554) throw err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

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

  // SMTP path (with retry for transient failures)
  return withRetry(() =>
    transporter.sendMail({
      from: sender,
      to,
      subject,
      html,
    })
  );
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
        //console.log(`Mail transporter verified (SMTP): host=${transporter.options.host} port=${transporter.options.port} secure=${transporter.options.secure}`);
      } else {
        //console.log("Mail transporter verified and ready (SMTP).");
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
            " - Ensure 2-Step Verification is ENABLED for the account.",
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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** HTML-escape a string to prevent injection in email templates */
function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Escape a URL for safe use in href attributes */
function escapeUrl(url) {
  if (typeof url !== "string") return "";
  if (/^javascript:/i.test(url.trim())) return "#";
  return url.replace(/"/g, "%22").replace(/'/g, "%27");
}

// ─────────────────────────────────────────────────────────────────────────────
// Corporate Email Template System
// ─────────────────────────────────────────────────────────────────────────────
// Colors aligned with EMB Region III / DENR corporate branding

const BRAND = {
  navy:       "#0C2340",
  navyLight:  "#163D64",
  green:      "#1B7A43",
  gold:       "#C8962E",
  blue:       "#1A6FB5",
  bg:         "#F4F6F9",
  cardBg:     "#FFFFFF",
  border:     "#E5E9F0",
  textDark:   "#1A1A2E",
  textMuted:  "#5A6578",
  textLight:  "#8A93A3",
  footerBg:   "#F8F9FB",
};

/**
 * Wraps email body content in a corporate-branded container.
 *
 * @param {object} opts
 * @param {string} opts.headerTitle    - main header text
 * @param {string} [opts.headerSubtitle] - smaller text below the title
 * @param {string} [opts.headerAccent] - header bar color (default: navy)
 * @param {string} opts.body           - inner HTML for the email body
 * @returns {string} complete HTML email
 */
function corporateEmail({ headerTitle, headerSubtitle, headerAccent, body }) {
  const accent = headerAccent || BRAND.navy;
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(headerTitle)}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:'Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BRAND.bg};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;margin:0 auto;background-color:${BRAND.cardBg};border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08),0 4px 16px rgba(0,0,0,.04);">

        <!-- ═══ HEADER ═══ -->
        <tr><td style="background:linear-gradient(135deg,${accent} 0%,${BRAND.navyLight} 100%);padding:28px 32px;">
          <p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,.65);">Republic of the Philippines</p>
          <h1 style="margin:6px 0 0;font-size:20px;font-weight:700;color:#FFFFFF;letter-spacing:.2px;line-height:1.3;">Environmental Management Bureau</h1>
          <p style="margin:2px 0 0;font-size:13px;color:rgba(255,255,255,.85);">Region III &mdash; Central Luzon</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0 0;"><tr><td style="border-top:1px solid rgba(255,255,255,.2);"></td></tr></table>
          <h2 style="margin:14px 0 0;font-size:16px;font-weight:600;color:#FFFFFF;">${escapeHtml(headerTitle)}</h2>
          ${headerSubtitle ? `<p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,.7);">${escapeHtml(headerSubtitle)}</p>` : ""}
        </td></tr>

        <!-- ═══ BODY ═══ -->
        <tr><td style="padding:32px 32px 24px;">${body}</td></tr>

        <!-- ═══ FOOTER ═══ -->
        <tr><td style="background-color:${BRAND.footerBg};border-top:1px solid ${BRAND.border};padding:20px 32px;">
          <p style="margin:0;font-size:11px;color:${BRAND.textLight};line-height:1.6;">Online Customer Satisfaction Measurement Portal</p>
          <p style="margin:4px 0 0;font-size:11px;color:${BRAND.textLight};line-height:1.6;">&copy; ${year} Environmental Management Bureau &mdash; Region III. All rights reserved.</p>
        </td></tr>

      </table>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;margin:12px auto 0;">
        <tr><td align="center"><p style="margin:0;font-size:11px;color:${BRAND.textLight};">This is an automated message. Please do not reply directly to this email.</p></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Builds a CTA button row */
function ctaButton(href, label, color) {
  const safeHref = escapeUrl(href);
  const c = color || BRAND.blue;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0;"><tr><td align="center">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeHref}" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="14%" strokecolor="${c}" fillcolor="${c}"><w:anchorlock/><center style="color:#ffffff;font-family:'Inter','Segoe UI',sans-serif;font-size:14px;font-weight:600;">${escapeHtml(label)}</center></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="${safeHref}" target="_blank" style="display:inline-block;background-color:${c};color:#FFFFFF;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:600;letter-spacing:.3px;line-height:20px;">${escapeHtml(label)}</a><!--<![endif]-->
  </td></tr></table>`;
}

/** Builds a fallback-link row shown below the CTA button */
function fallbackLink(href) {
  const safeHref = escapeUrl(href);
  return `<p style="margin:0 0 4px;font-size:12px;color:${BRAND.textMuted};">If the button above doesn&rsquo;t work, copy and paste this link into your browser:</p>
  <p style="margin:0;font-size:12px;word-break:break-all;"><a href="${safeHref}" style="color:${BRAND.blue};text-decoration:none;">${escapeHtml(href)}</a></p>`;
}

/** Builds a colored info/alert box */
function infoBox(bgColor, borderColor, innerHtml) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 4px;">
    <tr><td style="background-color:${bgColor};border-left:4px solid ${borderColor};border-radius:4px;padding:14px 16px;">${innerHtml}</td></tr>
  </table>`;
}

/** Horizontal rule separator */
function separator() {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 0;">
    <tr><td style="border-top:1px solid ${BRAND.border};padding-top:16px;"></td></tr>
  </table>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Email Templates
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Email Verification — sent after signup.
 */
export const sendVerificationEmail = async (to, name, link) => {
  const safeName = escapeHtml(name);
  const safeLink = escapeUrl(link);

  const body = `
    <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:${BRAND.textDark};">Hello, ${safeName}</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:${BRAND.textMuted};">
      Thank you for registering to the <strong style="color:${BRAND.textDark};">Online Customer Satisfaction Measurement Portal</strong> (Admin Panel).
      Please verify your email address to activate your account.
    </p>
    ${infoBox("#F0F7FF", BRAND.blue, `
      <p style="margin:0;font-size:13px;color:${BRAND.textMuted};line-height:1.6;">
        <strong style="color:${BRAND.textDark};">What happens next?</strong><br>
        After verifying, you can log in and begin managing surveys, viewing reports, and configuring your organization&rsquo;s data.
      </p>
    `)}
    ${ctaButton(safeLink, "Verify Email Address", BRAND.green)}
    ${fallbackLink(link)}
    ${separator()}
    <p style="margin:0;font-size:12px;color:${BRAND.textLight};line-height:1.6;">
      If you did not create an account, you can safely ignore this email. This link will remain valid for 24 hours.
    </p>`;

  const html = corporateEmail({
    headerTitle: "Email Verification",
    headerSubtitle: "Account Activation Request",
    body,
  });

  return sendMailUnified({
    to,
    subject: "Verify Your Email \u2014 EMB Region III Online CSM Portal",
    html,
  });
};

/**
 * Password Reset — sent when a user clicks "Forgot Password".
 */
export const sendResetPasswordEmail = async (to, name, resetLink) => {
  const safeName = escapeHtml(name);
  const safeLink = escapeUrl(resetLink);

  const body = `
    <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:${BRAND.textDark};">Hello, ${safeName}</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:${BRAND.textMuted};">
      We received a request to reset the password associated with your account.
      If you did not initiate this request, no action is needed &mdash; your account remains secure.
    </p>
    ${infoBox("#FFF8F0", BRAND.gold, `
      <p style="margin:0;font-size:13px;color:${BRAND.textMuted};line-height:1.6;">
        <strong style="color:#8B6914;">\u23F1 This link expires in 1 hour.</strong><br>
        For security purposes, this password reset link can only be used once and will expire 60 minutes after it was requested.
      </p>
    `)}
    ${ctaButton(safeLink, "Reset My Password", BRAND.gold)}
    ${fallbackLink(resetLink)}
    ${separator()}
    <p style="margin:0;font-size:12px;color:${BRAND.textLight};line-height:1.6;">
      If you didn&rsquo;t request a password reset, please disregard this email. Your password will remain unchanged.
    </p>`;

  const html = corporateEmail({
    headerTitle: "Password Reset Request",
    headerSubtitle: "Security Notification",
    headerAccent: BRAND.navyLight,
    body,
  });

  return sendMailUnified({
    to,
    subject: "Password Reset \u2014 EMB Region III Online CSM Portal",
    html,
  });
};

/**
 * Password Changed Confirmation — sent after a successful password change.
 * Call this after reset-password or admin-initiated password change.
 */
export const sendPasswordChangedEmail = async (to, name) => {
  const safeName = escapeHtml(name);
  const timestamp = new Date().toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "long",
    timeStyle: "short",
  });

  const body = `
    <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:${BRAND.textDark};">Hello, ${safeName}</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:${BRAND.textMuted};">
      This is to confirm that the password for your account was successfully changed.
    </p>
    ${infoBox("#F0FFF4", BRAND.green, `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr><td style="padding:0 0 6px;"><p style="margin:0;font-size:13px;color:${BRAND.textMuted};"><strong style="color:${BRAND.textDark};">Account:</strong> ${escapeHtml(to)}</p></td></tr>
        <tr><td><p style="margin:0;font-size:13px;color:${BRAND.textMuted};"><strong style="color:${BRAND.textDark};">Changed at:</strong> ${escapeHtml(timestamp)} (Philippine Time)</p></td></tr>
      </table>
    `)}
    ${infoBox("#FFF1F0", "#CF1322", `
      <p style="margin:0;font-size:13px;color:${BRAND.textMuted};line-height:1.6;">
        <strong style="color:#CF1322;">Didn&rsquo;t make this change?</strong><br>
        If you did not change your password, your account may have been compromised. Please contact your system administrator immediately.
      </p>
    `)}`;

  const html = corporateEmail({
    headerTitle: "Password Changed Successfully",
    headerSubtitle: "Security Confirmation",
    headerAccent: BRAND.green,
    body,
  });

  return sendMailUnified({
    to,
    subject: "Password Changed \u2014 EMB Region III Online CSM Portal",
    html,
  });
};

/**
 * Account Approved/Activated — sent by admin when user's role is elevated.
 */
export const sendAccountApprovedEmail = async (to, name, loginUrl) => {
  const safeName = escapeHtml(name);
  const safeLink = escapeUrl(loginUrl);

  const body = `
    <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:${BRAND.textDark};">Hello, ${safeName}</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:${BRAND.textMuted};">
      Your account on the <strong style="color:${BRAND.textDark};">Online Customer Satisfaction Measurement Portal</strong>
      has been approved by an administrator. You now have access to the admin panel.
    </p>
    ${infoBox("#F0F7FF", BRAND.blue, `
      <p style="margin:0;font-size:13px;color:${BRAND.textMuted};line-height:1.6;">
        <strong style="color:${BRAND.textDark};">What can you do?</strong><br>
        View survey results, generate reports, manage data configurations, and more &mdash; depending on the permissions assigned to you.
      </p>
    `)}
    ${ctaButton(safeLink, "Go to Admin Panel", BRAND.blue)}
    ${separator()}
    <p style="margin:0;font-size:12px;color:${BRAND.textLight};line-height:1.6;">
      If you have questions about your access level, please contact your system administrator.
    </p>`;

  const html = corporateEmail({
    headerTitle: "Account Approved",
    headerSubtitle: "Welcome to the Admin Panel",
    body,
  });

  return sendMailUnified({
    to,
    subject: "Account Approved \u2014 EMB Region III Online CSM Portal",
    html,
  });
};

/**
 * Test/Diagnostic Email — sent from admin panel to verify SMTP configuration.
 */
export const sendTestEmail = async (to) => {
  const timestamp = new Date().toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "long",
    timeStyle: "short",
  });

  const body = `
    <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:${BRAND.textDark};">Email Configuration Test</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:${BRAND.textMuted};">
      This email confirms that the SMTP / email transport for the
      <strong style="color:${BRAND.textDark};">Online CSM Portal</strong> is configured and working correctly.
    </p>
    ${infoBox("#F0F7FF", BRAND.blue, `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr><td style="padding:0 0 6px;"><p style="margin:0;font-size:13px;color:${BRAND.textMuted};"><strong style="color:${BRAND.textDark};">Sent to:</strong> ${escapeHtml(to)}</p></td></tr>
        <tr><td style="padding:0 0 6px;"><p style="margin:0;font-size:13px;color:${BRAND.textMuted};"><strong style="color:${BRAND.textDark};">Timestamp:</strong> ${escapeHtml(timestamp)} (PHT)</p></td></tr>
        <tr><td><p style="margin:0;font-size:13px;color:${BRAND.textMuted};"><strong style="color:${BRAND.textDark};">Transport:</strong> ${escapeHtml(envStr("SMTP_HOST") || "default")}:${escapeHtml(envStr("SMTP_PORT") || "587")}</p></td></tr>
      </table>
    `)}
    <p style="margin:16px 0 0;font-size:13px;color:${BRAND.textLight};">
      If you received this email, your mail configuration is working. No further action is required.
    </p>`;

  const html = corporateEmail({
    headerTitle: "SMTP Configuration Test",
    headerSubtitle: "Administration Diagnostic",
    headerAccent: BRAND.blue,
    body,
  });

  return sendMailUnified({
    to,
    subject: "Test Email \u2014 EMB Region III Online CSM Portal",
    html,
  });
};
