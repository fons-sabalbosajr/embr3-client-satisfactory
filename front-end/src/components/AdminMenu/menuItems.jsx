// components/AdminMenu/menuItems.js
import {
  DashboardOutlined,
  BarChartOutlined, // Keeping for Measurement, though PieChartOutlined might fit better
  FileTextOutlined,
  NotificationOutlined,
  SettingOutlined,
  // You might want to import more specific icons for sub-items like:
  // PieChartOutlined, // For Measurement
  // DownloadOutlined, // For Extract Data
  // UsergroupAddOutlined, // For Account Settings
  // DatabaseOutlined, // For Data Configuration
} from "@ant-design/icons";

const menuItems = [
  {
    key: "dashboard",
    icon: <DashboardOutlined />,
    label: "Dashboard",
  },
  {
    key: "measurement-data", // <-- CORRECTED KEY
    icon: <BarChartOutlined />,
    label: "Measurement Data",
  },
  {
    key: "reports",
    icon: <FileTextOutlined />,
    label: "Reports",
    children: [
      {
        key: "generate-report", // <-- CORRECTED KEY
        label: "Generate Report",
      },
      {
        key: "extract-data", // <-- CORRECTED KEY
        label: "Extract Data",
      },
    ],
  },
  {
    key: "announcements",
    icon: <NotificationOutlined />,
    label: "Announcements",
  },
  {
    key: "settings",
    icon: <SettingOutlined />,
    label: "Settings",
    children: [
      {
        key: "data-configuration", // <-- CORRECTED KEY
        label: "Data Configuration",
      },
      {
        key: "account-settings", // <-- CORRECTED KEY
        label: "Account Settings",
      },
      {
        key: "backup-data", // <-- CORRECTED KEY
        label: "Backup Data",
      },
    ],
  },
];

export default menuItems;