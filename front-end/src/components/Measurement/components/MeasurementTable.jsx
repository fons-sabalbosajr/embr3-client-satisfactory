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
import { EditOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import MeasurementFormModal from "./MeasurementFormModal";
import MeasurementViewModal from "./MeasurementViewModal";
import { deleteFeedback, updateFeedback } from "../../../services/api";
import "./measurementtable.css";
import socket from "../../../utils/socket";

function MeasurementTable({ data, onEdit, onDataRefresh }) {
  const [tableData, setTableData] = useState([...data]);
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
    await deleteFeedback(id);
    onDataRefresh();
  };

  const handleEditSubmit = async (updated) => {
    await updateFeedback(updated._id, updated);
    onDataRefresh();
  };

 const columns = [
  {
    title: "Client Type",
    render: (_, record) => {
      const company = record.answersLabeled?.["Company Name"];
      const type = record.answersLabeled?.["Customer Type"];
      return company ? (
        <div>
          <div style={{ fontWeight: 500 }}>{company}</div>
          <div style={{ fontSize: 12, color: "#888" }}>{type}</div>
        </div>
      ) : (
        <div>{type}</div>
      );
    },
    filters: Array.from(new Set(tableData.map(d => d.answersLabeled?.["Customer Type"]).filter(Boolean))).map(val => ({
      text: val,
      value: val,
    })),
    onFilter: (value, record) =>
      record.answersLabeled?.["Customer Type"] === value,
  },
  {
    title: "Gender",
    dataIndex: ["answersLabeled", "Gender"],
    filters: Array.from(new Set(tableData.map(d => d.answersLabeled?.["Gender"]).filter(Boolean))).map(val => ({
      text: val,
      value: val,
    })),
    onFilter: (value, record) =>
      record.answersLabeled?.["Gender"] === value,
  },
 

  {
    title: "Service Availed",
    render: (_, record) => {
      const services = record.answersLabeled?.["Service Availed"] || [];
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

      return (
        <div className="service-tags-container">
          {services.map((service) => (
            <Tag
              key={service}
              style={{
                backgroundColor: serviceColors[service] || "#aaa",
                color: "#fff",
                border: "none",
                marginBottom: 4,
                display: "inline-block",
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
        tableData.flatMap(d => d.answersLabeled?.["Service Availed"] || [])
      )
    ).map(service => ({
      text: service,
      value: service,
    })),
    onFilter: (value, record) =>
      (record.answersLabeled?.["Service Availed"] || []).includes(value),
  },
  {
    title: "Submitted At",
    dataIndex: "submittedAt",
    render: (d) => dayjs(d).format("MM/DD/YYYY hh:mm A"),
    sorter: (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt),
    defaultSortOrder: "descend",
  },
  {
    title: "Actions",
    render: (_, record) => (
      <>
        <Tooltip title="Review">
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => setViewing(record)}
          />
        </Tooltip>
        <Tooltip title="Edit">
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => setEditing(record)}
            style={{ marginLeft: 8 }}
          />
        </Tooltip>
        <Popconfirm
          title="Confirm delete?"
          onConfirm={() => handleDelete(record._id)}
        >
          <Button
            icon={<DeleteOutlined />}
            danger
            type="primary"
            style={{ marginLeft: 8 }}
          />
        </Popconfirm>
      </>
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
