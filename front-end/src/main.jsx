import "./utils/devConsolePatch";
import "antd/dist/reset.css";
import React from "react";
import ReactDOM from "react-dom/client";
import MainApp from "./mainApp";

//console.log("App is loading...");

window.addEventListener("error", (e) => {
  console.error("Runtime error:", e);
  alert("Runtime error: " + e.message);
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MainApp />
  </React.StrictMode>
);
