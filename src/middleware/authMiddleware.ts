import { Request, Response, NextFunction } from 'express';
import AuthService, { TokenPayload } from '../services/authService';

// Extend Express Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: TokenPayload;
}

class AuthMiddleware {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Middleware to authenticate JWT token
   */
  authenticate = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        res.status(401).json({
          error: {
            message: 'Authorization header missing',
            code: 'MISSING_AUTH_HEADER'
          }
        });
        return;
      }

      const token = authHeader.split(' ')[1]; // Bearer <token>
      
      if (!token) {
        res.status(401).json({
          error: {
            message: 'Token missing from authorization header',
            code: 'MISSING_TOKEN'
          }
        });
        return;
      }

      // Verify token
      const decoded = this.authService.verifyAccessToken(token);
      req.user = decoded;
      
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      
      let errorMessage = 'Authentication failed';
      let errorCode = 'AUTH_FAILED';
      
      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          errorMessage = 'Token expired';
          errorCode = 'TOKEN_EXPIRED';
        } else if (error.message.includes('invalid')) {
          errorMessage = 'Invalid token';
          errorCode = 'INVALID_TOKEN';
        }
      }

      res.status(401).json({
        error: {
          message: errorMessage,
          code: errorCode
        }
      });
    }
  };

  /**
   * Middleware to check if user has required role
   */
  requireRole = (requiredRole: 'admin' | 'super_admin') => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          error: {
            message: 'Authentication required',
            code: 'AUTH_REQUIRED'
          }
        });
        return;
      }

      if (!this.authService.hasPermission(req.user.role, requiredRole)) {
        res.status(403).json({
          error: {
            message: 'Insufficient permissions',
            code: 'INSUFFICIENT_PERMISSIONS',
            required: requiredRole,
            current: req.user.role
          }
        });
        return;
      }

      next();
    };
  };

  /**
   * Middleware to check if user can perform specific action
   */
  requirePermission = (action: string, getTargetUserId?: (req: Request) => number) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          error: {
            message: 'Authentication required',
            code: 'AUTH_REQUIRED'
          }
        });
        return;
      }

      const targetUserId = getTargetUserId ? getTargetUserId(req) : undefined;
      const canPerform = this.authService.canPerformAction(
        req.user.role,
        action,
        targetUserId,
        req.user.userId
      );

      if (!canPerform) {
        res.status(403).json({
          error: {
            message: 'Action not permitted',
            code: 'ACTION_NOT_PERMITTED',
            action,
            userRole: req.user.role
          }
        });
        return;
      }

      next();
    };
  };

  /**
   * Middleware to check if user can access their own resources or is super admin
   */
  requireOwnershipOrSuperAdmin = (getUserIdFromParams: (req: Request) => number) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          error: {
            message: 'Authentication required',
            code: 'AUTH_REQUIRED'
          }
        });
        return;
      }

      const targetUserId = getUserIdFromParams(req);
      const isSuperAdmin = req.user.role === 'super_admin';
      const isOwner = req.user.userId === targetUserId;

      if (!isSuperAdmin && !isOwner) {
        res.status(403).json({
          error: {
            message: 'Can only access own resources',
            code: 'OWNERSHIP_REQUIRED'
          }
        });
        return;
      }

      next();
    };
  };

  /**
   * Optional authentication middleware (doesn't fail if no token)
   */
  optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader) {
        const token = authHeader.split(' ')[1];
        if (token) {
          const decoded = this.authService.verifyAccessToken(token);
          req.user = decoded;
        }
      }
      
      next();
    } catch (error) {
      // Ignore authentication errors for optional auth
      next();
    }
  };

  /**
   * Middleware to log admin actions
   */
  logAdminAction = (action: string, getTargetInfo?: (req: Request) => { type: string; id: number }) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Store original res.json to intercept response
      const originalJson = res.json;
      
      res.json = function(body: any) {
        // Log the action after successful response
        if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
          const targetInfo = getTargetInfo ? getTargetInfo(req) : undefined;
          
          // This would typically save to admin_logs table
          console.log('Admin Action:', {
            adminUserId: req.user.userId,
            action,
            targetType: targetInfo?.type,
            targetId: targetInfo?.id,
            ipAddress: req.ip,
            timestamp: new Date().toISOString(),
            details: JSON.stringify({
              method: req.method,
              path: req.path,
              body: req.body
            })
          });
        }
        
        return originalJson.call(this, body);
      };
      
      next();
    };
  };
}

// Export singleton instance
const authMiddleware = new AuthMiddleware();

export default authMiddleware;

// Export individual middleware functions for convenience
export const authenticate = authMiddleware.authenticate;
export const requireRole = authMiddleware.requireRole;
export const requirePermission = authMiddleware.requirePermission;
export const requireOwnershipOrSuperAdmin = authMiddleware.requireOwnershipOrSuperAdmin;
export const optionalAuth = authMiddleware.optionalAuth;
export const logAdminAction = authMiddleware.logAdminAction;