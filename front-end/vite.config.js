// Suppress only the noisy Node DEP0060 (util._extend) warning from transitive deps during Vite dev
process.on("warning", (w) => {
  if (w && w.code === "DEP0060") return;
  // Pass through everything else
  console.warn(`${w.name}: ${w.message}`);
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Load server .env if present so dev proxy can use the same addresses
// as the backend. We avoid requiring the 'dotenv' package here by doing a
// tiny, safe parser. Order of precedence for BACKEND target:
// 1. process.env.VITE_BACKEND (explicit override)
// 2. SERVER_HOST + SERVER_PORT from server/.env
// 3. fallback to http://localhost:5000
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverEnvPath = path.resolve(__dirname, "../server/.env");
let parsedServerEnv = {};
if (fs.existsSync(serverEnvPath)) {
  try {
    const raw = fs.readFileSync(serverEnvPath, "utf8");
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const idx = trimmed.indexOf("=");
      if (idx === -1) return;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      parsedServerEnv[key] = val;
      // Also populate process.env for convenience, but do not let this
      // overwrite an explicit VITE_BACKEND if it was set in the environment.
      if (!process.env[key]) process.env[key] = val;
    });
  } catch (e) {
    // don't fail Vite startup for env parse issues; just continue with defaults
    console.warn(`[vite] warning: failed to parse server/.env: ${e.message}`);
  }
}

// Compute BACKEND: prefer explicit VITE_BACKEND; otherwise prefer values from
// server/.env (parsedServerEnv) and fall back to process.env; finally use localhost.
const explicitBackend = process.env.VITE_BACKEND;
const hostFromServerEnv = parsedServerEnv.SERVER_HOST || process.env.SERVER_HOST;
const portFromServerEnv = parsedServerEnv.SERVER_PORT || process.env.SERVER_PORT;
const BACKEND = explicitBackend
  ? explicitBackend
  : hostFromServerEnv && portFromServerEnv
  ? `http://${hostFromServerEnv}:${portFromServerEnv}`
  : "http://localhost:5000";

// Helpful debug logging when vite starts so we know what the dev proxy will target
console.log(`[vite] dev proxy BACKEND=${BACKEND}`);

export default defineConfig({
  // Serve app at root during dev and build
  base: "/",
  plugins: [react(), svgr()],
  server: {
    port: 5174,
    host: "0.0.0.0",
    proxy: {
      "/api": BACKEND,
      // Proxy Socket.IO websocket requests
      "/socket.io": {
        target: BACKEND,
        ws: true,
      },
    },
  },
});
