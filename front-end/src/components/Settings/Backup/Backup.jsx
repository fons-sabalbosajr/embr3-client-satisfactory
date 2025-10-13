import React, { useState } from "react";
import { Card, Form, Input, Button, Typography, Alert } from "antd";

const { Title } = Typography;

export default function Backup() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (values) => {
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      // TODO: Call API to update DB settings
      setSuccess(true);
    } catch (e) {
      setError("Failed to update database settings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Title level={4}>Database Connection & Backup/Restore</Title>
      <Alert
        message="Configure database connection, backup, and restore settings."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          dbHost: "localhost",
          dbPort: "27017",
          dbName: "client_satisfactory",
          dbUser: "",
          dbPassword: "",
        }}
        onFinish={handleSubmit}
      >
        <Form.Item label="Host" name="dbHost" rules={[{ required: true }]}> <Input /> </Form.Item>
        <Form.Item label="Port" name="dbPort" rules={[{ required: true }]}> <Input /> </Form.Item>
        <Form.Item label="Database Name" name="dbName" rules={[{ required: true }]}> <Input /> </Form.Item>
        <Form.Item label="Username" name="dbUser"> <Input /> </Form.Item>
        <Form.Item label="Password" name="dbPassword"> <Input.Password /> </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>Update DB Settings</Button>
        </Form.Item>
        {success && <Alert message="Database settings updated!" type="success" showIcon style={{ marginTop: 8 }} />}
        {error && <Alert message={error} type="error" showIcon style={{ marginTop: 8 }} />}
      </Form>
      <div style={{ marginTop: 24 }}>
        <Button type="default" style={{ marginRight: 8 }}>Backup Database</Button>
        <Button type="default">Restore Database</Button>
      </div>
    </Card>
  );
}