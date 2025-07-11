import React, { useState, useEffect } from 'react';
import { Card, Col, Row, Statistic, Table, Typography, Spin, Space, Tooltip } from 'antd'; // Ant Design components
import {
  QuestionCircleOutlined,
  CheckCircleOutlined,
  StarOutlined,
  BarChartOutlined,
} from '@ant-design/icons'; // Ant Design Icons
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip, // Renamed to avoid conflict with Antd Tooltip
  Legend,
  ResponsiveContainer,
} from 'recharts';
import * as api from "../../services/api"
import './dashboard.css'; // Custom CSS for dashboard styling

const { Title, Text } = Typography;

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [questionsSummary, setQuestionsSummary] = useState({
    totalQuestions: 0,
    textQuestions: 0,
    dropdownQuestions: 0,
    radioQuestions: 0,
  });
  const [recentSurveys, setRecentSurveys] = useState([]);
  const [questionTypeData, setQuestionTypeData] = useState([]); // Data for question type bar graph

  // Mock data for demonstration. In a real app, you'd fetch these from your backend.
  const mockSurveyStats = {
    totalSurveys: 1250,
    averageOverallScore: 4.15, // Out of 5
  };

  // Mock data for survey score distribution (e.g., average score per question code)
  const mockSurveyScoreDistribution = [
    { name: 'CC1', 'Average Score': 4.5 },
    { name: 'CC2', 'Average Score': 3.8 },
    { name: 'Q3', 'Average Score': 4.2 },
    { name: 'Q4', 'Average Score': 3.5 },
    { name: 'Q5', 'Average Score': 4.7 },
  ];

  // Mock data for recent surveyed clients
  const mockRecentSurveys = [
    {
      id: 'srv001',
      clientName: 'Alpha Corp',
      surveyDate: '2024-07-10',
      overallScore: 4.2,
      status: 'Completed',
    },
    {
      id: 'srv002',
      clientName: 'Beta Solutions',
      surveyDate: '2024-07-09',
      overallScore: 3.9,
      status: 'Completed',
    },
    {
      id: 'srv003',
      clientName: 'Gamma Innovations',
      surveyDate: '2024-07-08',
      overallScore: 4.5,
      status: 'Completed',
    },
    {
      id: 'srv004',
      clientName: 'Delta Systems',
      surveyDate: '2024-07-07',
      overallScore: 3.0,
      status: 'Pending',
    },
    {
      id: 'srv005',
      clientName: 'Epsilon Tech',
      surveyDate: '2024-07-06',
      overallScore: 4.8,
      status: 'Completed',
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch questions for summary and type distribution
        const questionsResponse = await api.getQuestions();
        const allQuestions = questionsResponse.data;

        const summary = {
          totalQuestions: allQuestions.length,
          textQuestions: allQuestions.filter(q => q.questionType === 'text').length,
          dropdownQuestions: allQuestions.filter(q => q.questionType === 'dropdown').length,
          radioQuestions: allQuestions.filter(q => q.questionType === 'radio').length,
        };
        setQuestionsSummary(summary);

        // Prepare data for question type bar graph
        const typeData = [
          { name: 'Text', count: summary.textQuestions },
          { name: 'Dropdown', count: summary.dropdownQuestions },
          { name: 'Radio', count: summary.radioQuestions },
        ];
        setQuestionTypeData(typeData);

        // In a real application, you'd fetch recent surveys and survey results from your backend
        // For now, using mock data
        setRecentSurveys(mockRecentSurveys);
        // If your survey results were dynamic, you'd fetch them here too
        // setSurveyResultsData(fetchedSurveyResults);

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        // You might want to show an error message here
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const recentSurveysColumns = [
    {
      title: 'Client Name',
      dataIndex: 'clientName',
      key: 'clientName',
      sorter: (a, b) => a.clientName.localeCompare(b.clientName),
    },
    {
      title: 'Survey Date',
      dataIndex: 'surveyDate',
      key: 'surveyDate',
      sorter: (a, b) => a.surveyDate.localeCompare(b.surveyDate),
    },
    {
      title: 'Overall Score (1-5)',
      dataIndex: 'overallScore',
      key: 'overallScore',
      sorter: (a, b) => a.overallScore - b.overallScore,
      render: (score) => <Text strong style={{ color: score >= 4 ? '#52c41a' : score >= 3 ? '#faad14' : '#f5222d' }}>{score}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: 'Completed', value: 'Completed' },
        { text: 'Pending', value: 'Pending' },
      ],
      onFilter: (value, record) => record.status.indexOf(value) === 0,
      render: (status) => (
        <Text type={status === 'Completed' ? 'success' : 'warning'}>
          {status}
        </Text>
      ),
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
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          {/* Section 1: Key Statistics Cards - Using Ant Design Card and Statistic */}
          <Row gutter={[24, 24]}>
            <Col xs={24} sm={12} md={8} lg={8}>
              <Card className="dashboard-card">
                <Statistic
                  title="Total Questions"
                  value={questionsSummary.totalQuestions}
                  prefix={<QuestionCircleOutlined />}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={8}>
              <Card className="dashboard-card">
                <Statistic
                  title="Total Surveys Completed"
                  value={mockSurveyStats.totalSurveys}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#0050b3' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={24} md={8} lg={8}>
              <Card className="dashboard-card">
                <Statistic
                  title="Avg. Overall Survey Score"
                  value={mockSurveyStats.averageOverallScore}
                  precision={2}
                  prefix={<StarOutlined />}
                  valueStyle={{ color: '#d46b08' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Section 2: Question Type Distribution Bar Graph - Using Ant Design Card for container */}
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <Card
                title="Question Type Distribution"
                className="dashboard-card chart-card"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={questionTypeData} // Using this for question type distribution
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#8884d8" name="Number of Questions" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            {/* Section 3: Survey Score Distribution Bar Graph (Mocked) - Using Ant Design Card for container */}
            <Col xs={24} lg={12}>
              <Card
                title="Average Survey Score Per Question (Mock)"
                className="dashboard-card chart-card"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={mockSurveyScoreDistribution}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 5]} /> {/* Assuming score out of 5 */}
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="Average Score" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
                <Text type="secondary" style={{ fontSize: '0.8em', marginTop: '10px', display: 'block', textAlign: 'center' }}>
                  * This graph uses mock data. Integrate your survey response processing to populate real data.
                </Text>
              </Card>
            </Col>
          </Row>

          {/* Section 4: Recent Surveyed Clients Table - Using Ant Design Table and Card */}
          <Row gutter={[24, 24]}>
            <Col span={24}>
              <Card
                title="Recent Survey Submissions"
                className="dashboard-card"
              >
                <Table
                  columns={recentSurveysColumns}
                  dataSource={recentSurveys}
                  rowKey="id"
                  pagination={{ pageSize: 5 }}
                  scroll={{ x: 'max-content' }}
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