import React, { useState } from "react";
import { Collapse, Typography, Form, Select, Button, Alert } from "antd";
import AccountSettings from "../AccountSettings/AccountSettings";
import DataConfig from "../DataConfig/DataConfig";
import Backup from "../Backup/Backup";
import Accounts from "../Accounts/Accounts";
import DangerZone from "./DangerZone";

const { Title } = Typography;
const { Panel } = Collapse;

export default function DeveloperSettings({ currentUser }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (values) => {
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      // TODO: Call API to update privileges
      // await updatePrivileges(values);
      setSuccess(true);
    } catch (e) {
      setError("Failed to update privileges. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <Title level={3}>Developer Settings</Title>
      <Collapse
        defaultActiveKey={["account"]}
        accordion
        items={[
          {
            key: "accounts",
            label: "Accounts Management",
            children: <Accounts />,
          },
          {
            key: "dangerzone",
            label: "Danger Zone (Developer Only)",
            children: <DangerZone />,
          },
        ]}
      />
    </div>
  );
}
