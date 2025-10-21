import React, { useEffect, useState } from "react";
import { Card, Select, Button, Typography, Alert, Space, Spin, message } from "antd";
import { getOpaqueItem } from "../../../utils/encryptedStorage";
import axios from "axios";

const { Title } = Typography;

export default function Backup() {
  const [messageApi, contextHolder] = message.useMessage();
  const [collections, setCollections] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const authHeader = () => {
    const token = getOpaqueItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/admin/db/collections", { headers: { ...authHeader() } });
      setCollections(Array.isArray(res.data.collections) ? res.data.collections : []);
  } catch (err) {
  console.error("Failed to list collections:", err);
  messageApi.error("Failed to fetch collections. Ensure you are authenticated and database is connected.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const doExport = async (format = "json") => {
  if (!selected) return messageApi.warn("Select a collection first.");
    setExporting(true);
    try {
      // download via browser by requesting the endpoint and creating a blob
      const res = await axios.get(`/api/admin/db/export?collection=${encodeURIComponent(selected)}&format=${encodeURIComponent(format)}`, {
        headers: { ...authHeader() },
        responseType: "blob",
      });

      const disposition = res.headers["content-disposition"] || "";
      let filename = `${selected}.${format}`;
      const m = disposition.match(/filename="?([^";]+)"?/);
      if (m) filename = m[1];

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      messageApi.success("Export started");
    } catch (err) {
      console.error("Export failed:", err);
      messageApi.error("Export failed. Check server logs and authentication.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      {contextHolder}
      <Title level={4}>Database Backup & Export</Title>
      <Alert
        message="Export a database collection as JSON or CSV. Requires admin privileges."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <Select
          showSearch
          placeholder={loading ? "Loading collections..." : "Select collection"}
          style={{ minWidth: 320 }}
          value={selected}
          onChange={(v) => setSelected(v)}
          options={collections.map((c) => ({ label: c, value: c }))}
          notFoundContent={loading ? <Spin size="small" /> : null}
        />
        <Space>
          <Button onClick={fetchCollections}>Refresh</Button>
          <Button type="primary" onClick={() => doExport("json")} loading={exporting}>Export JSON</Button>
          <Button onClick={() => doExport("csv")} loading={exporting}>Export CSV</Button>
        </Space>
      </div>

      <div style={{ marginTop: 8 }}>
        <small style={{ color: "#666" }}>Tip: Exports include all documents from the selected collection. For large collections prefer CSV to stream-run on server.</small>
      </div>
    </Card>
  );
}