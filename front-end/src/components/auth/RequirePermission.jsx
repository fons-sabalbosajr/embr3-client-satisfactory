import React from "react";
import { Navigate } from "react-router-dom";
import { getDecryptedItem } from "../../utils/encryptedStorage";

/**
 * Simple route guard to enforce basic permission checks on the client.
 * - anyOf: array of permission keys; pass if any is true
 * - allowDeveloper: if true, users with position "Developer" are always allowed
 */
export default function RequirePermission({ anyOf = [], allowDeveloper = true, children }) {
  let user = {};
  try {
    user = JSON.parse(getDecryptedItem("user") || "{}");
  } catch {
    user = {};
  }
  const perms = user?.permissions || {};
  const isDeveloper = (user?.position || "").toLowerCase() === "developer";

  const allowed = () => {
    if (allowDeveloper && isDeveloper) return true;
    if (!anyOf || anyOf.length === 0) return true; // nothing to check
    return anyOf.some((k) => !!perms[k]);
  };

  if (!allowed()) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return children;
}
