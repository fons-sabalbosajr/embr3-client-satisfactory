import React, { useCallback, useEffect, useState } from "react";
import {
  Card,
  Table,
  Tag,
  Typography,
  Space,
  Button,
  Input,
  Segmented,
  Row,
  Col,
  Statistic,
  Tooltip,
  Modal,
  message,
} from "antd";
import {
  FileSearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import * as api from "../../services/api";
import "./appLogs.css";

const { Title, Text } = Typography;

const LEVEL_META = {
  info: { color: "blue", label: "INFO" },
  warn: { color: "orange", label: "WARN" },
  error: { color: "red", label: "ERROR" },
  audit: { color: "purple", label: "AUDIT" },
};

const METHOD_COLOR = {
  GET: "default",
  POST: "green",
  PUT: "gold",
  PATCH: "gold",
  DELETE: "red",
};

export default function AppLogs() {
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ info: 0, warn: 0, error: 0, audit: 0 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [level, setLevel] = useState("all");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, pageSize };
      if (level !== "all") params.level = level;
      if (appliedSearch) params.search = appliedSearch;
      const res = await api.getAppLogs(params);
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
      if (res.data.counts) setCounts(res.data.counts);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
      messageApi.error("Failed to fetch application logs.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, level, appliedSearch, messageApi]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleClear = () => {
    Modal.confirm({
      title: "Clear application logs?",
      content:
        "This permanently deletes log entries. Choose what to remove. This cannot be undone.",
      okText: "Clear ALL logs",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: async () => {
        try {
          const res = await api.clearAppLogs();
          messageApi.success(
            `Cleared ${res.data.deletedCount || 0} log entr${
              (res.data.deletedCount || 0) === 1 ? "y" : "ies"
            }.`
          );
          setPage(1);
          fetchLogs();
        } catch (err) {
          console.error("Failed to clear logs:", err);
          messageApi.error("Failed to clear logs.");
        }
      },
    });
  };

  const totalCount = counts.info + counts.warn + counts.error + counts.audit;

  const columns = [
    {
      title: "Time",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      render: (v) => (
        <Tooltip title={dayjs(v).format("YYYY-MM-DD HH:mm:ss")}>
          <Text>{dayjs(v).format("MMM D, HH:mm:ss")}</Text>
        </Tooltip>
      ),
    },
    {
      title: "Level",
      dataIndex: "level",
      key: "level",
      width: 90,
      render: (lvl) => {
        const m = LEVEL_META[lvl] || { color: "default", label: lvl };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: "Method",
      dataIndex: "method",
      key: "method",
      width: 90,
      render: (m) =>
        m ? <Tag color={METHOD_COLOR[m] || "default"}>{m}</Tag> : "—",
    },
    {
      title: "Path",
      dataIndex: "path",
      key: "path",
      ellipsis: true,
      render: (p) => <Text code>{p || "—"}</Text>,
    },
    {
      title: "Status",
      dataIndex: "statusCode",
      key: "statusCode",
      width: 90,
      render: (s) => {
        if (s == null) return "—";
        let color = "default";
        if (s >= 500) color = "red";
        else if (s >= 400) color = "orange";
        else if (s >= 200 && s < 300) color = "green";
        return <Tag color={color}>{s}</Tag>;
      },
    },
    {
      title: "User",
      dataIndex: "userName",
      key: "userName",
      width: 140,
      render: (u) => u || <Text type="secondary">anonymous</Text>,
    },
    {
      title: "IP",
      dataIndex: "ip",
      key: "ip",
      width: 130,
      render: (v) => <Text type="secondary">{v || "—"}</Text>,
    },
    {
      title: "Duration",
      dataIndex: "durationMs",
      key: "durationMs",
      width: 100,
      align: "right",
      render: (v) => (v == null ? "—" : `${v} ms`),
    },
  ];

  return (
    <div className="applogs-page">
      {contextHolder}
      <div className="applogs-header">
        <div>
          <Title level={3} className="applogs-title">
            <FileSearchOutlined /> Application Logs
          </Title>
          <Text type="secondary">
            Audit trail of state-changing requests and errors across the app.
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchLogs} loading={loading}>
            Refresh
          </Button>
          <Button icon={<DeleteOutlined />} danger onClick={handleClear}>
            Clear Logs
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} className="applogs-stats">
        <Col xs={12} md={6}>
          <Card size="small" className="al-stat-card">
            <Statistic title="Total Entries" value={totalCount} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" className="al-stat-card">
            <Statistic
              title="Info"
              value={counts.info}
              prefix={<InfoCircleOutlined />}
              valueStyle={{ color: "#1677ff" }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" className="al-stat-card">
            <Statistic
              title="Warnings"
              value={counts.warn}
              prefix={<WarningOutlined />}
              valueStyle={{ color: "#fa8c16" }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" className="al-stat-card">
            <Statistic
              title="Errors"
              value={counts.error}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: "#ff4d4f" }}
            />
          </Card>
        </Col>
      </Row>

      <Card className="applogs-table-card">
        <Space
          style={{
            marginBottom: 16,
            width: "100%",
            justifyContent: "space-between",
          }}
          wrap
        >
          <Input
            placeholder="Search path, message, user, method..."
            prefix={<SearchOutlined />}
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => {
              setPage(1);
              setAppliedSearch(search.trim());
            }}
            style={{ width: 320, maxWidth: "100%" }}
          />
          <Segmented
            value={level}
            onChange={(v) => {
              setPage(1);
              setLevel(v);
            }}
            options={[
              { label: "All", value: "all" },
              { label: "Info", value: "info" },
              { label: "Warn", value: "warn" },
              { label: "Error", value: "error" },
              { label: "Audit", value: "audit" },
            ]}
          />
        </Space>

        <Table
          rowKey="_id"
          size="small"
          loading={loading}
          dataSource={items}
          columns={columns}
          scroll={{ x: "max-content" }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: [25, 50, 100, 200],
            showTotal: (t) => `${t} entries`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>
    </div>
  );
}
