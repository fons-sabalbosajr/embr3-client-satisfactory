import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, DatePicker, Select, Switch, message } from 'antd';
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../../services/api';
import { getOpaqueItem } from '../../utils/encryptedStorage';
import dayjs from 'dayjs';
import './announcement.css';

const { RangePicker } = DatePicker;

export default function Announcement() {
  const [messageApi, contextHolder] = message.useMessage();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await getAnnouncements({ });
      setAnnouncements(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      console.error('Fetch announcements failed', err);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const openNew = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (item) => { setEditing(item); form.setFieldsValue({ title: item.title, message: item.message, target: item.target || 'both', active: !!item.active, startDate: item.startDate ? dayjs(item.startDate) : null, endDate: item.endDate ? dayjs(item.endDate) : null }); setModalOpen(true); };

  const handleSave = async () => {
    try {
      // Quick auth guard: ensure token exists before attempting a protected API call
      const token = getOpaqueItem('token');
      if (!token) {
        messageApi.error('Not authenticated. Please sign in as an admin before creating announcements.');
        return;
      }
      const values = await form.validateFields();
      const payload = {
        title: values.title,
        message: values.message,
        target: values.target,
        active: values.active,
        startDate: values.range?.[0] ? values.range[0].toISOString() : undefined,
        endDate: values.range?.[1] ? values.range[1].toISOString() : undefined,
      };

      if (editing) {
        await updateAnnouncement(editing._id, payload);
        messageApi.success('Announcement updated');
      } else {
        await createAnnouncement(payload);
        messageApi.success('Announcement created');
      }
      setModalOpen(false);
      fetch();
    } catch (err) {
      console.error('Save announcement failed', err);
      messageApi.error('Failed to save announcement');
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = getOpaqueItem('token');
      if (!token) return messageApi.error('Not authenticated. Please sign in as an admin.');
      await deleteAnnouncement(id);
      messageApi.success('Deleted');
      fetch();
    } catch (err) {
      messageApi.error('Delete failed');
    }
  };

  // For client-side display: prefer server-provided status === 'active'
  const activeForClient = (item) => {
    if (!item) return false;
    if (typeof item.status !== 'undefined') return item.status === 'active';
    // Fallback to previous logic
    if (!item.active) return false;
    const now = new Date();
    if (item.startDate && new Date(item.startDate) > now) return false;
    if (item.endDate && new Date(item.endDate) < now) return false;
    return true;
  };

  const isClosed = (item) => {
    if (!item) return false;
    if (!item.endDate) return false;
    try {
      const end = new Date(item.endDate);
      return end.getTime() < Date.now();
    } catch {
      return false;
    }
  };

  // Heuristic: if running under /admin path, show manager UI. Otherwise show client view.
  const isAdminRoute = window.location.pathname.startsWith('/admin');

  if (!isAdminRoute) {
    // Client view
    const visible = announcements.filter(activeForClient);
    const clientColumns = [
      { title: 'Title', dataIndex: 'title', key: 'title', render: (t, r) => <strong>{t}</strong> },
      { title: 'Message', dataIndex: 'message', key: 'message', render: (m) => <div dangerouslySetInnerHTML={{ __html: m }} /> },
      { title: 'Range', key: 'range', render: (_, r) => {
        const s = r.startDate ? dayjs(r.startDate).format('YYYY-MM-DD') : '-';
        const e = r.endDate ? dayjs(r.endDate).format('YYYY-MM-DD') : '-';
        return <small>{s} → {e}</small>;
      }},
      { title: 'Status', dataIndex: 'status', key: 'status', width: 120, filters: [ { text: 'Active', value: 'active' }, { text: 'Queued', value: 'queued' }, { text: 'Closed', value: 'closed' }, { text: 'Inactive', value: 'inactive' } ], onFilter: (value, record) => record.status === value },
    ];

    return (
      <div className="announcements-client">
        <Table
          rowKey={(r) => r._id || r.id}
          dataSource={visible}
          columns={clientColumns}
          pagination={false}
        />
      </div>
    );
  }

  // Admin manager view
  return (
      <div className="announcements-admin">
        {contextHolder}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3>Announcements Manager</h3>
        <div>
          <Button type="primary" onClick={openNew}>New Announcement</Button>
          <Button style={{ marginLeft: 8 }} onClick={fetch}>Refresh</Button>
        </div>
      </div>

      <Table
        loading={loading}
        rowKey={(r) => r._id || r.id}
        rowClassName={(r) => (isClosed(r) ? 'announcement-closed' : '')}
        dataSource={announcements}
        columns={[
          { title: 'Title', dataIndex: 'title', key: 'title', render: (t, r) => (<div><strong>{t}</strong>{r.status !== 'active' && <span style={{ marginLeft: 8, color: '#888' }}>({r.status})</span>}</div>) },
          { title: 'Message', dataIndex: 'message', key: 'message', render: (m) => <div style={{ maxHeight: 80, overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: m }} /> },
          { title: 'Target', dataIndex: 'target', key: 'target', width: 100 },
          { title: 'Range', key: 'range', width: 220, render: (_, r) => {
            const s = r.startDate ? dayjs(r.startDate).format('YYYY-MM-DD') : '-';
            const e = r.endDate ? dayjs(r.endDate).format('YYYY-MM-DD') : '-';
            return <small>{s} → {e}</small>;
          }},
          { title: 'Status', dataIndex: 'status', key: 'status', width: 120, filters: [ { text: 'Active', value: 'active' }, { text: 'Queued', value: 'queued' }, { text: 'Closed', value: 'closed' }, { text: 'Inactive', value: 'inactive' } ], onFilter: (value, record) => record.status === value },
          { title: 'Created', dataIndex: 'createdAt', key: 'createdAt', width: 120, render: (d) => dayjs(d).format('YYYY-MM-DD') },
          { title: 'Actions', key: 'actions', width: 180, render: (_, r) => (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button onClick={() => openEdit(r)} disabled={isClosed(r)}>Edit</Button>
              <Button danger onClick={() => handleDelete(r._id)} disabled={isClosed(r)}>Delete</Button>
            </div>
          ) }
        ]}
      />

      <Modal title={editing ? 'Edit Announcement' : 'New Announcement'} open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)}>
        <Form form={form} layout="vertical" initialValues={{ target: 'both', active: true }}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="message" label="Message (HTML allowed)" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="target" label="Target">
            <Select>
              <Select.Option value="both">Both</Select.Option>
              <Select.Option value="client">Client</Select.Option>
              <Select.Option value="admin">Admin</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="range" label="Active Range">
            <RangePicker />
          </Form.Item>
          <Form.Item name="active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}