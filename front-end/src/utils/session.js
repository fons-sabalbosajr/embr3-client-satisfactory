// src/utils/session.js
// Who is signed in, and what they may see. The server enforces the same rules
// (server/middleware/permission.js → requireDeveloper); these helpers only
// decide what the UI shows.
import { getDecryptedItem } from "./encryptedStorage";

/** The signed-in user cached at login (or {}). */
export function getSessionUser() {
  try {
    return JSON.parse(getDecryptedItem("user") || "{}") || {};
  } catch {
    return {};
  }
}

/** A developer account is one with position "Developer" — nothing else. */
export const isDeveloperUser = (user) =>
  String(user?.position || "").trim().toLowerCase() === "developer";

/**
 * True when the signed-in account is a Developer. Read fresh on every call so
 * it follows sign-in / sign-out without a reload. Developers get the
 * Developer section of the admin and are exempt from the inactivity logout.
 */
export function isDeveloperSession() {
  return isDeveloperUser(getSessionUser());
}
