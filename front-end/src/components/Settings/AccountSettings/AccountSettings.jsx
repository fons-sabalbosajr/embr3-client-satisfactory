import React, { useState } from "react";
import { Form, Input, Button, Alert, Typography, message } from "antd";
import { updateUser } from "../../../services/api";
import {
  setOpaqueItem,
  setEncryptedItem,
  removeOpaqueItem,
} from "../../../utils/encryptedStorage";
import { useNavigate } from "react-router-dom";

const { Title } = Typography;

export default function AccountSettings({ currentUser }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();

  const handleSubmit = async (values) => {
    setLoading(true);
    setError("");
    setSuccess(false);

    // Build payload (only include password when provided)
    const payload = {
      fullname: values.fullname,
      username: values.username,
    };
    if (values.position !== undefined) payload.position = values.position;
    if (values.password) payload.password = values.password;

    try {
      // Call API to update user
      const userId = currentUser?._id || currentUser?.id;
      await updateUser(userId, payload);

      // If password was changed, for security force logout and redirect to login
      if (values.password) {
        try {
          removeOpaqueItem("token");
          removeOpaqueItem("user");
        } catch (_) {}
        messageApi.success(
          "Password updated. For security you have been signed out — please sign in using your new password."
        );
        // Redirect to login/admin page
        setTimeout(() => {
          navigate("/admin");
          window.location.reload();
        }, 700);
        return;
      }

      // No password change: update stored user object (best-effort)
      try {
        const updatedLocalUser = { ...(currentUser || {}), ...payload };
        setEncryptedItem("user", JSON.stringify(updatedLocalUser));
      } catch (_) {
        // ignore storage update failures
      }

      setSuccess(true);
      messageApi.success("Account updated successfully.");
    } catch (e) {
      console.error("Failed to update account:", e);
      setError("Failed to update account. Please try again.");
      messageApi.error("Failed to update account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "0 auto" }}>
      {contextHolder}
      <Title level={3}>Account Settings</Title>
      <Alert
        message="Warning: Changing your username, password, or position will affect your login credentials and access. Make sure to remember your new information."
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          fullname: currentUser?.fullname || "",
          username: currentUser?.username || "",
          position: currentUser?.position || "",
        }}
        onFinish={handleSubmit}
      >
        <Form.Item
          label="Full Name"
          name="fullname"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="Username"
          name="username"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        {currentUser?.position === "Developer" && (
          <Form.Item
            label="Position"
            name="position"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
        )}
        <Form.Item label="New Password" name="password" rules={[{ min: 6 }]}>
          <Input.Password />
        </Form.Item>
        <Form.Item
          label="Confirm Password"
          name="confirm"
          dependencies={["password"]}
          rules={[
            { required: false },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("Passwords do not match!"));
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            Update Account
          </Button>
        </Form.Item>
        {success && (
          <Form.Item style={{ marginTop: 8 }}>
            <Alert
              message="Account updated successfully!"
              type="success"
              showIcon
            />
          </Form.Item>
        )}
        {error && (
          <Form.Item style={{ marginTop: 8 }}>
            <Alert message={error} type="error" showIcon />
          </Form.Item>
        )}
      </Form>
    </div>
  );
}
