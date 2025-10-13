let configPromise;
let cachedConfig = {};

export function preloadConfig() {
  if (!configPromise) {
    configPromise = fetch("/api/config", { credentials: "include" })
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
