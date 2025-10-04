import { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: any;
  timestamp?: string;
  path?: string;
}

export interface NetworkError {
  type: 'network' | 'timeout' | 'server' | 'client' | 'unknown';
  message: string;
  originalError?: any;
  retryable: boolean;
}

export class ErrorHandler {
  /**
   * Parse API error response
   */
  static parseApiError(error: AxiosError): ApiError {
    if (error.response?.data) {
      const data = error.response.data as any;
      return {
        message: data.message || 'An error occurred',
        code: data.code,
        statusCode: error.response.status,
        details: data.details,
        timestamp: data.timestamp,
        path: data.path
      };
    }

    return {
      message: error.message || 'Network error occurred',
      statusCode: error.response?.status
    };
  }

  /**
   * Determine network error type
   */
  static categorizeNetworkError(error: AxiosError): NetworkError {
    // Network/Connection errors
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return {
          type: 'timeout',
          message: 'Request timed out. Please check your connection and try again.',
          originalError: error,
          retryable: true
        };
      }

      if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        return {
          type: 'network',
          message: 'Network connection failed. Please check your internet connection.',
          originalError: error,
          retryable: true
        };
      }

      return {
        type: 'network',
        message: 'Unable to connect to the server. Please try again later.',
        originalError: error,
        retryable: true
      };
    }

    // Server errors (5xx)
    if (error.response.status >= 500) {
      return {
        type: 'server',
        message: 'Server error occurred. Please try again later.',
        originalError: error,
        retryable: true
      };
    }

    // Client errors (4xx)
    if (error.response.status >= 400) {
      const isRetryable = error.response.status === 408 || error.response.status === 429;
      
      return {
        type: 'client',
        message: this.parseApiError(error).message,
        originalError: error,
        retryable: isRetryable
      };
    }

    return {
      type: 'unknown',
      message: 'An unexpected error occurred',
      originalError: error,
      retryable: false
    };
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: AxiosError): string {
    const networkError = this.categorizeNetworkError(error);
    
    switch (networkError.type) {
      case 'network':
        return 'Connection problem. Please check your internet connection and try again.';
      case 'timeout':
        return 'Request timed out. The server is taking too long to respond.';
      case 'server':
        return 'Server is temporarily unavailable. Please try again in a few minutes.';
      case 'client':
        return networkError.message;
      default:
        return 'Something went wrong. Please try again.';
    }
  }

  /**
   * Determine if error should trigger retry
   */
  static shouldRetry(error: AxiosError, retryCount: number, maxRetries: number = 3): boolean {
    if (retryCount >= maxRetries) {
      return false;
    }

    const networkError = this.categorizeNetworkError(error);
    return networkError.retryable;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  static getRetryDelay(retryCount: number, baseDelay: number = 1000): number {
    return Math.min(baseDelay * Math.pow(2, retryCount), 10000); // Max 10 seconds
  }

  /**
   * Format validation errors for display
   */
  static formatValidationErrors(errors: { [key: string]: string[] }): string[] {
    const messages: string[] = [];
    
    for (const [field, fieldErrors] of Object.entries(errors)) {
      for (const error of fieldErrors) {
        messages.push(error);
      }
    }
    
    return messages;
  }

  /**
   * Log error for debugging
   */
  static logError(error: any, context?: string) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      context,
      message: error.message,
      stack: error.stack,
      ...(error.response && {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      })
    };

    console.error('Error logged:', errorInfo);

    // In production, you might want to send this to an error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Send to error tracking service (e.g., Sentry, LogRocket)
    }
  }
}

/**
 * Enhanced error boundary for React components
 */
export class ComponentErrorHandler {
  static handleComponentError(error: Error, errorInfo: any) {
    console.error('Component error:', error, errorInfo);
    
    // Log to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Send to error tracking service
    }
  }

  static getErrorFallback(error: Error) {
    return {
      title: 'Something went wrong',
      message: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'An unexpected error occurred. Please refresh the page and try again.',
      showReload: true
    };
  }
}

/**
 * Form validation error handler
 */
export class FormErrorHandler {
  static processValidationErrors(apiError: ApiError): { [key: string]: string } {
    const fieldErrors: { [key: string]: string } = {};
    
    if (apiError.details && typeof apiError.details === 'object') {
      for (const [field, errors] of Object.entries(apiError.details)) {
        if (Array.isArray(errors) && errors.length > 0) {
          fieldErrors[field] = errors[0]; // Take first error for each field
        }
      }
    }
    
    return fieldErrors;
  }

  static getGeneralErrorMessage(apiError: ApiError): string {
    if (apiError.code === 'VALIDATION_ERROR') {
      return 'Please correct the errors below and try again.';
    }
    
    return apiError.message || 'An error occurred while processing your request.';
  }
}

/**
 * Retry mechanism for API calls
 */
export class RetryHandler {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        if (error.isAxiosError && !ErrorHandler.shouldRetry(error, attempt, maxRetries)) {
          throw error;
        }
        
        const delay = ErrorHandler.getRetryDelay(attempt, baseDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}

/**
 * Global error types for the application
 */
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Error notification helper
 */
export class ErrorNotificationHelper {
  static getNotificationConfig(error: AxiosError) {
    const networkError = ErrorHandler.categorizeNetworkError(error);
    
    switch (networkError.type) {
      case 'network':
        return {
          type: 'error' as const,
          title: 'Connection Error',
          message: networkError.message,
          duration: 5000,
          showRetry: true
        };
      
      case 'timeout':
        return {
          type: 'warning' as const,
          title: 'Request Timeout',
          message: networkError.message,
          duration: 4000,
          showRetry: true
        };
      
      case 'server':
        return {
          type: 'error' as const,
          title: 'Server Error',
          message: networkError.message,
          duration: 6000,
          showRetry: false
        };
      
      case 'client':
        const apiError = ErrorHandler.parseApiError(error);
        return {
          type: apiError.statusCode === 401 ? 'warning' as const : 'error' as const,
          title: apiError.statusCode === 401 ? 'Authentication Required' : 'Request Error',
          message: networkError.message,
          duration: 4000,
          showRetry: false
        };
      
      default:
        return {
          type: 'error' as const,
          title: 'Unexpected Error',
          message: 'Something unexpected happened. Please try again.',
          duration: 5000,
          showRetry: true
        };
    }
  }
}