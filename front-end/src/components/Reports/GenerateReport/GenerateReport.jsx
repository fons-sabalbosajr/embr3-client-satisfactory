import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  DatePicker,
  Table,
  Typography,
  Space,
  Select,
  Tag,
  message,
  Pagination,
  Tooltip,
} from "antd";
import { DownloadOutlined, FileSearchOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import { getFeedbacks } from "../../../services/api";
import "./generatereport.css";

const { RangePicker } = DatePicker;
const { Title } = Typography;
const { Option } = Select;

function GenerateReport() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [dateRange, setDateRange] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    region: null,
    agency: null,
    customerType: null,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const res = await getFeedbacks();
      const data = Array.isArray(res.data) ? res.data : res;

      // Sort by submittedAt descending
      const sorted = [...data].sort(
        (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
      );

      setFeedbacks(sorted);
      setFilteredData(sorted);
    } catch (error) {
      console.error("Fetch error:", error);
      message.error("Failed to load feedback data.");
    } finally {
      setLoading(false);
    }
  };

  const getUniqueValues = (key) => {
    return [
      ...new Set(
        feedbacks.map((f) => f.answersLabeled?.[key]?.trim()).filter(Boolean)
      ),
    ];
  };

  const handleFilter = () => {
    let filtered = [...feedbacks];

    if (dateRange.length) {
      const [start, end] = dateRange;
      filtered = filtered.filter((item) => {
        const submitted = dayjs(item.submittedAt);
        return submitted.isAfter(start) && submitted.isBefore(end);
      });
    }

    if (filters.region)
      filtered = filtered.filter(
        (item) => item.answersLabeled?.Region === filters.region
      );

    if (filters.agency)
      filtered = filtered.filter(
        (item) => item.answersLabeled?.Agency === filters.agency
      );

    if (filters.customerType)
      filtered = filtered.filter(
        (item) =>
          item.answersLabeled?.["Customer Type"] === filters.customerType
      );

    setFilteredData(filtered);
    setCurrentPage(1);
  };

  const exportToExcel = () => {
    const flatData = filteredData.map(({ answersLabeled, submittedAt }) => ({
      ...answersLabeled,
      "Submitted At": dayjs(submittedAt).format("YYYY-MM-DD HH:mm"),
    }));

    const ws = XLSX.utils.json_to_sheet(flatData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(
      wb,
      `Client-Satisfactory-Report_${dayjs().format("YYYY-MM-DD")}.xlsx`
    );
  };

  const tagColors = {
    Citizen: "green",
    Business: "blue",
    Government: "geekblue",
    Others: "magenta",
  };

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

  const sqdColorMap = {
    "Strongly Agree": "green",
    Agree: "blue",
    Neutral: "orange",
    Disagree: "volcano",
    "Strongly Disagree": "red",
  };

  const columns = [
    {
      title: "Region",
      dataIndex: ["answersLabeled", "Region"],
      key: "region",
    },
    {
      title: "Agency",
      dataIndex: ["answersLabeled", "Agency"],
      key: "agency",
    },
    {
      title: "Service Availed",
      dataIndex: ["answersLabeled", "Service Availed"],
      key: "service",
      filters: Object.keys(serviceColors).map((s) => ({
        text: s,
        value: s,
      })),
      onFilter: (value, record) =>
        record.answersLabeled?.["Service Availed"]?.includes(value),
      sorter: (a, b) => {
        const aCount = a.answersLabeled?.["Service Availed"]?.length || 0;
        const bCount = b.answersLabeled?.["Service Availed"]?.length || 0;
        return bCount - aCount;
      },
      render: (services) =>
        Array.isArray(services)
          ? services.map((s, i) => (
              <Tag key={i} color={serviceColors[s] || "default"}>
                {s}
              </Tag>
            ))
          : "-",
    },
    {
      title: "Customer Type",
      dataIndex: ["answersLabeled", "Customer Type"],
      key: "customerType",
      render: (type) => <Tag color={tagColors[type] || "default"}>{type}</Tag>,
    },
    {
      title: "Age",
      dataIndex: ["answersLabeled", "Age"],
      key: "age",
    },
    {
      title: "Gender",
      dataIndex: ["answersLabeled", "Gender"],
      key: "gender",
    },
    {
      title: "Citizens Charter",
      key: "ccGroup",
      render: (_, record) => {
        const a = record.answers || {};
        const ccTags = [
          { label: "CC1", key: "answer_6870a4056988ee91c469a5e9" },
          { label: "CC2", key: "answer_6870a4396988ee91c469a5f2" },
          { label: "CC3", key: "answer_6870a4646988ee91c469a5fa" },
        ];

        const cleanCCResponse = (response = "") => {
          // Remove anything inside parentheses (e.g., "(Skip questions CC2 and CC3)")
          return response.replace(/\s*\(.*?\)\s*/gi, "").trim();
        };

        return (
          <div style={{ whiteSpace: "pre-line" }}>
            {ccTags
              .filter(({ key }) => a[key])
              .map(({ label, key }) => {
                const raw = a[key];
                const cleaned = cleanCCResponse(raw);
                const isYes = cleaned.toLowerCase().includes("yes");
                const isNo = cleaned.toLowerCase().includes("no");
                const color = isYes ? "green" : isNo ? "volcano" : "default";

                return (
                  <div key={key}>
                    <Tag color={color}>
                      {label}: {cleaned}
                    </Tag>
                  </div>
                );
              })}
          </div>
        );
      },
    },

    {
      title: "Service Quality Dimensions",
      key: "sqdGroup",
      render: (_, record) => {
        const a = record.answers || {};
        const sqdMap = {
          answer_6870a4e26988ee91c469a604:
            "I am satisfied with the service that I availed.",
          answer_6870a52d6988ee91c469a60d:
            "I spent a reasonable amount of time for my transaction. (Responsiveness)",
          answer_6870a5436988ee91c469a611:
            "The office accurately informed and followed the transaction's requirements and steps. (Reliability)",
          answer_6870a58e6988ee91c469a615:
            "My online transaction (including steps and payment) was simple and convenient. (Access and Facilities)",
          answer_6870a5c66988ee91c469a61e:
            "I easily found information about my transaction from the office or its website. (Communication)",
          answer_6870a5dd6988ee91c469a622:
            "I paid an acceptable amount of fees for my transaction. (Costs)",
          answer_6870a6556988ee91c469a634:
            "I am confident my online transaction was secure. (Integrity)",
          answer_6870a66a6988ee91c469a638:
            "The office's online support was available, or (if asked questions) online support was quick to respond. (Assurance)",
          answer_6870a67b6988ee91c469a63c:
            "I got what I needed from the government office. (Outcome)",
        };

        const tagColorMap = {
          "Strongly Agree": "green",
          Agree: "blue",
          Neutral: "orange",
          Disagree: "red",
          "Strongly Disagree": "volcano",
        };

        const tooltipBgColorMap = {
          "Strongly Agree": "#52c41a",
          Agree: "#1890ff",
          Neutral: "#faad14",
          Disagree: "#ff4d4f",
          "Strongly Disagree": "#a8071a",
        };

        return (
          <div style={{ whiteSpace: "pre-line" }}>
            {Object.entries(sqdMap).map(([key, question], index) => {
              const response = a[key];
              if (!response) return null;

              return (
                <div key={key}>
                  <Tooltip
                    title={question}
                    styles={{
                      body: {
                        backgroundColor: tooltipBgColorMap[response] || "#d9d9d9",
                        color: "#fff",
                        borderRadius: "6px",
                        fontWeight: 500,
                      },
                    }}
                  >
                    <Tag color={tagColorMap[response] || "default"}>
                      SQD {index}: {response}
                    </Tag>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        );
      },
    },
    {
      title: "Remarks",
      dataIndex: ["answers", "answer_687604cc768f4175c4364582"],
      key: "remarks",
      render: (text) => <Tag color="purple">{text}</Tag>,
    },
    {
      title: "Submitted At",
      dataIndex: "submittedAt",
      key: "submittedAt",
      sorter: (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt),
      render: (date) => dayjs(date).format("MM/DD/YYYY hh:mm A"),
    },
  ];

  return (
    <div className="generate-report-container">
      <Card>
        <Title level={4} className="generate-report-title">
          <FileSearchOutlined /> Generate Client Satisfaction Report
        </Title>

        <div className="filter-pagination-row">
          <div className="filters-left">
            <Space wrap>
              <RangePicker onChange={(dates) => setDateRange(dates)} />
              <Select
                allowClear
                placeholder="Select Region"
                style={{ width: 150 }}
                onChange={(value) => setFilters({ ...filters, region: value })}
              >
                {getUniqueValues("Region").map((r) => (
                  <Option key={r} value={r}>
                    {r}
                  </Option>
                ))}
              </Select>

              <Select
                allowClear
                placeholder="Select Agency"
                style={{ width: 150 }}
                onChange={(value) => setFilters({ ...filters, agency: value })}
              >
                {getUniqueValues("Agency").map((a) => (
                  <Option key={a} value={a}>
                    {a}
                  </Option>
                ))}
              </Select>

              <Select
                allowClear
                placeholder="Customer Type"
                style={{ width: 150 }}
                onChange={(value) =>
                  setFilters({ ...filters, customerType: value })
                }
              >
                {getUniqueValues("Customer Type").map((ct) => (
                  <Option key={ct} value={ct}>
                    {ct}
                  </Option>
                ))}
              </Select>

              <Button type="primary" onClick={handleFilter}>
                Filter
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={exportToExcel}
                disabled={!filteredData.length}
              >
                Export to Excel
              </Button>
            </Space>
          </div>

          <div className="pagination-right">
            <Pagination
              size="small"
              simple
              current={currentPage}
              pageSize={pageSize}
              total={filteredData.length}
              showSizeChanger
              pageSizeOptions={["5", "10", "20", "50", "100"]}
              onChange={(page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              }}
            />
          </div>
        </div>

        <div className="table-responsive">
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={filteredData.slice(
              (currentPage - 1) * pageSize,
              currentPage * pageSize
            )}
            loading={loading}
            bordered
            pagination={false}
            scroll={{ x: 1200 }}
          />
        </div>
      </Card>
    </div>
  );
}

export default GenerateReport;
