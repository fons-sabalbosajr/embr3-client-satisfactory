// src/mainApp.jsx
import "./utils/devConsolePatch";

import React, { useEffect, useState, useMemo } from "react";
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
import RequirePermission from "./components/auth/RequirePermission";

import SurveyPage1 from "./page_survey/Survey";

import "@fontsource/poppins";
import {
  getDecryptedItem,
  setEncryptedItem,
  getOpaqueItem,
  setOpaqueItem,
  removeOpaqueItem,
} from "./utils/encryptedStorage";

const MainApp = () => {
  // On page load, if not authenticated, hide all localStorage values
  useEffect(() => {
    const isAuthenticated = !!(
      getOpaqueItem("token") ?? localStorage.getItem("token")
    );
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
      } catch {
        // ignore
      }
    };
    migrateKey("token");
    migrateKey("user");
    migrateKey("darkMode");
  }, []);

  // React to auth changes (e.g., login/logout) via custom event and storage
  const [authTick, setAuthTick] = useState(0);
  useEffect(() => {
    const onAuthChanged = () => setAuthTick((t) => t + 1);
    window.addEventListener("auth:changed", onAuthChanged);
    window.addEventListener("storage", onAuthChanged);
    return () => {
      window.removeEventListener("auth:changed", onAuthChanged);
      window.removeEventListener("storage", onAuthChanged);
    };
  }, []);

  const isAuthenticated = useMemo(() => {
    return !!(getOpaqueItem("token") ?? localStorage.getItem("token"));
  }, [authTick]);

  // Read maintenance mode from localStorage (or API in future)
  const maintenanceMode = localStorage.getItem("maintenanceMode") === "true";
  const currentUser = (() => {
    try {
      return JSON.parse(getDecryptedItem("user") || "{}");
    } catch {
      return {};
    }
  })();
  const isDeveloper = (currentUser?.position || "").toLowerCase() === "developer";

  // Auto logout on inactivity after 10 minutes
  useEffect(() => {
    let idleTimer = null;
    const IDLE_LIMIT_MS = 10 * 60 * 1000; // 10 minutes

    const clearAuthAndRedirect = () => {
      try {
        removeOpaqueItem("token");
        removeOpaqueItem("user");
      } catch {
        // ignore
      }
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        sessionStorage.clear();
      } catch {
        // ignore
      }
      // Redirect to /admin after clearing auth (not the deep path)
      try {
        const { origin } = window.location;
        window.location.replace(`${origin}/admin`);
      } catch {
        window.location.reload();
      }
    };

    const resetTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      // Only set idle timer when authenticated
      const hasToken = !!(getOpaqueItem("token") ?? localStorage.getItem("token"));
      if (!hasToken) return;
      idleTimer = setTimeout(() => {
        clearAuthAndRedirect();
      }, IDLE_LIMIT_MS);
    };

    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "visibilitychange",
    ];
    const onActivity = () => {
      // If tab became visible again, also reset timer
      if (document.visibilityState === "hidden") return;
      resetTimer();
    };

    activityEvents.forEach((evt) => document.addEventListener(evt, onActivity, { passive: true }));
    // Start the initial timer if already authenticated
    resetTimer();

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      activityEvents.forEach((evt) => document.removeEventListener(evt, onActivity));
    };
  }, []);

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
          element={
            maintenanceMode && !isDeveloper ? (
              <MaintenancePage />
            ) : (
              <Menu toggleColorScheme={toggleColorScheme} />
            )
          }
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
          path="/verify"
          element={maintenanceMode && !isDeveloper ? <MaintenancePage /> : <VerifyPage />}
        />
        <Route
          path="/reset-password"
          element={maintenanceMode && !isDeveloper ? <MaintenancePage /> : <ResetPassword />}
        />
        <Route
          path="/admin"
          element={
            maintenanceMode && !isDeveloper ? (
              <MaintenancePage />
            ) : isAuthenticated ? (
              <AdminPage />
            ) : (
              <HomeAdmin
                toggleColorScheme={toggleColorScheme}
                colorScheme={colorScheme}
              />
            )
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="measurement" element={<Measurement />} />
          <Route path="reports/generate-report" element={<GenerateReport />} />
          <Route path="reports/extract" element={<ExtractData />} />
          <Route path="announcements" element={<Announcements />} />
          <Route
            path="settings/account"
            element={
              <AccountSettings
                currentUser={JSON.parse(getDecryptedItem("user") || "{}")}
              />
            }
          />
          <Route
            path="settings/developer"
            element={(() => {
              const user = JSON.parse(getDecryptedItem("user") || "{}");
              if (user.position === "Developer") {
                return <DeveloperSettings currentUser={user} />;
              }
              return <Navigate to="/admin/dashboard" />;
            })()}
          />
          {/* Strict client-side guards for sensitive settings */}
          <Route
            path="settings/data-config"
            element={
              <RequirePermission anyOf={["canEdit", "canManageUsers"]}>
                <DataConfig />
              </RequirePermission>
            }
          />
          <Route
            path="settings/backup"
            element={
              <RequirePermission anyOf={["canManageUsers"]}>
                <BackupData />
              </RequirePermission>
            }
          />
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
    </MantineProvider>
  );
};

export default MainApp;
