// VERA settings — provider, persona, live-data behaviour and usage limits.
//
// The browser never holds the raw API key: it is submitted once for encrypted
// storage on the server (or the server env var is used), and only a masked
// hint ever comes back. All model calls happen server-side.
import React, { useEffect, useMemo, useState } from "react";
import {
  Form,
  Input,
  Switch,
  Select,
  AutoComplete,
  InputNumber,
  Button,
  Card,
  Row,
  Col,
  Tag,
  Alert,
  Typography,
  Space,
  Spin,
  Descriptions,
  Divider,
  Segmented,
  Tooltip,
  message,
  Popconfirm,
} from "antd";
import {
  SaveOutlined,
  ApiOutlined,
  KeyOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  MessageOutlined,
  ExperimentOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import * as api from "../../../services/api";
import VeraFlameIcon from "../../Vera/VeraFlameIcon";
import "./verasettings.css";

const { Text, Paragraph, Title, Link } = Typography;

// Provider metadata — drives the chooser, model presets and key hints.
const PROVIDER_INFO = {
  none: {
    label: "No model (rule-based)",
    tagline: "VERA answers from live survey figures and its help library only. No API key needed.",
    models: [],
  },
  anthropic: {
    label: "Anthropic (Claude)",
    tagline: "Official Claude API — best analysis quality. Requires a funded API key.",
    keyPlaceholder: "sk-ant-…",
    keyUrl: "https://console.anthropic.com/",
    envVar: "ANTHROPIC_API_KEY",
    defaultModel: "claude-opus-5",
    models: [
      { value: "claude-opus-5", label: "claude-opus-5 — most capable (recommended)" },
      { value: "claude-sonnet-5", label: "claude-sonnet-5 — balanced" },
      { value: "claude-haiku-4-5", label: "claude-haiku-4-5 — fastest & cheapest" },
    ],
  },
  gemini: {
    label: "Google Gemini",
    tagline: "Google Gemini API — a free tier is available for light use.",
    keyPlaceholder: "AIza…",
    keyUrl: "https://aistudio.google.com/apikey",
    envVar: "GEMINI_API_KEY",
    defaultModel: "gemini-2.5-flash",
    models: [
      { value: "gemini-2.5-flash", label: "gemini-2.5-flash — free tier (recommended)" },
      { value: "gemini-2.5-pro", label: "gemini-2.5-pro — advanced" },
    ],
  },
};

const toLines = (arr) => (Array.isArray(arr) ? arr.join("\n") : arr || "");

export default function VeraSettings() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState(null);
  const [usageToday, setUsageToday] = useState(0);
  const [messageApi, contextHolder] = message.useMessage();

  const provider = Form.useWatch(["provider", "provider"], form) || "none";
  const info = PROVIDER_INFO[provider] || PROVIDER_INFO.none;

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.getVeraSettings();
      setStatus(data.status || null);
      setUsageToday(data.usageToday || 0);
      const c = data.config || {};
      form.setFieldsValue({
        ...c,
        starterQuestions: toLines(c.starterQuestions),
        starterQuestionsPublic: toLines(c.starterQuestionsPublic),
        provider: { ...(c.provider || {}), apiKey: "" }, // never prefill; blank keeps stored key
      });
    } catch (err) {
      messageApi.error(err?.response?.data?.message || "Could not load VERA settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectProvider = (p) => {
    const current = form.getFieldValue(["provider", "provider"]);
    if (p === current) return;
    form.setFieldsValue({
      provider: {
        ...form.getFieldValue("provider"),
        provider: p,
        model: PROVIDER_INFO[p]?.defaultModel || "",
        apiKey: "",
      },
    });
  };

  const keyTag = useMemo(() => {
    if (!status) return <Tag>Unknown</Tag>;
    if (status.provider === "none") return <Tag>Not required</Tag>;
    if (!status.keyConfigured) return <Tag color="red">Not configured</Tag>;
    return <Tag color="green">Configured {status.keySource === "env" ? "(server env)" : "(encrypted in database)"}</Tag>;
  }, [status]);

  const opTag = useMemo(() => {
    if (!status) return null;
    if (!status.enabled) return <Tag color="default">Disabled</Tag>;
    if (status.operational) return <Tag color="blue">Model connected</Tag>;
    if (status.provider === "none") return <Tag color="cyan">Rule-based mode</Tag>;
    return <Tag color="orange">Fallback mode (no key)</Tag>;
  }, [status]);

  const handleSave = async (values) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        starterQuestions: String(values.starterQuestions || "").split("\n"),
        starterQuestionsPublic: String(values.starterQuestionsPublic || "").split("\n"),
        provider: { ...values.provider },
      };
      if (!String(payload.provider.apiKey || "").trim()) delete payload.provider.apiKey;
      const { data } = await api.updateVeraSettings(payload);
      setStatus(data.status || null);
      form.setFieldsValue({ provider: { ...form.getFieldValue("provider"), apiKey: "" } });
      messageApi.success("VERA settings saved.");
    } catch (err) {
      messageApi.error(err?.response?.data?.message || "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data } = await api.testVeraConnection();
      if (data.status) setStatus(data.status);
      if (data.ok) messageApi.success(data.message, 5);
      else messageApi.warning(data.message, 6);
    } catch (err) {
      messageApi.error(err?.response?.data?.message || "Connection test failed.");
    } finally {
      setTesting(false);
    }
  };

  const handleClearKey = async () => {
    try {
      const { data } = await api.clearVeraKey();
      setStatus(data.status || null);
      messageApi.success("Stored API key cleared.");
    } catch (err) {
      messageApi.error(err?.response?.data?.message || "Could not clear the key.");
    }
  };

  if (loading) {
    return (
      <div className="vera-settings-loading">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="vera-settings">
      {contextHolder}
      <div className="vera-settings-header">
        <span className="vera-settings-flame"><VeraFlameIcon size={34} hero /></span>
        <div>
          <Title level={3} className="vera-settings-title">VERA Assistant</Title>
          <Text type="secondary">
            Configure the Virtual Evaluation &amp; Response Assistant — the analyst that answers from live survey data inside the admin portal and guides visitors on the landing page.
          </Text>
        </div>
      </div>

      <Card size="small" className="vera-settings-status">
        <Descriptions size="small" column={{ xs: 1, sm: 2, lg: 4 }}>
          <Descriptions.Item label="Status">{opTag}</Descriptions.Item>
          <Descriptions.Item label="Provider">{status?.providerLabel || "—"}</Descriptions.Item>
          <Descriptions.Item label="Model">{status?.model || "—"}</Descriptions.Item>
          <Descriptions.Item label="API key">{keyTag}</Descriptions.Item>
          <Descriptions.Item label="Chats today">{usageToday}</Descriptions.Item>
          <Descriptions.Item label="Last connection">
            {status?.lastSuccessfulConnectionAt ? new Date(status.lastSuccessfulConnectionAt).toLocaleString() : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Last error" span={2}>
            {status?.lastError ? <Text type="danger">{status.lastError}</Text> : <Text type="secondary">None</Text>}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Form form={form} layout="vertical" onFinish={handleSave} className="vera-settings-form" requiredMark={false}>
        <Row gutter={[16, 16]}>
          {/* ── Availability & identity ─────────────────────────────────── */}
          <Col xs={24} lg={12}>
            <Card title={<Space><SafetyCertificateOutlined /> Availability</Space>} size="small" className="vera-settings-card">
              <Form.Item name="enabled" label="Enable VERA in the admin portal" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item
                name="publicEnabled"
                label="Enable VERA on the public landing page"
                valuePropName="checked"
                tooltip="The public assistant only explains the survey. It never sees survey data or accounts."
              >
                <Switch />
              </Form.Item>
              <Divider style={{ margin: "8px 0 16px" }} />
              <Row gutter={12}>
                <Col xs={24} sm={8}>
                  <Form.Item name="name" label="Short name" rules={[{ required: true, max: 40 }]}>
                    <Input placeholder="VERA" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={16}>
                  <Form.Item name="fullName" label="Full name" rules={[{ required: true, max: 120 }]}>
                    <Input placeholder="Virtual Evaluation & Response Assistant" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="tagline" label="Tagline (landing page)">
                <Input placeholder="Your client-satisfaction insight partner" maxLength={160} />
              </Form.Item>
            </Card>
          </Col>

          {/* ── Persona ─────────────────────────────────────────────────── */}
          <Col xs={24} lg={12}>
            <Card title={<Space><MessageOutlined /> Persona &amp; response style</Space>} size="small" className="vera-settings-card">
              <Form.Item name="tone" label="Tone">
                <Segmented
                  block
                  options={[
                    { label: "Analyst", value: "analyst" },
                    { label: "Friendly", value: "friendly" },
                    { label: "Formal", value: "formal" },
                  ]}
                />
              </Form.Item>
              <Form.Item name="responseLength" label="Response length">
                <Segmented
                  block
                  options={[
                    { label: "Brief", value: "brief" },
                    { label: "Balanced", value: "balanced" },
                    { label: "Detailed", value: "detailed" },
                  ]}
                />
              </Form.Item>
              <Form.Item
                name="customInstructions"
                label="Additional instructions"
                tooltip="Appended to VERA's instructions, e.g. office-specific targets, terminology or reporting periods."
              >
                <Input.TextArea rows={3} maxLength={2000} showCount placeholder="e.g. Our internal target for every SQD dimension is 95%. Refer to the office as EMB R3." />
              </Form.Item>
            </Card>
          </Col>

          {/* ── Live data ───────────────────────────────────────────────── */}
          <Col xs={24} lg={12}>
            <Card title={<Space><ThunderboltOutlined /> Live survey data</Space>} size="small" className="vera-settings-card">
              <Form.Item
                name="liveInsights"
                label="Ground admin answers in live survey aggregates"
                valuePropName="checked"
                tooltip="When on, every admin question is answered with current counts, SQD scores, CC awareness, top services, trends and remarks."
              >
                <Switch />
              </Form.Item>
              <Form.Item name="includeRemarks" label="Include recent client remarks (anonymised)" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item
                name="insightsWindowDays"
                label="Data window (days)"
                tooltip="0 = all responses. Set 90 to focus VERA on the current quarter."
              >
                <InputNumber min={0} max={3650} style={{ width: "100%" }} />
              </Form.Item>
            </Card>
          </Col>

          {/* ── Usage & logging ─────────────────────────────────────────── */}
          <Col xs={24} lg={12}>
            <Card title={<Space><ExperimentOutlined /> Usage &amp; logging</Space>} size="small" className="vera-settings-card">
              <Row gutter={12}>
                <Col xs={24} sm={12}>
                  <Form.Item name="dailyUserLimit" label="Chats per user per day" tooltip="0 = unlimited">
                    <InputNumber min={0} max={10000} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="publicWindowLimit" label="Public chats per visitor / 10 min">
                    <InputNumber min={1} max={500} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                name="loggingLevel"
                label="Logging"
                tooltip="Metadata records who asked and how long it took. Full also stores the question and answer in App Logs."
              >
                <Select
                  options={[
                    { value: "none", label: "None" },
                    { value: "metadata", label: "Metadata only (recommended)" },
                    { value: "full", label: "Full transcript" },
                  ]}
                />
              </Form.Item>
            </Card>
          </Col>

          {/* ── Provider ────────────────────────────────────────────────── */}
          <Col xs={24}>
            <Card title={<Space><ApiOutlined /> Model provider</Space>} size="small" className="vera-settings-card">
              <Form.Item name={["provider", "provider"]} noStyle>
                <Input type="hidden" />
              </Form.Item>
              <Row gutter={[12, 12]} className="vera-provider-grid">
                {Object.entries(PROVIDER_INFO).map(([id, p]) => (
                  <Col xs={24} md={8} key={id}>
                    <button
                      type="button"
                      className={`vera-provider-option${provider === id ? " selected" : ""}`}
                      onClick={() => selectProvider(id)}
                    >
                      <span className="vera-provider-label">{p.label}</span>
                      <span className="vera-provider-tagline">{p.tagline}</span>
                    </button>
                  </Col>
                ))}
              </Row>

              {provider !== "none" && (
                <>
                  <Divider style={{ margin: "16px 0" }} />
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name={["provider", "model"]}
                        label="Model"
                        tooltip="Pick a preset or type any model ID your key can access."
                      >
                        <AutoComplete options={info.models} placeholder={info.defaultModel} allowClear />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name={["provider", "apiKey"]}
                        label={
                          <Space>
                            <KeyOutlined /> API key
                            {status?.keyHint && status.provider === provider && (
                              <Tag color="green">{status.keyHint}</Tag>
                            )}
                          </Space>
                        }
                        tooltip="Stored encrypted. Leave blank to keep the current key. The server env var, when set, takes precedence."
                      >
                        <Input.Password placeholder={status?.keyConfigured && status.provider === provider ? "Leave blank to keep the stored key" : info.keyPlaceholder} autoComplete="new-password" />
                      </Form.Item>
                      <Paragraph type="secondary" style={{ fontSize: 12, marginTop: -8 }}>
                        Get a key from <Link href={info.keyUrl} target="_blank" rel="noreferrer">{info.keyUrl}</Link>, or set <code>{info.envVar}</code> on the server.
                      </Paragraph>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    {provider === "anthropic" ? (
                      <Col xs={24} sm={8}>
                        <Form.Item name={["provider", "effort"]} label="Reasoning effort" tooltip="Higher effort gives deeper analysis at higher cost per answer.">
                          <Select
                            options={[
                              { value: "low", label: "Low — fastest" },
                              { value: "medium", label: "Medium — balanced" },
                              { value: "high", label: "High — deepest" },
                            ]}
                          />
                        </Form.Item>
                      </Col>
                    ) : (
                      <Col xs={24} sm={8}>
                        <Form.Item name={["provider", "temperature"]} label="Temperature">
                          <InputNumber min={0} max={2} step={0.1} style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                    )}
                    <Col xs={24} sm={8}>
                      <Form.Item name={["provider", "maxTokens"]} label="Max answer tokens">
                        <InputNumber min={128} max={8192} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item name={["provider", "requestTimeoutMs"]} label="Request timeout (ms)">
                        <InputNumber min={5000} max={120000} step={1000} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                  </Row>
                  {status?.keySource === "database" && (
                    <Popconfirm
                      title="Clear the stored API key?"
                      description="VERA falls back to rule-based answers unless a server env key is set."
                      onConfirm={handleClearKey}
                      okText="Clear key"
                      okButtonProps={{ danger: true }}
                    >
                      <Button danger size="small" icon={<DeleteOutlined />}>Clear stored key</Button>
                    </Popconfirm>
                  )}
                </>
              )}
              {provider === "none" && status?.providerSource === "env" && (
                <Alert
                  style={{ marginTop: 12 }}
                  type="success"
                  showIcon
                  message={`Using ${status.providerLabel} from the server environment`}
                  description={`No provider is chosen here, so VERA picked ${status.providerLabel} (${status.model}) from the server's ${status.keyEnvVar}. Select a provider above to override.`}
                />
              )}
              {provider === "none" && status?.providerSource !== "env" && (
                <Alert
                  style={{ marginTop: 12 }}
                  type="info"
                  showIcon
                  message="Rule-based mode"
                  description="VERA will still answer data questions with a live snapshot (scores, awareness, services, remarks) and how-to questions from its help library — it just won't phrase custom analyses."
                />
              )}
            </Card>
          </Col>

          {/* ── Greetings & starters ─────────────────────────────────────── */}
          <Col xs={24} lg={12}>
            <Card title="Admin chat — greeting & starter questions" size="small" className="vera-settings-card">
              <Form.Item name="greeting" label="Greeting" tooltip="Blank uses the built-in greeting.">
                <Input.TextArea rows={2} maxLength={500} />
              </Form.Item>
              <Form.Item name="starterQuestions" label="Starter questions (one per line, max 10)">
                <Input.TextArea rows={5} placeholder={"How are we doing this month?\nWhich SQD dimension is the weakest?"} />
              </Form.Item>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Landing page — greeting & starter questions" size="small" className="vera-settings-card">
              <Form.Item name="greetingPublic" label="Greeting" tooltip="Blank uses the built-in greeting.">
                <Input.TextArea rows={2} maxLength={500} />
              </Form.Item>
              <Form.Item name="starterQuestionsPublic" label="Starter questions (one per line, max 10)">
                <Input.TextArea rows={5} placeholder={"What is this survey for?\nHow long does the survey take?"} />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        <div className="vera-settings-actions">
          <Space wrap>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
              Save settings
            </Button>
            <Tooltip title="Sends a tiny request to the selected provider using the saved settings.">
              <Button icon={<ApiOutlined />} onClick={handleTest} loading={testing} disabled={provider === "none"}>
                Test connection
              </Button>
            </Tooltip>
            <Button icon={<ReloadOutlined />} onClick={load}>Reload</Button>
          </Space>
        </div>
      </Form>
    </div>
  );
}
