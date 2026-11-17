// src/utils/appVersion.js
// Build information injected by vite.config.js (define). Bump "version" in
// front-end/package.json for each release; the commit and build time are
// added automatically.
/* global __APP_VERSION__, __APP_COMMIT__, __APP_BUILT_AT__ */

export const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0";
export const APP_COMMIT = typeof __APP_COMMIT__ !== "undefined" ? __APP_COMMIT__ : "";
export const APP_BUILT_AT = typeof __APP_BUILT_AT__ !== "undefined" ? __APP_BUILT_AT__ : "";

/** "v1.0" style label for 1.0.0, "v1.2.3" otherwise. */
export const versionLabel = (v = APP_VERSION) => {
  const [major = "0", minor = "0", patch = "0"] = String(v).split(".");
  return patch === "0" ? `v${major}.${minor}` : `v${major}.${minor}.${patch}`;
};

/** Human-readable build line for a tooltip. */
export const buildDetails = () => {
  const parts = [`Version ${APP_VERSION}`];
  if (APP_COMMIT) parts.push(`build ${APP_COMMIT}`);
  if (APP_BUILT_AT) {
    const d = new Date(APP_BUILT_AT);
    if (!Number.isNaN(d.getTime())) parts.push(d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }));
  }
  return parts.join(" · ");
};
