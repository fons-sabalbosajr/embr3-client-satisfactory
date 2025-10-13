import axios from "axios";
import { getOpaqueItem } from "../utils/encryptedStorage";

// Use a relative base URL so it works in dev (via Vite proxy) and prod (same origin)
const API = axios.create({
  baseURL: "/api",
});

// Add request interceptor to include auth token
API.interceptors.request.use((config) => {
  const token = getOpaqueItem("token");
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
