// src/utils/maintenance.js
// Maintenance mode as the server reports it (GET /api/system/status). The
// server is the authority — it refuses non-developer requests while
// maintenance is on — this only decides which page to show.
//
// Updates arrive three ways: a poll every 60 s, the "maintenance:on" event the
// API client fires when any request comes back 503/maintenance, and
// "maintenance:changed" fired by Developer Settings after a toggle.
import { useEffect, useState } from "react";
import { getSystemStatus } from "../services/api";

const POLL_MS = 60 * 1000;
const OFF = { enabled: false, message: "", endsAt: null };

let current = { ...OFF, loaded: false };
const listeners = new Set();
const publish = (next) => {
  current = { ...current, ...next, loaded: true };
  listeners.forEach((fn) => fn(current));
};

export async function refreshMaintenance() {
  try {
    const { data } = await getSystemStatus();
    publish({ ...OFF, ...(data?.maintenance || {}) });
  } catch {
    // Status endpoint unreachable: keep the last known state, but stop
    // "loading" so the app still renders.
    publish({});
  }
  return current;
}

if (typeof window !== "undefined") {
  window.addEventListener("maintenance:on", (e) =>
    publish({ enabled: true, message: e?.detail?.message || current.message, endsAt: e?.detail?.endsAt || current.endsAt })
  );
  window.addEventListener("maintenance:changed", (e) => publish({ ...OFF, ...(e?.detail || {}) }));
}

let polling = null;
export function useMaintenance() {
  const [state, setState] = useState(current);
  useEffect(() => {
    listeners.add(setState);
    if (!current.loaded) refreshMaintenance();
    if (!polling) polling = setInterval(refreshMaintenance, POLL_MS);
    return () => {
      listeners.delete(setState);
      if (!listeners.size && polling) {
        clearInterval(polling);
        polling = null;
      }
    };
  }, []);
  return state;
}

export const formatEndsAt = (endsAt) => {
  if (!endsAt) return "";
  const d = new Date(endsAt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};
