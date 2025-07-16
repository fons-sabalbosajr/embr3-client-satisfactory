// components/AdminMenu/AdminMenu.jsx
import React, { useState, useEffect, useMemo } from "react"; // Add useState and useEffect
import { Menu } from "antd";
import menuItems from "./menuItems";
import "./adminMenu.css";

function AdminMenu({ selectedKey, onMenuClick }) {
  const defaultOpenKeys = useMemo(() => {
    if (["generate-report", "extract-data"].includes(selectedKey))
      return ["reports"];
    if (
      ["data-configuration", "account-settings", "backup-data"].includes(
        selectedKey
      )
    )
      return ["settings"];
    return [];
  }, [selectedKey]);

  // Use local state to manage currently open keys based on user interaction
  const [currentOpenKeys, setCurrentOpenKeys] = useState(defaultOpenKeys);
  useEffect(() => {
    setCurrentOpenKeys(defaultOpenKeys);
  }, [selectedKey, defaultOpenKeys]);

  // This handler will be called when a submenu's open state changes (user clicks it)
  const handleOpenChange = (keys) => {
    const latestOpenKey = keys.find((key) => !currentOpenKeys.includes(key)); // Find the key that was just opened
    if (latestOpenKey) {
      setCurrentOpenKeys([latestOpenKey]);
    } else {
      // If an existing key was closed
      setCurrentOpenKeys(keys);
    }
  };

  return (
    <Menu
      mode="inline"
      selectedKeys={[selectedKey]}
      openKeys={currentOpenKeys} // Control open state using local state
      items={menuItems}
      onClick={onMenuClick}
      onOpenChange={handleOpenChange} // Handle user opening/closing submenus
      className="custom-admin-menu"
    />
  );
}

export default AdminMenu;
