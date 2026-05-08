import "./utils/devConsolePatch";
import "antd/dist/reset.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";   // ✅ add this import
import MainApp from "./mainApp";
import "./i18n.js";
import { preloadConfig } from "./utils/config";

//console.log("App is loading...");

if (import.meta && import.meta.env && import.meta.env.DEV) {
  window.addEventListener("error", (e) => {
    console.error("Runtime error:", e);
    // Show alert in dev to surface issues early; avoid noisy alerts in production
    alert("Runtime error: " + e.message);
  });
}

// Derive basename from Vite base (strip trailing slash for Router)
const BASE_PATH = (import.meta.env.BASE_URL || "/").replace(/\/$/, "") || "/";

// Preload runtime config, then mount app
preloadConfig().finally(() => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <BrowserRouter basename={BASE_PATH}>
      <MainApp />
    </BrowserRouter>
  );
});
