import { Request, Response, NextFunction } from 'express';
import AdminLogService, { AdminAction } from '../services/adminLogService';
import { AdminUser } from '../models/types';

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: AdminUser;
}

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
}

export interface ErrorResponse {
  success: false;
  message: string;
  error?: {
    code?: string;
    details?: any;
    stack?: string;
  };
  timestamp: string;
  requestId?: string;
  path: string;
  method: string;
}

/**
 * Custom error classes
 */
export class ValidationError extends Error implements ApiError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  isOperational = true;

  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error implements ApiError {
  statusCode = 401;
  code = 'AUTHENTICATION_ERROR';
  isOperational = true;

  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error implements ApiError {
  statusCode = 403;
  code = 'AUTHORIZATION_ERROR';
  isOperational = true;

  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error implements ApiError {
  statusCode = 404;
  code = 'NOT_FOUND_ERROR';
  isOperational = true;

  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error implements ApiError {
  statusCode = 409;
  code = 'CONFLICT_ERROR';
  isOperational = true;

  constructor(message: string = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends Error implements ApiError {
  statusCode = 429;
  code = 'RATE_LIMIT_ERROR';
  isOperational = true;

  constructor(message: string = 'Too many requests') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends Error implements ApiError {
  statusCode = 502;
  code = 'EXTERNAL_SERVICE_ERROR';
  isOperational = true;

  constructor(message: string = 'External service error', public service?: string) {
    super(message);
    this.name = 'ExternalServiceError';
  }
}

export class DatabaseError extends Error implements ApiError {
  statusCode = 500;
  code = 'DATABASE_ERROR';
  isOperational = true;

  constructor(message: string = 'Database operation failed', public details?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Error classification utility
 */
export const classifyError = (error: any): ApiError => {
  // Handle known error types
  if (error instanceof ApiError) {
    return error;
  }

  // Handle database errors
  if (error.code === 'SQLITE_CONSTRAINT' || error.code === 'SQLITE_BUSY') {
    return new DatabaseError('Database constraint violation', error);
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return new AuthenticationError('Invalid or expired token');
  }

  // Handle validation errors from Joi
  if (error.name === 'ValidationError' && error.details) {
    return new ValidationError('Validation failed', error.details);
  }

  // Handle network/connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
    return new ExternalServiceError('Network connection failed', error.code);
  }

  // Handle file system errors
  if (error.code === 'ENOENT') {
    return new NotFoundError('File or directory not found');
  }

  if (error.code === 'EACCES' || error.code === 'EPERM') {
    return new AuthorizationError('Permission denied');
  }

  // Default to internal server error
  const apiError = new Error(error.message || 'Internal server error') as ApiError;
  apiError.statusCode = 500;
  apiError.code = 'INTERNAL_SERVER_ERROR';
  apiError.isOperational = false;
  apiError.details = error;

  return apiError;
};

/**
 * Generate request ID for tracking
 */
const generateRequestId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

/**
 * Log error for monitoring and debugging
 */
const logError = async (error: ApiError, req: AuthenticatedRequest, requestId: string): Promise<void> => {
  try {
    const errorLog = {
      requestId,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.method !== 'GET' ? req.body : undefined,
      user: req.user ? { id: req.user.id, username: req.user.username } : undefined,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        stack: error.stack,
        details: error.details,
        isOperational: error.isOperational
      }
    };

    // Log to console (in production, this would go to a logging service)
    console.error('API Error:', JSON.stringify(errorLog, null, 2));

    // Log to admin logs if user is authenticated and it's an operational error
    if (req.user && error.isOperational && error.statusCode && error.statusCode >= 400) {
      const adminLogService = new AdminLogService();
      await adminLogService.logSystemAction(
        req.user.id!,
        req.user.username,
        'API_ERROR' as AdminAction,
        {
          requestId,
          method: req.method,
          path: req.path,
          errorCode: error.code,
          errorMessage: error.message
        },
        req.ip,
        false,
        error.message
      );
    }
  } catch (logError) {
    // Don't let logging errors crash the application
    console.error('Failed to log error:', logError);
  }
};

/**
 * Format error response
 */
const formatErrorResponse = (error: ApiError, req: Request, requestId: string): ErrorResponse => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const response: ErrorResponse = {
    success: false,
    message: error.message,
    timestamp: new Date().toISOString(),
    requestId,
    path: req.path,
    method: req.method
  };

  // Include error details in development or for operational errors
  if (isDevelopment || error.isOperational) {
    response.error = {
      code: error.code,
      details: error.details
    };

    // Include stack trace only in development
    if (isDevelopment) {
      response.error.stack = error.stack;
    }
  }

  return response;
};

/**
 * Main error handling middleware
 */
export const errorHandler = (
  error: any,
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // Generate unique request ID for tracking
  const requestId = req.headers['x-request-id'] as string || generateRequestId();

  // Classify and normalize the error
  const apiError = classifyError(error);

  // Log the error (don't await, let it run in background)
  logError(apiError, req, requestId).catch(logErr => {
    console.error('Failed to log error:', logErr);
  });

  // Format the response
  const errorResponse = formatErrorResponse(apiError, req, requestId);

  // Send the error response
  res.status(apiError.statusCode || 500).json(errorResponse);
};

/**
 * 404 handler for unmatched routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
  next(error);
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Request timeout middleware
 */
export const timeoutHandler = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        const error = new Error('Request timeout');
        (error as ApiError).statusCode = 408;
        (error as ApiError).code = 'REQUEST_TIMEOUT';
        (error as ApiError).isOperational = true;
        next(error);
      }
    }, timeoutMs);

    // Clear timeout when response is sent
    res.on('finish', () => {
      clearTimeout(timeout);
    });

    next();
  };
};

/**
 * Request size limit handler
 */
export const requestSizeLimitHandler = (req: Request, res: Response, next: NextFunction) => {
  if (req.headers['content-length']) {
    const contentLength = parseInt(req.headers['content-length']);
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (contentLength > maxSize) {
      const error = new ValidationError('Request payload too large');
      error.statusCode = 413;
      error.code = 'PAYLOAD_TOO_LARGE';
      return next(error);
    }
  }
  next();
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Add request ID header
  const requestId = req.headers['x-request-id'] as string || generateRequestId();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
};

export default {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  timeoutHandler,
  requestSizeLimitHandler,
  securityHeaders,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  DatabaseError,
  classifyError
};