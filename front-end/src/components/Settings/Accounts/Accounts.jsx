import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Alert,
  Typography,
  Space,
  Checkbox,
  Popconfirm,
} from "antd";
import * as api from "../../../services/api";
import { getDecryptedItem } from "../../../utils/encryptedStorage";
import Swal from "sweetalert2";

const { Title } = Typography;
const privilegeOptions = [
  { label: "Admin", value: "admin" },
  { label: "Editor", value: "editor" },
  { label: "Viewer", value: "viewer" },
  { label: "Client", value: "client" },
  { label: "Developer", value: "developer" },
];

export default function Accounts() {
  const [users, setUsers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [accessModalVisible, setAccessModalVisible] = useState(false);
  const [accessUser, setAccessUser] = useState(null);
  const [accessForm] = Form.useForm();

  const currentUser = (() => {
    try {
      const raw = getDecryptedItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await api.getAllUsers();
        setUsers(Array.isArray(res.data.data) ? res.data.data : []);
      } catch (err) {
        console.error("Error fetching users:", err);
        setUsers([]);
      }
    }
    fetchUsers();
  }, []);

  useEffect(() => {
    if (modalVisible && editingUser) {
      const privilegeValue = (editingUser.privilege || "")
        .toString()
        .toLowerCase();
      form.setFieldsValue({
        fullname: editingUser.fullname || "",
        username: editingUser.username || "",
        privilege: privilegeValue,
      });
    }
    if (accessModalVisible && accessUser) {
      const pv = (accessUser.privilege || "").toString().toLowerCase();
      const perms = accessUser.permissions || {};
      accessForm.setFieldsValue({
        privilege: pv,
        permissions: {
          canCreate: !!perms.canCreate,
          canEdit: !!perms.canEdit,
          canDelete: !!perms.canDelete,
          canManageUsers: !!perms.canManageUsers,
        },
      });
    }
  }, [modalVisible, editingUser, accessModalVisible, accessUser]);

  const handleEdit = (user) => {
    form.resetFields();
    setEditingUser(user);
    setModalVisible(true);
    setTimeout(() => {
      try {
        form.setFieldsValue({
          fullname: user.fullname || "",
          username: user.username || "",
          privilege: (user.privilege || "").toString().toLowerCase(),
        });
      } catch (err) {
        console.debug("form.setFieldsValue failed in handleEdit:", err);
      }
    }, 50);
  };

  const handleManageAccess = (user) => {
    setAccessUser(user);
    setAccessModalVisible(true);
    setTimeout(() => {
      try {
        accessForm.setFieldsValue({
          privilege: (user.privilege || "").toString().toLowerCase(),
          permissions: user.permissions || {},
        });
      } catch (err) {
        console.debug(
          "accessForm.setFieldsValue failed in handleManageAccess:",
          err
        );
      }
    }, 50);
  };

  const handleModalOk = async () => {
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      if (!editingUser) throw new Error("No user selected");
      const values = await form.validateFields();
      await api.updateUser(editingUser._id, values);
      setSuccess(true);
      setModalVisible(false);
      setEditingUser(null);
      Swal.fire({
        icon: "success",
        title: "User Updated",
        text: "The user account has been successfully updated.",
      });
      const res = await api.getAllUsers();
      setUsers(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (e) {
      console.error("Update user failed:", e);
      setError(
        e.response?.data?.message ||
          e.message ||
          "Failed to update user. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAccess = async () => {
    try {
      const values = await accessForm.validateFields();
      if (!accessUser) throw new Error("No user selected");

      const perms = values.permissions || {};
      const summaryLines = [
        `Privilege: ${values.privilege || "(unchanged)"}`,
        `Can Create: ${perms.canCreate ? "Yes" : "No"}`,
        `Can Edit: ${perms.canEdit ? "Yes" : "No"}`,
        `Can Delete: ${perms.canDelete ? "Yes" : "No"}`,
        `Can Manage Users: ${perms.canManageUsers ? "Yes" : "No"}`,
        `Can Manage Announcements: ${perms.canManageAnnouncements ? "Yes" : "No"}`,
      ];

      const result = await Swal.fire({
        title: `Update access for ${
          accessUser.fullname || accessUser.username
        }`,
        html: `<pre style="text-align:left">${summaryLines.join("\n")}</pre>`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, update",
        cancelButtonText: "Cancel",
      });

      if (!result.isConfirmed) return;

      setLoading(true);
      setError("");
      setSuccess(false);

      await api.updateUser(accessUser._id, {
        privilege: values.privilege,
        permissions: perms,
      });

      setAccessModalVisible(false);
      setSuccess(true);
      await Swal.fire({
        icon: "success",
        title: "Access updated",
        showConfirmButton: false,
        timer: 1400,
      });

      const res = await api.getAllUsers();
      setUsers(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      console.error("Update access failed:", err);
      setError(
        err.response?.data?.message || err.message || "Failed to update access"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (currentUser && currentUser._id === user._id) {
      Swal.fire({ icon: "error", title: "Cannot delete your own account" });
      return;
    }
    const result = await Swal.fire({
      title: `Delete user "${user.fullname || user.username}"?`,
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff4d4f",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;
    try {
      await api.deleteUser(user._id);
      Swal.fire({ icon: "success", title: "User deleted", showConfirmButton: false, timer: 1400 });
      const res = await api.getAllUsers();
      setUsers(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Failed to delete user",
        text: err.response?.data?.message || err.message,
      });
    }
  };

  const columns = [
    { title: "Full Name", dataIndex: "fullname", key: "fullname" },
    { title: "Username", dataIndex: "username", key: "username" },
    { title: "Privilege", dataIndex: "privilege", key: "privilege" },
    {
      title: "Actions",
      key: "actions",
      render: (_, user) => (
        <Space>
          <Button type="primary" size="small" onClick={() => handleEdit(user)}>
            Edit
          </Button>
          <Button type="primary" size="small" onClick={() => handleManageAccess(user)}>
            Manage Access
          </Button>
          <Button
            danger
            size="small"
            disabled={currentUser && currentUser._id === user._id}
            onClick={() => handleDeleteUser(user)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>Accounts Management</Title>
      <Alert
        message="Manage all users of the system. Edit privileges, modify accounts, and control access."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Table
        columns={columns}
        dataSource={users}
        rowKey="_id"
        pagination={false}
      />

      <Modal
        title="Edit User Account"
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setModalVisible(false);
          setEditingUser(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Full Name"
            name="fullname"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Privilege"
            name="privilege"
            rules={[{ required: true }]}
          >
            <Select options={privilegeOptions} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={handleModalOk} loading={loading}>
              Update Account
            </Button>
          </Form.Item>
          {success && (
            <Alert
              message="Account updated!"
              type="success"
              showIcon
              style={{ marginTop: 8 }}
            />
          )}
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              style={{ marginTop: 8 }}
            />
          )}
        </Form>
      </Modal>

      <Modal
        title="Manage User Access"
        open={accessModalVisible}
        onCancel={() => {
          setAccessModalVisible(false);
          setAccessUser(null);
          accessForm.resetFields();
        }}
        footer={null}
      >
        <Alert
          message="Update user accessibility and permissions."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={accessForm} layout="vertical">
          <Form.Item label="Privilege" name="privilege">
            <Select options={privilegeOptions} />
          </Form.Item>
          <Form.Item label="Permissions" shouldUpdate>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Form.Item
                name={["permissions", "canCreate"]}
                valuePropName="checked"
                noStyle
              >
                <Checkbox>Create items</Checkbox>
              </Form.Item>
              <Form.Item
                name={["permissions", "canEdit"]}
                valuePropName="checked"
                noStyle
              >
                <Checkbox>Edit items</Checkbox>
              </Form.Item>
              <Form.Item
                name={["permissions", "canDelete"]}
                valuePropName="checked"
                noStyle
              >
                <Checkbox>Delete items</Checkbox>
              </Form.Item>
              <Form.Item
                name={["permissions", "canManageUsers"]}
                valuePropName="checked"
                noStyle
              >
                <Checkbox>Manage users</Checkbox>
              </Form.Item>
              <Form.Item
                name={["permissions", "canManageAnnouncements"]}
                valuePropName="checked"
                noStyle
              >
                <Checkbox>Manage announcements</Checkbox>
              </Form.Item>
            </div>
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              onClick={handleUpdateAccess}
              loading={loading}
            >
              Update Access
            </Button>
          </Form.Item>
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              style={{ marginTop: 8 }}
            />
          )}
        </Form>
      </Modal>
    </div>
  );
}
