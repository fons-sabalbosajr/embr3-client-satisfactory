// Developer Settings → Maintenance. Turns maintenance mode on/off for the whole
// system (stored on the server). While on, the server answers 503 to every
// account except Developers, and the public pages show the maintenance page.
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, DatePicker, Input, Modal, Skeleton, Tag, message } from "antd";
import {
  ToolOutlined,
  CheckCircleFilled,
  CodeOutlined,
  PoweroffOutlined,
  SaveOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import * as api from "../../../services/api";
import { isDeveloperUser } from "../../../utils/session";
import { formatEndsAt } from "../../../utils/maintenance";

const DEFAULT_MESSAGE = "EMBR3 OCSM is being updated and is temporarily unavailable.";

export default function Maintenance() {
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [endsAt, setEndsAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [developers, setDevelopers] = useState([]);
  const [messageApi, contextHolder] = message.useMessage();

  const load = async () => {
    setError("");
    try {
      const { data } = await api.getMaintenance();
      const m = data?.maintenance || {};
      setState(m);
      setMsg(m.message || "");
      setEndsAt(m.endsAt ? dayjs(m.endsAt) : null);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not read maintenance status.");
    }
  };

  useEffect(() => {
    load();
    api
      .getAllUsers()
      .then((res) => setDevelopers((res.data?.data || []).filter(isDeveloperUser)))
      .catch(() => {});
  }, []);

  const on = !!state?.enabled;
  const dirty = useMemo(
    () =>
      !!state &&
      ((msg || "") !== (state.message || "") ||
        (endsAt ? endsAt.toISOString() : null) !== (state.endsAt ? new Date(state.endsAt).toISOString() : null)),
    [state, msg, endsAt]
  );

  const apply = async (payload, success) => {
    setSaving(true);
    try {
      const { data } = await api.updateMaintenance(payload);
      const m = data?.maintenance || {};
      setState(m);
      setMsg(m.message || "");
      setEndsAt(m.endsAt ? dayjs(m.endsAt) : null);
      // The rest of the app (banner, routing) follows straight away.
      window.dispatchEvent(new CustomEvent("maintenance:changed", { detail: { enabled: m.enabled, message: m.message, endsAt: m.endsAt } }));
      messageApi.success(success);
    } catch (err) {
      messageApi.error(err?.response?.data?.message || "Could not update maintenance mode.");
    } finally {
      setSaving(false);
    }
  };

  const turnOn = () =>
    Modal.confirm({
      title: "Turn on maintenance mode?",
      icon: <ToolOutlined style={{ color: "#d48806" }} />,
      width: 480,
      content: (
        <div className="dev-confirm">
          <p>While maintenance is on:</p>
          <ul>
            <li>Clients see the maintenance page instead of the survey.</li>
            <li>Staff are signed out of use — every request they make is refused.</li>
            <li>
              <strong>Developer accounts keep full access</strong> ({developers.length || 1}) and can still sign in.
            </li>
          </ul>
        </div>
      ),
      okText: "Turn on",
      okButtonProps: { danger: true },
      onOk: () =>
        apply(
          { enabled: true, message: msg.trim() || DEFAULT_MESSAGE, endsAt: endsAt ? endsAt.toISOString() : null },
          "Maintenance mode is on."
        ),
    });

  const turnOff = () =>
    Modal.confirm({
      title: "End maintenance?",
      icon: <CheckCircleFilled style={{ color: "#52c41a" }} />,
      content: "The site goes live again for clients and staff immediately.",
      okText: "End maintenance",
      onOk: () => apply({ enabled: false }, "Maintenance ended — the system is live."),
    });

  if (!state && !error) return <Skeleton active paragraph={{ rows: 6 }} />;

  return (
    <div className="dev-maint">
      {contextHolder}
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={<Button size="small" icon={<ReloadOutlined />} onClick={load}>Retry</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      {state && (
        <>
          <section className={`dev-status${on ? " is-maint" : " is-live"}`}>
            <span className="dev-status__icon">{on ? <ToolOutlined /> : <CheckCircleFilled />}</span>
            <div className="dev-status__text">
              <strong>{on ? "Maintenance mode is on" : "The system is live"}</strong>
              <span>
                {on
                  ? `Since ${state.startedAt ? new Date(state.startedAt).toLocaleString() : "—"}${state.startedBy ? ` · by ${state.startedBy}` : ""}${state.endsAt ? ` · expected back ${formatEndsAt(state.endsAt)}` : ""}`
                  : "Clients and staff can use every page normally."}
              </span>
            </div>
            {on ? (
              <Button size="large" icon={<PoweroffOutlined />} onClick={turnOff} loading={saving}>
                End maintenance
              </Button>
            ) : (
              <Button size="large" danger type="primary" icon={<ToolOutlined />} onClick={turnOn} loading={saving}>
                Turn on maintenance
              </Button>
            )}
          </section>

          <div className="dev-grid">
            <section className="dev-card">
              <h4>Message for visitors</h4>
              <p className="dev-card__desc">Shown on the maintenance page and the sign-in page.</p>
              <Input.TextArea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder={DEFAULT_MESSAGE}
                autoSize={{ minRows: 3, maxRows: 6 }}
                maxLength={500}
                showCount
              />
              <div className="dev-field">
                <label htmlFor="maint-ends">Expected back (optional)</label>
                <DatePicker
                  id="maint-ends"
                  showTime={{ format: "h:mm A", use12Hours: true }}
                  format="MMM D, YYYY h:mm A"
                  value={endsAt}
                  onChange={setEndsAt}
                  disabledDate={(d) => d && d.isBefore(dayjs().startOf("day"))}
                  style={{ width: "100%" }}
                />
              </div>
              {on && (
                <div className="dev-card__foot">
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    disabled={!dirty}
                    loading={saving}
                    onClick={() =>
                      apply({ message: msg.trim() || DEFAULT_MESSAGE, endsAt: endsAt ? endsAt.toISOString() : null }, "Maintenance message updated.")
                    }
                  >
                    Update message
                  </Button>
                </div>
              )}
              {!on && <p className="dev-card__hint">These are used when you turn maintenance on.</p>}
            </section>

            <section className="dev-card">
              <h4>What visitors will see</h4>
              <div className="dev-preview" aria-hidden="true">
                <span className="dev-preview__icon"><ToolOutlined /></span>
                <strong>Under maintenance</strong>
                <p>
                  {msg.trim() || DEFAULT_MESSAGE}{" "}
                  {endsAt ? `We expect to be back by ${formatEndsAt(endsAt.toISOString())}.` : "Please check again in a little while."}
                </p>
                <span className="dev-preview__btns"><i>Check again</i><i>Developer sign-in</i></span>
              </div>

              <h4 className="dev-card__sub">Keeps full access</h4>
              <ul className="dev-devlist">
                {developers.length ? (
                  developers.map((d) => (
                    <li key={d._id}>
                      <CodeOutlined /> {d.fullname || d.username} <Tag>@{d.username}</Tag>
                    </li>
                  ))
                ) : (
                  <li><CodeOutlined /> Developer accounts</li>
                )}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
