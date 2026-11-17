// Developer Settings → Accounts. Developer accounts only (the server enforces
// requireDeveloper on every call this makes).
//
// What access actually means on the server:
//   • Role "Administrator" (privilege admin) passes every staff permission.
//   • Otherwise each permission below unlocks one thing.
//   • Developer access comes ONLY from the Developer position, which is set
//     on the server, never from this page.
// Older flags (canCreate, canManageUsers) no longer unlock anything; they are
// left untouched — the server updates only the keys that are sent.
import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Alert,
  Tag,
  Switch,
  Tooltip,
  Popconfirm,
  message,
} from "antd";
import {
  EditOutlined,
  SafetyCertificateOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
  CodeOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
} from "@ant-design/icons";
import * as api from "../../../services/api";
import { getSessionUser, isDeveloperUser } from "../../../utils/session";
import { setEncryptedItem } from "../../../utils/encryptedStorage";
import "./accounts.css";

const ROLES = [
  { value: "viewer", label: "Viewer", desc: "Can sign in and view dashboards, data and reports." },
  { value: "editor", label: "Editor", desc: "Viewer, plus the permissions switched on below." },
  { value: "admin", label: "Administrator", desc: "Every staff permission below, automatically." },
];
const ROLE_LABEL = { viewer: "Viewer", editor: "Editor", admin: "Administrator" };

const PERMS = [
  { key: "canEdit", label: "Edit responses", desc: "Change a submitted response in Measurement Data." },
  { key: "canDelete", label: "Delete responses", desc: "Remove a submitted response permanently." },
  { key: "canManageAnnouncements", label: "Manage announcements", desc: "Create, edit, delete and email announcements." },
];

const idOf = (u) => String(u?._id || u?.id || "");
const initials = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";

function effectivePerms(user) {
  const isAdmin = String(user?.privilege || "").toLowerCase() === "admin";
  return PERMS.filter((p) => isAdmin || user?.permissions?.[p.key]);
}

