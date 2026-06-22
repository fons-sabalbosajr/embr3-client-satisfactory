let configPromise;
let cachedConfig = {};

export function preloadConfig() {
  if (!configPromise) {
    // Prefer explicit VITE_API_BASE; else derive from VITE_SOCKET_URL; else infer backend from Render hostname; else fallback to /api
    const ENV = typeof import.meta !== "undefined" ? import.meta.env : undefined;
    const viteBase = (ENV?.BASE_URL || "/").replace(/\/$/, "");
    let API_BASE = ENV?.VITE_API_BASE || `${viteBase}/api`;
    if (!ENV?.VITE_API_BASE && ENV?.VITE_SOCKET_URL) {
      try {
        const u = new URL(ENV.VITE_SOCKET_URL, window.location.origin);
        API_BASE = `${u.origin}/api`;
      } catch (_) {
        // keep default
      }
    }
    if (API_BASE === "/api") {
      try {
        if (typeof window !== "undefined") {
          const host = window.location.hostname;
          if (host.endsWith(".onrender.com") && host.includes("-measurement.")) {
            const backendHost = host.replace("-measurement.", ".");
            API_BASE = `https://${backendHost}/api`;
          }
        }
      } catch (_) {
        // keep default
      }
    }
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
