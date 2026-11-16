import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request Interceptor: Attach JWT token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('docusphere_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized / Expired tokens
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't auto-redirect on login or register failure endpoints
      const isAuthEndpoint = error.config.url.includes('/api/auth/login') || error.config.url.includes('/api/auth/register');
      if (!isAuthEndpoint) {
        localStorage.removeItem('docusphere_token');
        localStorage.removeItem('docusphere_user');
        window.dispatchEvent(new CustomEvent('docusphere-session-expired'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
