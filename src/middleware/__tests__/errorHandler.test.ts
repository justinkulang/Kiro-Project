import { Request, Response, NextFunction } from 'express';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  errorHandler,
  asyncHandler,
  validateRequired,
  sanitizeInput,
  rateLimit,
  healthCheck
} from '../errorHandler';

// Mock dependencies
jest.mock('../../services/adminLogService');
jest.mock('../../models/database');

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create an AppError with correct properties', () => {
      const error = new AppError('Test error', 400, true, 'TEST_ERROR', { field: 'value' });
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.details).toEqual({ field: 'value' });
    });

    it('should default isOperational to true', () => {
      const error = new AppError('Test error', 400);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('ValidationError', () => {
    it('should create a ValidationError with correct properties', () => {
      const error = new ValidationError('Validation failed', { field: 'required' });
      
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: 'required' });
    });
  });

  describe('AuthenticationError', () => {
    it('should create an AuthenticationError with default message', () => {
      const error = new AuthenticationError();
      
      expect(error.message).toBe('Authentication failed');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should create an AuthenticationError with custom message', () => {
      const error = new AuthenticationError('Token expired');
      
      expect(error.message).toBe('Token expired');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('AuthorizationError', () => {
    it('should create an AuthorizationError with default message', () => {
      const error = new AuthorizationError();
      
      expect(error.message).toBe('Insufficient permissions');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
    });
  });

  describe('NotFoundError', () => {
    it('should create a NotFoundError with default resource', () => {
      const error = new NotFoundError();
      
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND_ERROR');
    });

    it('should create a NotFoundError with custom resource', () => {
      const error = new NotFoundError('User');
      
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('ConflictError', () => {
    it('should create a ConflictError', () => {
      const error = new ConflictError('Resource already exists');
      
      expect(error.message).toBe('Resource already exists');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT_ERROR');
    });
  });

  describe('RateLimitError', () => {
    it('should create a RateLimitError with default message', () => {
      const error = new RateLimitError();
      
      expect(error.message).toBe('Too many requests');
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_ERROR');
    });
  });

  describe('DatabaseError', () => {
    it('should create a DatabaseError', () => {
      const error = new DatabaseError('Connection failed', { host: 'localhost' });
      
      expect(error.message).toBe('Connection failed');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.details).toEqual({ host: 'localhost' });
    });
  });

  describe('ExternalServiceError', () => {
    it('should create an ExternalServiceError', () => {
      const error = new ExternalServiceError('MikroTik', 'Connection timeout');
      
      expect(error.message).toBe('MikroTik service error: Connection timeout');
      expect(error.statusCode).toBe(502);
      expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
    });
  });
});

describe('Error Handler Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonSpy: jest.Mock;
  let statusSpy: jest.Mock;

  beforeEach(() => {
    jsonSpy = jest.fn();
    statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });
    
    mockReq = {
      url: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-agent'),
      user: { id: 1, username: 'testuser' }
    };
    
    mockRes = {
      status: statusSpy,
      json: jsonSpy
    };
    
    mockNext = jest.fn();
    
    // Mock console.error to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should handle AppError correctly', () => {
    const error = new ValidationError('Test validation error', { field: 'required' });
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
    
    expect(statusSpy).toHaveBeenCalledWith(400);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Test validation error',
        code: 'VALIDATION_ERROR',
        details: { field: 'required' }
      })
    );
  });

  it('should handle unknown errors in production', () => {
    process.env.NODE_ENV = 'production';
    const error = new Error('Internal error');
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
    
    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Internal server error'
      })
    );
    
    delete process.env.NODE_ENV;
  });

  it('should handle unknown errors in development', () => {
    process.env.NODE_ENV = 'development';
    const error = new Error('Internal error');
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
    
    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Internal error',
        stack: expect.any(String)
      })
    );
    
    delete process.env.NODE_ENV;
  });

  it('should convert ValidationError to AppError', () => {
    const error = new Error('Validation failed');
    error.name = 'ValidationError';
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
    
    expect(statusSpy).toHaveBeenCalledWith(400);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR'
      })
    );
  });

  it('should convert JsonWebTokenError to AuthenticationError', () => {
    const error = new Error('Invalid token');
    error.name = 'JsonWebTokenError';
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
    
    expect(statusSpy).toHaveBeenCalledWith(401);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'AUTHENTICATION_ERROR'
      })
    );
  });

  it('should convert TokenExpiredError to AuthenticationError', () => {
    const error = new Error('Token expired');
    error.name = 'TokenExpiredError';
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
    
    expect(statusSpy).toHaveBeenCalledWith(401);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Token expired'
      })
    );
  });

  it('should handle SQLITE_CONSTRAINT errors', () => {
    const error = new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed');
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
    
    expect(statusSpy).toHaveBeenCalledWith(409);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'CONFLICT_ERROR'
      })
    );
  });
});

