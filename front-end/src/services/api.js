import axios from "axios";
import { getDecryptedItem, getOpaqueItem } from "../utils/encryptedStorage";

// Base URL strategy:
// - Prefer VITE_API_BASE when deploying frontend and backend on different domains (e.g., Render multi-service)
// - If missing, try to infer backend from current hostname (Render: remove "-measurement" suffix)
// - Fallback to same-origin "/api" (works in dev with Vite proxy and when backend serves the SPA)
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

const baseURL = import.meta?.env?.VITE_API_BASE || inferBackendApiBase() || "/api";
const API = axios.create({ baseURL });

// Add request interceptor to include auth token
API.interceptors.request.use((config) => {
  // Prefer encrypted token; fallback to legacy opaque/plain for backward compatibility
  const token = getDecryptedItem("token") || getOpaqueItem("token") || localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Get all users (for Accounts Management)
export const getAllUsers = () => API.get("/auth/users");

export const getFeedbacks = () => API.get("/feedback");
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
export const deleteFeedback = (id) => API.delete(`/feedback/${id}`);
export const updateFeedback = (id, updatedFeedback) =>
  API.put(`/feedback/${id}`, updatedFeedback);

export const getClientSatisfactoryData = () => API.get("/client-satisfactory");

export const forgotPassword = (email) =>
  API.post("/auth/forgot-password", { email });
export const resetPassword = (payload) =>
  API.post("/auth/reset-password", payload);
export const updateUser = (id, updatedUser) => API.put(`/auth/users/${id}`, updatedUser);
export const getMe = () => API.get('/auth/me');

// Preferences API (per-user settings)
export const getPreferences = () => API.get(`/auth/preferences`);
export const updatePreferences = (prefs) => API.put(`/auth/preferences`, prefs);

// Database / infrastructure helpers for DeveloperSettings.DangerZone
export const getDbStatus = () => API.get(`/admin/db/status`);
export const connectDb = () => API.post(`/admin/db/connect`);

// Announcements
export const getAnnouncements = (params) => API.get('/announcements', { params });
export const createAnnouncement = (payload) => API.post('/announcements', payload);
export const updateAnnouncement = (id, payload) => API.put(`/announcements/${id}`, payload);
export const deleteAnnouncement = (id) => API.delete(`/announcements/${id}`);

// Service Categories (for Services Availed)
export const getServiceCategories = () => API.get('/service-categories');
export const createServiceCategory = (payload) => API.post('/service-categories', payload);
export const updateServiceCategory = (id, payload) => API.put(`/service-categories/${id}`, payload);
export const deleteServiceCategory = (id) => API.delete(`/service-categories/${id}`);

// Admin utility: sync Q5 services from env on server
export const syncServicesFromEnv = () => API.post('/question/sync-services-from-env');
