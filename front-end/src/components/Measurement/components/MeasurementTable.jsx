import React, { useState, useEffect } from "react";
import {
  Table,
  Tag,
  Button,
  Popconfirm,
  Tooltip,
  Alert,
  notification,
} from "antd";
import {
  getDecryptedItem,
  getOpaqueItem,
  setOpaqueItem,
} from "../../../utils/encryptedStorage";
import { EditOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import MeasurementFormModal from "./MeasurementFormModal";
import MeasurementViewModal from "./MeasurementViewModal";
import { deleteFeedback, updateFeedback, getPreferences, updatePreferences } from "../../../services/api";
import "./measurementtable.css";
import socket from "../../../utils/socket";

function MeasurementTable({ data, onEdit, onDataRefresh }) {
  // Infer survey type for records that don't have surveyType stored
  const inferSurveyType = (record) => {
    if (record.surveyType) return record.surveyType;
    const labeled = record.answersLabeled || {};
    if (
      labeled["Customer Type"] === "Government" &&
      (labeled["Agency Name"] === "EMB Region III" || labeled["Employee Name"])
    ) {
      return "internal";
    }
    return "external";
  };

  const [tableData, setTableData] = useState([...data]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      // build per-user logical key
      const rawUser = getDecryptedItem("user");
      const userObj = rawUser ? JSON.parse(rawUser) : null;
      const key = userObj
        ? `measurement_table_page_size_${userObj._id}`
        : `measurement_table_page_size_guest`;

      const stored = getOpaqueItem(key) ?? localStorage.getItem(key);
      return stored ? Number(stored) : 10;
    } catch {
      return 10;
    }
  });
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [newFeedbackAlert, setNewFeedbackAlert] = useState(false);
  const [incomingClient, setIncomingClient] = useState(null);
  const [activeClients, setActiveClients] = useState([]);

  useEffect(() => {
    const sortedData = [...data].sort(
      (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
    );
    setTableData(sortedData);
  }, [data]);

  useEffect(() => {
    // reset to first page when data or pageSize changes
    setCurrentPage(1);
  }, [data, pageSize]);

  // Load user preferences (server-backed) on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getPreferences();
        const prefs = res?.data?.preferences ?? res?.preferences ?? {};
        if (!mounted) return;
        if (prefs.measurement_table_page_size) {
          setPageSize(Number(prefs.measurement_table_page_size));
        }
      } catch (err) {
        // ignore if not logged in or endpoint unavailable
      }
    })();
    return () => { mounted = false; };
  }, []);

  const currentUser = (() => {
    try {
      const raw = getDecryptedItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();
  const perms = currentUser?.permissions || {};
  const isDeveloper = (currentUser?.position || "").toLowerCase() === "developer";

  useEffect(() => {
    socket.emit("joinRoom", "questions-table");

    socket.on("active-feedbacks", (clients) => {
      setActiveClients(clients);
    });

    socket.on("feedbackAdded", (newEntry) => {
      setTableData((prev) => [{ ...newEntry, _new: true }, ...prev]);
      setNewFeedbackAlert(true);
      setTimeout(() => setNewFeedbackAlert(false), 3000);
    });

    socket.on("feedbackUpdated", (updatedFeedback) => {
      setTableData((prevData) =>
        prevData.map((item) =>
          item._id === updatedFeedback._id ? { ...updatedFeedback } : item
        )
      );
    });

    // 🔁 Optional polling fallback to refresh if user is mid-typing but hasn’t submitted
    const pollInterval = setInterval(() => {
      socket.emit("fetchLatestFeedback"); // You must emit this from client...
    }, 10000); // every 10 seconds

    return () => {
      socket.off("active-feedbacks");
      socket.off("feedbackAdded");
      socket.off("feedbackUpdated");
      clearInterval(pollInterval);
    };
  }, []);

  const handleDelete = async (id) => {
    if (!perms.canDelete && currentUser?.privilege !== "admin" && !isDeveloper) {
      notification.error({ message: "Permission denied" });
      return;
    }
    await deleteFeedback(id);
    onDataRefresh();
  };

  const handleEditSubmit = async (updated) => {
    if (!perms.canEdit && currentUser?.privilege !== "admin" && !isDeveloper) {
      notification.error({ message: "Permission denied" });
      return;
    }
    await updateFeedback(updated._id, updated);
    onDataRefresh();
  };

  const columns = [
    {
      title: "Survey Type",
      key: "surveyType",
      width: 110,
      render: (_, record) => {
        const type = inferSurveyType(record);
        return (
          <Tag color={type === "internal" ? "blue" : "green"} style={{ marginInlineEnd: 0 }}>
            {type === "internal" ? "Internal" : "External"}
          </Tag>
        );
      },
      filters: [
        { text: "Internal", value: "internal" },
        { text: "External", value: "external" },
      ],
      onFilter: (value, record) => inferSurveyType(record) === value,
    },
    {
      title: "Client",
      key: "client",
      width: 220,
      render: (_, record) => {
        const labeled = record.answersLabeled || {};
        const name = labeled["Company Name"] || labeled["Agency Name"] || labeled["Employee Name"];
        const type = labeled["Customer Type"];
        return name ? (
          <div>
            <div className="measurement-client-name" title={name}>{name}</div>
            <div className="measurement-client-type">{type}</div>
          </div>
        ) : (
          <div>{type}</div>
        );
      },
      filters: Array.from(
        new Set(
          tableData
            .map((d) => d.answersLabeled?.["Customer Type"])
            .filter(Boolean)
        )
      ).map((val) => ({
        text: val,
        value: val,
      })),
      onFilter: (value, record) =>
        record.answersLabeled?.["Customer Type"] === value,
    },
    {
      title: "Gender",
      dataIndex: ["answersLabeled", "Gender"],
      width: 100,
      responsive: ["md"],
      render: (v) => v || <span style={{ color: "#bbb" }}>—</span>,
      filters: Array.from(
        new Set(
          tableData.map((d) => d.answersLabeled?.["Gender"]).filter(Boolean)
        )
      ).map((val) => ({
        text: val,
        value: val,
      })),
      onFilter: (value, record) => record.answersLabeled?.["Gender"] === value,
    },

    {
      title: "Service Availed",
      key: "services",
      width: 320,
      render: (_, record) => {
        const raw = record.answersLabeled?.["Service Availed"];
        const services = Array.isArray(raw) ? raw : raw ? [raw] : [];
        const serviceColors = {
          "ECC Online": "#0b5f74",
          "CNC Online": "#bc6e00",
          "OPMS Online": "#4a2250",
          "HWMS Online": "#415e20",
          "CMR Online": "#542c14",
          "COC Online": "#607d8b",
          "ELR Online": "#9c27b0",
          "Importation Clearance": "#5d4037",
          "PCB Online": "#37474f",
          "PCL Online": "#795548",
          "PMPIN Online": "#3e2723",
          "CRS Online": "#33691e",
          "SMR Online": "#1a237e",
          "PCO Online": "#263238",
        };

        if (!services.length) return <span style={{ color: "#bbb" }}>—</span>;
        return (
          <div className="service-tags-container">
            {services.map((service) => (
              <Tag
                key={service}
                title={service}
                style={{
                  backgroundColor: serviceColors[service] || "#5b6b7a",
                  color: "#fff",
                  border: "none",
                }}
              >
                {service}
              </Tag>
            ))}
          </div>
        );
      },
      filters: Array.from(
        new Set(
          tableData.flatMap((d) => {
            const raw = d.answersLabeled?.["Service Availed"];
            return Array.isArray(raw) ? raw : raw ? [raw] : [];
          })
        )
      ).map((service) => ({
        text: service,
        value: service,
      })),
      filterSearch: true,
      onFilter: (value, record) => {
        const raw = record.answersLabeled?.["Service Availed"];
        const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
        return list.includes(value);
      },
    },
    {
      title: "Submitted",
      dataIndex: "submittedAt",
      key: "submittedAt",
      width: 150,
      render: (d) => (
        <div style={{ whiteSpace: "nowrap" }}>
          <div>{dayjs(d).format("MM/DD/YYYY")}</div>
          <div style={{ fontSize: 12, color: "#888" }}>{dayjs(d).format("hh:mm A")}</div>
        </div>
      ),
      sorter: (a, b) => new Date(a.submittedAt) - new Date(b.submittedAt),
      defaultSortOrder: "descend",
    },
    {
      title: "Actions",
      key: "actions",
      width: 118,
      fixed: "right",
      align: "center",
      render: (_, record) => (
        <div className="measurement-actions">
          <Tooltip title="Review">
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => setViewing(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="primary"
              size="small"
              icon={<EditOutlined />}
              onClick={() => setEditing(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Confirm delete?"
            onConfirm={() => handleDelete(record._id)}
            placement="topRight"
          >
            <Button
              icon={<DeleteOutlined />}
              danger
              type="primary"
              size="small"
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <>
      {activeClients.length > 0 && (
        <div
          className={`incoming-feedback-banner client-types-${
            [...new Set(activeClients.map((c) => c.clientType))].length
          }`}
        >
          <Alert
            message={
              <div className="csm-banner-content">
                <span className="pulse-dot" />
                <span>
                  <strong>Live:</strong>{" "}
                  {[...new Set(activeClients.map((c) => c.clientType))].join(
                    ", "
                  )}{" "}
                  client{activeClients.length > 1 ? "s are" : " is"} filling out
                  the satisfaction survey...
                </span>
              </div>
            }
            type="info"
            showIcon={false}
            banner
          />
        </div>
      )}

      {newFeedbackAlert && (
        <Alert
          message="New feedback received!"
          type="success"
          showIcon
          style={{ marginBottom: 10 }}
        />
      )}

      <Table
        rowKey="_id"
        dataSource={tableData}
        columns={columns}
        rowClassName={(record) => (record._new ? "new-row-highlight" : "")}
        size="small"
        className="measurement-table"
        scroll={{ x: 900 }}
        pagination={{
          current: currentPage,
          pageSize,
          showSizeChanger: true,
          responsive: true,
          showTotal: (total, range) => `${range[0]}–${range[1]} of ${total}`,
          pageSizeOptions: ["5", "10", "20", "50", "100"],
          onChange: (page, size) => {
            setCurrentPage(page);
            if (size && size !== pageSize) {
              setPageSize(size);
              try {
                const rawUser = getDecryptedItem("user");
                const userObj = rawUser ? JSON.parse(rawUser) : null;
                const key = userObj
                  ? `measurement_table_page_size_${userObj._id}`
                  : `measurement_table_page_size_guest`;

                try {
                  setOpaqueItem(key, String(size));
                } catch {
                  localStorage.setItem(key, String(size));
                }
              } catch {}
            }
          },
        }}
      />

      {editing && (
        <MeasurementFormModal
          visible={!!editing}
          onClose={() => setEditing(null)}
          onSubmit={handleEditSubmit}
          record={editing}
        />
      )}

      {viewing && (
        <MeasurementViewModal
          visible={!!viewing}
          onClose={() => setViewing(null)}
          record={viewing}
        />
      )}
    </>
  );
}

export default MeasurementTable;
