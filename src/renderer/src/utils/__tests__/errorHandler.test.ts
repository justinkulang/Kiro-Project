import { AxiosError, AxiosResponse } from 'axios';
import {
  ErrorHandler,
  ComponentErrorHandler,
  FormErrorHandler,
  RetryHandler,
  ErrorNotificationHelper,
  ErrorType,
  ApiError,
  NetworkError
} from '../errorHandler';

// Mock axios error helper
const createAxiosError = (
  message: string,
  status?: number,
  data?: any,
  code?: string
): AxiosError => {
  const error = new Error(message) as AxiosError;
  error.isAxiosError = true;
  error.code = code;
  
  if (status) {
    error.response = {
      status,
      statusText: status === 404 ? 'Not Found' : 'Error',
      data,
      headers: {},
      config: {}
    } as AxiosResponse;
  }
  
  return error;
};

describe('ErrorHandler', () => {
  describe('parseApiError', () => {
    it('should parse error response data', () => {
      const responseData = {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: { field: 'required' },
        timestamp: '2023-01-01T00:00:00Z',
        path: '/api/users'
      };
      
      const axiosError = createAxiosError('Request failed', 400, responseData);
      const apiError = ErrorHandler.parseApiError(axiosError);
      
      expect(apiError).toEqual({
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details: { field: 'required' },
        timestamp: '2023-01-01T00:00:00Z',
        path: '/api/users'
      });
    });

    it('should handle error without response data', () => {
      const axiosError = createAxiosError('Network Error');
      const apiError = ErrorHandler.parseApiError(axiosError);
      
      expect(apiError).toEqual({
        message: 'Network Error',
        statusCode: undefined
      });
    });

    it('should use default message when no message provided', () => {
      const axiosError = createAxiosError('', 500, {});
      const apiError = ErrorHandler.parseApiError(axiosError);
      
      expect(apiError.message).toBe('An error occurred');
    });
  });

  describe('categorizeNetworkError', () => {
    it('should categorize timeout errors', () => {
      const axiosError = createAxiosError('timeout of 5000ms exceeded', undefined, undefined, 'ECONNABORTED');
      const networkError = ErrorHandler.categorizeNetworkError(axiosError);
      
      expect(networkError).toEqual({
        type: 'timeout',
        message: 'Request timed out. Please check your connection and try again.',
        originalError: axiosError,
        retryable: true
      });
    });

    it('should categorize network errors', () => {
      const axiosError = createAxiosError('Network Error', undefined, undefined, 'NETWORK_ERROR');
      const networkError = ErrorHandler.categorizeNetworkError(axiosError);
      
      expect(networkError).toEqual({
        type: 'network',
        message: 'Network connection failed. Please check your internet connection.',
        originalError: axiosError,
        retryable: true
      });
    });

    it('should categorize server errors (5xx)', () => {
      const axiosError = createAxiosError('Internal Server Error', 500);
      const networkError = ErrorHandler.categorizeNetworkError(axiosError);
      
      expect(networkError).toEqual({
        type: 'server',
        message: 'Server error occurred. Please try again later.',
        originalError: axiosError,
        retryable: true
      });
    });

    it('should categorize client errors (4xx)', () => {
      const axiosError = createAxiosError('Not Found', 404, { message: 'Resource not found' });
      const networkError = ErrorHandler.categorizeNetworkError(axiosError);
      
      expect(networkError).toEqual({
        type: 'client',
        message: 'Resource not found',
        originalError: axiosError,
        retryable: false
      });
    });

    it('should mark 408 and 429 as retryable client errors', () => {
      const timeoutError = createAxiosError('Request Timeout', 408);
      const timeoutNetworkError = ErrorHandler.categorizeNetworkError(timeoutError);
      expect(timeoutNetworkError.retryable).toBe(true);
      
      const rateLimitError = createAxiosError('Too Many Requests', 429);
      const rateLimitNetworkError = ErrorHandler.categorizeNetworkError(rateLimitError);
      expect(rateLimitNetworkError.retryable).toBe(true);
    });

    it('should categorize unknown errors', () => {
      const axiosError = createAxiosError('Unknown error', 300);
      const networkError = ErrorHandler.categorizeNetworkError(axiosError);
      
      expect(networkError).toEqual({
        type: 'unknown',
        message: 'An unexpected error occurred',
        originalError: axiosError,
        retryable: false
      });
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return user-friendly message for network errors', () => {
      const axiosError = createAxiosError('Network Error');
      const message = ErrorHandler.getUserFriendlyMessage(axiosError);
      
      expect(message).toBe('Connection problem. Please check your internet connection and try again.');
    });

    it('should return user-friendly message for timeout errors', () => {
      const axiosError = createAxiosError('timeout', undefined, undefined, 'ECONNABORTED');
      const message = ErrorHandler.getUserFriendlyMessage(axiosError);
      
      expect(message).toBe('Request timed out. The server is taking too long to respond.');
    });

    it('should return user-friendly message for server errors', () => {
      const axiosError = createAxiosError('Internal Server Error', 500);
      const message = ErrorHandler.getUserFriendlyMessage(axiosError);
      
      expect(message).toBe('Server is temporarily unavailable. Please try again in a few minutes.');
    });

    it('should return API message for client errors', () => {
      const axiosError = createAxiosError('Validation failed', 400, { message: 'Invalid input' });
      const message = ErrorHandler.getUserFriendlyMessage(axiosError);
      
      expect(message).toBe('Invalid input');
    });
  });

  describe('shouldRetry', () => {
    it('should not retry when max retries exceeded', () => {
      const axiosError = createAxiosError('Network Error');
      const shouldRetry = ErrorHandler.shouldRetry(axiosError, 3, 3);
      
      expect(shouldRetry).toBe(false);
    });

    it('should retry for retryable errors', () => {
      const axiosError = createAxiosError('Network Error');
      const shouldRetry = ErrorHandler.shouldRetry(axiosError, 1, 3);
      
      expect(shouldRetry).toBe(true);
    });

    it('should not retry for non-retryable errors', () => {
      const axiosError = createAxiosError('Not Found', 404);
      const shouldRetry = ErrorHandler.shouldRetry(axiosError, 1, 3);
      
      expect(shouldRetry).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should calculate exponential backoff delay', () => {
      expect(ErrorHandler.getRetryDelay(0, 1000)).toBe(1000);
      expect(ErrorHandler.getRetryDelay(1, 1000)).toBe(2000);
      expect(ErrorHandler.getRetryDelay(2, 1000)).toBe(4000);
      expect(ErrorHandler.getRetryDelay(3, 1000)).toBe(8000);
    });

    it('should cap delay at 10 seconds', () => {
      expect(ErrorHandler.getRetryDelay(10, 1000)).toBe(10000);
    });
  });

  describe('formatValidationErrors', () => {
    it('should format validation errors as array', () => {
      const errors = {
        name: ['Name is required', 'Name must be at least 2 characters'],
        email: ['Email is invalid']
      };
      
      const messages = ErrorHandler.formatValidationErrors(errors);
      
      expect(messages).toEqual([
        'Name is required',
        'Name must be at least 2 characters',
        'Email is invalid'
      ]);
    });

    it('should handle empty errors object', () => {
      const messages = ErrorHandler.formatValidationErrors({});
      expect(messages).toEqual([]);
    });
  });

  describe('logError', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log error with context', () => {
      const error = new Error('Test error');
      ErrorHandler.logError(error, 'Test context');
      
      expect(consoleSpy).toHaveBeenCalledWith('Error logged:', expect.objectContaining({
        context: 'Test context',
        message: 'Test error',
        timestamp: expect.any(String)
      }));
    });

    it('should log axios error with response details', () => {
      const axiosError = createAxiosError('Request failed', 400, { message: 'Bad request' });
      ErrorHandler.logError(axiosError);
      
      expect(consoleSpy).toHaveBeenCalledWith('Error logged:', expect.objectContaining({
        status: 400,
        statusText: 'Error',
        data: { message: 'Bad request' }
      }));
    });
  });
});

