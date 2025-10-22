// components/AdminMenu/AdminMenu.jsx
import React, { useState, useEffect, useMemo } from "react"; // Add useState and useEffect
import { Menu } from "antd";
import rawMenuItems from "./menuItems";
import { getDecryptedItem } from "../../utils/encryptedStorage";
import "./adminMenu.css";

function AdminMenu({ selectedKey, onMenuClick, menuTheme = "light" }) {
  const user = (() => {
    try {
      return JSON.parse(getDecryptedItem("user") || "{}");
    } catch {
      return {};
    }
  })();
  const perms = user?.permissions || {};

  const menuItems = useMemo(() => {
    // Filter menu items based on privilege/permissions
    const canManageUsers = !!perms.canManageUsers;
    const isDeveloper = (user?.position || "").toLowerCase() === "developer";
    return rawMenuItems
      .map((item) => {
        if (item.key === "settings") {
          const children = (item.children || []).filter((ch) => {
            if (ch.key === "developer-settings") return isDeveloper;
            if (ch.key === "account-settings") return true; // self settings allowed
            if (ch.key === "backup-data") return canManageUsers || isDeveloper;
            if (ch.key === "data-configuration") return !!perms.canEdit || canManageUsers || isDeveloper;
            return true;
          });
          return { ...item, children };
        }
        if (item.key === "announcements") {
          // Show to all, but creation/edit is enforced server-side; could hide if no permission
          return item;
        }
        return item;
      })
      .filter((it) => !(it.key === "settings" && (!it.children || it.children.length === 0)));
  }, [perms, user]);
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
      theme={menuTheme}
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
