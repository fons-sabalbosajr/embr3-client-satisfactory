// Staff sign-in page (/admin when signed out): Sign in, Create account and
// Forgot password, in the same look as the client survey (AuthLayout).
//
// Results and errors are shown inline in the card rather than in pop-ups, so
// the person can read the message and correct the form without losing it.

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Alert, Button, Form, Input } from "antd";
import {
  LockOutlined,
  MailOutlined,
  UserOutlined,
  IdcardOutlined,
  SafetyCertificateOutlined,
  KeyOutlined,
  UserAddOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import AuthLayout from "../../components/AuthLayout/AuthLayout";
import { describeError } from "../../components/StatusUI/describeError";
import { signUp, login, forgotPassword, resendVerification } from "../../services/api";
import { setOpaqueItem, setEncryptedItem } from "../../utils/encryptedStorage";
import { formatEndsAt } from "../../utils/maintenance";

// Rough strength score 0–4 for the sign-up password meter.
function passwordScore(pw = "") {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}
const STRENGTH_LABEL = ["Too short", "Weak", "Fair", "Good", "Strong"];

const errorText = (err, fallback) => {
  const info = describeError(err);
  // For a 401 on the login form, "session ended" would be wrong.
  if (info.variant === "unauthorized") return err?.response?.data?.message || fallback;
  return info.message || fallback;
};

function HomeAdmin({ toggleColorScheme, colorScheme, maintenance = {} }) {
  const underMaintenance = !!maintenance.enabled;
  const location = useLocation();
  const navigate = useNavigate();
  const [view, setView] = useState("login"); // login | signup | forgot
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null); // { type, message, description, actions }
  const [loginForm] = Form.useForm();
  const [signupForm] = Form.useForm();
  const [forgotForm] = Form.useForm();
  const signupPassword = Form.useWatch("password", signupForm) || "";
  const score = useMemo(() => passwordScore(signupPassword), [signupPassword]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("verified") === "true") {
      setView("login");
      setNotice({ type: "success", message: "Email verified", description: "You can now sign in with your username and password." });
    }
  }, [location.search]);

  // No new accounts during maintenance.
  useEffect(() => {
    if (underMaintenance && view === "signup") setView("login");
  }, [underMaintenance, view]);

  const switchView = (next) => {
    setNotice(null);
    setView(next);
  };

  const handleLogin = async ({ username, password }) => {
    setLoading(true);
    setNotice(null);
    try {
      const res = await login({ username: username.trim(), password });
      setOpaqueItem("token", res.data.token);
      setEncryptedItem("user", JSON.stringify(res.data.user));
      try {
        window.dispatchEvent(new Event("auth:changed"));
      } catch {
        /* ignore */
      }
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      const maint = err?.response?.data?.code === "maintenance";
      setNotice({
        type: maint ? "warning" : "error",
        message: maint ? "Sign-in is paused for maintenance" : "Couldn't sign you in",
        description: maint
          ? err.response.data.message
          : errorText(err, "The username or password is incorrect."),
      });
      loginForm.setFieldValue("password", "");
    } finally {
      setLoading(false);
    }
  };

  const resend = async (email) => {
    setLoading(true);
    try {
      await resendVerification({ email });
      setNotice({
        type: "success",
        message: "Verification email sent again",
        description: `We sent a new verification link to ${email}. Check your inbox and spam folder.`,
      });
    } catch (err) {
      setNotice({
        type: "error",
        message: "Email delivery issue",
        description: errorText(err, "We couldn't send the verification email right now. Please try again later."),
      });
    } finally {
      setLoading(false);
    }
  };

  const verificationNotice = (email, message) => ({
    type: "success",
    message: "Check your email",
    description: message || `We sent a verification link to ${email}. Open it to activate your account, then sign in.`,
    actions: (
      <div className="auth-row" style={{ margin: "10px 0 0" }}>
        <a className="auth-link" href="https://mail.google.com" target="_blank" rel="noopener noreferrer">
          Open Gmail
        </a>
        <button type="button" className="auth-link" onClick={() => resend(email)}>
          Resend email
        </button>
      </div>
    ),
  });

  const handleSignup = async ({ fullname, username, email, password }) => {
    setLoading(true);
    setNotice(null);
    try {
      const res = await signUp({ fullname: fullname.trim(), username: username.trim(), email: email.trim(), password });
      signupForm.resetFields();
      setView("login");
      setNotice(verificationNotice(email, res.data?.message));
    } catch (err) {
      console.error("Signup error:", err);
      const msg = err.response?.data?.message || "";
      // The account can be created even when the email fails; retry it once.
      if (msg.includes("User created, but failed to send verification email")) {
        try {
          await resendVerification({ email });
          signupForm.resetFields();
          setView("login");
          setNotice(verificationNotice(email));
        } catch (resendErr) {
          setNotice({
            type: "warning",
            message: "Account created, but the email didn't send",
            description: errorText(resendErr, "Try “Resend email” in a few minutes or contact the system administrator."),
            actions: (
              <div className="auth-row" style={{ margin: "10px 0 0" }}>
                <button type="button" className="auth-link" onClick={() => resend(email)}>Resend email</button>
              </div>
            ),
          });
        }
      } else {
        setNotice({ type: "error", message: "Couldn't create the account", description: errorText(err, "Something went wrong. Please try again.") });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async ({ email }) => {
    setLoading(true);
    setNotice(null);
    try {
      const res = await forgotPassword(email.trim());
      forgotForm.resetFields();
      setNotice({
        type: "success",
        message: "Reset link sent",
        description: res.data?.message || `If ${email} is registered, a password reset link is on its way. It expires after a short time.`,
      });
    } catch (err) {
      console.error("Forgot Password error:", err);
      setNotice({ type: "error", message: "Couldn't send the reset email", description: errorText(err, "Please try again in a moment.") });
    } finally {
      setLoading(false);
    }
  };

  const heading = {
    login: underMaintenance
      ? { icon: <ToolOutlined />, title: "Developer sign-in", subtitle: "The system is under maintenance. Developer accounts can still sign in." }
      : { icon: <SafetyCertificateOutlined />, title: "Administration Panel", subtitle: "Sign in to manage surveys, reports and system settings." },
    signup: { icon: <UserAddOutlined />, title: "Create a staff account", subtitle: "New accounts are verified by email and activated by an administrator." },
    forgot: { icon: <KeyOutlined />, title: "Reset your password", subtitle: "Enter the email address on your account and we'll send you a reset link." },
  }[view];

  const noticeBox = notice && (
    <Alert
      type={notice.type}
      showIcon
      message={notice.message}
      description={
        <>
          {notice.description}
          {notice.actions}
        </>
      }
      closable
      onClose={() => setNotice(null)}
      role={notice.type === "error" ? "alert" : "status"}
    />
  );

  return (
    <AuthLayout
      icon={heading.icon}
      title={heading.title}
      subtitle={heading.subtitle}
      colorScheme={colorScheme}
      toggleColorScheme={toggleColorScheme}
      footer={
        view === "forgot" ? (
          <>
            Remembered it?{" "}
            <button type="button" className="auth-link" onClick={() => switchView("login")}>Back to sign in</button>
          </>
        ) : (
          <>For staff of EMB Region III only. Clients answer the survey without an account.</>
        )
      }
    >
      {underMaintenance && (
        <Alert
          type="warning"
          showIcon
          icon={<ToolOutlined />}
          message="Maintenance in progress"
          description={`Only developer accounts can sign in right now.${maintenance.endsAt ? ` Expected back by ${formatEndsAt(maintenance.endsAt)}.` : ""}`}
          style={{ marginBottom: 16 }}
        />
      )}

      {view !== "forgot" && !underMaintenance && (
        <div className="auth-switch" role="tablist" aria-label="Account">
          <button type="button" role="tab" aria-selected={view === "login"} onClick={() => switchView("login")}>
            Sign in
          </button>
          <button type="button" role="tab" aria-selected={view === "signup"} onClick={() => switchView("signup")}>
            Create account
          </button>
        </div>
      )}

      {noticeBox}

      {view === "login" && (
        <Form form={loginForm} layout="vertical" onFinish={handleLogin} disabled={loading} requiredMark={false}>
          <Form.Item label="Username" name="username" rules={[{ required: true, whitespace: true, message: "Enter your username" }]}>
            <Input prefix={<UserOutlined />} placeholder="Your username" autoComplete="username" autoFocus />
          </Form.Item>
          <Form.Item label="Password" name="password" rules={[{ required: true, message: "Enter your password" }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Your password" autoComplete="current-password" />
          </Form.Item>
          <div className="auth-row">
            <span />
            <button type="button" className="auth-link" onClick={() => switchView("forgot")}>
              Forgot password?
            </button>
          </div>
          <Button type="primary" htmlType="submit" block loading={loading} className="auth-submit">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </Form>
      )}

      {view === "signup" && (
        <Form
          form={signupForm}
          layout="vertical"
          onFinish={({ fullname, username, email, password }) => handleSignup({ fullname, username, email, password })}
          disabled={loading}
          requiredMark={false}
        >
          <Form.Item label="Full name" name="fullname" rules={[{ required: true, whitespace: true, message: "Enter your full name" }]}>
            <Input prefix={<IdcardOutlined />} placeholder="Juan Dela Cruz" autoComplete="name" />
          </Form.Item>
          <Form.Item label="Username" name="username" rules={[{ required: true, whitespace: true, message: "Choose a username" }]}>
            <Input prefix={<UserOutlined />} placeholder="jdelacruz" autoComplete="username" />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: "Enter your email" }, { type: "email", message: "Enter a valid email address" }]}
          >
            <Input prefix={<MailOutlined />} placeholder="name@emb.gov.ph" autoComplete="email" inputMode="email" />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: "Choose a password" }, { min: 8, message: "Use at least 8 characters" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="At least 8 characters" autoComplete="new-password" />
          </Form.Item>
          {signupPassword && (
            <>
              <div className="auth-strength" data-score={score} aria-hidden="true">
                <span /><span /><span /><span />
              </div>
              <p className="auth-strength-label" aria-live="polite">Password strength: {STRENGTH_LABEL[score]}</p>
            </>
          )}
          <Form.Item
            label="Confirm password"
            name="confirm"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Re-enter your password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  return !value || getFieldValue("password") === value
                    ? Promise.resolve()
                    : Promise.reject(new Error("The passwords don't match"));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Type it again" autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading} className="auth-submit">
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </Form>
      )}

      {view === "forgot" && (
        <Form form={forgotForm} layout="vertical" onFinish={handleForgot} disabled={loading} requiredMark={false}>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: "Enter your email" }, { type: "email", message: "Enter a valid email address" }]}
          >
            <Input prefix={<MailOutlined />} placeholder="name@emb.gov.ph" autoComplete="email" inputMode="email" autoFocus />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading} className="auth-submit">
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </Form>
      )}
    </AuthLayout>
  );
}

export default HomeAdmin;
