import axios from "axios";
import { getDecryptedItem, getOpaqueItem, setOpaqueItem, removeOpaqueItem } from "../utils/encryptedStorage";
import { appUrl, routePath, BASE_PATH } from "../utils/basePath";

// Base URL strategy:
// - Prefer VITE_API_BASE when deploying frontend and backend on different domains (e.g., Render multi-service)
// - If missing, try to infer backend from current hostname (Render: remove "-measurement" suffix)
// - Fallback to same-origin "${BASE_URL}/api" so subdirectory deployments like /ocsm work
function inferBackendApiBase() {
  try {
    if (typeof window === "undefined") return null;
    const host = window.location.hostname;
    // Heuristic: front-end static site is "*-measurement.onrender.com"; backend is same without "-measurement"
    if (host.endsWith(".onrender.com") && host.includes("-measurement.")) {
      const backendHost = host.replace("-measurement.", ".");
      return `https://${backendHost}/api`;
    }
  } catch (_) {}
  return null;
}

// NOTE: write `import.meta.env.X` literally. Vite only injects/replaces
// `import.meta.env` when it appears verbatim; the previous optional-chained
// form (`import.meta?.env?.BASE_URL`) evaluated to undefined in the browser,
// so every request went to "/api" instead of "/ocsm/api" and 404'd.
const sameOriginApiBase = `${BASE_PATH}/api`;
const baseURL = import.meta.env.VITE_API_BASE || inferBackendApiBase() || sameOriginApiBase;
// Always bound requests in time. Without a timeout a stalled request hangs
// forever and the UI has no way to tell the user anything went wrong.
const API = axios.create({ baseURL, timeout: 30000 });

