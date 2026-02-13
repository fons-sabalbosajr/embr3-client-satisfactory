import React, { useEffect, useState } from "react";
import { Button, Card, Input, DatePicker, Row, Col, Tooltip, message } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import MeasurementTable from "../Measurement/components/MeasurementTable";
import MeasurementFormModal from "../Measurement/components/MeasurementFormModal";
import { getFeedbacks } from "../../services/api";
import { exportToExcelFile } from "../../utils/excelExport";
import dayjs from "dayjs";
import socket from "../../utils/socket"; // Ensure this path is correct

const { RangePicker } = DatePicker;

function Measurement() {
  const [messageApi, contextHolder] = message.useMessage();
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState([]);
  const [editRecord, setEditRecord] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchData();

    // 👇 Listen for real-time survey submissions
    socket.on("feedbackAdded", () => {
      fetchData(); // reloads both `data` and `filtered`
    });

    return () => {
      socket.off("feedbackAdded");
    };
  }, []);

  const fetchData = async () => {
    try {
      const res = await getFeedbacks();
      setData(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.error("Failed to fetch feedbacks:", err);
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    filterData(value, dateRange);
  };

  const handleDateFilter = (dates) => {
    setDateRange(dates);
    filterData(searchTerm, dates);
  };

  const filterData = (search, dates) => {
    let result = [...data];
    if (search) {
      result = result.filter((item) =>
        Object.values(item.answersLabeled || {})
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    }
    if (dates && dates.length === 2) {
      const [start, end] = dates;
      result = result.filter((item) => {
        const submitted = dayjs(item.submittedAt);
        return submitted.isAfter(start) && submitted.isBefore(end);
      });
    }
    setFiltered(result);
  };

  const handleExport = () => {
    const exportData = filtered.map((item) => ({
      ...item.answersLabeled,
      submittedAt: dayjs(item.submittedAt).format("YYYY-MM-DD HH:mm:ss"),
    }));

    exportToExcelFile("ClientMeasurements.xlsx", exportData, "Measurements");
  };

  const openEditModal = (record) => {
    setEditRecord(record);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditRecord(null);
  };

  const handleSave = (updatedRecord) => {
    const updatedData = data.map((item) =>
      item._id === updatedRecord._id ? updatedRecord : item
    );
    setData(updatedData);
    setFiltered(updatedData);
    closeModal();
    (messageApi && messageApi.success) ? messageApi.success("Entry updated successfully.") : null;
  };

  return (
    <Card title="Client Measurement Data">
      {contextHolder}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Input.Search
            placeholder="Search..."
            onSearch={handleSearch}
            allowClear
          />
        </Col>
        <Col span={8}>
          <RangePicker onChange={handleDateFilter} />
        </Col>
        <Col span={8}>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 12,
            }}
          >
            <Tooltip title="Export to Excel">
              <Button type="primary" onClick={handleExport}>
                <ExportOutlined />
              </Button>
            </Tooltip>
          </div>
        </Col>
      </Row>

      <MeasurementTable
        data={filtered}
        onEdit={openEditModal}
        onDataRefresh={fetchData}
      />

      <MeasurementFormModal
        visible={modalVisible}
        onClose={closeModal}
        onSave={handleSave}
        record={editRecord}
      />
    </Card>
  );
}

export default Measurement;