describe('ComponentErrorHandler', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('handleComponentError', () => {
    it('should log component error', () => {
      const error = new Error('Component error');
      const errorInfo = { componentStack: 'Component stack trace' };
      
      ComponentErrorHandler.handleComponentError(error, errorInfo);
      
      expect(consoleSpy).toHaveBeenCalledWith('Component error:', error, errorInfo);
    });
  });

  describe('getErrorFallback', () => {
    it('should return development error fallback', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');
      
      const fallback = ComponentErrorHandler.getErrorFallback(error);
      
      expect(fallback).toEqual({
        title: 'Something went wrong',
        message: 'Test error',
        showReload: true
      });
      
      delete process.env.NODE_ENV;
    });

    it('should return production error fallback', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');
      
      const fallback = ComponentErrorHandler.getErrorFallback(error);
      
      expect(fallback).toEqual({
        title: 'Something went wrong',
        message: 'An unexpected error occurred. Please refresh the page and try again.',
        showReload: true
      });
      
      delete process.env.NODE_ENV;
    });
  });
});

describe('FormErrorHandler', () => {
  describe('processValidationErrors', () => {
    it('should process validation errors into field errors', () => {
      const apiError: ApiError = {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: {
          name: ['Name is required'],
          email: ['Email is invalid', 'Email already exists']
        }
      };
      
      const fieldErrors = FormErrorHandler.processValidationErrors(apiError);
      
      expect(fieldErrors).toEqual({
        name: 'Name is required',
        email: 'Email is invalid'
      });
    });

    it('should handle empty details', () => {
      const apiError: ApiError = {
        message: 'Error',
        details: {}
      };
      
      const fieldErrors = FormErrorHandler.processValidationErrors(apiError);
      expect(fieldErrors).toEqual({});
    });

    it('should handle missing details', () => {
      const apiError: ApiError = {
        message: 'Error'
      };
      
      const fieldErrors = FormErrorHandler.processValidationErrors(apiError);
      expect(fieldErrors).toEqual({});
    });
  });

  describe('getGeneralErrorMessage', () => {
    it('should return validation-specific message for validation errors', () => {
      const apiError: ApiError = {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR'
      };
      
      const message = FormErrorHandler.getGeneralErrorMessage(apiError);
      expect(message).toBe('Please correct the errors below and try again.');
    });

    it('should return API error message for other errors', () => {
      const apiError: ApiError = {
        message: 'Server error',
        code: 'SERVER_ERROR'
      };
      
      const message = FormErrorHandler.getGeneralErrorMessage(apiError);
      expect(message).toBe('Server error');
    });

    it('should return default message when no message provided', () => {
      const apiError: ApiError = {
        message: ''
      };
      
      const message = FormErrorHandler.getGeneralErrorMessage(apiError);
      expect(message).toBe('An error occurred while processing your request.');
    });
  });
});

