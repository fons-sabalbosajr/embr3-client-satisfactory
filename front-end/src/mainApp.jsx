// src/mainApp.jsx
import "./utils/devConsolePatch";

import React, { useEffect, useState } from "react";
import { MantineProvider } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { Routes, Route, Navigate } from "react-router-dom"; // Router is provided at root in main.jsx
import App from "./pages/Home/Home";
import HomeAdmin from "./pages/HomeAdmin/HomeAdmin";
import AdminPage from "./pages/AdminPage/AdminPage";
import Menu from "./pages/AMenu/Menu";
import VerifyPage from "./pages/VerifyEmail/VerifyEmail";
import ResetPassword from "./pages/ResetPassword/ResetPassword";

import Dashboard from "./components/Dashboard/Dashboard";
import AccountSettings from "./components/Settings/AccountSettings/AccountSettings";
import DeveloperSettings from "./components/Settings/DeveloperSettings/DeveloperSettings";
import Measurement from "./components/Measurement/Measurement";
import GenerateReport from "./components/Reports/GenerateReport/GenerateReport";
import ExtractData from "./components/Reports/ExtractData/ExtractData";
import Announcements from "./components/Announcements/Announcement";
import DataConfig from "./components/Settings/DataConfig/DataConfig";
import Accounts from "./components/Settings/Accounts/Accounts";
import BackupData from "./components/Settings/Backup/Backup";
import MaintenancePage from "./components/MaintenancePage";

import SurveyPage1 from "./page_survey/Survey";

import "@fontsource/poppins";
import { getDecryptedItem, setEncryptedItem, getOpaqueItem, setOpaqueItem } from "./utils/encryptedStorage";

const MainApp = () => {
  // On page load, if not authenticated, hide all localStorage values
  useEffect(() => {
    const isAuthenticated = !!(getOpaqueItem("token") ?? localStorage.getItem("token"));
    if (!isAuthenticated) {
      localStorage.clear();
      sessionStorage.clear();
    }
  }, []);
  const defaultColor = getDecryptedItem("mantine-color-scheme") || "light";
  const [colorScheme, setColorScheme] = useState(defaultColor);

  const toggleColorScheme = () => {
    const next = colorScheme === "dark" ? "light" : "dark";
    setColorScheme(next);

  setEncryptedItem("mantine-color-scheme", next);
  };

  useHotkeys([["mod+J", () => toggleColorScheme()]]);

  useEffect(() => {
    document.body.setAttribute("data-mantine-color-scheme", colorScheme);
  setEncryptedItem("mantine-color-scheme", colorScheme);
  }, [colorScheme]);

  // One-time migration of plain localStorage keys to obfuscated ones
  useEffect(() => {
    const migrateKey = (k) => {
      try {
        const val = localStorage.getItem(k);
        if (val && !getOpaqueItem(k)) {
          setOpaqueItem(k, val);
          localStorage.removeItem(k);
        }
      } catch {}
    };
    migrateKey("token");
    migrateKey("user");
    migrateKey("darkMode");
  }, []);

  const isAuthenticated = !!(getOpaqueItem("token") ?? localStorage.getItem("token"));

  // Read maintenance mode from localStorage (or API in future)
  const maintenanceMode = localStorage.getItem("maintenanceMode") === "true";

  return (
    <MantineProvider
      withGlobalStyles
      withNormalizeCSS
      theme={{
        colorScheme,
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <Routes>
        <Route
          path="/"
          element={maintenanceMode ? <MaintenancePage /> : <Menu toggleColorScheme={toggleColorScheme} />}
        />
        <Route
          path="/client"
          element={<App toggleColorScheme={toggleColorScheme} colorScheme={colorScheme} />}
        />
        <Route path="/verify" element={maintenanceMode ? <MaintenancePage /> : <VerifyPage />} />
        <Route path="/reset-password" element={maintenanceMode ? <MaintenancePage /> : <ResetPassword />} />
        <Route
          path="/admin"
          element={maintenanceMode ? <MaintenancePage /> : (isAuthenticated ? <AdminPage /> : <HomeAdmin toggleColorScheme={toggleColorScheme} colorScheme={colorScheme} />)}
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="measurement" element={<Measurement />} />
          <Route path="reports/generate-report" element={<GenerateReport />} />
          <Route path="reports/extract" element={<ExtractData />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="settings/data-config" element={<DataConfig />} />
          <Route path="settings/account" element={<AccountSettings currentUser={JSON.parse(getDecryptedItem("user") || '{}')} />} />
          <Route path="settings/developer" element={(() => {
            const user = JSON.parse(getDecryptedItem("user") || '{}');
            if (user.position === "Developer") {
              return <DeveloperSettings currentUser={user} />;
            }
            return <Navigate to="/admin/dashboard" />;
          })()} />
          <Route path="settings/backup" element={<BackupData />} />
        </Route>
        <Route
          path="/survey/page1"
          element={<SurveyPage1 toggleColorScheme={toggleColorScheme} colorScheme={colorScheme} />}
        />
      </Routes>
    </MantineProvider>
  );
};

export default MainApp;