export default function Accounts() {
  const me = getSessionUser();
  const myId = idOf(me);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [access, setAccess] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editForm] = Form.useForm();
  const [accessForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const role = Form.useWatch("privilege", accessForm);

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await api.getAllUsers();
      setUsers(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      setLoadError(err?.response?.data?.message || "Could not load accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const developerCount = users.filter(isDeveloperUser).length;
  const stats = useMemo(
    () => ({
      total: users.length,
      developers: developerCount,
      admins: users.filter((u) => String(u.privilege).toLowerCase() === "admin").length,
      unverified: users.filter((u) => u.isVerified === false).length,
    }),
    [users, developerCount]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => `${u.fullname} ${u.username} ${u.email}`.toLowerCase().includes(q));
  }, [users, query]);

  // Keep the signed-in developer's cached profile in step with their edits.
  const syncSelf = (id, patch) => {
    if (id !== myId) return;
    try {
      setEncryptedItem("user", JSON.stringify({ ...me, ...patch }));
    } catch {
      /* ignore */
    }
  };

  // ── Edit profile ─────────────────────────────────────────────────────────
  const openEdit = (user) => setEditing(user);

  const saveEdit = async () => {
    const values = await editForm.validateFields();
    setSaving(true);
    try {
      const payload = { fullname: values.fullname.trim(), username: values.username.trim() };
      await api.updateUser(idOf(editing), payload);
      syncSelf(idOf(editing), payload);
      messageApi.success("Account updated.");
      setEditing(null);
      load();
    } catch (err) {
      messageApi.error(err?.response?.data?.message || "Could not update the account.");
    } finally {
      setSaving(false);
    }
  };

  // ── Manage access ────────────────────────────────────────────────────────
  const openAccess = (user) => setAccess(user);

  // Starting values for the access form. Every permission the form shows is
  // loaded, so saving can never turn one off by accident (the old form left
  // out "announcements" and revoked it on every save).
  const accessInitial = (user) => {
    const p = user?.permissions || {};
    const priv = String(user?.privilege || "").toLowerCase();
    return {
      privilege: ROLE_LABEL[priv] ? priv : undefined,
      permissions: Object.fromEntries(PERMS.map(({ key }) => [key, !!p[key]])),
    };
  };

  const accessChanges = () => {
    if (!access) return [];
    const v = accessForm.getFieldsValue(true);
    const out = [];
    const before = String(access.privilege || "").toLowerCase();
    if (v.privilege && v.privilege !== before) out.push(`Role: ${ROLE_LABEL[before] || before || "none"} → ${ROLE_LABEL[v.privilege]}`);
    PERMS.forEach(({ key, label }) => {
      const was = !!access.permissions?.[key];
      const now = !!v.permissions?.[key];
      if (was !== now) out.push(`${label}: ${now ? "granted" : "removed"}`);
    });
    return out;
  };

  const saveAccess = async () => {
    const v = accessForm.getFieldsValue(true);
    const changes = accessChanges();
    if (!changes.length) {
      setAccess(null);
      return;
    }
    setSaving(true);
    try {
      const payload = { permissions: Object.fromEntries(PERMS.map(({ key }) => [key, !!v.permissions?.[key]])) };
      if (v.privilege) payload.privilege = v.privilege;
      await api.updateUser(idOf(access), payload);
      syncSelf(idOf(access), { privilege: payload.privilege ?? access.privilege, permissions: { ...(access.permissions || {}), ...payload.permissions } });
      messageApi.success(`Access updated for ${access.fullname || access.username}.`);
      setAccess(null);
      load();
    } catch (err) {
      messageApi.error(err?.response?.data?.message || "Could not update access.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const remove = async (user) => {
    try {
      await api.deleteUser(idOf(user));
      messageApi.success(`${user.fullname || user.username} was deleted.`);
      load();
    } catch (err) {
      messageApi.error(err?.response?.data?.message || "Could not delete the account.");
    }
  };

  const deleteBlock = (user) => {
    if (idOf(user) === myId) return "You can't delete your own account.";
    if (isDeveloperUser(user) && developerCount <= 1) return "The only Developer account can't be deleted.";
    return "";
  };

  const columns = [
    {
      title: "Account",
      key: "account",
      render: (_, u) => (
        <div className="acc-user">
          <span className={`acc-avatar${isDeveloperUser(u) ? " is-dev" : ""}`}>{initials(u.fullname || u.username)}</span>
          <div className="acc-user-text">
            <span className="acc-name">
              {u.fullname || "—"}
              {idOf(u) === myId && <Tag className="acc-you">You</Tag>}
            </span>
            <span className="acc-sub">@{u.username}{u.email ? ` · ${u.email}` : ""}</span>
          </div>
        </div>
      ),
    },
    {
      title: "Role",
      key: "role",
      width: 210,
      render: (_, u) => {
        const priv = String(u.privilege || "").toLowerCase();
        return (
          <div className="acc-tags">
            {isDeveloperUser(u) && <Tag color="red" icon={<CodeOutlined />}>Developer</Tag>}
            {ROLE_LABEL[priv] ? (
              <Tag color={priv === "admin" ? "blue" : priv === "editor" ? "geekblue" : "default"}>{ROLE_LABEL[priv]}</Tag>
            ) : isDeveloperUser(u) ? null : (
              <Tooltip title={`"${u.privilege || "none"}" is not a recognised role and grants nothing. Set a role in Manage access.`}>
                <Tag color="warning">No role</Tag>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: "Staff permissions",
      key: "perms",
      render: (_, u) => {
        const list = effectivePerms(u);
        if (isDeveloperUser(u)) return <span className="acc-perm-all">Full access (Developer)</span>;
        if (String(u.privilege).toLowerCase() === "admin") return <span className="acc-perm-all">All staff permissions</span>;
        return list.length ? (
          <div className="acc-tags">{list.map((p) => <Tag key={p.key}>{p.label}</Tag>)}</div>
        ) : (
          <span className="acc-muted">View only</span>
        );
      },
    },
    {
      title: "Status",
      key: "status",
      width: 120,
      render: (_, u) =>
        u.isVerified === false ? (
          <span className="acc-status is-pending"><ClockCircleOutlined /> Unverified</span>
        ) : (
          <span className="acc-status is-ok"><CheckCircleFilled /> Verified</span>
        ),
    },
    {
      title: "",
      key: "actions",
      align: "right",
      width: 230,
      render: (_, u) => {
        const block = deleteBlock(u);
        return (
          <div className="acc-actions">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(u)}>Edit</Button>
            <Button size="small" type="primary" ghost icon={<SafetyCertificateOutlined />} onClick={() => openAccess(u)}>
              Access
            </Button>
            {block ? (
              <Tooltip title={block}>
                <Button size="small" danger icon={<DeleteOutlined />} disabled aria-label="Delete" />
              </Tooltip>
            ) : (
              <Popconfirm
                title={`Delete ${u.fullname || u.username}?`}
                description="The account is removed permanently. Their past actions stay in App Logs."
                okText="Delete"
                okButtonProps={{ danger: true }}
                onConfirm={() => remove(u)}
              >
                <Button size="small" danger icon={<DeleteOutlined />} aria-label={`Delete ${u.fullname || u.username}`} />
              </Popconfirm>
            )}
          </div>
        );
      },
    },
  ];

  const isAdminRole = role === "admin";

  return (
    <div className="acc">
      {contextHolder}
      <div className="acc-stats">
        <div className="acc-stat"><span>{stats.total}</span>Accounts</div>
        <div className="acc-stat"><span>{stats.developers}</span>Developers</div>
        <div className="acc-stat"><span>{stats.admins}</span>Administrators</div>
        <div className={`acc-stat${stats.unverified ? " is-warn" : ""}`}><span>{stats.unverified}</span>Unverified</div>
      </div>

      <div className="acc-toolbar">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search by name, username or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="acc-search"
        />
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
      </div>

      {loadError && <Alert type="error" showIcon message={loadError} style={{ marginBottom: 12 }} />}

      <Table
        className="acc-table"
        columns={columns}
        dataSource={filtered}
        rowKey={idOf}
        loading={loading}
        pagination={filtered.length > 10 ? { pageSize: 10 } : false}
        scroll={{ x: 900 }}
        size="middle"
      />

      {/* Edit profile */}
      <Modal
        title="Edit account"
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={saveEdit}
        okText="Save"
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form
          key={idOf(editing)}
          form={editForm}
          layout="vertical"
          requiredMark={false}
          initialValues={{ fullname: editing?.fullname || "", username: editing?.username || "" }}
        >
          <Form.Item label="Full name" name="fullname" rules={[{ required: true, whitespace: true, message: "Enter a full name" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Username" name="username" rules={[{ required: true, whitespace: true, message: "Enter a username" }]}>
            <Input />
          </Form.Item>
        </Form>
        <p className="acc-muted">Role and permissions are under <strong>Access</strong>.</p>
      </Modal>

      {/* Manage access */}
      <Modal
        title={access ? `Access — ${access.fullname || access.username}` : "Access"}
        open={!!access}
        onCancel={() => setAccess(null)}
        onOk={saveAccess}
        okText="Save access"
        confirmLoading={saving}
        width={560}
        destroyOnHidden
      >
        {access && (
          <Form
            key={idOf(access)}
            form={accessForm}
            layout="vertical"
            requiredMark={false}
            className="acc-access"
            initialValues={accessInitial(access)}
          >
            <div className="acc-dev-row">
              <CodeOutlined />
              <div>
                <strong>Developer access: {isDeveloperUser(access) ? "Yes" : "No"}</strong>
                <span>Comes only from the Developer position, which is set on the server — not from this form.</span>
              </div>
            </div>

            {!ROLE_LABEL[String(access.privilege || "").toLowerCase()] && (
              <Alert
                type="warning"
                showIcon
                className="acc-legacy"
                message={`Current role "${access.privilege || "none"}" is not recognised and grants nothing.`}
                description="Choose a role below, or leave it unselected to keep the current value."
              />
            )}

            <Form.Item name="privilege" label="Role">
              <RoleCards />
            </Form.Item>

            <div className="acc-perm-head">Staff permissions</div>
            {PERMS.map((p) => (
              <div className="acc-perm" key={p.key}>
                <div>
                  <strong>{p.label}</strong>
                  <span>{p.desc}</span>
                </div>
                {isAdminRole ? (
                  <Tag color="blue">Included</Tag>
                ) : (
                  <Form.Item name={["permissions", p.key]} valuePropName="checked" noStyle>
                    <Switch aria-label={p.label} />
                  </Form.Item>
                )}
              </div>
            ))}

            <Form.Item shouldUpdate noStyle>
              {() => {
                const changes = accessChanges();
                return changes.length ? (
                  <div className="acc-changes">
                    <strong>Changes to save</strong>
                    <ul>{changes.map((c) => <li key={c}>{c}</li>)}</ul>
                  </div>
                ) : (
                  <p className="acc-muted acc-nochange">No changes yet.</p>
                );
              }}
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}

function RoleCards({ value, onChange }) {
  return (
    <div className="acc-roles" role="radiogroup" aria-label="Role">
      {ROLES.map((r) => (
        <button
          type="button"
          key={r.value}
          role="radio"
          aria-checked={value === r.value}
          className={`acc-role${value === r.value ? " is-on" : ""}`}
          onClick={() => onChange?.(r.value)}
        >
          <strong>{r.label}</strong>
          <span>{r.desc}</span>
        </button>
      ))}
    </div>
  );
}
