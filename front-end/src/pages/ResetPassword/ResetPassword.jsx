// Reset password (link from the "Forgot password" email).
import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Alert, Button, Form, Input } from "antd";
import { KeyOutlined, LockOutlined, CheckCircleFilled, CloseCircleFilled } from "@ant-design/icons";
import AuthLayout from "../../components/AuthLayout/AuthLayout";
import { describeError } from "../../components/StatusUI/describeError";
import { resetPassword } from "../../services/api";

const ResetPassword = ({ colorScheme, toggleColorScheme }) => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const token = params.get("token");
  const email = params.get("email");

  const onFinish = async ({ password }) => {
    setLoading(true);
    setError(null);
    try {
      await resetPassword({ email, token, newPassword: password });
      setDone(true);
    } catch (err) {
      console.error("Reset password failed:", err);
      setError(describeError(err).message || "Something went wrong while resetting your password.");
    } finally {
      setLoading(false);
    }
  };

  const layout = { colorScheme, toggleColorScheme, icon: <KeyOutlined /> };

  if (!token || !email) {
    return (
      <AuthLayout {...layout} title="This link isn't valid" subtitle="The reset link is incomplete or has been used.">
        <div className="auth-status">
          <span className="auth-status-icon is-bad"><CloseCircleFilled /></span>
          <p>Request a new reset link from the sign-in page. Links expire after a short time for your security.</p>
          <Button type="primary" block className="auth-submit" onClick={() => navigate("/admin")}>
            Go to sign in
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout {...layout} title="Password updated" subtitle="You can now sign in with your new password.">
        <div className="auth-status">
          <span className="auth-status-icon is-ok"><CheckCircleFilled /></span>
          <p>For your security, other signed-in sessions may need to sign in again.</p>
          <Button type="primary" block className="auth-submit" onClick={() => navigate("/admin", { replace: true })}>
            Go to sign in
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout {...layout} title="Choose a new password" subtitle={`For ${email}`}>
      {error && <Alert type="error" showIcon message="Couldn't reset the password" description={error} closable onClose={() => setError(null)} />}
      <Form layout="vertical" onFinish={onFinish} disabled={loading} requiredMark={false}>
        <Form.Item
          label="New password"
          name="password"
          rules={[{ required: true, message: "Enter a new password" }, { min: 8, message: "Use at least 8 characters" }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="At least 8 characters" autoComplete="new-password" autoFocus />
        </Form.Item>
        <Form.Item
          label="Confirm new password"
          name="confirmPassword"
          dependencies={["password"]}
          rules={[
            { required: true, message: "Re-enter the new password" },
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
        <p className="auth-hint">Use at least 8 characters. A mix of letters, numbers and symbols is stronger.</p>
        <Button type="primary" htmlType="submit" loading={loading} block className="auth-submit">
          {loading ? "Saving…" : "Save new password"}
        </Button>
      </Form>
    </AuthLayout>
  );
};

export default ResetPassword;
