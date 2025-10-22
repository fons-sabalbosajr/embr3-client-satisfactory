import React, { useEffect, useState } from "react";
import {
  Collapse,
  Typography,
  Form,
  Select,
  Button,
  Alert,
  Card,
  Space,
  ColorPicker,
} from "antd";
import * as api from "../../../services/api";
import { setEncryptedItem } from "../../../utils/encryptedStorage";
import AccountSettings from "../AccountSettings/AccountSettings";
import DataConfig from "../DataConfig/DataConfig";
import Backup from "../Backup/Backup";
import Accounts from "../Accounts/Accounts";
import DangerZone from "./DangerZone";

const { Title } = Typography;
const { Panel } = Collapse;

export default function DeveloperSettings({ currentUser }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [themeForm] = Form.useForm();
  const [themeSaving, setThemeSaving] = useState(false);
  const [themeSaved, setThemeSaved] = useState(false);
  const [presetApplying, setPresetApplying] = useState(false);

  const broadcastTheme = (vals) => {
    try {
      setEncryptedItem("themePrefsCache", JSON.stringify(vals));
      window.dispatchEvent(new CustomEvent("theme:updated", { detail: vals }));
    } catch {}
  };

  useEffect(() => {
    // Load saved preferences to prefill the theme form
    (async () => {
      try {
        const res = await api.getPreferences();
        const prefs = res?.data?.preferences || {};
        themeForm.setFieldsValue({
          siderBg: prefs.siderBg || "#001529",
          headerBg: prefs.headerBg || "#001529",
          colorPrimary: prefs.colorPrimary || "#1677ff",
        });
      } catch {
        // Ignore if not set
      }
    })();
  }, [themeForm]);

  const handleSubmit = async (values) => {
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      // TODO: Call API to update privileges
      // await updatePrivileges(values);
      setSuccess(true);
    } catch (e) {
      setError("Failed to update privileges. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <Title level={3}>Developer Settings</Title>
      <Space direction="vertical" style={{ width: "100%" }} size={16}>
        <Card
          title="Theme Customization"
          extra={<span>Customize sider, header and primary color</span>}
        >
          <Form
            form={themeForm}
            layout="vertical"
            disabled={false}
            initialValues={{
              siderBg: "#001529",
              headerBg: "#001529",
              colorPrimary: "#1677ff",
            }}
          >
            <Form.Item
              name="siderBg"
              label="Sider Background"
              valuePropName="value"
              getValueFromEvent={(color, hex) => hex}
              tooltip="Custom color overrides preset"
            >
              <ColorPicker
                format="hex"
                showText
                onChange={(_, hex) => {
                  const vals = themeForm.getFieldsValue();
                  // Merge the immediate change to avoid any async timing
                  broadcastTheme({
                    siderBg: hex || vals.siderBg || "#001529",
                    headerBg: vals.headerBg || "#001529",
                    colorPrimary: vals.colorPrimary || "#1677ff",
                  });
                }}
              />
            </Form.Item>
            <Form.Item
              name="headerBg"
              label="Header Background"
              valuePropName="value"
              getValueFromEvent={(color, hex) => hex}
              tooltip="Custom color overrides preset"
            >
              <ColorPicker
                format="hex"
                showText
                onChange={(_, hex) => {
                  const vals = themeForm.getFieldsValue();
                  broadcastTheme({
                    siderBg: vals.siderBg || "#001529",
                    headerBg: hex || vals.headerBg || "#001529",
                    colorPrimary: vals.colorPrimary || "#1677ff",
                  });
                }}
              />
            </Form.Item>
            <Form.Item
              name="colorPrimary"
              label="Primary Color (Buttons)"
              valuePropName="value"
              getValueFromEvent={(color, hex) => hex}
              tooltip="Custom color overrides preset"
            >
              <ColorPicker
                format="hex"
                showText
                onChange={(_, hex) => {
                  const vals = themeForm.getFieldsValue();
                  broadcastTheme({
                    siderBg: vals.siderBg || "#001529",
                    headerBg: vals.headerBg || "#001529",
                    colorPrimary: hex || vals.colorPrimary || "#1677ff",
                  });
                }}
              />
            </Form.Item>
            <Space>
              <Button
                type="primary"
                loading={themeSaving}
                onClick={async () => {
                  try {
                    setThemeSaving(true);
                    setThemeSaved(false);
                    const values = themeForm.getFieldsValue();
                    const sanitized = {
                      siderBg: values.siderBg || "#001529",
                      headerBg: values.headerBg || "#001529",
                      colorPrimary: values.colorPrimary || "#1677ff",
                    };
                    // Apply immediately in the UI
                    try {
                      setEncryptedItem("themePrefsCache", JSON.stringify(sanitized));
                      window.dispatchEvent(new CustomEvent("theme:updated", { detail: sanitized }));
                    } catch {}
                    // Persist in the background
                    await api.updatePreferences(sanitized);
                    setThemeSaved(true);
                  } catch (e) {
                    // non-fatal
                  } finally {
                    setThemeSaving(false);
                  }
                }}
              >
                Save Theme
              </Button>
              <Button
                onClick={async () => {
                  const defaults = {
                    siderBg: "#ffffff",
                    headerBg: "#ffffff",
                    colorPrimary: "#1677ff",
                  };
                  themeForm.setFieldsValue(defaults);
                  try {
                    // Apply immediately
                    setEncryptedItem("themePrefsCache", JSON.stringify(defaults));
                    window.dispatchEvent(new CustomEvent("theme:updated", { detail: defaults }));
                    // Persist in the background
                    await api.updatePreferences(defaults);
                    setThemeSaved(true);
                  } catch {}
                }}
              >
                Reset to Default
              </Button>
              {themeSaved && (
                <Alert
                  type="success"
                  message="Theme saved and applied."
                  showIcon
                />
              )}
            </Space>
          </Form>
          <div style={{ marginTop: 16 }}>
            <Title level={5} style={{ marginBottom: 8 }}>
              Presets
            </Title>
            <Space wrap>
              {[
                {
                  name: "Light (Default)",
                  siderBg: "#ffffff",
                  headerBg: "#ffffff",
                  colorPrimary: "#1677ff",
                },
                {
                  name: "Dark Blue",
                  siderBg: "#001529",
                  headerBg: "#001529",
                  colorPrimary: "#1677ff",
                },
                {
                  name: "Forest",
                  siderBg: "#0f2f1f",
                  headerBg: "#0f2f1f",
                  colorPrimary: "#4caf50",
                },
                {
                  name: "Ocean",
                  siderBg: "#102a43",
                  headerBg: "#102a43",
                  colorPrimary: "#1890ff",
                },
                {
                  name: "Sunset",
                  siderBg: "#2d1b38",
                  headerBg: "#2d1b38",
                  colorPrimary: "#fa8c16",
                },
                {
                  name: "Ember Green",
                  siderBg: "#003b2f",
                  headerBg: "#003b2f",
                  colorPrimary: "#4B8D73",
                },
              ].map((preset) => (
                <Card
                  key={preset.name}
                  size="small"
                  style={{ width: 200 }}
                  title={preset.name}
                >
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div
                        style={{
                          width: 28,
                          height: 18,
                          background: preset.siderBg,
                          border: "1px solid #ddd",
                        }}
                        title="Sider"
                      />
                      <div
                        style={{
                          width: 28,
                          height: 18,
                          background: preset.headerBg,
                          border: "1px solid #ddd",
                        }}
                        title="Header"
                      />
                      <div
                        style={{
                          width: 28,
                          height: 18,
                          background: preset.colorPrimary,
                          border: "1px solid #ddd",
                        }}
                        title="Primary"
                      />
                    </div>
                    <Button
                      block
                      size="small"
                      loading={presetApplying}
                      onClick={async () => {
                        try {
                          setPresetApplying(true);
                          themeForm.setFieldsValue({
                            siderBg: preset.siderBg,
                            headerBg: preset.headerBg,
                            colorPrimary: preset.colorPrimary,
                          });
                          try {
                            // Apply immediately
                            setEncryptedItem("themePrefsCache", JSON.stringify(preset));
                            window.dispatchEvent(new CustomEvent("theme:updated", { detail: preset }));
                          } catch {}
                          // Persist in the background
                          await api.updatePreferences({
                            siderBg: preset.siderBg,
                            headerBg: preset.headerBg,
                            colorPrimary: preset.colorPrimary,
                          });
                          setThemeSaved(true);
                        } catch (e) {
                          // ignore
                        } finally {
                          setPresetApplying(false);
                        }
                      }}
                    >
                      Apply
                    </Button>
                  </Space>
                </Card>
              ))}
            </Space>
          </div>
        </Card>

        <Collapse
          defaultActiveKey={["accounts"]}
          accordion
          items={[
            {
              key: "accounts",
              label: "Accounts Management",
              children: <Accounts />,
            },
            {
              key: "dangerzone",
              label: "Danger Zone (Developer Only)",
              children: <DangerZone />,
            },
          ]}
        />
      </Space>
    </div>
  );
}
