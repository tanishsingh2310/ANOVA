// client/src/api/axios.js
// The ONLY place the API base URL lives. Set VITE_API_URL in client/.env if it differs.
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// An expired or invalid token is removed so the app sends the user back to log in.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) localStorage.removeItem('token');
    return Promise.reject(err);
  }
);

// Turns any axios error into a message a customer can read.
export const errorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  if (err.response?.data?.message) return err.response.data.message;
  if (err.request) return 'Cannot reach the server. Check that it is running.';
  return fallback;
};

export default api;
