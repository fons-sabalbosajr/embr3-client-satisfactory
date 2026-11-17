// VERA settings — provider, model, persona, chat experience, live data, usage.
//
// The browser never holds the raw API key: it is submitted once for encrypted
// storage on the server (or the server env var is used), and only a masked
// hint ever comes back. All model calls happen server-side.
//
// Layout: a status hero (what VERA is running on right now, plus the on/off
// switch and connection test), then tabbed sections. Every tab is rendered
// up-front (forceRender) so the form submits all fields, not only the tabs
// that were opened. A sticky bar appears as soon as something is changed.
import React, { useEffect, useMemo, useState } from "react";
import {
  Form,
  Input,
  Switch,
  Select,
  AutoComplete,
  InputNumber,
  Slider,
  Button,
  Tag,
  Alert,
  Typography,
  Spin,
  Segmented,
  Tabs,
  Tooltip,
  message,
  Popconfirm,
  theme as antdTheme,
} from "antd";
import {
  SaveOutlined,
  ApiOutlined,
  KeyOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  MessageOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CheckCircleFilled,
  RobotOutlined,
  ReadOutlined,
  CommentOutlined,
  ArrowRightOutlined,
  UndoOutlined,
  WarningFilled,
  SettingOutlined,
} from "@ant-design/icons";
import * as api from "../../../services/api";
import VeraFlameIcon from "../../Vera/VeraFlameIcon";
import { VeraFlame } from "../../Vera/VeraMark";
import useBodyTheme from "../../Vera/useBodyTheme";
import "../../Vera/VeraChat.css";
import "./verasettings.css";

const { Text, Link } = Typography;

// Provider metadata — drives the chooser, model presets and key hints.
// Gemini presets were checked against the model list of a free-tier key on
// 2026-11-17: Flash models answer; Pro models return "quota exceeded" there.
const PROVIDER_INFO = {
  none: {
    label: "Rule-based",
    sub: "No model",
    icon: <ReadOutlined />,
    tagline: "Answers from live survey figures and the help library only. No API key needed.",
    models: [],
  },
  anthropic: {
    label: "Anthropic",
    sub: "Claude",
    icon: <RobotOutlined />,
    tagline: "Best analysis quality. Requires a funded API key.",
    keyPlaceholder: "sk-ant-…",
    keyUrl: "https://console.anthropic.com/",
    envVar: "ANTHROPIC_API_KEY",
    defaultModel: "claude-opus-5",
    effortLabel: "Reasoning effort",
    models: [
      { value: "claude-opus-5", title: "Claude Opus 5", desc: "Most capable analyst for nuanced trends and remarks.", badges: ["Recommended"] },
      { value: "claude-sonnet-5", title: "Claude Sonnet 5", desc: "Balanced quality and cost.", badges: [] },
      { value: "claude-haiku-4-5", title: "Claude Haiku 4.5", desc: "Fastest and cheapest; lighter reasoning.", badges: ["Fastest"] },
    ],
  },
  gemini: {
    label: "Google Gemini",
    sub: "Gemini",
    icon: <ThunderboltOutlined />,
    tagline: "Fast answers; a free tier is available for light use.",
    keyPlaceholder: "AIza…",
    keyUrl: "https://aistudio.google.com/apikey",
    envVar: "GEMINI_API_KEY",
    defaultModel: "gemini-3.5-flash",
    effortLabel: "Thinking depth",
    models: [
      { value: "gemini-3.5-flash", title: "Gemini 3.5 Flash", desc: "Current generation. Strong analysis, quick replies, free tier.", badges: ["Recommended", "Free tier"] },
      { value: "gemini-3.5-flash-lite", title: "Gemini 3.5 Flash-Lite", desc: "Quickest replies with lighter reasoning. Also VERA's automatic fallback.", badges: ["Free tier", "Fastest"] },
      { value: "gemini-3.8-flash", title: "Gemini 3.8 Flash", desc: "Newest Flash. Often busy after release — VERA falls back automatically.", badges: ["Newest"] },
      { value: "gemini-3.1-pro-preview", title: "Gemini 3.1 Pro (preview)", desc: "Deepest reasoning. Needs a paid Gemini plan.", badges: ["Paid plan"] },
      { value: "gemini-2.5-flash", title: "Gemini 2.5 Flash", desc: "Previous generation, kept for compatibility.", badges: ["Legacy"] },
    ],
  },
};

const BADGE_COLORS = { Recommended: "blue", "Free tier": "green", Fastest: "cyan", Newest: "purple", "Paid plan": "gold", Legacy: "default" };

