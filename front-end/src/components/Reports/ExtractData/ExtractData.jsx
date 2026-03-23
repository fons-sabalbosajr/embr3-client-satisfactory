import React, { useEffect, useMemo, useState } from 'react';
import { Card, Table, Space, Typography, Input, Button, Tag, Select } from 'antd';
import * as api from '../../../services/api';
import { exportToExcelFile } from '../../../utils/excelExport';

const { Title, Text } = Typography;

// Infer survey type for records without surveyType stored
const inferSurveyType = (entry) => {
  if (entry.surveyType) return entry.surveyType;
  const labeled = entry.answersLabeled || {};
  if (
    labeled["Customer Type"] === "Government" &&
    (labeled["Agency Name"] === "EMB Region III" || labeled["Employee Name"])
  ) return "internal";
  return "external";
};

function ExtractData() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [personnel, setPersonnel] = useState('');
  const [surveyTypeFilter, setSurveyTypeFilter] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const res = await api.getClientSatisfactoryData();
        const data = Array.isArray(res?.data) ? res.data : [];
        const mapped = data.map((entry) => {
          const labeled = entry.answersLabeled || {};
          const services = labeled['Service Availed'] || [];
          const assisted = labeled['Assisted Personnel'] || '';
          const companyOrAgency =
            labeled['Company Name'] ||
            labeled['Unknown Question (merged_customer_age_gender_question_agencyName)'] ||
            labeled['Agency'] ||
            '—';
          const customerType = labeled['Customer Type'] || '—';
          const region = labeled['Region'] || '—';
          const submittedAt = entry.submittedAt ? new Date(entry.submittedAt).toLocaleString() : '—';
          return {
            id: entry._id,
            region,
            customerType,
            companyOrAgency,
            services,
            assisted,
            submittedAt,
            surveyType: inferSurveyType(entry),
            raw: entry,
          };
        });
        setRows(mapped);
      } catch (e) {
        console.error('Failed to fetch data for extract:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    const q = (search || '').toLowerCase();
    const p = (personnel || '').toLowerCase();
    return rows.filter((r) => {
      const hay = `${r.region} ${r.customerType} ${r.companyOrAgency} ${(r.services||[]).join(', ')} ${r.assisted}`.toLowerCase();
      const okQ = q ? hay.includes(q) : true;
      const okP = p ? String(r.assisted||'').toLowerCase().includes(p) : true;
      const okType = surveyTypeFilter ? r.surveyType === surveyTypeFilter : true;
      return okQ && okP && okType;
    });
  }, [rows, search, personnel, surveyTypeFilter]);

  const columns = [
    { title: 'Submitted At', dataIndex: 'submittedAt', key: 'submittedAt' },
    {
      title: 'Survey Type',
      dataIndex: 'surveyType',
      key: 'surveyType',
      width: 120,
      render: (type) => (
        <Tag color={type === 'internal' ? 'blue' : 'green'}>
          {type === 'internal' ? 'Internal' : 'External'}
        </Tag>
      ),
    },
    { title: 'Region', dataIndex: 'region', key: 'region' },
    { title: 'Customer Type', dataIndex: 'customerType', key: 'customerType' },
    { title: 'Company/Agency', dataIndex: 'companyOrAgency', key: 'companyOrAgency' },
    { title: 'Assisted Personnel', dataIndex: 'assisted', key: 'assisted', render: (v) => <Text>{v || '—'}</Text> },
    { title: 'Service Availed', dataIndex: 'services', key: 'services', render: (arr=[]) => (
        <Space wrap>
          {arr.map((s) => <Tag key={s}>{s}</Tag>)}
        </Space>
      )
    },
  ];

  const handleExport = () => {
    const exportRows = filtered.map((r) => ({
      'Submitted At': r.submittedAt,
      'Survey Type': r.surveyType === 'internal' ? 'Internal' : 'External',
      Region: r.region,
      'Customer Type': r.customerType,
      'Company/Agency': r.companyOrAgency,
      'Assisted Personnel': r.assisted || '',
      'Service Availed': (r.services || []).join('; '),
    }));
    exportToExcelFile(`survey-extract-${new Date().toISOString().slice(0,10)}.xlsx`, exportRows, 'Extract');
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      <Card>
        <Title level={4} style={{ marginBottom: 12 }}>Extract Data</Title>
        <Space wrap>
          <Input
            placeholder="Search (company, type, services, region)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 320 }}
          />
          <Input
            placeholder="Filter by Assisted Personnel"
            value={personnel}
            onChange={(e) => setPersonnel(e.target.value)}
            style={{ width: 260 }}
          />
          <Select
            allowClear
            placeholder="All Survey Types"
            value={surveyTypeFilter}
            onChange={(v) => setSurveyTypeFilter(v || null)}
            options={[
              { value: 'internal', label: 'Internal' },
              { value: 'external', label: 'External' },
            ]}
            style={{ width: 160 }}
          />
          <Button type="primary" onClick={handleExport}>Export to Excel</Button>
        </Space>
      </Card>

      <Card>
        <Table
          loading={loading}
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size='small'
        />
      </Card>
    </Space>
  );
}

export default ExtractData;