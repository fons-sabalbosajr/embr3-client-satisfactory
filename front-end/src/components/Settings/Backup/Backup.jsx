import React, { useEffect, useState, useCallback } from "react";
import {
  Card,
  Button,
  Typography,
  Alert,
  Space,
  Tag,
  Row,
  Col,
  Statistic,
  Table,
  Descriptions,
  Tooltip,
  Dropdown,
  message,
} from "antd";
import {
  DatabaseOutlined,
  ReloadOutlined,
  CloudDownloadOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  HddOutlined,
  FileTextOutlined,
  DeploymentUnitOutlined,
  DownOutlined,
} from "@ant-design/icons";
import { getOpaqueItem } from "../../../utils/encryptedStorage";
import * as api from "../../../services/api";
import axios from "axios";
import "./backup.css";

const { Title, Text } = Typography;

// Human-readable byte formatting
function formatBytes(bytes) {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export default function Backup() {
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [exportingKey, setExportingKey] = useState(null);

  const authHeader = () => {
    const token = getOpaqueItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDbStats();
      setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch DB stats:", err);
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to fetch database statistics. Ensure you are authenticated and the database is connected."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const doExport = async (collection, format = "json") => {
    if (!collection) return;
    setExportingKey(`${collection}:${format}`);
    try {
      const res = await axios.get(
        `/api/admin/db/export?collection=${encodeURIComponent(
          collection
        )}&format=${encodeURIComponent(format)}`,
        { headers: { ...authHeader() }, responseType: "blob" }
      );
      const disposition = res.headers["content-disposition"] || "";
      let filename = `${collection}.${format}`;
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
      messageApi.success(`Exported ${collection} as ${format.toUpperCase()}`);
    } catch (err) {
      console.error("Export failed:", err);
      messageApi.error("Export failed. Check server logs and authentication.");
    } finally {
      setExportingKey(null);
    }
  };

  const connection = stats?.connection;
  const db = stats?.db;
  const connected = connection?.readyState === 1;

  const columns = [
    {
      title: "Collection",
      dataIndex: "name",
      key: "name",
      render: (name) => (
        <Space>
          <FileTextOutlined style={{ color: "#1677ff" }} />
          <Text strong>{name}</Text>
        </Space>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Documents",
      dataIndex: "count",
      key: "count",
      align: "right",
      render: (v) =>
        typeof v === "number" ? v.toLocaleString() : v ?? "—",
      sorter: (a, b) => (a.count || 0) - (b.count || 0),
    },
    {
      title: "Data Size",
      dataIndex: "size",
      key: "size",
      align: "right",
      render: (v) => formatBytes(v),
      sorter: (a, b) => (a.size || 0) - (b.size || 0),
    },
    {
      title: "Storage Size",
      dataIndex: "storageSize",
      key: "storageSize",
      align: "right",
      render: (v) => formatBytes(v),
      sorter: (a, b) => (a.storageSize || 0) - (b.storageSize || 0),
    },
    {
      title: "Indexes",
      dataIndex: "nindexes",
      key: "nindexes",
      align: "right",
      render: (v, r) => (
        <Tooltip title={`Total index size: ${formatBytes(r.totalIndexSize)}`}>
          <Tag>{v ?? 0}</Tag>
        </Tooltip>
      ),
    },
    {
      title: "Backup",
      key: "actions",
      align: "right",
      width: 160,
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: "json",
                label: "Export JSON",
                onClick: () => doExport(record.name, "json"),
              },
              {
                key: "csv",
                label: "Export CSV",
                onClick: () => doExport(record.name, "csv"),
              },
            ],
          }}
        >
          <Button
            size="small"
            icon={<CloudDownloadOutlined />}
            loading={String(exportingKey || "").startsWith(`${record.name}:`)}
          >
            Export <DownOutlined />
          </Button>
        </Dropdown>
      ),
    },
  ];

  return (
    <div className="backup-page">
      {contextHolder}
      <div className="backup-header">
        <div>
          <Title level={3} className="backup-title">
            <DatabaseOutlined /> Database Backup &amp; Diagnostics
          </Title>
          <Text type="secondary">
            Inspect database health and export collections as JSON or CSV.
            Requires administrator privileges.
          </Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchStats}
          loading={loading}
        >
          Refresh
        </Button>
      </div>

      {error && (
        <Alert
          type="error"
          showIcon
          message="Database diagnostics unavailable"
          description={error}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Connection status */}
      <Card
        className="backup-card"
        loading={loading && !stats}
        style={{ marginBottom: 16 }}
        title={
          <Space>
            <DeploymentUnitOutlined />
            <span>Connection Status</span>
          </Space>
        }
        extra={
          connected ? (
            <Tag icon={<CheckCircleFilled />} color="success">
              Connected
            </Tag>
          ) : (
            <Tag icon={<CloseCircleFilled />} color="error">
              {connection?.state || "Disconnected"}
            </Tag>
          )
        }
      >
        <Descriptions
          column={{ xs: 1, sm: 2, lg: 3 }}
          size="small"
          bordered
          items={[
            { key: "db", label: "Database", children: connection?.name || "—" },
            { key: "host", label: "Host", children: connection?.host || "—" },
            { key: "port", label: "Port", children: connection?.port || "—" },
            {
              key: "state",
              label: "Ready State",
              children: `${connection?.state || "—"} (${
                connection?.readyState ?? "—"
              })`,
            },
            {
              key: "mongoose",
              label: "Mongoose",
              children: connection?.mongooseVersion || "—",
            },
            {
              key: "generated",
              label: "Snapshot",
              children: stats?.generatedAt
                ? new Date(stats.generatedAt).toLocaleString()
                : "—",
            },
          ]}
        />
      </Card>

      {/* Database overview tiles */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card size="small" className="backup-stat-card">
            <Statistic
              title="Collections"
              value={db?.collections ?? 0}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" className="backup-stat-card">
            <Statistic
              title="Total Documents"
              value={db?.objects ?? 0}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" className="backup-stat-card">
            <Statistic
              title="Data Size"
              value={formatBytes(db?.dataSize)}
              prefix={<HddOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" className="backup-stat-card">
            <Statistic
              title="Index Size"
              value={formatBytes(db?.indexSize)}
              prefix={<DeploymentUnitOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Collections table */}
      <Card
        className="backup-card"
        title={
          <Space>
            <DatabaseOutlined />
            <span>Collections</span>
            {stats?.collections ? (
              <Tag color="blue">{stats.collections.length}</Tag>
            ) : null}
          </Space>
        }
        extra={
          <Text type="secondary" style={{ fontSize: 12 }}>
            Storage size on disk includes compression &amp; pre-allocation.
          </Text>
        }
      >
        <Table
          rowKey="name"
          size="middle"
          loading={loading}
          dataSource={stats?.collections || []}
          columns={columns}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          scroll={{ x: "max-content" }}
        />
      </Card>
    </div>
  );
}