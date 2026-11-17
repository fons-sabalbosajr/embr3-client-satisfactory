// My Account — the signed-in user's profile and appearance. Every staff
// member can open it; it only ever edits the user's own account.
import React, { useEffect, useState } from "react";
import { Form, Input, Button, Alert, Tag, message } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { updateUser } from "../../../services/api";
import { setEncryptedItem, removeOpaqueItem } from "../../../utils/encryptedStorage";
import { isDeveloperUser } from "../../../utils/session";
import Appearance from "../Appearance/Appearance";
import "./accountsettings.css";

export default function AccountSettings({ currentUser }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const [messageApi, contextHolder] = message.useMessage();
  const isDeveloper = isDeveloperUser(currentUser);
  const role = isDeveloper
    ? "Developer"
    : currentUser?.permissions?.canManageUsers || currentUser?.privilege === "admin"
      ? "Administrator"
      : "Staff";

  // Opened from the header's "Appearance" item → scroll to that section.
  useEffect(() => {
    if (location.hash === "#appearance") {
      setTimeout(() => document.getElementById("appearance")?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    }
  }, [location.hash]);

  const handleSubmit = async (values) => {
    setLoading(true);
    setError("");
    // The server accepts name, username and password for your own account;
    // position and permissions are managed by a developer.
    const payload = { fullname: values.fullname.trim(), username: values.username.trim() };
    if (values.password) payload.password = values.password;

    try {
      const userId = currentUser?._id || currentUser?.id;
      await updateUser(userId, payload);

      if (values.password) {
        try {
          removeOpaqueItem("token");
          removeOpaqueItem("user");
        } catch {
          /* ignore */
        }
        messageApi.success("Password updated. For security you have been signed out — please sign in with your new password.");
        setTimeout(() => {
          navigate("/admin");
          window.location.reload();
        }, 900);
        return;
      }

      try {
        setEncryptedItem("user", JSON.stringify({ ...(currentUser || {}), ...payload }));
      } catch {
        /* ignore */
      }
      form.setFieldsValue({ password: "", confirm: "" });
      messageApi.success("Profile updated.");
    } catch (e) {
      console.error("Failed to update account:", e);
      const msg = e?.response?.data?.message || "Failed to update your account. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="acct">
      {contextHolder}
      <section className="acct-card" aria-labelledby="profile-title">
        <header className="acct-head">
          <div>
            <h3 id="profile-title" className="acct-title">Profile</h3>
            <p className="acct-desc">Your name and sign-in details.</p>
          </div>
          <div className="acct-role">
            <Tag color={isDeveloper ? "red" : "blue"}>{role}</Tag>
            {currentUser?.email && <span className="acct-email">{currentUser.email}</span>}
          </div>
        </header>

        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={{ fullname: currentUser?.fullname || "", username: currentUser?.username || "" }}
          onFinish={handleSubmit}
          className="acct-form"
        >
          <div className="acct-grid">
            <Form.Item label="Full name" name="fullname" rules={[{ required: true, whitespace: true, message: "Enter your full name" }]}>
              <Input autoComplete="name" />
            </Form.Item>
            <Form.Item label="Username" name="username" rules={[{ required: true, whitespace: true, message: "Enter a username" }]}>
              <Input autoComplete="username" />
            </Form.Item>
          </div>

          <div className="acct-sub">Change password</div>
          <p className="acct-note">Leave blank to keep your current password. Changing it signs you out.</p>
          <div className="acct-grid">
            <Form.Item label="New password" name="password" rules={[{ min: 8, message: "Use at least 8 characters" }]}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Form.Item
              label="Confirm new password"
              name="confirm"
              dependencies={["password"]}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const pw = getFieldValue("password");
                    if (!pw && !value) return Promise.resolve();
                    return pw === value ? Promise.resolve() : Promise.reject(new Error("The passwords don't match"));
                  },
                }),
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          </div>

          {error && <Alert type="error" showIcon message={error} className="acct-alert" />}

          <div className="acct-actions">
            <Button type="primary" htmlType="submit" loading={loading}>
              Save profile
            </Button>
          </div>
        </Form>
      </section>

      <Appearance />
    </div>
  );
}
