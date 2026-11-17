// Developer Settings → System & Config: health of the server, database and
// email, plus the maintenance tools. Developer accounts only.
import React, { useEffect, useState } from "react";
import { Alert, Button, Input, Modal, Progress, Skeleton, Tag, Tooltip, message } from "antd";
import {
  CloudServerOutlined,
  DatabaseOutlined,
  MailOutlined,
  ToolOutlined,
  ReloadOutlined,
  SyncOutlined,
  ApiOutlined,
  SendOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import * as api from "../../../services/api";
import { APP_VERSION, APP_COMMIT, APP_BUILT_AT } from "../../../utils/appVersion";

// Free-tier Atlas clusters are capped at 512 MB (shared by every app on it).
const ATLAS_QUOTA_MB = 512;

const mb = (bytes) => (bytes ? bytes / 1048576 : 0);
const uptime = (s) => {
  if (s == null) return "—";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return [d && `${d}d`, (d || h) && `${h}h`, `${m}m`].filter(Boolean).join(" ");
};

function Row({ label, children }) {
  return (
    <div className="dev-kv">
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  );
}

export default function SystemConfig() {
  const [info, setInfo] = useState(null);
  const [db, setDb] = useState(null);
  const [email, setEmail] = useState(null);
  const [busy, setBusy] = useState("");
  const [testTo, setTestTo] = useState("");
  const [messageApi, contextHolder] = message.useMessage();

  const loadInfo = () => api.getSystemInfo().then((r) => setInfo(r.data)).catch(() => setInfo({ error: true }));
  const loadDb = () => api.getDbStats().then((r) => setDb(r.data)).catch((e) => setDb({ error: e?.response?.data?.message || "Unavailable" }));
  const loadEmail = () =>
    api.getEmailHealth().then((r) => setEmail(r.data)).catch((e) => setEmail({ ok: false, error: e?.response?.data?.error || "Unavailable" }));

  useEffect(() => {
    loadInfo();
    loadDb();
    loadEmail();
  }, []);

  const run = async (key, fn, ok) => {
    setBusy(key);
    try {
      const res = await fn();
      messageApi.success(typeof ok === "function" ? ok(res) : ok);
      return res;
    } catch (err) {
      messageApi.error(err?.response?.data?.message || err?.response?.data?.error || "That didn't work.");
      return null;
    } finally {
      setBusy("");
    }
  };

  const syncServices = () =>
    Modal.confirm({
      title: "Replace the Service Availed list?",
      icon: <WarningOutlined style={{ color: "#cf1322" }} />,
      width: 500,
      content: (
        <div className="dev-confirm">
          <p>
            This overwrites the survey's <strong>Service Availed</strong> options with the{" "}
            <code>EXTERNAL_SERVICES</code> and <code>INTERNAL_SERVICES</code> lists in the server <code>.env</code>.
          </p>
          <ul>
            <li>Any option edited in Data Configuration is lost.</li>
            <li>Separate services with <code>|</code> in the .env — names with commas break otherwise.</li>
            <li>Past responses are not changed.</li>
          </ul>
        </div>
      ),
      okText: "Replace list",
      okButtonProps: { danger: true },
      onOk: () => run("sync", () => api.syncServicesFromEnv(), (r) => `Service list replaced (${r?.data?.data?.options?.length ?? "?"} services).`),
    });

  const dbMb = mb(db?.db?.storageSize);
  const dbPct = Math.min(100, Math.round((dbMb / ATLAS_QUOTA_MB) * 100));

  return (
    <div className="dev-sys">
      {contextHolder}
      <div className="dev-grid">
        {/* Server */}
        <section className="dev-card">
          <h4><CloudServerOutlined /> Server</h4>
          {!info ? (
            <Skeleton active paragraph={{ rows: 4 }} title={false} />
          ) : info.error ? (
            <Alert type="error" showIcon message="Server info unavailable" />
          ) : (
            <>
              <Row label="Environment"><Tag color={info.env === "production" ? "green" : "gold"}>{info.env}</Tag></Row>
              <Row label="Uptime">{uptime(info.uptimeSec)}</Row>
              <Row label="Node.js">{info.node}</Row>
              <Row label="Memory">{info.memoryMb} MB</Row>
              <Row label="Cached responses">{info.cachedResponses ?? "—"}</Row>
              <Row label="Server version">{info.serverVersion || "—"}</Row>
            </>
          )}
          <div className="dev-card__foot">
            <Button size="small" icon={<ReloadOutlined />} onClick={loadInfo}>Refresh</Button>
          </div>
        </section>

        {/* App */}
        <section className="dev-card">
          <h4><ApiOutlined /> Web app</h4>
          <Row label="Version">v{APP_VERSION}</Row>
          <Row label="Build">{APP_COMMIT || "—"}</Row>
          <Row label="Built">{APP_BUILT_AT ? new Date(APP_BUILT_AT).toLocaleString() : "—"}</Row>
          <p className="dev-card__hint">Bump <code>version</code> in <code>front-end/package.json</code> for each release; it shows at the bottom of the sidebar.</p>
        </section>

        {/* Database */}
        <section className="dev-card">
          <h4><DatabaseOutlined /> Database</h4>
          {!db ? (
            <Skeleton active paragraph={{ rows: 3 }} title={false} />
          ) : db.error ? (
            <Alert type="error" showIcon message={db.error} />
          ) : (
            <>
              <Row label="Status">
                <Tag color={db.connection?.state === "connected" ? "green" : "red"}>{db.connection?.state || "unknown"}</Tag>
              </Row>
              <Row label="Database">{db.db?.name}</Row>
              <Row label="Documents">{(db.db?.objects || 0).toLocaleString()}</Row>
              <div className="dev-quota">
                <div className="dev-quota__head">
                  <span>Storage used by this database</span>
                  <strong>{dbMb.toFixed(1)} MB</strong>
                </div>
                <Progress percent={dbPct} size="small" showInfo={false} status={dbPct > 85 ? "exception" : "normal"} />
                <span className="dev-card__hint">
                  Of the {ATLAS_QUOTA_MB} MB free-tier cluster limit, which is shared with other apps on the same cluster.
                </span>
              </div>
            </>
          )}
          <div className="dev-card__foot">
            <Button size="small" icon={<ReloadOutlined />} onClick={loadDb}>Refresh</Button>
            <Button size="small" icon={<ApiOutlined />} loading={busy === "connect"} onClick={() => run("connect", () => api.connectDb(), (r) => r?.data?.message || "Database checked.").then(loadDb)}>
              Reconnect
            </Button>
          </div>
        </section>

        {/* Email */}
        <section className="dev-card">
          <h4><MailOutlined /> Email</h4>
          {!email ? (
            <Skeleton active paragraph={{ rows: 2 }} title={false} />
          ) : (
            <Row label="Mail service">
              {email.ok ? <Tag color="green">Working</Tag> : <Tooltip title={email.error}><Tag color="red">Not working</Tag></Tooltip>}
            </Row>
          )}
          {email && !email.ok && email.error && <p className="dev-card__hint dev-err">{email.error}</p>}
          <div className="dev-field">
            <label htmlFor="test-email">Send a test email</label>
            <Input.Search
              id="test-email"
              placeholder="you@emb.gov.ph"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              enterButton={<><SendOutlined /> Send</>}
              loading={busy === "email"}
              onSearch={(to) => to && run("email", () => api.sendTestEmail(to.trim()), (r) => r?.data?.message || "Test email sent.")}
            />
          </div>
          <div className="dev-card__foot">
            <Button size="small" icon={<ReloadOutlined />} onClick={loadEmail}>Check again</Button>
          </div>
        </section>
      </div>

      {/* Tools */}
      <section className="dev-card dev-tools">
        <h4><ToolOutlined /> Tools</h4>
        <div className="dev-tool">
          <div>
            <strong>Reload responses</strong>
            <span>Re-read every response from the database. Use after editing data directly in Atlas — the app otherwise refreshes every 5 minutes.</span>
          </div>
          <Button icon={<SyncOutlined />} loading={busy === "cache"} onClick={() => run("cache", () => api.refreshResponseCache(), (r) => `Reloaded ${r?.data?.responses ?? 0} responses.`).then(loadInfo)}>
            Reload
          </Button>
        </div>
        <div className="dev-tool is-danger">
          <div>
            <strong>Replace Service Availed list from .env</strong>
            <span>Overwrites the survey's service options with the server's environment lists.</span>
          </div>
          <Button danger icon={<WarningOutlined />} loading={busy === "sync"} onClick={syncServices}>
            Replace…
          </Button>
        </div>
      </section>
    </div>
  );
}
