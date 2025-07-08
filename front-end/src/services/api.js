import axios from 'axios';

const API = axios.create({
  baseURL: '/api', // Proxy handles this during development
});

export const getFeedbacks = () => API.get('/feedback');
