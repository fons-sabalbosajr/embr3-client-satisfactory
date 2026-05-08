import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, Row, Col } from 'antd';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

function MeasurementFormModal({ visible, onClose, onSubmit, record }) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (record) {
      form.setFieldsValue({
        surveyType: record.surveyType || "external",
        Agency: record.answersLabeled?.Agency || "",
        Region: record.answersLabeled?.Region || "",
        "Customer Type": record.answersLabeled?.["Customer Type"] || "",
        Age: record.answersLabeled?.Age || "",
        Gender: record.answersLabeled?.Gender || "",
        "Company Name": record.answersLabeled?.["Company Name"] || "",
        "Agency Name": record.answersLabeled?.["Agency Name"] || "",
        "Employee Name": record.answersLabeled?.["Employee Name"] || "",
        "Assisted Personnel": record.answersLabeled?.["Assisted Personnel"] || "",
        "Remarks (optional):": record.answersLabeled?.["Remarks (optional):"] || "",
      });
    }
  }, [record, form]);

  const customerType = Form.useWatch("Customer Type", form);

  const handleOk = () => {
    form.validateFields().then((values) => {
      MySwal.fire({
        title: "Confirm update?",
        text: "Are you sure you want to save these changes?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, update it",
        cancelButtonText: "Cancel",
      }).then((result) => {
        if (result.isConfirmed) {
          const { surveyType, ...labeledValues } = values;
          onSubmit({
            ...record,
            surveyType,
            answersLabeled: {
              ...record.answersLabeled,
              ...labeledValues,
            },
          });
          MySwal.fire("Updated!", "The client entry has been updated.", "success");
          onClose();
        }
      });
    });
  };

  return (
    <Modal
      title="Edit Client Entry"
      open={visible}
      onOk={handleOk}
      onCancel={onClose}
      okText="Save"
      width={640}
    >
      <Form layout="vertical" form={form}>
        <Form.Item name="surveyType" label="Survey Type">
          <Select>
            <Select.Option value="internal">Internal</Select.Option>
            <Select.Option value="external">External</Select.Option>
          </Select>
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="Region" label="Region">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="Agency" label="Agency">
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="Customer Type" label="Customer Type">
              <Select>
                <Select.Option value="Citizen">Citizen</Select.Option>
                <Select.Option value="Business">Business</Select.Option>
                <Select.Option value="Government">Government</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="Age" label="Age">
              <Input type="number" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="Gender" label="Gender">
              <Select allowClear>
                <Select.Option value="Male">Male</Select.Option>
                <Select.Option value="Female">Female</Select.Option>
                <Select.Option value="LGBTQ++">LGBTQ++</Select.Option>
                <Select.Option value="RatherNotSay">Rather Not Say</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        {customerType === "Business" && (
          <Form.Item name="Company Name" label="Company Name">
            <Input />
          </Form.Item>
        )}
        {customerType === "Government" && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="Agency Name" label="Agency Name">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="Employee Name" label="Employee Name">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        )}
        <Form.Item name="Assisted Personnel" label="Assisted Personnel">
          <Input />
        </Form.Item>
        <Form.Item name="Remarks (optional):" label="Remarks">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default MeasurementFormModal;
