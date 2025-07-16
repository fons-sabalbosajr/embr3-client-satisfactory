import React from 'react';
import { Modal, Form, Input, Select } from 'antd';

function MeasurementFormModal({ visible, onClose, onSubmit, record }) {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (record) form.setFieldsValue(record.answersLabeled);
  }, [record, form]);

  const handleOk = () => {
    form.validateFields().then(values => {
      onSubmit({ ...record, answersLabeled: values });
      onClose();
    });
  };

  return (
    <Modal
      title="Edit Client Entry"
      visible={visible}
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
