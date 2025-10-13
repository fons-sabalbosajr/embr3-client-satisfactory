import React, { useState, useEffect } from "react";
import { Card, Button, Switch, Typography, Alert, Space } from "antd";
import * as api from "../../../services/api";

const { Title, Text } = Typography;

export default function DangerZone() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [dbStatus, setDbStatus] = useState({ connected: false, info: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Read persisted maintenance mode
    const m = localStorage.getItem("maintenanceMode") === "true";
    setMaintenanceMode(m);
    // fetch DB status on mount
    fetchDbStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDbStatus = async () => {
    setLoading(true);
    try {
      const res = await api.getDbStatus();
      setDbStatus({ connected: true, info: res.data });
    } catch (err) {
      setDbStatus({
        connected: false,
        info: err.response?.data || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectDb = async () => {
    setLoading(true);
    try {
      await api.connectDb();
      await fetchDbStatus();
    } catch (err) {
      setDbStatus({
        connected: false,
        info: err.response?.data || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMaintenanceToggle = (checked) => {
    setMaintenanceMode(checked);
    localStorage.setItem("maintenanceMode", checked ? "true" : "false");
    // TODO: Call API to enable/disable maintenance mode
  };

  return (
    <Card style={{ border: "1px solid #ff4d4f" }}>
      <Title level={4} style={{ color: "#cf1322" }}>
        Danger Zone
      </Title>
      <Alert
        message="Developer Maintenance & Configuration"
        description="These settings affect the entire system. Use with caution."
        type="error"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <div style={{ marginBottom: 16 }}>
        <Text strong>Maintenance Mode:</Text>
        <Switch
          checked={maintenanceMode}
          onChange={handleMaintenanceToggle}
          style={{ marginLeft: 12 }}
        />
        <Text type="danger" style={{ marginLeft: 12 }}>
          {maintenanceMode
            ? "System is in maintenance mode."
            : "System is live."}
        </Text>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Text strong>Database Status:</Text>
        <div style={{ marginTop: 8 }}>
          <Space direction="vertical">
            <Text>{dbStatus.connected ? "Connected" : "Not connected"}</Text>
            <Text
              type="secondary"
              style={{ whiteSpace: "pre-wrap", maxWidth: 600 }}
            >
              {dbStatus.info
                ? JSON.stringify(dbStatus.info, null, 2)
                : "No details available."}
            </Text>
            <Space>
              <Button
                type="primary"
                onClick={handleConnectDb}
                loading={loading}
              >
                Connect
              </Button>
              <Button onClick={fetchDbStatus} loading={loading}>
                Refresh
              </Button>
            </Space>
          </Space>
        </div>
      </div>
    </Card>
  );
}
