// Developer Settings — developer accounts only (route guard + requireDeveloper
// on every endpoint it calls). Three tabs:
//   Accounts         — people, roles and staff permissions
//   Maintenance      — take the system offline for everyone but developers
//   System & Config  — server, database and email health; maintenance tools
// Deep link with ?tab=accounts|maintenance|system.
import React from "react";
import { Tabs, Tag } from "antd";
import { TeamOutlined, ToolOutlined, CloudServerOutlined, LockOutlined } from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import Accounts from "../Accounts/Accounts";
import Maintenance from "./Maintenance";
import SystemConfig from "./SystemConfig";
import { useMaintenance } from "../../../utils/maintenance";
import "./developersettings.css";

const TABS = ["accounts", "maintenance", "system"];

export default function DeveloperSettings() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get("tab")) ? params.get("tab") : "accounts";
  const maintenance = useMaintenance();

  return (
    <div className="dev-settings">
      <header className="dev-head">
        <div>
          <h2 className="dev-title">Developer Settings</h2>
          <p className="dev-desc">
            <LockOutlined /> Restricted to Developer accounts — the server refuses these actions from anyone else.
          </p>
        </div>
      </header>

      <Tabs
        className="dev-tabs"
        activeKey={tab}
        onChange={(key) => setParams(key === "accounts" ? {} : { tab: key }, { replace: true })}
        items={[
          { key: "accounts", label: <span><TeamOutlined /> Accounts</span>, children: <Accounts /> },
          {
            key: "maintenance",
            label: (
              <span>
                <ToolOutlined /> Maintenance {maintenance.enabled && <Tag color="warning" className="dev-tab-tag">ON</Tag>}
              </span>
            ),
            children: <Maintenance />,
          },
          { key: "system", label: <span><CloudServerOutlined /> System &amp; Config</span>, children: <SystemConfig /> },
        ]}
      />
    </div>
  );
}
