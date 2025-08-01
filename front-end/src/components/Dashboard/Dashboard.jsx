import React, { useState, useEffect } from "react";
import {
  Card,
  Col,
  Row,
  Statistic,
  Table,
  Typography,
  Spin,
  Space,
  Tooltip,
} from "antd";
import {
  QuestionCircleOutlined,
  CheckCircleOutlined,
  StarOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import * as api from "../../services/api";
import "./dashboard.css";

const { Title, Text } = Typography;

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSurveys: 0,
    averageOverallScore: 0,
    scoreDistribution: [],
    recentSurveys: [],
    questionTypeData: [],
    totalQuestions: 0,
  });

  const [ccResponseCounts, setCcResponseCounts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all survey responses
        const response = await api.getClientSatisfactoryData();
        const data = response.data;

        const totalSurveys = data.length;

        const ccKeys = {
          CC1: "answer_6870a4056988ee91c469a5e9",
          CC2: "answer_6870a4396988ee91c469a5f2",
          CC3: "answer_6870a4646988ee91c469a5fa",
        };

        const sqdKeys = {
          SQD0: "answer_6870a4e26988ee91c469a604",
          SQD1: "answer_6870a52d6988ee91c469a60d",
          SQD2: "answer_6870a5436988ee91c469a611",
          SQD3: "answer_6870a58e6988ee91c469a615",
          SQD4: "answer_6870a5c66988ee91c469a61e",
          SQD5: "answer_6870a5dd6988ee91c469a622",
          SQD6: "answer_6870a6556988ee91c469a634",
          SQD7: "answer_6870a66a6988ee91c469a638",
          SQD8: "answer_6870a67b6988ee91c469a63c",
        };

        const scoreKeyMap = { ...ccKeys, ...sqdKeys };
        const scoreKeys = Object.values(scoreKeyMap);

        const scoreMap = {
          "Strongly Agree": 5,
          Agree: 4,
          Neutral: 3,
          Disagree: 2,
          "Strongly Disagree": 1,
        };

        let totalScore = 0;
        let scoreCount = 0;

        const questionScores = Object.entries(scoreKeyMap).map(
          ([label, key]) => {
            let sum = 0;
            let count = 0;
            data.forEach((entry) => {
              const val = entry.answers?.[key];
              if (scoreMap[val]) {
                sum += scoreMap[val];
                count++;
                totalScore += scoreMap[val];
                scoreCount++;
              }
            });
            return {
              name: label,
              average: count ? sum / count : 0,
            };
          }
        );

        const scoreDistribution = questionScores.map((q) => ({
          name: q.name, // now short label: CC1, SQD0, etc.
          "Average Score": Number(q.average.toFixed(2)),
        }));

        const averageOverallScore = scoreCount ? totalScore / scoreCount : 0;

        const newCcResponseCounts = Object.entries(ccKeys).map(
          ([label, key]) => ({
            question: label,
            responses: data.filter((entry) => entry.answers?.[key]).length,
          })
        );
        setCcResponseCounts(newCcResponseCounts);

        const recentSurveys = data
          .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
          .slice(0, 5)
          .map((entry) => {
            const labeled = entry.answersLabeled || {};
            const customerType = labeled["Customer Type"] || "Unknown";
            const companyOrAgency =
              labeled["Company Name"] ||
              labeled[
                "Unknown Question (merged_customer_age_gender_question_agencyName)"
              ] ||
              labeled["Agency"] ||
              "—";

            const ccScores = Object.values(ccKeys)
              .map((key) => scoreMap[entry.answers?.[key]] || null)
              .filter((val) => val !== null);

            const avgCcScore = ccScores.length
              ? Number(
                  (
                    ccScores.reduce((a, b) => a + b, 0) / ccScores.length
                  ).toFixed(2)
                )
              : null;

            const sqdResponses = Object.values(sqdKeys)
              .map((key) => entry.answers?.[key])
              .filter((val) => !!val);

            const sqdPositive = sqdResponses.filter(
              (ans) => ans === "Strongly Agree" || ans === "Agree"
            ).length;

            const sqdNegative = sqdResponses.length - sqdPositive;

            const sqdScores = sqdResponses.map((val) => scoreMap[val] || null);
            const avgSqdScore = sqdScores.length
              ? Number(
                  (
                    sqdScores.reduce((a, b) => a + b, 0) / sqdScores.length
                  ).toFixed(2)
                )
              : null;

            return {
              id: entry._id,
              companyCustomerInfo: {
                name: companyOrAgency,
                type: customerType,
              },
              surveyDate: new Date(entry.submittedAt).toLocaleDateString(),
              averageCcScore: avgCcScore,
              averageSqdScore: avgSqdScore,
              sqdPositive,
              sqdNegative,
              status: "Completed",
              remarks: labeled["Remarks/Recommendations:"],
            };
          });
        const questionExcludingCitizenScores = questionScores
          .filter(
            (score) => !Object.keys(ccKeys).some((key) => key === score.name)
          )
          .map((q) => ({
            name: q.name, // now short label: CC1, SQD0, etc.
            "Average Score": Number(q.average.toFixed(2)),
          }));
        setStats({
          totalSurveys,
          averageOverallScore: Number(averageOverallScore.toFixed(2)),
          scoreDistribution,
          recentSurveys,
          questionTypeData: [
            { name: "Text", count: 5 },
            { name: "Dropdown", count: 2 },
            { name: "Radio", count: 2 },
          ],
          totalQuestions: Object.keys(scoreKeyMap).length,
          scoreDistribution: questionExcludingCitizenScores,
        });
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const recentSurveysColumns = [
    {
      title: "Company/Agency",
      dataIndex: "companyCustomerInfo",
      key: "companyCustomerInfo",
      render: (info) => (
        <div>
          <Text strong>{info.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {info.type}
          </Text>
        </div>
      ),
    },
    {
      title: "Survey Date",
      dataIndex: "surveyDate",
      key: "surveyDate",
    },
    {
      title: "Avg. CC Score",
      dataIndex: "averageCcScore",
      key: "averageCcScore",
      render: (score) =>
        score !== null ? (
          <Text strong>{score}</Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "SQD Breakdown",
      key: "sqdBreakdown",
      render: (_, record) => (
        <div>
          <Text type="success">👍 {record.sqdPositive}</Text>{" "}
          <Text type="danger">👎 {record.sqdNegative}</Text>
        </div>
      ),
    },

    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Text type={status === "Completed" ? "success" : "warning"}>
          {status}
        </Text>
      ),
    },
    {
      title: "Remarks",
      dataIndex: "remarks",
      key: "remarks",
      render: (text) => <Text>{text}</Text>,
    },
  ];

  return (
    <div className="dashboard-container">
      <Title level={2} className="dashboard-title">
        <BarChartOutlined /> Admin Dashboard
      </Title>

      {loading ? (
        <div className="dashboard-loading">
          <Spin size="large" tip="Loading Dashboard Data..." />
        </div>
      ) : (
        <Space direction="vertical" size={24} style={{ width: "100%" }}>
          {/* Key Statistics */}
          <Row gutter={[24, 24]}>
            <Col xs={24} sm={12} md={8} lg={8}>
              <Card className="dashboard-card">
                <Statistic
                  title="Total Questions"
                  value={stats.totalQuestions}
                  prefix={<QuestionCircleOutlined />}
                  valueStyle={{ color: "#3f8600" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={8}>
              <Card className="dashboard-card">
                <Statistic
                  title="Total Surveys Completed"
                  value={stats.totalSurveys}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: "#0050b3" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={24} md={8} lg={8}>
              <Card className="dashboard-card">
                <Statistic
                  title="Avg. Overall Survey Score"
                  value={stats.averageOverallScore}
                  precision={2}
                  prefix={<StarOutlined />}
                  valueStyle={{ color: "#d46b08" }}
                />
              </Card>
            </Col>
          </Row>

          {/* Question Type Distribution */}
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <Card
                title="Citizen's Charter Response Count"
                className="dashboard-card"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ccResponseCounts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="question" />
                    <YAxis allowDecimals={false} />
                    <RechartsTooltip /> {/* <== FIXED */}
                    <Bar dataKey="responses" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
                <Text
                  type="secondary"
                  style={{
                    fontSize: "0.8em",
                    marginTop: "10px",
                    display: "block",
                    textAlign: "center",
                  }}
                >
                  * Data is based on actual citizen's charter responses.
                </Text>
              </Card>
            </Col>

            {/* Survey Score Distribution */}
            <Col xs={24} lg={12}>
              <Card
                title="Average Survey Score Per Question"
                className="dashboard-card"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={stats.scoreDistribution}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-30}
                      textAnchor="end"
                      interval={0}
                      height={80}
                    />
                    <YAxis domain={[0, 5]} />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="Average Score" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
                <Text
                  type="secondary"
                  style={{
                    fontSize: "0.8em",
                    marginTop: "10px",
                    display: "block",
                    textAlign: "center",
                  }}
                >
                  * Data is based on actual survey responses.
                </Text>
              </Card>
            </Col>
          </Row>

          {/* Recent Surveyed Clients Table */}
          <Row gutter={[24, 24]}>
            <Col span={24}>
              <Card
                title="Recent Survey Submissions"
                className="dashboard-card"
              >
                <Table
                  columns={recentSurveysColumns}
                  dataSource={stats.recentSurveys}
                  rowKey="id"
                  pagination={{ pageSize: 5 }}
                  scroll={{ x: "max-content" }}
                />
              </Card>
            </Col>
          </Row>
        </Space>
      )}
    </div>
  );
}

export default Dashboard;
