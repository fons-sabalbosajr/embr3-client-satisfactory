import React, { useEffect } from 'react';
import { Modal, Form, Input, Select } from 'antd';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

function MeasurementFormModal({ visible, onClose, onSubmit, record }) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (record) {
      form.setFieldsValue({
        Agency: record.answersLabeled?.Agency || "",
        Region: record.answersLabeled?.Region || "",
        "Customer Type": record.answersLabeled?.["Customer Type"] || "",
        Age: record.answersLabeled?.Age || "",
        Gender: record.answersLabeled?.Gender || "",
        "Remarks (optional):": record.answersLabeled?.["Remarks (optional):"] || "",
      });
    }
  }, [record, form]);

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
          onSubmit({
            ...record,
            answersLabeled: {
              ...record.answersLabeled,
              ...values,
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
    >
      <Form layout="vertical" form={form}>
        <Form.Item name="Agency" label="Agency">
          <Input />
        </Form.Item>
        <Form.Item name="Region" label="Region">
          <Input />
        </Form.Item>
        <Form.Item name="Customer Type" label="Customer Type">
          <Select>
            <Select.Option value="Citizen">Citizen</Select.Option>
            <Select.Option value="Business">Business</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="Age" label="Age">
          <Input type="number" />
        </Form.Item>
        <Form.Item name="Gender" label="Gender">
          <Select>
            <Select.Option value="Male">Male</Select.Option>
            <Select.Option value="Female">Female</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="Remarks (optional):" label="Remarks">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default MeasurementFormModal;