const EFFORT_OPTIONS = {
  anthropic: [
    { value: "low", label: "Low", hint: "Fastest" },
    { value: "medium", label: "Medium", hint: "Balanced" },
    { value: "high", label: "High", hint: "Deepest" },
  ],
  gemini: [
    { value: "low", label: "Minimal", hint: "No extended thinking — fastest" },
    { value: "medium", label: "Low", hint: "Brief thinking — balanced" },
    { value: "high", label: "High", hint: "Deep thinking — slowest" },
  ],
};

const TONES = [
  { value: "analyst", label: "Analyst", hint: "Numbers first, crisp findings and next steps." },
  { value: "friendly", label: "Friendly", hint: "Warm and plain-spoken, still data-led." },
  { value: "formal", label: "Formal", hint: "Report-ready wording for memos and ARTA submissions." },
];

const LENGTHS = [
  { value: "brief", label: "Brief" },
  { value: "balanced", label: "Balanced" },
  { value: "detailed", label: "Detailed" },
];

const toLines = (arr) => (Array.isArray(arr) ? arr.join("\n") : arr || "");
const fromLines = (s) => String(s || "").split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 10);

function relativeTime(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return "—";
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(iso).toLocaleDateString();
}

// A labelled row: text on the left, control on the right (stacks on phones).
function SettingRow({ title, desc, children, align = "center" }) {
  return (
    <div className={`vs-row vs-row--${align}`}>
      <div className="vs-row__text">
        <div className="vs-row__title">{title}</div>
        {desc && <div className="vs-row__desc">{desc}</div>}
      </div>
      <div className="vs-row__control">{children}</div>
    </div>
  );
}

function Section({ title, desc, children, extra }) {
  return (
    <section className="vs-section">
      <header className="vs-section__head">
        <div>
          <h3 className="vs-section__title">{title}</h3>
          {desc && <p className="vs-section__desc">{desc}</p>}
        </div>
        {extra}
      </header>
      <div className="vs-section__body">{children}</div>
    </section>
  );
}

