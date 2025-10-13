// src/pages/ResetPassword.jsx
import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Form, Input, Button, Card, Typography } from "antd";
import "./resetpassword.css";
import Swal from "sweetalert2";
import { resetPassword } from "../../services/api"; // Adjust the import path as necessary}
import { getCachedConfig } from "../../utils/config";

const ResetPassword = () => {
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const token = params.get("token");
  const email = params.get("email");

  const onFinish = async ({ password, confirmPassword }) => {
    try {
      if (password !== confirmPassword) {
        return Swal.fire({
          icon: "warning",
          title: "Passwords do not match",
          text: "Please re-enter your new password and confirmation.",
        });
      }
      setLoading(true);
      const res = await resetPassword({ email, token, newPassword: password });

      Swal.fire({
        icon: "success",
        title: "Password Reset",
        text: res.data.message || "Your password has been reset successfully.",
      });

  // Redirect to admin (ignore any legacy base path like /ocsm)
  navigate("/admin", { replace: true });
    } catch (err) {
      console.error("Reset password failed:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          err.response?.data?.message ||
          "Something went wrong while resetting your password.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return <Typography.Text type="danger">Invalid reset link.</Typography.Text>;
  }

  return (
    <div className="reset-container">
      <Card
        title="Reset Your Password"
        style={{ maxWidth: 400, margin: "auto", marginTop: 100 }}
      >
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="New Password"
            name="password"
            rules={[
              { required: true, message: "Please enter your new password" },
              { min: 8, message: "Password must be at least 8 characters" },
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            label="Confirm New Password"
            name="confirmPassword"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Please confirm your new password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
            Use at least 8 characters. We recommend a mix of letters, numbers, and symbols.
          </Typography.Paragraph>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Reset Password
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ResetPassword;
