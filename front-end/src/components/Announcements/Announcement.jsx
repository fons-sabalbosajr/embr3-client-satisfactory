import React, { useEffect, useState } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, DatePicker, Select,
  Switch, message, theme, Tag, Space, Popconfirm, Tooltip, Typography,
} from 'antd';
import {
  PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined,
  MailOutlined, CheckCircleOutlined, ClockCircleOutlined,
  StopOutlined, ExclamationCircleOutlined, EyeOutlined,
} from '@ant-design/icons';
import {
  getAnnouncements, createAnnouncement, updateAnnouncement,
  deleteAnnouncement, sendAnnouncementEmailApi,
} from '../../services/api';
import { getOpaqueItem } from '../../utils/encryptedStorage';
import dayjs from 'dayjs';
import './announcement.css';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const STATUS_CONFIG = {
  active:   { color: 'green',   icon: <CheckCircleOutlined />,       label: 'Active' },
  queued:   { color: 'blue',    icon: <ClockCircleOutlined />,       label: 'Queued' },
  closed:   { color: 'default', icon: <StopOutlined />,              label: 'Closed' },
  inactive: { color: 'orange',  icon: <ExclamationCircleOutlined />, label: 'Inactive' },
};

const DISPLAY_LABELS = {
  banner: 'Login Banner',
  modal:  'Popup Modal',
  both:   'Banner + Modal',
};

