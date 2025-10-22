import React, { useEffect, useMemo, useState } from 'react';
import { Card, Table, Space, Typography, Input, Button, Tag } from 'antd';
import * as api from '../../../services/api';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;

function ExtractData() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [personnel, setPersonnel] = useState('');

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
      return okQ && okP;
    });
  }, [rows, search, personnel]);

  const columns = [
    { title: 'Submitted At', dataIndex: 'submittedAt', key: 'submittedAt' },
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
      Region: r.region,
      'Customer Type': r.customerType,
      'Company/Agency': r.companyOrAgency,
      'Assisted Personnel': r.assisted || '',
      'Service Availed': (r.services || []).join('; '),
    }));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Extract');
    XLSX.writeFile(wb, `survey-extract-${new Date().toISOString().slice(0,10)}.xlsx`);
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