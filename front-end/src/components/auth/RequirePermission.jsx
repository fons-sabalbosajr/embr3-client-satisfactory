import React from "react";
import { Navigate } from "react-router-dom";
import { getSessionUser, isDeveloperUser } from "../../utils/session";

/**
 * Client-side route guard. The server enforces the same rules; this only
 * keeps people off pages whose requests would be refused.
 * - developerOnly: only a Developer account (position "Developer") may enter
 * - anyOf: permission keys; pass if any is true (Developers always pass)
 */
export default function RequirePermission({ anyOf = [], developerOnly = false, children }) {
  const user = getSessionUser();
  const perms = user?.permissions || {};
  const isDeveloper = isDeveloperUser(user);

  const allowed = developerOnly
    ? isDeveloper
    : isDeveloper || !anyOf || anyOf.length === 0 || anyOf.some((k) => !!perms[k]);

  if (!allowed) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return children;
}
