let configPromise;
let cachedConfig = {};

export function preloadConfig() {
  if (!configPromise) {
    const API_BASE = (typeof import.meta !== "undefined" && import.meta?.env?.VITE_API_BASE) || "/api";
    const url = `${API_BASE.replace(/\/$/, "")}/config`;
    configPromise = fetch(url, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load config");
        return r.json();
      })
      .then((cfg) => {
        cachedConfig = cfg || {};
        return cachedConfig;
      })
      .catch((e) => {
        console.error("Failed to fetch runtime config:", e);
        cachedConfig = {};
        return cachedConfig;
      });
  }
  return configPromise;
}

export async function getConfig() {
  return await preloadConfig();
}

export function getCachedConfig() {
  return cachedConfig;
}
