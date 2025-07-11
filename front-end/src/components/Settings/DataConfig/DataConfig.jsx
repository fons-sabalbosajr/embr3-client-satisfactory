import React, { useState, useEffect, useRef } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Menu,
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
import { getCurrentUserFullname } from "../../../services/authService";
import "./dataconfig.css";

const { Option } = Select;

const SOCKET_SERVER_URL = "http://10.14.77.107:5000";

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

  // Removed the redundant `searchText` state
  const [globalSearchText, setGlobalSearchText] = useState(""); // ✨ State for global search input

  const [columnSearchText, setColumnSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");
  const searchInputRef = useRef(null);

  const [typeFilters, setTypeFilters] = useState([]);
  const [userFilters, setUserFilters] = useState([]);

  const [addFormInitialValues, setAddFormInitialValues] = useState({
    questionType: "text",
    options: "",
  });

  const socket = useRef(null);

  useEffect(() => {
    fetchQuestions();

    const fetchedUser = getCurrentUserFullname();
    setCurrentUser(fetchedUser);
    console.log("Fetched Current User:", fetchedUser);

    socket.current = io(SOCKET_SERVER_URL);

    socket.current.on("connect", () => {
      console.log("Connected to Socket.IO server:", socket.current.id);
    });

    socket.current.on("questionAdded", (newQuestion) => {
      console.log("Real-time: Question added", newQuestion);
      setQuestions((prevQuestions) => [...prevQuestions, newQuestion]);
    });

    socket.current.on("questionUpdated", (updatedQuestion) => {
      console.log("Real-time: Question updated", updatedQuestion);
      setQuestions((prevQuestions) =>
        prevQuestions.map((q) =>
          q._id === updatedQuestion._id ? updatedQuestion : q
        )
      );
    });

    socket.current.on("questionDeleted", (deletedQuestionId) => {
      console.log("Real-time: Question deleted", deletedQuestionId);
      setQuestions((prevQuestions) =>
        prevQuestions.filter((q) => q._id !== deletedQuestionId)
      );
    });

    return () => {
      if (socket.current) {
        socket.current.disconnect();
        console.log("Disconnected from Socket.IO server");
      }
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      setAddFormInitialValues((prevValues) => ({
        ...prevValues,
        user: currentUser,
      }));
    }
  }, [currentUser]);

  useEffect(() => {
    // Global search filter logic
    const lowercasedGlobalSearchText = globalSearchText.toLowerCase();
    const newFilteredQuestions = questions.filter(
      (question) =>
        question.questionCode
          .toLowerCase()
          .includes(lowercasedGlobalSearchText) ||
        question.questionText
          .toLowerCase()
          .includes(lowercasedGlobalSearchText) ||
        question.questionType
          .toLowerCase()
          .includes(lowercasedGlobalSearchText) ||
        (question.user &&
          question.user.toLowerCase().includes(lowercasedGlobalSearchText)) ||
        (question.options &&
          question.options.some((option) =>
            option.toLowerCase().includes(lowercasedGlobalSearchText)
          ))
    );
    setFilteredQuestions(newFilteredQuestions);

    // Generate unique filter options for 'Type' and 'User' columns
    const uniqueTypes = [
      ...new Set(questions.map((q) => q.questionType)),
    ].sort();
    setTypeFilters(uniqueTypes.map((type) => ({ text: type, value: type })));

    const uniqueUsers = [...new Set(questions.map((q) => q.user))].sort();
    setUserFilters(uniqueUsers.map((user) => ({ text: user, value: user })));
  }, [questions, globalSearchText]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const response = await api.getQuestions();
      setQuestions(response.data);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Failed to fetch questions. Please check your backend connection.",
      });
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
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
      close,
    }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInputRef}
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) =>
            setSelectedKeys(e.target.value ? [e.target.value] : [])
          }
          onPressEnter={() =>
            handleColumnSearch(selectedKeys, confirm, dataIndex)
          }
          style={{ marginBottom: 8, display: "block" }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => handleColumnSearch(selectedKeys, confirm, dataIndex)}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Search
          </Button>
          <Button
            onClick={() => handleColumnReset(clearFilters)}
            size="small"
            style={{ width: 90 }}
          >
            Reset
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              confirm({ closeDropdown: false });
              setSearchedColumn(dataIndex);
            }}
          >
            Filter
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              close();
            }}
          >
            Close
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
    ),
    onFilter: (value, record) => {
      if (dataIndex === "options") {
        return (
          record.options &&
          record.options.some((option) =>
            String(option).toLowerCase().includes(String(value).toLowerCase())
          )
        );
      }
      return record[dataIndex]
        .toString()
        .toLowerCase()
        .includes(String(value).toLowerCase());
    },
    onFilterDropdownOpenChange: (visible) => {
      if (visible) {
        setTimeout(() => searchInputRef.current?.select(), 100);
      }
    },
    render: (text) =>
      searchedColumn === dataIndex ? (
        <Highlighter
          highlightStyle={{ backgroundColor: "#ffc069", padding: 0 }}
          searchWords={[columnSearchText]}
          autoEscape
          textToHighlight={text ? text.toString() : ""}
        />
      ) : (
        text
      ),
  });

  const showAddModal = () => {
    addForm.resetFields();
    setAddQuestionType("text");
    setIsAddModalVisible(true);
  };

  const handleAddOk = async () => {
    try {
      const values = await addForm.validateFields();
      setLoading(true);

      const newQuestion = {
        questionCode: values.questionCode,
        questionText: values.questionText,
        questionType: values.questionType,
        user: values.user,
      };

      if (
        values.questionType === "dropdown" ||
        values.questionType === "radio"
      ) {
        newQuestion.options = values.options
          ? values.options
              .split(",")
              .map((option) => option.trim())
              .filter((option) => option !== "")
          : [];
      } else {
        newQuestion.options = [];
      }

      await api.createQuestion(newQuestion);
      Swal.fire({
        icon: "success",
        title: "Added!",
        text: "Question added successfully!",
        showConfirmButton: false,
        timer: 1500,
      });
      setIsAddModalVisible(false);
      fetchQuestions();
    } catch (info) {
      console.log("Validate Failed:", info);
      let errorMessage = "Failed to add question. Please try again.";
      if (info.errorFields) {
        errorMessage = "Please fill in all required fields correctly.";
      } else if (
        info.response &&
        info.response.data &&
        info.response.data.message
      ) {
        errorMessage = info.response.data.message;
      }
      Swal.fire({
        icon: "error",
        title: "Error!",
        text: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCancel = () => {
    setIsAddModalVisible(false);
  };

  const showEditModal = (record) => {
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

      if (
        values.questionType === "dropdown" ||
        values.questionType === "radio"
      ) {
        updatedQuestion.options = values.options
          ? values.options
              .split(",")
              .map((option) => option.trim())
              .filter((option) => option !== "")
          : [];
      } else {
        updatedQuestion.options = [];
      }

      await api.updateQuestion(editingQuestion._id, updatedQuestion);
      Swal.fire({
        icon: "success",
        title: "Updated!",
        text: "Question updated successfully!",
        showConfirmButton: false,
        timer: 1500,
      });
      setIsEditModalVisible(false);
      setEditingQuestion(null);
      fetchQuestions();
    } catch (info) {
      console.log("Validate Failed:", info);
      let errorMessage = "Failed to update question. Please try again.";
      if (info.errorFields) {
        errorMessage = "Please fill in all required fields correctly.";
      } else if (
        info.response &&
        info.response.data &&
        info.response.data.message
      ) {
        errorMessage = info.response.data.message;
      }
      Swal.fire({
        icon: "error",
        title: "Error!",
        text: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditCancel = () => {
    setIsEditModalVisible(false);
    setEditingQuestion(null);
  };

  const handleDelete = async (id) => {
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
          Swal.fire({
            icon: "error",
            title: "Error!",
            text: "Failed to delete question. Please try again.",
          });
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
          <Tag color="blue" icon={<BookOutlined />}>
            Text
          </Tag>
        );
      case "dropdown":
        return (
          <Tag color="green" icon={<DownCircleOutlined />}>
            Dropdown
          </Tag>
        );
      case "radio":
        return (
          <Tag color="orange" icon={<CheckSquareOutlined />}>
            Radio Button
          </Tag>
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
      sorter: (a, b) => a.questionCode.localeCompare(b.questionCode), // Added sorter
      width: "15%",
      ...getColumnSearchProps("questionCode"),
    },
    {
      title: "Type",
      dataIndex: "questionType",
      key: "questionType",
      sorter: (a, b) => a.questionType.localeCompare(b.questionType), // Added sorter
      width: "12%",
      render: (type) => getQuestionTypeTag(type),
      filters: typeFilters,
      onFilter: (value, record) => record.questionType === value,
    },
    {
      title: "Question Description", // Renamed from "Question Text" as per your column definition in the comment
      dataIndex: "questionText",
      key: "questionText",
      sorter: (a, b) => a.questionText.localeCompare(b.questionText), // Added sorter
      ellipsis: true,
      width: "30%",
      ...getColumnSearchProps("questionText"),
    },
    {
      title: "Options",
      dataIndex: "options",
      key: "options",
      // Keep the search props for filter dropdown, icon, and onFilter
      ...getColumnSearchProps("options"), // Keep this to get search functionality
      render: (options, record) => {
        if (!options || options.length === 0) {
          // No options, return "N/A"
          // We also need to consider if we are currently searching this column.
          // If so, Highlighter might still try to render "N/A".
          // For "N/A" we usually don't need highlighting, so return directly.
          return "N/A";
        }

        let displayText;
        if (
          record.questionType === "dropdown" ||
          record.questionType === "radio"
        ) {
          // If it's dropdown/radio, join with comma and newline
          displayText = options.join(",\n");
        } else {
          // For other types, just join with comma and space
          displayText = options.join(", ");
        }

        // Now, apply the highlighting logic within this render function
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
              // If not searching this column, or no search text, just display the formatted text
              textToHighlight
            )}
          </span>
        );
      },
      width: "30%",
      // Remove ...getColumnSearchProps("options") from here if you put it above
      // If it's here, it will overwrite the render function above.
      // Make sure the spread is at the top of the render function to avoid overwriting your custom render.
    },
    {
      title: "User",
      dataIndex: "user",
      key: "user",
      sorter: (a, b) => a.user.localeCompare(b.user), // Added sorter
      width: "10%",
      filters: userFilters,
      onFilter: (value, record) => record.user === value,
    },
    {
      title: "Actions",
      key: "actions",
      render: (text, record) => (
        <Dropdown
          overlay={
            <Menu>
              <Menu.Item key="edit" onClick={() => showEditModal(record)}>
                <EditOutlined /> Edit
              </Menu.Item>
              <Menu.Item key="delete">
                <span onClick={() => handleDelete(record._id)}>
                  <DeleteOutlined /> Delete
                </span>
              </Menu.Item>
            </Menu>
          }
          trigger={["click"]}
        >
          <Button icon={<MoreOutlined />} />
        </Dropdown>
      ),
      width: "10%",
      align: "center",
    },
  ];

  return (
    <div className="data-config-container">
      <h1 className="data-config-title">Question Management 📚</h1>

      <Space
        className="table-controls"
        style={{
          marginBottom: 16,
          width: "100%",
          justifyContent: "space-between",
        }}
      >
        <Input
          placeholder="Search questions by code, text, type, or user..."
          prefix={<SearchOutlined />}
          value={globalSearchText}
          onChange={(e) => setGlobalSearchText(e.target.value)}
          className="search-input"
          allowClear
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>
          Add New Question
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={filteredQuestions}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 10, position: ["topRight"] }}
        bordered
        className="questions-table-compact"
        size="small"
      />

      <Modal
        title="Add New Question"
        open={isAddModalVisible}
        onOk={handleAddOk}
        onCancel={handleAddCancel}
        confirmLoading={loading}
      >
        <Form
          form={addForm}
          layout="vertical"
          initialValues={addFormInitialValues}
        >
          <Form.Item
            name="questionCode"
            label="Question Code"
            rules={[
              {
                required: true,
                message: "Please input the question code (e.g., CC1, Q2)!",
              },
            ]}
          >
            <Input placeholder="Enter question code (e.g., CC1)" />
          </Form.Item>
          <Form.Item
            name="questionText"
            label="Question Text"
            rules={[
              { required: true, message: "Please input the question text!" },
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Enter the full question text"
            />
          </Form.Item>
          <Form.Item
            name="questionType"
            label="Question Type"
            rules={[
              { required: true, message: "Please select a question type!" },
            ]}
          >
            <Select
              placeholder="Select question type"
              onChange={(value) => setAddQuestionType(value)}
            >
              <Option value="text">Text</Option>
              <Option value="dropdown">Dropdown</Option>
              <Option value="radio">Radio Button</Option>
            </Select>
          </Form.Item>
          {(addQuestionType === "dropdown" || addQuestionType === "radio") && (
            <Form.Item
              name="options"
              label="Options (comma-separated)"
              rules={[
                {
                  required: true,
                  message: "Please enter options for this question type!",
                },
              ]}
              tooltip="Enter options separated by commas (e.g., Option 1, Option 2, Option 3)"
            >
              <Input.TextArea rows={2} placeholder="e.g., Yes, No, Maybe" />
            </Form.Item>
          )}
          <Form.Item
            name="user"
            label="Created By User"
            rules={[
              {
                required: true,
                message: "Please input the user who created this question!",
              },
            ]}
          >
            <Input placeholder="Enter user name" disabled />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Edit Question"
        open={isEditModalVisible}
        onOk={handleEditOk}
        onCancel={handleEditCancel}
        confirmLoading={loading}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="questionCode"
            label="Question Code"
            rules={[
              { required: true, message: "Please input the question code!" },
            ]}
          >
            <Input placeholder="Enter question code" />
          </Form.Item>
          <Form.Item
            name="questionText"
            label="Question Text"
            rules={[
              { required: true, message: "Please input the question text!" },
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Enter the full question text"
            />
          </Form.Item>
          <Form.Item
            name="questionType"
            label="Question Type"
            rules={[
              { required: true, message: "Please select a question type!" },
            ]}
          >
            <Select
              placeholder="Select question type"
              onChange={(value) => setEditQuestionType(value)}
            >
              <Option value="text">Text</Option>
              <Option value="dropdown">Dropdown</Option>
              <Option value="radio">Radio Button</Option>
            </Select>
          </Form.Item>
          {(editQuestionType === "dropdown" ||
            editQuestionType === "radio") && (
            <Form.Item
              name="options"
              label="Options (comma-separated)"
              rules={[
                {
                  required: true,
                  message: "Please enter options for this question type!",
                },
              ]}
              tooltip="Enter options separated by commas (e.g., Option 1, Option 2, Option 3)"
            >
              <Input.TextArea rows={2} placeholder="e.g., Yes, No, Maybe" />
            </Form.Item>
          )}
          <Form.Item
            name="user"
            label="Modified By User"
            rules={[
              {
                required: true,
                message: "Please input the user who modified this question!",
              },
            ]}
          >
            <Input placeholder="Enter user name" disabled />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default DataConfig;
