// My Account → Appearance: light/dark mode and the admin colours, per user.
//
// Changes preview live (the shell listens for "theme:updated") and are saved
// to the user's preferences on the server. A cleared colour (null) means the
// ARTA default for the current mode. Mode is switched through "theme:mode";
// AdminPage owns it and reports back with "theme:mode-changed".
import React, { useEffect, useMemo, useState } from "react";
import { Button, ColorPicker, Segmented, Tag, Tooltip, message } from "antd";
import { SunOutlined, MoonOutlined, UndoOutlined, SaveOutlined, CheckOutlined } from "@ant-design/icons";
import * as api from "../../../services/api";
import { getDecryptedItem, setEncryptedItem } from "../../../utils/encryptedStorage";
import { buildAdminTheme, normalizePrefs, THEME_PRESETS } from "../../../pages/AdminPage/adminTheme";
import "./appearance.css";

const FIELDS = [
  { key: "siderBg", label: "Sidebar", hint: "Navigation background. Default: ARTA navy gradient." },
  { key: "headerBg", label: "Header", hint: "Top bar background. Default: white in light mode, navy in dark." },
  { key: "colorPrimary", label: "Primary colour", hint: "Buttons, links and highlights. Default: ARTA blue." },
];

const readMode = () => (document.body?.getAttribute("data-theme") === "dark" ? "dark" : "light");
const same = (a, b) => FIELDS.every(({ key }) => (a[key] || null) === (b[key] || null));

const broadcast = (prefs) => {
  try {
    setEncryptedItem("themePrefsCache", JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("theme:updated", { detail: prefs }));
};

// A small picture of the admin with the given colours.
function MiniAdmin({ prefs, dark }) {
  const t = buildAdminTheme({ dark, prefs });
  return (
    <span className="ap-mini" style={{ background: t.vars["--adm-layout-bg"] }} aria-hidden="true">
      <span className="ap-mini__sider" style={{ background: t.vars["--adm-sider-bg"] }}>
        <span style={{ background: t.vars["--adm-sider-indicator"] }} />
        <span style={{ background: t.vars["--adm-sider-text"] }} />
        <span style={{ background: t.vars["--adm-sider-text"] }} />
      </span>
      <span className="ap-mini__main">
        <span className="ap-mini__header" style={{ background: t.vars["--adm-header-bg"], borderColor: t.vars["--adm-header-border"] }} />
        <span className="ap-mini__card" style={{ background: t.vars["--adm-surface"] }}>
          <span className="ap-mini__btn" style={{ background: t.primary }} />
        </span>
      </span>
    </span>
  );
}

export default function Appearance() {
  const [mode, setMode] = useState(readMode);
  const [saved, setSaved] = useState(() => normalizePrefs({}));
  const [prefs, setPrefs] = useState(() => {
    try {
      return normalizePrefs(JSON.parse(getDecryptedItem("themePrefsCache") || "{}"));
    } catch {
      return normalizePrefs({});
    }
  });
  const [saving, setSaving] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const dark = mode === "dark";
  const dirty = !same(prefs, saved);

  useEffect(() => {
    let alive = true;
    api
      .getPreferences()
      .then((res) => {
        if (!alive) return;
        const p = normalizePrefs(res?.data?.preferences || {});
        setSaved(p);
        setPrefs(p);
      })
      .catch(() => {});
    const onMode = (e) => setMode(e?.detail === "dark" ? "dark" : "light");
    window.addEventListener("theme:mode-changed", onMode);
    return () => {
      alive = false;
      window.removeEventListener("theme:mode-changed", onMode);
    };
  }, []);

  // Leaving with unsaved colours puts the saved ones back.
  const savedRef = React.useRef(saved);
  savedRef.current = saved;
  useEffect(() => () => broadcast(savedRef.current), []);

  const apply = (next) => {
    const p = normalizePrefs(next);
    setPrefs(p);
    broadcast(p);
  };

  const setColor = (key, hex) => apply({ ...prefs, [key]: hex || null });

  const save = async () => {
    setSaving(true);
    try {
      await api.updatePreferences(prefs);
      setSaved(prefs);
      broadcast(prefs);
      messageApi.success("Appearance saved.");
    } catch {
      messageApi.error("Could not save your appearance settings.");
    } finally {
      setSaving(false);
    }
  };

  const activePreset = useMemo(() => THEME_PRESETS.find((p) => same(p, prefs))?.name, [prefs]);

  return (
    <section className="ap" id="appearance" aria-labelledby="appearance-title">
      {contextHolder}
      <header className="ap-head">
        <div>
          <h3 id="appearance-title" className="ap-title">Appearance</h3>
          <p className="ap-desc">Choose light or dark mode and the colours of your admin. These settings are yours only.</p>
        </div>
        <Segmented
          value={mode}
          onChange={(v) => window.dispatchEvent(new CustomEvent("theme:mode", { detail: v }))}
          options={[
            { value: "light", label: <span className="ap-mode"><SunOutlined /> Light</span> },
            { value: "dark", label: <span className="ap-mode"><MoonOutlined /> Dark</span> },
          ]}
        />
      </header>

      <div className="ap-sub">Themes</div>
      <div className="ap-presets" role="radiogroup" aria-label="Theme presets">
        {THEME_PRESETS.map((p) => {
          const on = activePreset === p.name;
          return (
            <button
              key={p.name}
              type="button"
              role="radio"
              aria-checked={on}
              className={`ap-preset${on ? " is-on" : ""}`}
              onClick={() => apply(p)}
            >
              <MiniAdmin prefs={p} dark={dark} />
              <span className="ap-preset__name">
                {p.name}
                {on && <CheckOutlined />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="ap-sub">Custom colours</div>
      <div className="ap-colors">
        {FIELDS.map(({ key, label, hint }) => (
          <div className="ap-color" key={key}>
            <ColorPicker
              value={prefs[key] || undefined}
              format="hex"
              disabledAlpha
              allowClear
              onChangeComplete={(c) => setColor(key, c?.toHexString?.())}
              onClear={() => setColor(key, null)}
            />
            <div className="ap-color__text">
              <span className="ap-color__label">
                {label}
                {prefs[key] ? <code>{prefs[key]}</code> : <Tag className="ap-default-tag">ARTA default</Tag>}
              </span>
              <span className="ap-color__hint">{hint}</span>
            </div>
            {prefs[key] && (
              <Tooltip title="Use the default">
                <Button size="small" type="text" icon={<UndoOutlined />} onClick={() => setColor(key, null)} aria-label={`Reset ${label} to default`} />
              </Tooltip>
            )}
          </div>
        ))}
      </div>

      <footer className="ap-foot">
        <span className={`ap-state${dirty ? " is-dirty" : ""}`}>
          {dirty ? "Previewing — not saved yet" : "Saved"}
        </span>
        <div className="ap-actions">
          <Button onClick={() => apply(saved)} disabled={!dirty || saving}>Discard</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={save} loading={saving} disabled={!dirty}>
            Save appearance
          </Button>
        </div>
      </footer>
    </section>
  );
}
