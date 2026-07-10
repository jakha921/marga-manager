import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

const getErrorDetail = (data: unknown): string => {
  if (typeof data === 'string') return data;
  if (!data || typeof data !== 'object') return '';

  const payload = data as { detail?: unknown; error?: unknown };
  return getErrorDetail(payload.detail) || getErrorDetail(payload.error);
};

// Request interceptor: attach JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('km_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Promise-based lock to prevent parallel refresh races
let refreshPromise: Promise<string> | null = null;

// Response interceptor: auto-refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Suspended org — redirect to holding page
    if (error.response?.status === 403 && getErrorDetail(error.response.data).includes('приостановлена')) {
      localStorage.setItem('km_org_suspended', 'true');
      if (window.location.pathname !== '/suspended') {
        window.location.href = '/suspended';
      }
      return Promise.reject(error);
    }
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('km_refresh_token');
      if (refreshToken) {
        try {
          if (!refreshPromise) {
            refreshPromise = axios
              .post(`${API_URL}/auth/refresh/`, { refresh: refreshToken })
              .then(({ data }) => {
                localStorage.setItem('km_access_token', data.access);
                if (data.refresh) localStorage.setItem('km_refresh_token', data.refresh);
                return data.access as string;
              })
              .finally(() => { refreshPromise = null; });
          }
          const newToken = await refreshPromise;
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        } catch {
          localStorage.removeItem('km_access_token');
          localStorage.removeItem('km_refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
