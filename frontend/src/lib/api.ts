import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach auth token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('bs_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('bs_token');
      localStorage.removeItem('bs_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Helper to extract data or throw with a message
export async function apiCall<T>(
  fn: () => Promise<{ data: { success: boolean; data: T; error?: { message: string } } }>
): Promise<T> {
  const response = await fn();
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Request failed');
  }
  return response.data.data;
}
