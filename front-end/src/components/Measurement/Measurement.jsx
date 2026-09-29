import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Input,
  DatePicker,
  Row,
  Col,
  Tooltip,
  message,
  Typography,
  Statistic,
} from "antd";
import {
  ExportOutlined,
  DatabaseOutlined,
  TeamOutlined,
  UserOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import MeasurementTable from "../Measurement/components/MeasurementTable";
import MeasurementFormModal from "../Measurement/components/MeasurementFormModal";
import { getFeedbacks } from "../../services/api";
import { exportToExcelFile } from "../../utils/excelExport";
import { buildResponseRows, inferSurveyType } from "../../utils/responseExport";
import dayjs from "dayjs";
import socket from "../../utils/socket"; // Ensure this path is correct
import "./measurement.css";

const { RangePicker } = DatePicker;

function Measurement() {
  const [messageApi, contextHolder] = message.useMessage();
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState([]);
  const [editRecord, setEditRecord] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);

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
          .flat()
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    }
    if (dates && dates.length === 2) {
      const [start, end] = dates;
      result = result.filter((item) => {
        const submitted = dayjs(item.submittedAt);
        return (submitted.isSame(start, 'day') || submitted.isAfter(start)) && (submitted.isSame(end, 'day') || submitted.isBefore(end));
      });
    }
    setFiltered(result);
  };

  const handleExport = async () => {
    if (!filtered.length) {
      messageApi.warning("There are no responses to export.");
      return;
    }
    setExporting(true);
    try {
      // One row per response; "Service Availed" (a multi-select array) is
      // flattened to "A; B" so it survives the trip into a spreadsheet cell.
      const exportData = buildResponseRows(filtered);
      const stamp = dayjs().format("YYYY-MM-DD");
      await exportToExcelFile(`ClientMeasurements-${stamp}.xlsx`, exportData, "Measurements");
      messageApi.success(`Exported ${exportData.length} response(s).`);
    } catch (err) {
      console.error("Export failed:", err);
      messageApi.error("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
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
    if (messageApi && messageApi.success) messageApi.success("Entry updated successfully.");
  };

  return (
    <div className="measurement-page">
      {contextHolder}
      <div className="measurement-header">
        <Typography.Title level={3} className="measurement-title">
          <DatabaseOutlined /> Client Measurement Data
        </Typography.Title>
        <Typography.Text type="secondary">
          Browse, filter, and export individual client satisfaction responses.
        </Typography.Text>
      </div>

      <Row gutter={[12, 12]} className="measurement-stats">
        <Col xs={12} sm={12} md={6}>
          <Card size="small" className="ms-stat-card ms-blue">
            <Statistic
              title="Total Responses"
              value={data.length}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small" className="ms-stat-card ms-cyan">
            <Statistic
              title="Internal"
              value={data.filter((d) => inferSurveyType(d) === "internal").length}
              prefix={<TeamOutlined />}
              valueStyle={{ color: "#13c2c2" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small" className="ms-stat-card ms-green">
            <Statistic
              title="External"
              value={data.filter((d) => inferSurveyType(d) === "external").length}
              prefix={<UserOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small" className="ms-stat-card ms-orange">
            <Statistic
              title="Today"
              value={
                data.filter((d) =>
                  dayjs(d.submittedAt).isSame(dayjs(), "day")
                ).length
              }
              prefix={<CalendarOutlined />}
              valueStyle={{ color: "#fa8c16" }}
            />
          </Card>
        </Col>
      </Row>

      <Card className="measurement-table-card">
        <div className="measurement-toolbar">
          <div className="measurement-toolbar-filters">
            <Input.Search
              placeholder="Search responses..."
              onSearch={handleSearch}
              onChange={(e) => {
                if (!e.target.value) handleSearch("");
              }}
              allowClear
              className="measurement-search"
            />
            <RangePicker
              onChange={handleDateFilter}
              className="measurement-range"
              placeholder={["Start date", "End date"]}
            />
          </div>
          <div className="measurement-toolbar-actions">
            <Typography.Text type="secondary" className="measurement-count">
              Showing <strong>{filtered.length}</strong> of {data.length}
            </Typography.Text>
            <Tooltip title="Export filtered data to Excel (includes Service Availed)">
              <Button
                type="primary"
                icon={<ExportOutlined />}
                onClick={handleExport}
                loading={exporting}
                disabled={!filtered.length}
              >
                Export
              </Button>
            </Tooltip>
          </div>
        </div>

        <MeasurementTable
          data={filtered}
          onEdit={openEditModal}
          onDataRefresh={fetchData}
        />
      </Card>

      <MeasurementFormModal
        visible={modalVisible}
        onClose={closeModal}
        onSave={handleSave}
        record={editRecord}
      />
    </div>
  );
}

export default Measurement;
