import React, { useState, useEffect, useRef } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Dropdown,
  Select,
  Tag,
  Space,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  MoreOutlined,
  SearchOutlined,
  BookOutlined,
  CheckSquareOutlined,
  DownCircleOutlined,
} from "@ant-design/icons";
import Swal from "sweetalert2";
import io from "socket.io-client";
import Highlighter from "react-highlight-words";
import * as api from "../../../services/api";
import { categorizeServices } from "../../../utils/serviceCategories";
import { getCurrentUserFullname } from "../../../services/authService";
import { getDecryptedItem } from "../../../utils/encryptedStorage";
import "./dataconfig.css";

const { Option } = Select;
const SOCKET_SERVER_URL = "/";

function DataConfig() {
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [currentUser, setCurrentUser] = useState("");
  const [addQuestionType, setAddQuestionType] = useState("text");
  const [editQuestionType, setEditQuestionType] = useState("text");
  const [quickExternalName, setQuickExternalName] = useState("");
  const [quickExternalLoading, setQuickExternalLoading] = useState(false);

  const [globalSearchText, setGlobalSearchText] = useState("");
  const [columnSearchText, setColumnSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");
  const searchInputRef = useRef(null);

  const [typeFilters, setTypeFilters] = useState([]);
  const [userFilters, setUserFilters] = useState([]);

  const [addFormInitialValues, setAddFormInitialValues] = useState({
    questionType: "text",
    options: "",
  });

  const [perms, setPerms] = useState({
    canCreate: false,
    canEdit: false,
    canDelete: false,
  });

  const socket = useRef(null);
  const [svcCategories, setSvcCategories] = useState({ internal: [], external: [] });
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catForm] = Form.useForm();
  const [catLoading, setCatLoading] = useState(false);
  const [catItems, setCatItems] = useState([]);

  useEffect(() => {
    fetchQuestions();
  fetchCategories();

    const fetchedUser = getCurrentUserFullname();
    setCurrentUser(fetchedUser);

    // Read permissions from stored user object (defensive)
    try {
      const raw = getDecryptedItem("user");
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed) {
        const priv = (parsed.privilege || "").toLowerCase();
        const pos = (parsed.position || "").toLowerCase();
        const isDeveloper = priv === "developer" || pos === "developer";

        if (isDeveloper) {
          // Developer override: full access
          setPerms({ canCreate: true, canEdit: true, canDelete: true });
        } else if (parsed.permissions) {
          setPerms({
            canCreate: !!parsed.permissions.canCreate,
            canEdit: !!parsed.permissions.canEdit,
            canDelete: !!parsed.permissions.canDelete,
          });
        } else if (priv) {
          setPerms({
            canCreate: priv === "admin",
            canEdit: priv === "admin",
            canDelete: priv === "admin",
          });
        }
      }
    } catch (e) {
      console.warn("Failed to parse user permissions:", e);
    }

    socket.current = io(SOCKET_SERVER_URL);

    socket.current.on("connect", () => {
      // connected
    });

    socket.current.on("questionAdded", (newQuestion) => {
      setQuestions((prevQuestions) => [...prevQuestions, newQuestion]);
    });

    socket.current.on("questionUpdated", (updatedQuestion) => {
      setQuestions((prevQuestions) =>
        prevQuestions.map((q) => (q._id === updatedQuestion._id ? updatedQuestion : q))
      );
    });

    socket.current.on("questionDeleted", (deletedQuestionId) => {
      setQuestions((prevQuestions) => prevQuestions.filter((q) => q._id !== deletedQuestionId));
    });

    return () => {
      if (socket.current) socket.current.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentUser) {
      setAddFormInitialValues((prevValues) => ({ ...prevValues, user: currentUser }));
    }
  }, [currentUser]);

  useEffect(() => {
    const lowercasedGlobalSearchText = globalSearchText.toLowerCase();
    const newFilteredQuestions = questions.filter((question) =>
      question.questionCode.toLowerCase().includes(lowercasedGlobalSearchText) ||
      question.questionText.toLowerCase().includes(lowercasedGlobalSearchText) ||
      question.questionType.toLowerCase().includes(lowercasedGlobalSearchText) ||
      (question.user && question.user.toLowerCase().includes(lowercasedGlobalSearchText)) ||
      (question.options && question.options.some((option) => option.toLowerCase().includes(lowercasedGlobalSearchText)))
    );
    setFilteredQuestions(newFilteredQuestions);

    const uniqueTypes = [...new Set(questions.map((q) => q.questionType))].sort();
    setTypeFilters(uniqueTypes.map((type) => ({ text: type, value: type })));

    const uniqueUsers = [...new Set(questions.map((q) => q.user))].sort();
    setUserFilters(uniqueUsers.map((user) => ({ text: user, value: user })));

  }, [questions, globalSearchText]);

  const fetchCategories = async () => {
    try {
      const res = await api.getServiceCategories();
      const list = res.data?.data || [];
      setCatItems(list);
      const internal = list.filter((x) => x.type === 'internal').map((x) => x.name);
      const external = list.filter((x) => x.type === 'external').map((x) => x.name);
      setSvcCategories({ internal, external });
    } catch (e) {
      // non-fatal; fallback to static if any
      console.warn('Failed to fetch service categories', e);
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const response = await api.getQuestions();
      setQuestions(response.data);
    } catch (error) {
      Swal.fire({ icon: "error", title: "Oops...", text: "Failed to fetch questions. Please check your backend connection." });
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleColumnSearch = (selectedKeys, confirm, dataIndex) => {
    confirm();
    setColumnSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };

  const handleColumnReset = (clearFilters) => {
    clearFilters();
    setColumnSearchText("");
    setSearchedColumn("");
  };

  const getColumnSearchProps = (dataIndex) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInputRef}
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => handleColumnSearch(selectedKeys, confirm, dataIndex)}
          style={{ marginBottom: 8, display: "block" }}
        />
        <Space>
          <Button type="primary" onClick={() => handleColumnSearch(selectedKeys, confirm, dataIndex)} icon={<SearchOutlined />} size="small" style={{ width: 90 }}>
            Search
          </Button>
          <Button onClick={() => handleColumnReset(clearFilters)} size="small" style={{ width: 90 }}>
            Reset
          </Button>
          <Button type="link" size="small" onClick={() => { confirm({ closeDropdown: false }); setSearchedColumn(dataIndex); }}>
            Filter
          </Button>
          <Button type="link" size="small" onClick={() => { close(); }}>
            Close
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />,
    onFilter: (value, record) => {
      if (dataIndex === "options") {
        return record.options && record.options.some((option) => String(option).toLowerCase().includes(String(value).toLowerCase()));
      }
      return record[dataIndex].toString().toLowerCase().includes(String(value).toLowerCase());
    },
    onFilterDropdownOpenChange: (visible) => { if (visible) setTimeout(() => searchInputRef.current?.select(), 100); },
    render: (text) => searchedColumn === dataIndex ? (
      <Highlighter highlightStyle={{ backgroundColor: "#ffc069", padding: 0 }} searchWords={[columnSearchText]} autoEscape textToHighlight={text ? text.toString() : ""} />
    ) : (text),
  });

  const showAddModal = () => {
    if (!perms.canCreate) {
      Swal.fire({ icon: "error", title: "Permission denied", text: "You don't have permission to create questions." });
      return;
    }
    addForm.resetFields();
    setAddQuestionType("text");
    setIsAddModalVisible(true);
  };

  const handleAddOk = async () => {
    if (!perms.canCreate) {
      Swal.fire({ icon: "error", title: "Permission denied", text: "You don't have permission to create questions." });
      return;
    }
    try {
      const values = await addForm.validateFields();
      setLoading(true);

      const newQuestion = {
        questionCode: values.questionCode,
        questionText: values.questionText,
        questionType: values.questionType,
        user: values.user,
      };

      if (values.questionType === "dropdown" || values.questionType === "radio") {
        newQuestion.options = values.options ? values.options.split(",").map((option) => option.trim()).filter((option) => option !== "") : [];
      } else {
        newQuestion.options = [];
      }

      await api.createQuestion(newQuestion);
      Swal.fire({ icon: "success", title: "Added!", text: "Question added successfully!", showConfirmButton: false, timer: 1500 });
      setIsAddModalVisible(false);
      fetchQuestions();
    } catch (info) {
      console.log("Validate Failed:", info);
      let errorMessage = "Failed to add question. Please try again.";
      if (info.errorFields) {
        errorMessage = "Please fill in all required fields correctly.";
      } else if (info.response && info.response.data && info.response.data.message) {
        errorMessage = info.response.data.message;
      }
      Swal.fire({ icon: "error", title: "Error!", text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCancel = () => {
    setIsAddModalVisible(false);
  };

  const showEditModal = (record) => {
    if (!perms.canEdit) {
      Swal.fire({ icon: "error", title: "Permission denied", text: "You don't have permission to edit questions." });
      return;
    }
    setEditingQuestion(record);
    setEditQuestionType(record.questionType || "text");
    editForm.setFieldsValue({
      questionCode: record.questionCode,
      questionText: record.questionText,
      questionType: record.questionType || "text",
      options: record.options ? record.options.join(", ") : "",
      user: record.user,
    });
    setIsEditModalVisible(true);
  };

  const handleEditOk = async () => {
    if (!perms.canEdit) {
      Swal.fire({ icon: "error", title: "Permission denied", text: "You don't have permission to edit questions." });
      return;
    }
    try {
      const values = await editForm.validateFields();
      setLoading(true);

      const updatedQuestion = {
        ...editingQuestion,
        questionCode: values.questionCode,
        questionText: values.questionText,
        questionType: values.questionType,
        user: values.user,
        updatedAt: new Date(),
      };

      if (values.questionType === "dropdown" || values.questionType === "radio") {
        updatedQuestion.options = values.options ? values.options.split(",").map((option) => option.trim()).filter((option) => option !== "") : [];
      } else {
        updatedQuestion.options = [];
      }

      await api.updateQuestion(editingQuestion._id, updatedQuestion);
      Swal.fire({ icon: "success", title: "Updated!", text: "Question updated successfully!", showConfirmButton: false, timer: 1500 });
      setIsEditModalVisible(false);
      setEditingQuestion(null);
      fetchQuestions();
    } catch (info) {
      console.log("Validate Failed:", info);
      let errorMessage = "Failed to update question. Please try again.";
      if (info.errorFields) {
        errorMessage = "Please fill in all required fields correctly.";
      } else if (info.response && info.response.data && info.response.data.message) {
        errorMessage = info.response.data.message;
      }
      Swal.fire({ icon: "error", title: "Error!", text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleEditCancel = () => {
    setIsEditModalVisible(false);
    setEditingQuestion(null);
  };

  const handleDelete = async (id) => {
    if (!perms.canDelete) {
      Swal.fire({ icon: "error", title: "Permission denied", text: "You don't have permission to delete questions." });
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        try {
          await api.deleteQuestion(id);
          Swal.fire("Deleted!", "The question has been deleted.", "success");
          fetchQuestions();
        } catch (error) {
          Swal.fire({ icon: "error", title: "Error!", text: "Failed to delete question. Please try again." });
          console.error("Error deleting question:", error);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const getQuestionTypeTag = (type) => {
    switch (type) {
      case "text":
        return (
          <Tag color="blue" icon={<BookOutlined />}>Text</Tag>
        );
      case "dropdown":
        return (
          <Tag color="green" icon={<DownCircleOutlined />}>Dropdown</Tag>
        );
      case "radio":
        return (
          <Tag color="orange" icon={<CheckSquareOutlined />}>Radio Button</Tag>
        );
      default:
        return <Tag>{type}</Tag>;
    }
  };

  const columns = [
    {
      title: "Question Code",
      dataIndex: "questionCode",
      key: "questionCode",
      sorter: (a, b) => a.questionCode.localeCompare(b.questionCode),
      width: "15%",
      ...getColumnSearchProps("questionCode"),
    },
    // Note: Service categories apply to 'Services Availed' OPTIONS, not per-question.
    {
      title: "Type",
      dataIndex: "questionType",
      key: "questionType",
      sorter: (a, b) => a.questionType.localeCompare(b.questionType),
      width: "12%",
      render: (type) => getQuestionTypeTag(type),
      filters: typeFilters,
      onFilter: (value, record) => record.questionType === value,
    },
    {
      title: "Question Description",
      dataIndex: "questionText",
      key: "questionText",
      sorter: (a, b) => a.questionText.localeCompare(b.questionText),
      ellipsis: true,
      width: "30%",
      ...getColumnSearchProps("questionText"),
    },
    {
      title: "Options",
      dataIndex: "options",
      key: "options",
      ...getColumnSearchProps("options"),
      render: (options, record) => {
        if (!options || options.length === 0) return "N/A";
        // Prefer dynamic categories from server; fallback to static helper
        const toKey = (s) => String(s || "").trim().toLowerCase();
        const intSet = new Set((svcCategories.internal || []).map(toKey));
        const extSet = new Set((svcCategories.external || []).map(toKey));
        let internal = [];
        let external = [];
        let other = [];
        if (intSet.size || extSet.size) {
          options.forEach((opt) => {
            const k = toKey(opt);
            if (intSet.has(k)) internal.push(opt);
            else if (extSet.has(k)) external.push(opt);
            else other.push(opt);
          });
        } else {
          const grouped = categorizeServices(options);
          internal = grouped.internal;
          external = grouped.external;
          other = grouped.other;
        }

        // If none matched known services, fall back to previous simple rendering
        const matchedCount = internal.length + external.length;
        if (matchedCount === 0) {
          let displayText =
            record.questionType === "dropdown" || record.questionType === "radio"
              ? options.join(",\n")
              : options.join(", ");
          const textToHighlight = displayText ? displayText.toString() : "";
          return (
            <span style={{ whiteSpace: "pre-wrap" }}>
              {searchedColumn === "options" && columnSearchText ? (
                <Highlighter
                  highlightStyle={{ backgroundColor: "#ffc069", padding: 0 }}
                  searchWords={[columnSearchText]}
                  autoEscape
                  textToHighlight={textToHighlight}
                />
              ) : (
                textToHighlight
              )}
            </span>
          );
        }

        // Render grouped services
        return (
          <div style={{ whiteSpace: "pre-wrap" }}>
            {internal.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <strong>Internal Services</strong>
                <div>{internal.join(", ")}</div>
              </div>
            )}
            {external.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <strong>External Services</strong>
                <div>{external.join(", ")}</div>
              </div>
            )}
            {other.length > 0 && (
              <div>
                <strong>Other</strong>
                <div>{other.join(", ")}</div>
              </div>
            )}
          </div>
        );
      },
      width: "30%",
    },
    {
      title: "User",
      dataIndex: "user",
      key: "user",
      sorter: (a, b) => a.user.localeCompare(b.user),
      width: "10%",
      filters: userFilters,
      onFilter: (value, record) => record.user === value,
    },
    {
      title: "Actions",
      key: "actions",
      render: (text, record) => {
        const items = [];
        if (perms.canEdit) {
          items.push({
            key: "edit",
            label: (
              <span onClick={() => showEditModal(record)}>
                <EditOutlined /> Edit
              </span>
            ),
          });
        }
        if (perms.canDelete) {
          items.push({
            key: "delete",
            label: (
              <span onClick={() => handleDelete(record._id)}>
                <DeleteOutlined /> Delete
              </span>
            ),
          });
        }

        return (
          <Dropdown menu={{ items }} trigger={["click"]}>
            <Button icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
      width: "10%",
      align: "center",
    },
  ];

  return (
    <div className="data-config-container">
      <h1 className="data-config-title">Question Management 📚</h1>

      <Space className="table-controls" style={{ marginBottom: 16, width: "100%", justifyContent: "space-between" }}>
        <Input placeholder="Search questions by code, text, type, or user..." prefix={<SearchOutlined />} value={globalSearchText} onChange={(e) => setGlobalSearchText(e.target.value)} className="search-input" allowClear />
        <Space>
          <Button onClick={() => setCatModalOpen(true)} icon={<BookOutlined />}>Manage Service Categories</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal} disabled={!perms.canCreate} title={!perms.canCreate ? "You don't have permission to add questions" : undefined}>
            Add New Question
          </Button>
        </Space>
      </Space>

      <Table columns={columns} dataSource={filteredQuestions} rowKey="_id" loading={loading} pagination={{ pageSize: 10, position: ["topRight"] }} bordered className="questions-table-compact" size="small" />

      <Modal title="Add New Question" open={isAddModalVisible} onOk={handleAddOk} onCancel={handleAddCancel} confirmLoading={loading}>
        <Form form={addForm} layout="vertical" initialValues={addFormInitialValues}>
          <Form.Item name="questionCode" label="Question Code" rules={[{ required: true, message: "Please input the question code (e.g., CC1, Q2)!" }]}> 
            <Input placeholder="Enter question code (e.g., CC1)" />
          </Form.Item>
          <Form.Item name="questionText" label="Question Text" rules={[{ required: true, message: "Please input the question text!" }]}> 
            <Input.TextArea rows={4} placeholder="Enter the full question text" />
          </Form.Item>
          {/* Service categories are defined per option for Services Availed, not per question */}
          <Form.Item name="questionType" label="Question Type" rules={[{ required: true, message: "Please select a question type!" }]}> 
            <Select placeholder="Select question type" onChange={(value) => setAddQuestionType(value)}> 
              <Option value="text">Text</Option>
              <Option value="dropdown">Dropdown</Option>
              <Option value="radio">Radio Button</Option>
            </Select>
          </Form.Item>
          {(addQuestionType === "dropdown" || addQuestionType === "radio") && ( 
            <Form.Item name="options" label="Options (comma-separated)" rules={[{ required: true, message: "Please enter options for this question type!" }]} tooltip="Enter options separated by commas (e.g., Option 1, Option 2, Option 3)"> 
              <Input.TextArea rows={2} placeholder="e.g., Yes, No, Maybe" />
            </Form.Item>
          )}
          <Form.Item name="user" label="Created By User" rules={[{ required: true, message: "Please input the user who created this question!" }]}> 
            <Input placeholder="Enter user name" disabled />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Edit Question" open={isEditModalVisible} onOk={handleEditOk} onCancel={handleEditCancel} confirmLoading={loading}>
        <Form form={editForm} layout="vertical">
          <Form.Item name="questionCode" label="Question Code" rules={[{ required: true, message: "Please input the question code!" }]}> 
            <Input placeholder="Enter question code" />
          </Form.Item>
          <Form.Item name="questionText" label="Question Text" rules={[{ required: true, message: "Please input the question text!" }]}> 
            <Input.TextArea rows={4} placeholder="Enter the full question text" />
          </Form.Item>
          {/* Service categories are defined per option for Services Availed, not per question */}
          <Form.Item name="questionType" label="Question Type" rules={[{ required: true, message: "Please select a question type!" }]}> 
            <Select placeholder="Select question type" onChange={(value) => setEditQuestionType(value)}> 
              <Option value="text">Text</Option>
              <Option value="dropdown">Dropdown</Option>
              <Option value="radio">Radio Button</Option>
            </Select>
          </Form.Item>
          {(editQuestionType === "dropdown" || editQuestionType === "radio") && ( 
            <Form.Item name="options" label="Options (comma-separated)" rules={[{ required: true, message: "Please enter options for this question type!" }]} tooltip="Enter options separated by commas (e.g., Option 1, Option 2, Option 3)"> 
              <Input.TextArea rows={2} placeholder="e.g., Yes, No, Maybe" />
            </Form.Item>
          )}
          {(editQuestionType === "dropdown" || editQuestionType === "radio") && (
            <Space align="start" style={{ width: '100%', marginBottom: 12 }}>
              <Input
                placeholder="Quick add External Service (e.g., ECC Online)"
                value={quickExternalName}
                onChange={(e) => setQuickExternalName(e.target.value)}
                style={{ minWidth: 260 }}
              />
              <Button
                loading={quickExternalLoading}
                onClick={async () => {
                  const name = (quickExternalName || '').trim();
                  if (!name) return;
                  try {
                    setQuickExternalLoading(true);
                    await api.createServiceCategory({ name, type: 'external' });
                    setQuickExternalName('');
                    await fetchCategories();
                    // Append to options field if not present yet
                    const cur = editForm.getFieldValue('options') || '';
                    const parts = cur.split(',').map((s) => s.trim()).filter(Boolean);
                    if (!parts.some((p) => p.toLowerCase() === name.toLowerCase())) {
                      parts.push(name);
                      editForm.setFieldsValue({ options: parts.join(', ') });
                    }
                  } catch (e) {
                    console.error('Quick add external service failed', e);
                  } finally {
                    setQuickExternalLoading(false);
                  }
                }}
              >
                Add as External Service
              </Button>
            </Space>
          )}
          <Form.Item name="user" label="Modified By User" rules={[{ required: true, message: "Please input the user who modified this question!" }]}> 
            <Input placeholder="Enter user name" disabled />
          </Form.Item>
        </Form>
      </Modal>

      {/* Manage Service Categories Modal */}
      <Modal
        title="Manage Service Categories"
        open={catModalOpen}
        onCancel={() => setCatModalOpen(false)}
        footer={null}
        width={700}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form
            form={catForm}
            layout="inline"
            onFinish={async (values) => {
              try {
                setCatLoading(true);
                await api.createServiceCategory({ name: values.name, type: values.type });
                catForm.resetFields();
                fetchCategories();
              } catch (e) {
                console.error('Create category failed', e);
              } finally {
                setCatLoading(false);
              }
            }}
          >
            <Form.Item name="name" rules={[{ required: true, message: 'Name required' }]}>
              <Input placeholder="Service name (e.g., ECC Online)" />
            </Form.Item>
            <Form.Item name="type" rules={[{ required: true, message: 'Type required' }]}>
              <Select placeholder="Type" style={{ width: 160 }}>
                <Option value="internal">Internal</Option>
                <Option value="external">External</Option>
              </Select>
            </Form.Item>
            <Form.Item>
              <Button htmlType="submit" type="primary" loading={catLoading}>Add</Button>
            </Form.Item>
          </Form>

          <Table
            size="small"
            rowKey="_id"
            dataSource={catItems}
            columns={[
              { title: 'Name', dataIndex: 'name', key: 'name' },
              { title: 'Type', dataIndex: 'type', key: 'type', render: (t) => t === 'internal' ? <Tag color="geekblue">Internal</Tag> : <Tag color="green">External</Tag> },
              {
                title: 'Actions', key: 'actions', align: 'right',
                render: (_, rec) => (
                  <Space>
                    <Button size="small" onClick={async () => {
                      const newType = rec.type === 'internal' ? 'external' : 'internal';
                      try {
                        setCatLoading(true);
                        await api.updateServiceCategory(rec._id, { type: newType });
                        fetchCategories();
                      } catch (e) {
                        console.error('Update category failed', e);
                      } finally {
                        setCatLoading(false);
                      }
                    }}>Toggle Type</Button>
                    <Button size="small" danger onClick={async () => {
                      try {
                        setCatLoading(true);
                        await api.deleteServiceCategory(rec._id);
                        fetchCategories();
                      } catch (e) {
                        console.error('Delete category failed', e);
                      } finally {
                        setCatLoading(false);
                      }
                    }}>Delete</Button>
                  </Space>
                )
              }
            ]}
          />
        </Space>
      </Modal>
    </div>
  );
}

export default DataConfig;