describe('Async Handler', () => {
  it('should call next with error when async function throws', async () => {
    const mockNext = jest.fn();
    const error = new Error('Async error');
    const asyncFn = jest.fn().mockRejectedValue(error);
    
    const handler = asyncHandler(asyncFn);
    await handler({} as Request, {} as Response, mockNext);
    
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  it('should not call next when async function succeeds', async () => {
    const mockNext = jest.fn();
    const asyncFn = jest.fn().mockResolvedValue('success');
    
    const handler = asyncHandler(asyncFn);
    await handler({} as Request, {} as Response, mockNext);
    
    expect(mockNext).not.toHaveBeenCalled();
  });
});

describe('Validation Helpers', () => {
  describe('validateRequired', () => {
    it('should pass when all required fields are present', () => {
      const fields = { name: 'John', email: 'john@example.com' };
      const required = ['name', 'email'];
      
      expect(() => validateRequired(fields, required)).not.toThrow();
    });

    it('should throw ValidationError when required fields are missing', () => {
      const fields = { name: 'John' };
      const required = ['name', 'email'];
      
      expect(() => validateRequired(fields, required)).toThrow(ValidationError);
    });

    it('should throw ValidationError when required fields are empty', () => {
      const fields = { name: 'John', email: '' };
      const required = ['name', 'email'];
      
      expect(() => validateRequired(fields, required)).toThrow(ValidationError);
    });

    it('should throw ValidationError when required fields are null', () => {
      const fields = { name: 'John', email: null };
      const required = ['name', 'email'];
      
      expect(() => validateRequired(fields, required)).toThrow(ValidationError);
    });
  });

  describe('sanitizeInput', () => {
    it('should trim string inputs', () => {
      const input = '  hello world  ';
      const result = sanitizeInput(input);
      expect(result).toBe('hello world');
    });

    it('should sanitize nested objects', () => {
      const input = {
        name: '  John  ',
        details: {
          email: '  john@example.com  '
        }
      };
      
      const result = sanitizeInput(input);
      expect(result).toEqual({
        name: 'John',
        details: {
          email: 'john@example.com'
        }
      });
    });

    it('should sanitize arrays', () => {
      const input = ['  item1  ', '  item2  '];
      const result = sanitizeInput(input);
      expect(result).toEqual(['item1', 'item2']);
    });

    it('should return non-string values unchanged', () => {
      expect(sanitizeInput(123)).toBe(123);
      expect(sanitizeInput(true)).toBe(true);
      expect(sanitizeInput(null)).toBe(null);
    });
  });
});

describe('Rate Limiting', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      ip: '127.0.0.1',
      url: '/test'
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  it('should allow requests within limit', () => {
    const limiter = rateLimit(5, 60000); // 5 requests per minute
    
    limiter(mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should block requests exceeding limit', () => {
    const limiter = rateLimit(1, 60000); // 1 request per minute
    
    // First request should pass
    limiter(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
    
    // Second request should be blocked
    mockNext.mockClear();
    limiter(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(RateLimitError));
  });
});

describe('Health Check', () => {
  beforeEach(() => {
    // Mock database module
    jest.doMock('../../models/database', () => ({
      getDatabase: () => ({
        get: (query: string, callback: Function) => callback(null, {})
      })
    }));
  });

  it('should return healthy status when all checks pass', async () => {
    const status = await healthCheck();
    
    expect(status.status).toBe('healthy');
    expect(status.database).toBe(true);
    expect(status).toHaveProperty('timestamp');
    expect(status).toHaveProperty('uptime');
    expect(status).toHaveProperty('memory');
  });

  it('should return unhealthy status when database check fails', async () => {
    // Mock database failure
    jest.doMock('../../models/database', () => ({
      getDatabase: () => ({
        get: (query: string, callback: Function) => callback(new Error('DB Error'), null)
      })
    }));

    const status = await healthCheck();
    
    expect(status.status).toBe('unhealthy');
    expect(status.database).toBe(false);
  });
});