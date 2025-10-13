import axios from "axios";

// Use a relative base URL so it works in dev (via Vite proxy) and prod (same origin)
const API = axios.create({
  baseURL: "/api",
});

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
