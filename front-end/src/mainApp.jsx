// src/mainApp.jsx
import "./utils/devConsolePatch";

import React, { useEffect, useState } from "react";
import { MantineProvider } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./pages/Home/Home";
import HomeAdmin from "./pages/HomeAdmin/HomeAdmin";
import AdminPage from "./pages/AdminPage/AdminPage";
import Menu from "./pages/AMenu/Menu";
import VerifyPage from "./pages/VerifyEmail/VerifyEmail";

import Dashboard from "./components/Dashboard/Dashboard";
import Measurement from "./components/Measurement/Measurement";
import GenerateReport from "./components/Reports/GenerateReport/GenerateReport";
import ExtractData from "./components/Reports/ExtractData/ExtractData";
import Announcements from "./components/Announcements/Announcement";
import DataConfig from "./components/Settings/DataConfig/DataConfig";
import Accounts from "./components/Settings/Accounts/Accounts";
import BackupData from "./components/Settings/Backup/Backup";

import SurveyPage1 from "./page_survey/Survey";

import "@fontsource/poppins";
import { getDecryptedItem, setEncryptedItem } from "./utils/encryptedStorage";

const MainApp = () => {
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

  const isAuthenticated = !!localStorage.getItem("token");

  return (
    <MantineProvider
      withGlobalStyles
      withNormalizeCSS
      theme={{
        colorScheme,
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={<Menu toggleColorScheme={toggleColorScheme} />}
          />
          <Route
            path="/client"
            element={
              <App
                toggleColorScheme={toggleColorScheme}
                colorScheme={colorScheme}
              />
            }
          />
          <Route
            path="/admin-auth"
            element={
              <HomeAdmin
                toggleColorScheme={toggleColorScheme}
                colorScheme={colorScheme}
              />
            }
          />
          <Route path="/verify" element={<VerifyPage />} />
          <Route
            path="/admin"
            element={
              isAuthenticated ? <AdminPage /> : <Navigate to="/admin-auth" />
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="measurement" element={<Measurement />} />
            <Route
              path="reports/generate-report" // This path corresponds to "/admin/reports/generate-report"
              element={<GenerateReport />}
            />
            <Route path="reports/extract" element={<ExtractData />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="settings/data-config" element={<DataConfig />} />
            <Route path="settings/account" element={<Accounts />} />
            <Route path="settings/backup" element={<BackupData />} />
          </Route>
          <Route
            path="/survey/page1"
            element={
              <SurveyPage1
                toggleColorScheme={toggleColorScheme}
                colorScheme={colorScheme}
              />
            }
          />
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
};

export default MainApp;