export default function Announcement() {
  const [messageApi, contextHolder] = message.useMessage();
  const { token } = theme.useToken();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [emailSending, setEmailSending] = useState(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getAnnouncements({});
      setAnnouncements(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      console.error('Fetch announcements failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  /* ─── CRUD handlers ─── */
  const openNew = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ target: 'both', displayMode: 'banner', active: true });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    form.setFieldsValue({
      title:       item.title,
      message:     item.message,
      target:      item.target || 'both',
      displayMode: item.displayMode || 'banner',
      active:      !!item.active,
      range:       item.startDate && item.endDate
        ? [dayjs(item.startDate), dayjs(item.endDate)]
        : item.startDate
          ? [dayjs(item.startDate), null]
          : null,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const tkn = getOpaqueItem('token');
      if (!tkn) return messageApi.error('Not authenticated. Please sign in as an admin.');

      const values = await form.validateFields();
      const payload = {
        title:       values.title,
        message:     values.message,
        target:      values.target,
        displayMode: values.displayMode,
        active:      values.active,
        startDate:   values.range?.[0] ? values.range[0].toISOString() : undefined,
        endDate:     values.range?.[1] ? values.range[1].toISOString() : undefined,
      };

      if (editing) {
        await updateAnnouncement(editing._id, payload);
        messageApi.success('Announcement updated');
      } else {
        await createAnnouncement(payload);
        messageApi.success('Announcement created');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Save announcement failed', err);
      messageApi.error(err?.response?.data?.message || 'Failed to save announcement');
    }
  };

  const handleDelete = async (id) => {
    try {
      const tkn = getOpaqueItem('token');
      if (!tkn) return messageApi.error('Not authenticated.');
      await deleteAnnouncement(id);
      messageApi.success('Announcement deleted');
      fetchData();
    } catch (err) {
      messageApi.error('Delete failed');
    }
  };

  const handleSendEmail = async (id) => {
    try {
      setEmailSending(id);
      const res = await sendAnnouncementEmailApi(id);
      const data = res.data || {};
      messageApi.success(data.message || 'Emails sent successfully');
      fetchData();
    } catch (err) {
      messageApi.error(err?.response?.data?.message || 'Failed to send announcement email');
    } finally {
      setEmailSending(null);
    }
  };

  const handlePreview = (item) => {
    setPreviewItem(item);
    setPreviewOpen(true);
  };

  /* ─── Status helpers ─── */
  const isClosed = (item) => {
    if (!item) return false;
    if (!item.endDate) return false;
    return new Date(item.endDate).getTime() < Date.now();
  };

  /* ─── Columns ─── */
  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (t, r) => (
        <Text strong style={isClosed(r) ? { color: token.colorTextQuaternary } : {}}>
          {t}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      filters: Object.entries(STATUS_CONFIG).map(([k, v]) => ({ text: v.label, value: k })),
      onFilter: (value, record) => record.status === value,
      render: (s) => {
        const cfg = STATUS_CONFIG[s] || STATUS_CONFIG.inactive;
        return <Tag icon={cfg.icon} color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: 'Display',
      dataIndex: 'displayMode',
      key: 'displayMode',
      width: 130,
      render: (v) => <Tag>{DISPLAY_LABELS[v] || v || 'Banner'}</Tag>,
    },
    {
      title: 'Target',
      dataIndex: 'target',
      key: 'target',
      width: 90,
      render: (v) => <Tag color="processing">{(v || 'both').charAt(0).toUpperCase() + (v || 'both').slice(1)}</Tag>,
    },
    {
      title: 'Validity',
      key: 'range',
      width: 200,
      render: (_, r) => {
        const s = r.startDate ? dayjs(r.startDate).format('MMM D, YYYY') : '—';
        const e = r.endDate ? dayjs(r.endDate).format('MMM D, YYYY') : '—';
        return <Text type="secondary" style={{ fontSize: 12 }}>{s} → {e}</Text>;
      },
    },
    {
      title: 'Email',
      key: 'emailSent',
      width: 80,
      align: 'center',
      render: (_, r) => r.emailSent
        ? <Tooltip title={`Sent ${r.emailSentAt ? dayjs(r.emailSentAt).format('MMM D, YYYY h:mm A') : ''}`}><Tag color="green">Sent</Tag></Tooltip>
        : <Tag>Not sent</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (_, r) => (
        <Space size={4} wrap>
          <Tooltip title="Preview">
            <Button size="small" icon={<EyeOutlined />} onClick={() => handlePreview(r)} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} disabled={isClosed(r)} />
          </Tooltip>
          <Tooltip title={r.emailSent ? 'Resend Email' : 'Send Email to All Users'}>
            <Popconfirm
              title={r.emailSent ? 'Resend this announcement email to all users?' : 'Send this announcement email to all verified users?'}
              onConfirm={() => handleSendEmail(r._id)}
              okText="Send"
            >
              <Button
                size="small"
                icon={<MailOutlined />}
                loading={emailSending === r._id}
                type={r.emailSent ? 'default' : 'primary'}
              />
            </Popconfirm>
          </Tooltip>
          <Popconfirm title="Delete this announcement?" onConfirm={() => handleDelete(r._id)} okText="Delete" okType="danger">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="announcements-admin">
      {contextHolder}

      <Card
        title={<Text strong style={{ fontSize: 18 }}>Announcements Manager</Text>}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
            <Button icon={<PlusOutlined />} type="primary" onClick={openNew}>New Announcement</Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          Manage announcements displayed on the admin login panel and/or as popup modals.
          You can set validity dates, choose display mode, and broadcast via email.
        </Text>
      </Card>

      <Card>
        <Table
          loading={loading}
          rowKey={(r) => r._id || r.id}
          dataSource={announcements}
          columns={columns}
          pagination={{ pageSize: 8 }}
          size="small"
          scroll={{ x: 900 }}
          onRow={(record) =>
            isClosed(record)
              ? { style: { color: token.colorTextQuaternary, background: token.colorFillAlter } }
              : {}
          }
        />
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        title={editing ? 'Edit Announcement' : 'New Announcement'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={600}
        okText={editing ? 'Update' : 'Create'}
      >
        <Form form={form} layout="vertical" initialValues={{ target: 'both', displayMode: 'banner', active: true }}>
          <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Title is required' }]}>
            <Input maxLength={200} showCount placeholder="e.g. System Maintenance Notice" />
          </Form.Item>
          <Form.Item name="message" label="Message (HTML supported)" rules={[{ required: true, message: 'Message is required' }]}>
            <Input.TextArea
              rows={5}
              maxLength={10000}
              showCount
              placeholder="Announcement body. HTML tags like <b>, <ul>, <a> are supported."
            />
          </Form.Item>
          <Space size={16} wrap style={{ width: '100%' }}>
            <Form.Item name="target" label="Target Audience" style={{ minWidth: 160 }}>
              <Select>
                <Select.Option value="both">Both (Client + Admin)</Select.Option>
                <Select.Option value="client">Client Only</Select.Option>
                <Select.Option value="admin">Admin Only</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="displayMode" label="Display Mode" style={{ minWidth: 170 }}>
              <Select>
                <Select.Option value="banner">Login Banner</Select.Option>
                <Select.Option value="modal">Popup Modal</Select.Option>
                <Select.Option value="both">Banner + Modal</Select.Option>
              </Select>
            </Form.Item>
          </Space>
          <Form.Item name="range" label="Validity Period">
            <RangePicker style={{ width: '100%' }} allowEmpty={[true, true]} />
          </Form.Item>
          <Form.Item name="active" label="Active" valuePropName="checked">
            <Switch checkedChildren="ON" unCheckedChildren="OFF" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Preview Modal */}
      <Modal
        title={previewItem?.title || 'Preview'}
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={<Button onClick={() => setPreviewOpen(false)}>Close</Button>}
        width={560}
      >
        {previewItem && (
          <div className="announcement-preview">
            <div style={{ marginBottom: 12 }}>
              <Space wrap>
                <Tag color={STATUS_CONFIG[previewItem.status]?.color}>{STATUS_CONFIG[previewItem.status]?.label}</Tag>
                <Tag>{DISPLAY_LABELS[previewItem.displayMode] || 'Banner'}</Tag>
                <Tag color="processing">{(previewItem.target || 'both').charAt(0).toUpperCase() + (previewItem.target || 'both').slice(1)}</Tag>
              </Space>
            </div>
            <div style={{ marginBottom: 12, fontSize: 12, color: token.colorTextSecondary }}>
              {previewItem.startDate ? dayjs(previewItem.startDate).format('MMM D, YYYY') : '—'}
              {' → '}
              {previewItem.endDate ? dayjs(previewItem.endDate).format('MMM D, YYYY') : '—'}
            </div>
            <div
              className="announcement-preview-body"
              dangerouslySetInnerHTML={{ __html: previewItem.message }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}