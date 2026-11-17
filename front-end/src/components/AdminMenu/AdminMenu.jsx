// components/AdminMenu/AdminMenu.jsx
// The sidebar menu. Groups come from menuItems.jsx; the Developer group is
// only built for Developer accounts. Collapsed, group titles become dividers
// so the icon rail stays tidy.
import React, { useState, useEffect, useMemo } from "react";
import { Menu } from "antd";
import { MENU_GROUPS } from "./menuItems";
import { getSessionUser, isDeveloperUser } from "../../utils/session";
import "./adminMenu.css";

const parentOf = (key) => {
  for (const g of MENU_GROUPS) {
    for (const it of g.items) {
      if (it.children?.some((c) => c.key === key)) return it.key;
    }
  }
  return null;
};

function AdminMenu({ selectedKey, onMenuClick, collapsed = false, isDeveloper: isDeveloperProp }) {
  const isDeveloper = isDeveloperProp ?? isDeveloperUser(getSessionUser());

  const items = useMemo(() => {
    const groups = MENU_GROUPS.filter((g) => !g.developerOnly || isDeveloper);
    if (collapsed) {
      return groups.flatMap((g, i) => (i === 0 ? g.items : [{ type: "divider", key: `div-${g.key}` }, ...g.items]));
    }
    return groups.map((g) => ({
      type: "group",
      key: g.key,
      label: g.developerOnly ? (
        <span className="admin-menu-group admin-menu-group--dev">
          {g.label}
          <span className="admin-menu-group__badge">Restricted</span>
        </span>
      ) : (
        <span className="admin-menu-group">{g.label}</span>
      ),
      children: g.items,
    }));
  }, [collapsed, isDeveloper]);

  const parent = parentOf(selectedKey);
  const [openKeys, setOpenKeys] = useState(parent ? [parent] : []);
  useEffect(() => {
    if (parent) setOpenKeys((keys) => (keys.includes(parent) ? keys : [parent]));
  }, [parent]);

  return (
    <Menu
      mode="inline"
      theme="light"
      inlineCollapsed={collapsed}
      selectedKeys={[selectedKey]}
      openKeys={collapsed ? undefined : openKeys}
      onOpenChange={(keys) => setOpenKeys(keys.slice(-1))}
      items={items}
      onClick={onMenuClick}
      className="custom-admin-menu"
    />
  );
}

export default AdminMenu;
