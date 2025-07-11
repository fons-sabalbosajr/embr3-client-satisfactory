import axios from "axios";

const API = axios.create({
  // This is correct: your backend's base URL and port for API endpoints
  baseURL: "http://10.14.77.107:5000/api",
});

export const getFeedbacks = () => API.get("/feedback");
export const signUp = (formData) => API.post("/auth/signup", formData);
export const login = (formData) => API.post("/auth/login", formData);

// Question API calls
export const getQuestions = () => API.get('/question');
export const createQuestion = (newQuestion) => API.post('/question', newQuestion);
export const updateQuestion = (id, updatedQuestion) => API.put(`/question/${id}`, updatedQuestion);
export const deleteQuestion = (id) => API.delete(`/question/${id}`);