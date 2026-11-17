// components/AdminMenu/menuItems.jsx
// Admin navigation, in three groups:
//   Workspace — day-to-day survey work, every signed-in staff member
//   Account   — the signed-in user's own profile and appearance
//   Developer — system setup and maintenance, Developer accounts only
//               (the server enforces the same rule: requireDeveloper)
import {
  DashboardOutlined,
  BarChartOutlined,
  FileTextOutlined,
  NotificationOutlined,
  UserOutlined,
  DatabaseOutlined,
  RobotOutlined,
  CloudDownloadOutlined,
  FileSearchOutlined,
  CodeOutlined,
} from "@ant-design/icons";

export const MENU_GROUPS = [
  {
    key: "grp-workspace",
    label: "Workspace",
    items: [
      { key: "dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
      { key: "measurement-data", icon: <BarChartOutlined />, label: "Measurement Data" },
      {
        key: "reports",
        icon: <FileTextOutlined />,
        label: "Reports",
        children: [
          { key: "generate-report", label: "Generate Report" },
          { key: "extract-data", label: "Extract Data" },
        ],
      },
      { key: "announcements", icon: <NotificationOutlined />, label: "Announcements" },
    ],
  },
  {
    key: "grp-account",
    label: "Account",
    items: [{ key: "account-settings", icon: <UserOutlined />, label: "My Account" }],
  },
  {
    key: "grp-developer",
    label: "Developer",
    developerOnly: true,
    items: [
      { key: "data-configuration", icon: <DatabaseOutlined />, label: "Data Configuration" },
      { key: "vera-settings", icon: <RobotOutlined />, label: "VERA Assistant" },
      { key: "backup-data", icon: <CloudDownloadOutlined />, label: "Backup Data" },
      { key: "app-logs", icon: <FileSearchOutlined />, label: "App Logs" },
      { key: "developer-settings", icon: <CodeOutlined />, label: "Developer Settings" },
    ],
  },
];

// Page titles for the header, keyed like the menu.
export const PAGE_META = {
  dashboard: { title: "Dashboard", section: "Workspace" },
  "measurement-data": { title: "Measurement Data", section: "Workspace" },
  "generate-report": { title: "Generate Report", section: "Reports" },
  "extract-data": { title: "Extract Data", section: "Reports" },
  announcements: { title: "Announcements", section: "Workspace" },
  "account-settings": { title: "My Account", section: "Account" },
  "data-configuration": { title: "Data Configuration", section: "Developer" },
  "vera-settings": { title: "VERA Assistant", section: "Developer" },
  "backup-data": { title: "Backup Data", section: "Developer" },
  "app-logs": { title: "App Logs", section: "Developer" },
  "developer-settings": { title: "Developer Settings", section: "Developer" },
};

export default MENU_GROUPS;
