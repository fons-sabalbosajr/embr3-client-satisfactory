import React, { useState } from "react";
import { Form, Input, Button, Alert, Typography } from "antd";

const { Title } = Typography;

export default function AccountSettings({ currentUser }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (values) => {
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      // TODO: Call API to update user info
      // await updateAdminAccount(values);
      setSuccess(true);
    } catch (e) {
      setError("Failed to update account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "0 auto" }}>
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
        <Form.Item label="Full Name" name="fullname" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Username" name="username" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        {currentUser?.position === "Developer" && (
          <Form.Item label="Position" name="position" rules={[{ required: true }]}>
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
                return Promise.reject("Passwords do not match!");
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
            <Alert message="Account updated successfully!" type="success" showIcon />
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
