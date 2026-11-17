// src/utils/basePath.js
// The app is served under a URL prefix (Vite `base`, "/ocsm/" by default), so
// full-page redirects must include it: /ocsm/admin, not /admin. React Router
// links already get it from the <BrowserRouter basename> in main.jsx; use these
// helpers for window.location redirects and absolute URLs.

/** "/ocsm" (no trailing slash), or "" when served at the root. */
// Keep `import.meta.env.BASE_URL` written literally — Vite only replaces the
// exact expression (optional chaining on import.meta defeats it).
export const BASE_PATH = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

/** Path inside the app → path with the prefix, e.g. "/admin" → "/ocsm/admin". */
export const appPath = (path = "/") =>
  `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;

/** Absolute URL on the current origin, e.g. "https://host/ocsm/admin". */
export const appUrl = (path = "/") => `${window.location.origin}${appPath(path)}`;

/**
 * Public address of the client page, used for the QR codes and "client page"
 * links on /landing and /client. Fixed to the deployed site so a QR printed or
 * scanned from any environment (dev, preview, a mis-set VITE_APP_URL) always
 * opens the live survey.
 */
export const PUBLIC_CLIENT_URL = "https://embr3-onlinesystems.cloud/ocsm/client";

/** Current location path without the prefix ("/ocsm/admin/x" → "/admin/x"). */
export const routePath = (pathname = window.location.pathname) =>
  BASE_PATH && pathname.startsWith(BASE_PATH)
    ? pathname.slice(BASE_PATH.length) || "/"
    : pathname;