describe('RetryHandler', () => {
  describe('withRetry', () => {
    it('should return result on first success', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await RetryHandler.withRetry(operation, 3, 100);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Failure 1'))
        .mockRejectedValueOnce(new Error('Failure 2'))
        .mockResolvedValue('success');
      
      const result = await RetryHandler.withRetry(operation, 3, 10);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      const error = new Error('Persistent failure');
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(RetryHandler.withRetry(operation, 2, 10)).rejects.toThrow('Persistent failure');
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry non-retryable axios errors', async () => {
      const axiosError = createAxiosError('Not Found', 404);
      axiosError.isAxiosError = true;
      const operation = jest.fn().mockRejectedValue(axiosError);
      
      await expect(RetryHandler.withRetry(operation, 3, 10)).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });
});

describe('ErrorNotificationHelper', () => {
  describe('getNotificationConfig', () => {
    it('should return network error notification config', () => {
      const axiosError = createAxiosError('Network Error');
      const config = ErrorNotificationHelper.getNotificationConfig(axiosError);
      
      expect(config).toEqual({
        type: 'error',
        title: 'Connection Error',
        message: 'Network connection failed. Please check your internet connection.',
        duration: 5000,
        showRetry: true
      });
    });

    it('should return timeout error notification config', () => {
      const axiosError = createAxiosError('timeout', undefined, undefined, 'ECONNABORTED');
      const config = ErrorNotificationHelper.getNotificationConfig(axiosError);
      
      expect(config).toEqual({
        type: 'warning',
        title: 'Request Timeout',
        message: 'Request timed out. Please check your connection and try again.',
        duration: 4000,
        showRetry: true
      });
    });

    it('should return server error notification config', () => {
      const axiosError = createAxiosError('Internal Server Error', 500);
      const config = ErrorNotificationHelper.getNotificationConfig(axiosError);
      
      expect(config).toEqual({
        type: 'error',
        title: 'Server Error',
        message: 'Server error occurred. Please try again later.',
        duration: 6000,
        showRetry: false
      });
    });

    it('should return authentication error notification config', () => {
      const axiosError = createAxiosError('Unauthorized', 401, { message: 'Token expired' });
      const config = ErrorNotificationHelper.getNotificationConfig(axiosError);
      
      expect(config).toEqual({
        type: 'warning',
        title: 'Authentication Required',
        message: 'Token expired',
        duration: 4000,
        showRetry: false
      });
    });

    it('should return client error notification config', () => {
      const axiosError = createAxiosError('Bad Request', 400, { message: 'Invalid input' });
      const config = ErrorNotificationHelper.getNotificationConfig(axiosError);
      
      expect(config).toEqual({
        type: 'error',
        title: 'Request Error',
        message: 'Invalid input',
        duration: 4000,
        showRetry: false
      });
    });

    it('should return unknown error notification config', () => {
      const axiosError = createAxiosError('Unknown error', 300);
      const config = ErrorNotificationHelper.getNotificationConfig(axiosError);
      
      expect(config).toEqual({
        type: 'error',
        title: 'Unexpected Error',
        message: 'Something unexpected happened. Please try again.',
        duration: 5000,
        showRetry: true
      });
    });
  });
});