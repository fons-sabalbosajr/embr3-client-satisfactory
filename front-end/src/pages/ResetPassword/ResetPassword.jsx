// src/pages/ResetPassword.jsx
import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Form, Input, Button, Card, Typography } from "antd";
import Swal from "sweetalert2";
import { resetPassword } from "../../services/api"; // Adjust the import path as necessary}

const ResetPassword = () => {
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const token = params.get("token");
  const email = params.get("email");

  const onFinish = async ({ password }) => {
    try {
      setLoading(true);
      const res = await resetPassword({ email, token, newPassword: password });

      Swal.fire({
        icon: "success",
        title: "Password Reset",
        text: res.data.message || "Your password has been reset successfully.",
      });

      // Redirect to admin
      window.location.href = `${import.meta.env.VITE_FRONTEND_URL}/?admin-auth=true`;
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
            ]}
          >
            <Input.Password />
          </Form.Item>

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