// Add request interceptor to include auth token
API.interceptors.request.use((config) => {
  // Prefer encrypted token; fallback to legacy opaque/plain for backward compatibility
  const token = getDecryptedItem("token") || getOpaqueItem("token") || localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle token refresh and 401 auto-logout
API.interceptors.response.use(
  (response) => {
    // If the server refreshed the token, store the new one
    const refreshedToken = response.headers["x-refreshed-token"];
    if (refreshedToken) {
      setOpaqueItem("token", refreshedToken);
    }
    return response;
  },
  (error) => {
    // Maintenance mode switched on while the page was open: let the app swap
    // to the maintenance page straight away (utils/maintenance.js listens).
    if (error.response?.status === 503 && error.response?.data?.code === "maintenance") {
      try {
        window.dispatchEvent(new CustomEvent("maintenance:on", { detail: error.response.data }));
      } catch {
        /* ignore */
      }
    }
    if (error.response?.status === 401) {
      // Token expired or invalid — clear auth and redirect
      removeOpaqueItem("token");
      removeOpaqueItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Only redirect from inside the admin (not the login page or public
      // pages). Paths include the /ocsm prefix, so compare without it — the
      // old check against "/admin" never matched "/ocsm/admin/..." and the
      // expired session was never sent back to the login page.
      const path = routePath();
      if (path.startsWith("/admin/")) {
        window.location.replace(appUrl("/admin"));
      }
    }
    return Promise.reject(error);
  }
);

// Get all users (for Accounts Management)
export const getAllUsers = () => API.get("/auth/users");

export const getFeedbacks = () => API.get("/feedback");

// Backup export (blob download). Longer timeout: whole collections can be large.
export const exportCollection = (collection, format = "json") =>
  API.get("/admin/db/export", {
    params: { collection, format },
    responseType: "blob",
    timeout: 120000,
  });
export const signUp = (formData) => API.post("/auth/signup", formData);
export const login = (formData) => API.post("/auth/login", formData);

// Question API calls
export const getQuestions = () => API.get("/question");
export const createQuestion = (newQuestion) =>
  API.post("/question", newQuestion);
export const updateQuestion = (id, updatedQuestion) =>
  API.put(`/question/${id}`, updatedQuestion);
export const deleteQuestion = (id) => API.delete(`/question/${id}`);

// Submit survey feedback
export const submitFeedback = (payload) =>
  API.post("/client-satisfactory/submit", payload);
// Names of personnel past clients said assisted them (survey autocomplete).
export const getAssistPersonnel = () =>
  API.get("/client-satisfactory/assist-personnel");
export const deleteFeedback = (id) => API.delete(`/feedback/${id}`);
export const updateFeedback = (id, updatedFeedback) =>
  API.put(`/feedback/${id}`, updatedFeedback);

export const getClientSatisfactoryData = () => API.get("/client-satisfactory");

// Public response total for the Landing and /client pages. Uses the public
// count endpoint — the full response list requires sign-in.
export const getFeedbackCount = () => API.get("/feedback/count");

export const forgotPassword = (email) =>
  API.post("/auth/forgot-password", { email });
export const resetPassword = (payload) =>
  API.post("/auth/reset-password", payload);
export const updateUser = (id, updatedUser) => API.put(`/auth/users/${id}`, updatedUser);
// Delete an account (developer only). Accounts Management called this but it
// was never defined, so the Delete button always failed.
export const deleteUser = (id) => API.delete(`/auth/users/${id}`);
export const getMe = () => API.get('/auth/me');
export const verifyEmail = ({ token, email }) => API.get('/auth/verify', { params: { token, email } });
export const resendVerification = (payload) => API.post('/auth/resend-verification', payload);

// Preferences API (per-user settings)
export const getPreferences = () => API.get(`/auth/preferences`);
export const updatePreferences = (prefs) => API.put(`/auth/preferences`, prefs);

// Database / infrastructure helpers for DeveloperSettings.DangerZone
export const getDbStatus = () => API.get(`/admin/db/status`);
export const getEmailHealth = () => API.get(`/admin/email/health`);
export const sendTestEmail = (to) => API.post(`/admin/email/test`, { to });

// System — maintenance mode and runtime info (developer-only except status).
export const getSystemStatus = () => API.get("/system/status");
export const getMaintenance = () => API.get("/system/maintenance");
export const updateMaintenance = (payload) => API.put("/system/maintenance", payload);
export const getSystemInfo = () => API.get("/system/info");
export const refreshResponseCache = () => API.post("/system/refresh-cache");
export const connectDb = () => API.post(`/admin/db/connect`);
export const getDbStats = () => API.get(`/admin/db/stats`);
export const getDbCollections = () => API.get(`/admin/db/collections`);

// Application logs (admin)
export const getAppLogs = (params) => API.get(`/admin/logs`, { params });
export const clearAppLogs = (params) => API.delete(`/admin/logs`, { params });

// Announcements
export const getAnnouncements = (params) => API.get('/announcements', { params });
export const createAnnouncement = (payload) => API.post('/announcements', payload);
export const updateAnnouncement = (id, payload) => API.put(`/announcements/${id}`, payload);
export const deleteAnnouncement = (id) => API.delete(`/announcements/${id}`);
export const sendAnnouncementEmailApi = (id) => API.post(`/announcements/${id}/send-email`);

// Service Categories (for Services Availed)
export const getServiceCategories = () => API.get('/service-categories');
export const createServiceCategory = (payload) => API.post('/service-categories', payload);
export const updateServiceCategory = (id, payload) => API.put(`/service-categories/${id}`, payload);
export const deleteServiceCategory = (id) => API.delete(`/service-categories/${id}`);

// Admin utility: sync Q5 services from env on server
export const syncServicesFromEnv = () => API.post('/question/sync-services-from-env');

// VERA — Virtual Environmental Response Assistant
export const getVeraStatus = () => API.get('/vera/status');
export const veraChat = (payload, config) => API.post('/vera/chat', payload, config);
export const getVeraInsights = () => API.get('/vera/insights');
export const getVeraPublicStatus = () => API.get('/vera/public-status');
export const veraPublicChat = (payload, config) => API.post('/vera/public-chat', payload, config);
export const getVeraSettings = () => API.get('/vera/settings');
export const updateVeraSettings = (payload) => API.put('/vera/settings', payload);
export const testVeraConnection = () => API.post('/vera/settings/test');
export const clearVeraKey = () => API.delete('/vera/settings/key');
