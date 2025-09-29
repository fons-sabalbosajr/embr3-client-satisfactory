import "./utils/devConsolePatch";
import "antd/dist/reset.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";   // ✅ add this import
import MainApp from "./mainApp";
import "./i18n.js";

//console.log("App is loading...");

window.addEventListener("error", (e) => {
  console.error("Runtime error:", e);
  alert("Runtime error: " + e.message);
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter basename="/ocsm">
    <MainApp />
  </BrowserRouter>
);
