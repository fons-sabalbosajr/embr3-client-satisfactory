// components/AdminMenu/AdminMenu.jsx
import React, { useState, useEffect, useMemo } from "react"; // Add useState and useEffect
import { Menu } from "antd";
import menuItems from "./menuItems";
import "./adminMenu.css";

function AdminMenu({ selectedKey, onMenuClick }) {
  // Determine the default open key based on the selected item
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

  // Update currentOpenKeys if selectedKey changes (e.g., direct URL navigation)
  useEffect(() => {
    setCurrentOpenKeys(defaultOpenKeys);
  }, [selectedKey, defaultOpenKeys]); // defaultOpenKeys might re-calculate, so depend on it too

  // This handler will be called when a submenu's open state changes (user clicks it)
  const handleOpenChange = (keys) => {
    // 'keys' is an array of currently open submenu keys
    // For inline mode, typically you'd only want one parent open at a time (unless specified otherwise)
    // If you want to allow multiple open submenus, just use setCurrentOpenKeys(keys);
    // If you want only one open, implement logic here:
    const latestOpenKey = keys.find((key) => !currentOpenKeys.includes(key)); // Find the key that was just opened
    if (latestOpenKey) {
      // If a new key was opened, close others (optional, but common for inline mode)
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
