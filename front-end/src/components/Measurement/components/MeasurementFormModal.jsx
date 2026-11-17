import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, Row, Col } from 'antd';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

// Remarks have been stored under different question labels over time; edit
// whichever one the record already uses so we never create a second, empty
// remarks column in exports.
const REMARKS_KEYS = ["Remarks/Recommendations:", "Remarks (optional):"];
const remarksKeyFor = (labeled = {}) =>
  REMARKS_KEYS.find((k) => labeled[k] !== undefined && labeled[k] !== "") ||
  Object.keys(labeled).find((k) => /remark|recommend|suggest/i.test(k)) ||
  REMARKS_KEYS[0];

const ANALYSIS_KEY = "Type of Result of Analyses";
const CONTROL_NO_KEY = "Analysis Control Number";

function MeasurementFormModal({ visible, onClose, onSubmit, record }) {
  const [form] = Form.useForm();
  const remarksKey = remarksKeyFor(record?.answersLabeled);
  const services = record?.answersLabeled?.["Service Availed"];
  const showAnalysis =
    !!record?.answersLabeled?.[ANALYSIS_KEY] ||
    (Array.isArray(services) ? services : services ? [services] : []).some((s) =>
      /analys[ie]s\s+of\s+environmental\s+samples?/i.test(String(s))
    );

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
        [ANALYSIS_KEY]: record.answersLabeled?.[ANALYSIS_KEY] || "",
        [CONTROL_NO_KEY]: record.answersLabeled?.[CONTROL_NO_KEY] || "",
        remarks: record.answersLabeled?.[remarksKeyFor(record.answersLabeled)] || "",
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
          const { surveyType, remarks, ...labeledValues } = values;
          const answersLabeled = { ...record.answersLabeled };
          // Only write fields that hold a value or already existed, so the
          // edit does not add blank keys (= blank columns) to the record.
          Object.entries(labeledValues).forEach(([key, val]) => {
            if (val === undefined) return;
            if (val === "" && answersLabeled[key] === undefined) return;
            answersLabeled[key] = val;
          });
          if (remarks || answersLabeled[remarksKey] !== undefined) {
            answersLabeled[remarksKey] = remarks || "";
          }
          onSubmit({ ...record, surveyType, answersLabeled });
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
          <Col xs={24} sm={12}>
            <Form.Item name="Region" label="Region">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="Agency" label="Agency">
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item name="Customer Type" label="Customer Type">
              <Select>
                <Select.Option value="Citizen">Citizen</Select.Option>
                <Select.Option value="Business">Business</Select.Option>
                <Select.Option value="Government">Government</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="Age" label="Age">
              <Input type="number" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
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
            <Col xs={24} sm={12}>
              <Form.Item name="Agency Name" label="Agency Name">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="Employee Name" label="Employee Name">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        )}
        <Form.Item name="Assisted Personnel" label="Assisted Personnel">
          <Input />
        </Form.Item>
        {showAnalysis && (
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name={ANALYSIS_KEY} label="Type of Result of Analyses">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name={CONTROL_NO_KEY} label="Analysis Control Number">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        )}
        <Form.Item name="remarks" label="Remarks / Recommendations">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default MeasurementFormModal;
