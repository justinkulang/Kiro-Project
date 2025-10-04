import { Request, Response, NextFunction } from 'express';
import authMiddleware, { authenticate, requireRole, requirePermission } from '../authMiddleware';
import AuthService from '../../services/authService';

// Mock AuthService
jest.mock('../../services/authService');

describe('AuthMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(() => {
    mockReq = {
      headers: {},
      user: undefined
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
    
    // Mock AuthService methods
    mockAuthService = {
      verifyAccessToken: jest.fn(),
      hasPermission: jest.fn(),
      canPerformAction: jest.fn()
    } as any;
    
    (AuthService as jest.Mock).mockImplementation(() => mockAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate middleware', () => {
    test('should authenticate valid token', () => {
      const mockPayload = {
        userId: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin' as const
      };

      mockReq.headers = {
        authorization: 'Bearer valid.jwt.token'
      };

      mockAuthService.verifyAccessToken.mockReturnValue(mockPayload);

      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuthService.verifyAccessToken).toHaveBeenCalledWith('valid.jwt.token');
      expect(mockReq.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should reject request without authorization header', () => {
      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Authorization header missing',
          code: 'MISSING_AUTH_HEADER'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject request with malformed authorization header', () => {
      mockReq.headers = {
        authorization: 'InvalidFormat'
      };

      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Token missing from authorization header',
          code: 'MISSING_TOKEN'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject invalid token', () => {
      mockReq.headers = {
        authorization: 'Bearer invalid.token'
      };

      mockAuthService.verifyAccessToken.mockImplementation(() => {
        throw new Error('Invalid access token');
      });

      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should handle expired token', () => {
      mockReq.headers = {
        authorization: 'Bearer expired.token'
      };

      mockAuthService.verifyAccessToken.mockImplementation(() => {
        throw new Error('Access token expired');
      });

      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireRole middleware', () => {
    beforeEach(() => {
      mockReq.user = {
        userId: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin'
      };
    });

    test('should allow access with sufficient role', () => {
      mockAuthService.hasPermission.mockReturnValue(true);

      const middleware = requireRole('admin');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuthService.hasPermission).toHaveBeenCalledWith('admin', 'admin');
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should deny access with insufficient role', () => {
      mockAuthService.hasPermission.mockReturnValue(false);

      const middleware = requireRole('super_admin');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuthService.hasPermission).toHaveBeenCalledWith('admin', 'super_admin');
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: 'super_admin',
          current: 'admin'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should deny access without authentication', () => {
      mockReq.user = undefined;

      const middleware = requireRole('admin');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requirePermission middleware', () => {
    beforeEach(() => {
      mockReq.user = {
        userId: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin'
      };
    });

    test('should allow action with permission', () => {
      mockAuthService.canPerformAction.mockReturnValue(true);

      const middleware = requirePermission('create_user');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuthService.canPerformAction).toHaveBeenCalledWith(
        'admin',
        'create_user',
        undefined,
        1
      );
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should deny action without permission', () => {
      mockAuthService.canPerformAction.mockReturnValue(false);

      const middleware = requirePermission('create_admin');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Action not permitted',
          code: 'ACTION_NOT_PERMITTED',
          action: 'create_admin',
          userRole: 'admin'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should pass target user ID to permission check', () => {
      mockAuthService.canPerformAction.mockReturnValue(true);
      mockReq.params = { userId: '2' };

      const getTargetUserId = (req: Request) => parseInt(req.params!.userId);
      const middleware = requirePermission('update_admin', getTargetUserId);
      
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuthService.canPerformAction).toHaveBeenCalledWith(
        'admin',
        'update_admin',
        2,
        1
      );
    });

    test('should deny access without authentication', () => {
      mockReq.user = undefined;

      const middleware = requirePermission('create_user');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Integration tests', () => {
    test('should chain middleware correctly', () => {
      const mockPayload = {
        userId: 1,
        username: 'superadmin',
        email: 'super@example.com',
        role: 'super_admin' as const
      };

      mockReq.headers = {
        authorization: 'Bearer valid.token'
      };

      mockAuthService.verifyAccessToken.mockReturnValue(mockPayload);
      mockAuthService.hasPermission.mockReturnValue(true);

      // First authenticate
      authenticate(mockReq as Request, mockRes as Response, mockNext);
      expect(mockReq.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Then check role
      const roleMiddleware = requireRole('super_admin');
      roleMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(2);

      // Both middleware should have passed
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});