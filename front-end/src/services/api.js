import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
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
