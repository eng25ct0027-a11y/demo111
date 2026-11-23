import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cofounder-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use((response) => response.data, (error) => {
  if (error.response?.status === 401) {
    localStorage.removeItem('cofounder-token');
    if (!['/login', '/register', '/'].includes(window.location.pathname)) window.location.assign('/login');
  }
  return Promise.reject(error);
});
export default api;
