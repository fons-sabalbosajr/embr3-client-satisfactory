import React, { useState } from "react";
import { Table, Tag, Button, Popconfirm, Tooltip } from "antd";
import { EditOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import MeasurementFormModal from "./MeasurementFormModal";
import MeasurementViewModal from "./MeasurementViewModal";

function MeasurementTable({ data, onDataRefresh }) {
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  const handleDelete = async (id) => {
    await fetch(`http://10.14.77.107:5000/api/feedback/${id}`, {
      method: "DELETE",
    });
    onDataRefresh();
  };

  const handleEditSubmit = async (updated) => {
    await fetch(`http://10.14.77.107:5000/api/feedback/${updated._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    onDataRefresh();
  };

  const columns = [
    {
      title: "Agency",
      dataIndex: ["answersLabeled", "Agency"],
    },
    {
      title: "Region",
      dataIndex: ["answersLabeled", "Region"],
    },
    {
      title: "Customer Type",
      dataIndex: ["answersLabeled", "Customer Type"],
    },
    {
      title: "Service Availed",
      render: (_, record) =>
        (record.answersLabeled["Service Availed"] || []).map((tag) => (
          <Tag key={tag} color="blue">
            {tag}
          </Tag>
        )),
    },
    {
      title: "Submitted At",
      dataIndex: "submittedAt",
      render: (d) => dayjs(d).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "Actions",
      render: (_, record) => (
        <>
          <Tooltip title="Review">
            <Button icon={<EyeOutlined />} onClick={() => setViewing(record)} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
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
              style={{ marginLeft: 8 }}
            />
          </Popconfirm>
        </>
      ),
    },
  ];

  return (
    <>
      <Table rowKey="_id" dataSource={data} columns={columns} />
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