export default function VeraSettings() {
  const [form] = Form.useForm();
  const { token } = antdTheme.useToken();
  const bodyTheme = useBodyTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { ok, message }
  const [status, setStatus] = useState(null);
  const [usageToday, setUsageToday] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState("model");
  const [messageApi, contextHolder] = message.useMessage();

  const provider = Form.useWatch(["provider", "provider"], form) || "none";
  const model = Form.useWatch(["provider", "model"], form) || "";
  const effort = Form.useWatch(["provider", "effort"], form) || "medium";
  const enabled = Form.useWatch("enabled", form);
  const previewName = Form.useWatch("name", form) || "VERA";
  const previewFullName = Form.useWatch("fullName", form) || "Virtual Environmental Response Assistant";
  const previewTagline = Form.useWatch("tagline", form);
  const previewGreeting = Form.useWatch("greeting", form);
  const previewStarters = fromLines(Form.useWatch("starterQuestions", form));
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
        provider: { effort: "medium", ...(c.provider || {}), apiKey: "" }, // never prefill; blank keeps stored key
      });
      setDirty(false);
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

  const setField = (name, value) => {
    form.setFieldValue(name, value);
    setDirty(true);
  };

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
    setDirty(true);
  };

  const handleSave = async (values) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        starterQuestions: String(values.starterQuestions || "").split("\n"),
        provider: { ...values.provider },
      };
      if (!String(payload.provider.apiKey || "").trim()) delete payload.provider.apiKey;
      const { data } = await api.updateVeraSettings(payload);
      setStatus(data.status || null);
      form.setFieldsValue({ provider: { ...form.getFieldValue("provider"), apiKey: "" } });
      setDirty(false);
      setTestResult(null);
      messageApi.success("VERA settings saved.");
    } catch (err) {
      messageApi.error(err?.response?.data?.message || "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data } = await api.testVeraConnection();
      if (data.status) setStatus(data.status);
      setTestResult({ ok: !!data.ok, message: data.message });
    } catch (err) {
      setTestResult({ ok: false, message: err?.response?.data?.message || "Connection test failed." });
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

  const state = useMemo(() => {
    if (!status) return { tone: "idle", label: "Unknown" };
    if (!status.enabled) return { tone: "off", label: "Turned off" };
    if (status.operational) return { tone: "on", label: "Model connected" };
    if (status.provider === "none") return { tone: "lite", label: "Rule-based mode" };
    return { tone: "warn", label: "No API key — using live figures" };
  }, [status]);

  const keyLabel = !status
    ? "—"
    : status.provider === "none"
      ? "Not required"
      : !status.keyConfigured
        ? "Not configured"
        : status.keySource === "env"
          ? "Server environment"
          : "Encrypted in database";

  // antd tokens → CSS variables, so the page follows light/dark and the
  // admin's chosen primary colour without separate overrides.
  const cssVars = {
    "--vs-primary": token.colorPrimary,
    "--vs-surface": token.colorBgContainer,
    "--vs-elevated": token.colorBgElevated,
    "--vs-fill": token.colorFillQuaternary,
    "--vs-fill-strong": token.colorFillTertiary,
    "--vs-border": token.colorBorderSecondary,
    "--vs-border-strong": token.colorBorder,
    "--vs-text": token.colorText,
    "--vs-muted": token.colorTextSecondary,
    "--vs-faint": token.colorTextTertiary,
  };

  if (loading) {
    return (
      <div className="vera-settings-loading">
        <Spin size="large" />
      </div>
    );
  }

  const presetValues = new Set(info.models.map((m) => m.value));
  const customModel = model && !presetValues.has(model);

  const modelTab = (
    <>
      <Section title="Provider" desc="Where VERA's answers are written. Live survey figures are always computed on the server.">
        <Form.Item name={["provider", "provider"]} noStyle>
          <Input type="hidden" />
        </Form.Item>
        <div className="vs-providers" role="radiogroup" aria-label="Model provider">
          {Object.entries(PROVIDER_INFO).map(([id, p]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={provider === id}
              className={`vs-provider${provider === id ? " is-selected" : ""}`}
              onClick={() => selectProvider(id)}
            >
              <span className="vs-provider__icon">{p.icon}</span>
              <span className="vs-provider__text">
                <span className="vs-provider__label">{p.label}</span>
                <span className="vs-provider__tagline">{p.tagline}</span>
              </span>
              {provider === id && <CheckCircleFilled className="vs-provider__check" />}
            </button>
          ))}
        </div>
        {provider === "none" && status?.providerSource === "env" && (
          <Alert
            className="vs-alert"
            type="success"
            showIcon
            message={`Using ${status.providerLabel} from the server environment`}
            description={`No provider is chosen here, so VERA picked ${status.providerLabel} (${status.model}) from the server's ${status.keyEnvVar}. Select a provider above to override.`}
          />
        )}
        {provider === "none" && status?.providerSource !== "env" && (
          <Alert
            className="vs-alert"
            type="info"
            showIcon
            message="Rule-based mode"
            description="VERA still answers data questions with a live snapshot (scores, awareness, services, remarks) and how-to questions from its help library — it just won't write custom analyses."
          />
        )}
      </Section>

      {provider !== "none" && (
        <>
          <Section
            title="Model"
            desc={provider === "gemini"
              ? "Pick a preset or enter any model ID your key can access. If the chosen model is overloaded, VERA retries once on the fallback."
              : "Pick a preset or enter any model ID your key can access."}
          >
            <div className="vs-models" role="radiogroup" aria-label="Model">
              {info.models.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={model === m.value}
                  className={`vs-model${model === m.value ? " is-selected" : ""}`}
                  onClick={() => setField(["provider", "model"], m.value)}
                >
                  <span className="vs-model__radio" aria-hidden="true" />
                  <span className="vs-model__text">
                    <span className="vs-model__title">
                      {m.title}
                      {m.badges.map((b) => (
                        <Tag key={b} color={BADGE_COLORS[b]} className="vs-model__badge">{b}</Tag>
                      ))}
                    </span>
                    <span className="vs-model__desc">{m.desc}</span>
                    <code className="vs-model__id">{m.value}</code>
                  </span>
                </button>
              ))}
            </div>
            <Form.Item
              name={["provider", "model"]}
              label={customModel ? "Custom model ID (in use)" : "Or enter another model ID"}
              className="vs-custom-model"
            >
              <AutoComplete
                options={info.models.map((m) => ({ value: m.value, label: m.value }))}
                placeholder={info.defaultModel}
                allowClear
              />
            </Form.Item>
            {provider === "gemini" && status?.fallbackModel && (
              <Text type="secondary" className="vs-note">
                Fallback when busy: <code>{status.fallbackModel}</code> (server setting <code>GEMINI_FALLBACK_MODEL</code>).
              </Text>
            )}
          </Section>

          <Section title="API key" desc="Stored encrypted and never sent back to the browser. A server environment key always takes precedence.">
            <Form.Item
              name={["provider", "apiKey"]}
              label={
                <span className="vs-key-label">
                  <KeyOutlined /> {info.label} key
                  {status?.keyHint && status.provider === provider && <Tag color="green">{status.keyHint}</Tag>}
                </span>
              }
            >
              <Input.Password
                placeholder={status?.keyConfigured && status.provider === provider ? "Leave blank to keep the current key" : info.keyPlaceholder}
                autoComplete="new-password"
              />
            </Form.Item>
            <div className="vs-key-foot">
              <Text type="secondary" className="vs-note">
                Get a key at <Link href={info.keyUrl} target="_blank" rel="noreferrer">{info.keyUrl.replace(/^https:\/\//, "")}</Link>, or set <code>{info.envVar}</code> on the server.
              </Text>
              {status?.keySource === "database" && (
                <Popconfirm
                  title="Clear the stored API key?"
                  description="VERA falls back to live figures unless a server env key is set."
                  onConfirm={handleClearKey}
                  okText="Clear key"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger size="small" icon={<DeleteOutlined />}>Clear stored key</Button>
                </Popconfirm>
              )}
            </div>
          </Section>

          <Section title="Answer generation">
            <SettingRow
              title={info.effortLabel}
              desc={(EFFORT_OPTIONS[provider] || []).find((o) => o.value === effort)?.hint}
            >
              <Form.Item name={["provider", "effort"]} noStyle>
                <Segmented options={(EFFORT_OPTIONS[provider] || []).map(({ value, label }) => ({ value, label }))} />
              </Form.Item>
            </SettingRow>
            {provider === "gemini" && (
              <SettingRow title="Temperature" desc="Lower is more consistent; higher is more varied. 0.3 suits data briefs.">
                <div className="vs-slider">
                  <Form.Item name={["provider", "temperature"]} noStyle>
                    <Slider min={0} max={2} step={0.1} />
                  </Form.Item>
                  <Form.Item name={["provider", "temperature"]} noStyle>
                    <InputNumber min={0} max={2} step={0.1} size="small" className="vs-slider__num" />
                  </Form.Item>
                </div>
              </SettingRow>
            )}
            <SettingRow
              title="Max answer tokens"
              desc={provider === "gemini" ? "Visible answer length. Thinking gets its own allowance on top." : "Upper limit for one answer."}
            >
              <Form.Item name={["provider", "maxTokens"]} noStyle>
                <InputNumber min={128} max={8192} step={100} className="vs-num" />
              </Form.Item>
            </SettingRow>
            <SettingRow title="Request timeout" desc="How long VERA waits for the provider before answering from live figures.">
              <Form.Item name={["provider", "requestTimeoutMs"]} noStyle>
                <InputNumber min={5000} max={120000} step={1000} className="vs-num" addonAfter="ms" />
              </Form.Item>
            </SettingRow>
          </Section>
        </>
      )}
    </>
  );

  const personaTab = (
    <>
      <Section title="Identity" desc="How VERA introduces herself in the chat.">
        <div className="vs-grid-2">
          <Form.Item name="name" label="Short name" rules={[{ required: true, max: 40 }]}>
            <Input placeholder="VERA" />
          </Form.Item>
          <Form.Item name="fullName" label="Full name" rules={[{ required: true, max: 120 }]}>
            <Input placeholder="Virtual Environmental Response Assistant" />
          </Form.Item>
        </div>
        <Form.Item name="tagline" label="Tagline" extra="Shown under her name on the chat's welcome screen.">
          <Input placeholder="Your client-satisfaction insight partner" maxLength={160} />
        </Form.Item>
      </Section>

      <Section title="Response style">
        <Form.Item name="tone" label="Tone">
          <ToneCards />
        </Form.Item>
        <SettingRow title="Response length" desc="Brief answers suit quick checks; detailed answers suit report drafting.">
          <Form.Item name="responseLength" noStyle>
            <Segmented options={LENGTHS} />
          </Form.Item>
        </SettingRow>
        <Form.Item
          name="customInstructions"
          label="Additional instructions"
          extra="Appended to VERA's instructions — office targets, terminology or reporting periods."
          className="vs-mt"
        >
          <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} maxLength={2000} showCount placeholder="e.g. Our internal target for every SQD dimension is 95%. Refer to the office as EMB R3." />
        </Form.Item>
      </Section>
    </>
  );

  const chatTab = (
    <div className="vs-chat-layout">
      <Section title="Welcome screen" desc="What staff see when they open a new conversation.">
        <Form.Item name="greeting" label="Greeting" extra="Leave blank for the built-in greeting.">
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} maxLength={500} showCount />
        </Form.Item>
        <Form.Item name="starterQuestions" label="Suggested questions" extra="One per line, up to 10. The first few are shown as cards.">
          <Input.TextArea autoSize={{ minRows: 4, maxRows: 10 }} placeholder={"How are we doing this month?\nWhich SQD dimension is the weakest?"} />
        </Form.Item>
      </Section>

      <div className="vs-preview" aria-label="Chat preview">
        <div className="vs-preview__label">Live preview</div>
        <div className="vera-root vs-preview__root" data-theme={bodyTheme} style={{ "--v-app-accent": token.colorPrimary }}>
          <div className="vera-window vs-preview__window">
            <div className="vera-header">
              <div className="vera-header__id">
                <span className="vera-header__mark"><VeraFlame size={34} state="burning" theme={bodyTheme} label="" /></span>
                <div className="vera-header__text">
                  <div className="vera-header__name">{previewName}</div>
                  <div className="vera-header__sub">
                    <span className={`vera-status-dot vera-status-dot--${enabled === false ? "off" : status?.operational ? "online" : "lite"}`} />
                    <span className="vera-header__status">{enabled === false ? "Offline — turned off" : status?.operational ? "Online · Live insights" : "Online · Live figures"}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="vera-messages">
              <div className="vera-welcome">
                <span className="vera-welcome__mark"><VeraFlame size={46} state="burning" theme={bodyTheme} label="" /></span>
                <h3 className="vera-welcome__title">Hi, I'm {previewName}</h3>
                <p className="vera-welcome__role">{previewTagline || previewFullName}</p>
                <div className="vera-welcome__greeting">
                  {previewGreeting || "Ask me about satisfaction scores, Citizen's Charter awareness, services availed, trends or client remarks — I answer from the live survey data."}
                </div>
                <div className="vera-starters">
                  {previewStarters.slice(0, 3).map((q) => (
                    <div key={q} className="vera-starter">
                      <span className="vera-starter__text">{q}</span>
                      <ArrowRightOutlined className="vera-starter__go" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const dataTab = (
    <Section title="Live survey data" desc="What VERA can see when she answers.">
      <SettingRow title="Ground answers in live survey aggregates" desc="Current counts, SQD scores, Citizen's Charter awareness, top services, trends and remarks.">
        <Form.Item name="liveInsights" valuePropName="checked" noStyle><Switch /></Form.Item>
      </SettingRow>
      <SettingRow title="Include recent client remarks" desc="Anonymised remark text, so VERA can summarise what clients are saying.">
        <Form.Item name="includeRemarks" valuePropName="checked" noStyle><Switch /></Form.Item>
      </SettingRow>
      <SettingRow title="Data window" desc="0 uses every response. 90 focuses VERA on the current quarter.">
        <Form.Item name="insightsWindowDays" noStyle>
          <InputNumber min={0} max={3650} className="vs-num" addonAfter="days" />
        </Form.Item>
      </SettingRow>
    </Section>
  );

  const usageTab = (
    <Section title="Usage & logging" desc="VERA is available to signed-in staff only — never on the public pages.">
      <SettingRow title="Chats per user per day" desc="0 means unlimited.">
        <Form.Item name="dailyUserLimit" noStyle>
          <InputNumber min={0} max={10000} className="vs-num" />
        </Form.Item>
      </SettingRow>
      <SettingRow title="Logging" desc="Metadata records who asked and how long it took. Full transcript also stores questions and answers in App Logs.">
        <Form.Item name="loggingLevel" noStyle>
          <Select
            className="vs-select"
            options={[
              { value: "none", label: "None" },
              { value: "metadata", label: "Metadata only (recommended)" },
              { value: "full", label: "Full transcript" },
            ]}
          />
        </Form.Item>
      </SettingRow>
    </Section>
  );

  return (
    <div className="vera-settings" style={cssVars}>
      {contextHolder}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        onValuesChange={() => setDirty(true)}
        requiredMark={false}
        className="vera-settings-form"
      >
        {/* ── Status hero ───────────────────────────────────────────────── */}
        <div className="vs-hero">
          <div className="vs-hero__top">
            <span className="vs-hero__flame"><VeraFlameIcon size={60} tile anime theme="dark" title="VERA" /></span>
            <div className="vs-hero__intro">
              <h2 className="vs-hero__title">VERA Assistant</h2>
              <p className="vs-hero__lead">
                The Virtual Environmental Response Assistant answers staff questions from live survey data inside the admin portal.
              </p>
            </div>
            <div className="vs-hero__switch">
              <span className="vs-hero__switch-label">{enabled ? "On" : "Off"}</span>
              <Form.Item name="enabled" valuePropName="checked" noStyle>
                <Switch aria-label="Enable VERA in the admin portal" />
              </Form.Item>
            </div>
          </div>

          <div className="vs-stats">
            <div className="vs-stat">
              <span className="vs-stat__label">Status</span>
              <span className={`vs-state vs-state--${state.tone}`}><span className="vs-state__dot" />{state.label}</span>
            </div>
            <div className="vs-stat">
              <span className="vs-stat__label">Model</span>
              <span className="vs-stat__value" title={status?.model}>{status?.model || "—"}</span>
              <span className="vs-stat__sub">{status?.providerLabel || ""}</span>
            </div>
            <div className="vs-stat">
              <span className="vs-stat__label">API key</span>
              <span className="vs-stat__value">{keyLabel}</span>
            </div>
            <div className="vs-stat">
              <span className="vs-stat__label">Chats today</span>
              <span className="vs-stat__value">{usageToday}</span>
            </div>
            <div className="vs-stat">
              <span className="vs-stat__label">Last connected</span>
              <span className="vs-stat__value" title={status?.lastSuccessfulConnectionAt ? new Date(status.lastSuccessfulConnectionAt).toLocaleString() : ""}>
                {relativeTime(status?.lastSuccessfulConnectionAt)}
              </span>
            </div>
          </div>

          <div className="vs-hero__foot">
            {status?.lastError ? (
              <span className="vs-hero__error"><WarningFilled /> Last error: {status.lastError}</span>
            ) : testResult ? (
              <span className={testResult.ok ? "vs-hero__ok" : "vs-hero__error"}>
                {testResult.ok ? <CheckCircleFilled /> : <WarningFilled />} {testResult.message}
              </span>
            ) : (
              <span className="vs-hero__hint">Test the saved settings with a tiny request to the provider.</span>
            )}
            <Tooltip title={dirty ? "Save your changes first — the test uses the saved settings." : ""}>
              <Button
                className="vs-hero__test"
                icon={<ApiOutlined />}
                onClick={handleTest}
                loading={testing}
                disabled={provider === "none" || dirty}
              >
                Test connection
              </Button>
            </Tooltip>
          </div>
        </div>

        {/* ── Sections ──────────────────────────────────────────────────── */}
        <Tabs
          className="vs-tabs"
          activeKey={tab}
          onChange={setTab}
          items={[
            { key: "model", label: <span><ApiOutlined /> Model</span>, children: modelTab, forceRender: true },
            { key: "persona", label: <span><MessageOutlined /> Persona</span>, children: personaTab, forceRender: true },
            { key: "chat", label: <span><CommentOutlined /> Chat experience</span>, children: chatTab, forceRender: true },
            { key: "data", label: <span><ThunderboltOutlined /> Live data</span>, children: dataTab, forceRender: true },
            { key: "usage", label: <span><SafetyCertificateOutlined /> Usage &amp; logging</span>, children: usageTab, forceRender: true },
          ]}
        />

        {/* ── Save bar ─────────────────────────────────────────────────── */}
        <div className={`vs-savebar${dirty ? " is-dirty" : ""}`}>
          <span className="vs-savebar__text">
            {dirty ? <><span className="vs-savebar__dot" /> You have unsaved changes</> : <><SettingOutlined /> All changes saved</>}
          </span>
          <div className="vs-savebar__actions">
            <Button icon={dirty ? <UndoOutlined /> : <ReloadOutlined />} onClick={load} disabled={saving}>
              {dirty ? "Discard" : "Reload"}
            </Button>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} disabled={!dirty}>
              Save settings
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
}

// Tone as three selectable cards with a one-line description each.
function ToneCards({ value, onChange }) {
  return (
    <div className="vs-tones" role="radiogroup" aria-label="Tone">
      {TONES.map((t) => (
        <button
          key={t.value}
          type="button"
          role="radio"
          aria-checked={value === t.value}
          className={`vs-tone${value === t.value ? " is-selected" : ""}`}
          onClick={() => onChange?.(t.value)}
        >
          <span className="vs-tone__label">{t.label}</span>
          <span className="vs-tone__hint">{t.hint}</span>
        </button>
      ))}
    </div>
  );
}
