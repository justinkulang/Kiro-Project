import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ErrorHandler, RetryHandler } from '../utils/errorHandler';

// API configuration
const API_BASE_URL = 'http://localhost:3001/api';
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Log error for debugging
    ErrorHandler.logError(error, 'API Client');

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return Promise.reject(new Error('Session expired. Please login again.'));
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      return Promise.reject(new Error('Access denied. Insufficient permissions.'));
    }

    // Handle 404 Not Found
    if (error.response?.status === 404) {
      return Promise.reject(new Error('Resource not found.'));
    }

    // Handle 500 Internal Server Error
    if (error.response?.status === 500) {
      return Promise.reject(new Error('Server error. Please try again later.'));
    }

    // Handle network errors
    if (!error.response) {
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }

    // Use enhanced error parsing
    const apiError = ErrorHandler.parseApiError(error);
    return Promise.reject(new Error(apiError.message));
  }
);

// Helper functions for common HTTP methods
export const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return RetryHandler.withRetry(() => apiClient.get<T>(url, config));
  },

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return RetryHandler.withRetry(() => apiClient.post<T>(url, data, config));
  },

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return RetryHandler.withRetry(() => apiClient.put<T>(url, data, config));
  },

  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return RetryHandler.withRetry(() => apiClient.patch<T>(url, data, config));
  },

  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return RetryHandler.withRetry(() => apiClient.delete<T>(url, config));
  },

  // Non-retryable versions for operations that shouldn't be retried
  getOnce: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.get<T>(url, config);
  },

  postOnce: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.post<T>(url, data, config);
  },

  // File upload helper
  uploadFile: <T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<AxiosResponse<T>> => {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  },

  // File download helper
  downloadFile: async (url: string, filename?: string): Promise<void> => {
    const response = await apiClient.get(url, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },
};

export { apiClient };
export default api;