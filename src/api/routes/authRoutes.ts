import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import AuthService from '../../services/authService';
import { authenticate, requireRole, logAdminAction } from '../../middleware/authMiddleware';
import { getAdminUserRepository } from '../../models';
import PasswordUtils from '../../utils/passwordUtils';

const router = Router();
const authService = new AuthService();

/**
 * Validation middleware for login
 */
const validateLogin = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required')
];

/**
 * Validation middleware for user creation
 */
const validateCreateUser = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .custom((password) => {
      const strength = PasswordUtils.checkPasswordStrength(password);
      if (!strength.isStrong) {
        throw new Error(`Password is too weak: ${strength.feedback.join(', ')}`);
      }
      return true;
    }),
  
  body('role')
    .isIn(['admin', 'super_admin'])
    .withMessage('Role must be either admin or super_admin')
];

/**
 * Validation middleware for password change
 */
const validatePasswordChange = [
  body('currentPassword')
    .isLength({ min: 1 })
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .custom((password) => {
      const strength = PasswordUtils.checkPasswordStrength(password);
      if (!strength.isStrong) {
        throw new Error(`New password is too weak: ${strength.feedback.join(', ')}`);
      }
      return true;
    })
];

/**
 * Handle validation errors
 */
const handleValidationErrors = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      }
    });
  }
  next();
};

/**
 * POST /api/auth/login
 * Authenticate user and return JWT tokens
 */
router.post('/login', validateLogin, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent');
    
    const result = await authService.login({ username, password }, ipAddress, userAgent);
    
    res.json({
      success: true,
      data: result,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    
    let statusCode = 500;
    let errorMessage = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid credentials')) {
        statusCode = 401;
        errorMessage = 'Invalid username or password';
        errorCode = 'INVALID_CREDENTIALS';
      } else if (error.message.includes('disabled')) {
        statusCode = 403;
        errorMessage = 'Account is disabled';
        errorCode = 'ACCOUNT_DISABLED';
      }
    }
    
    res.status(statusCode).json({
      error: {
        message: errorMessage,
        code: errorCode
      }
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        error: {
          message: 'Refresh token is required',
          code: 'MISSING_REFRESH_TOKEN'
        }
      });
    }
    
    const tokens = await authService.refreshAccessToken(refreshToken);
    
    res.json({
      success: true,
      data: { tokens },
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    
    let statusCode = 401;
    let errorMessage = 'Invalid or expired refresh token';
    let errorCode = 'INVALID_REFRESH_TOKEN';
    
    if (error instanceof Error && error.message.includes('not found')) {
      errorMessage = 'User not found or inactive';
      errorCode = 'USER_NOT_FOUND';
    }
    
    res.status(statusCode).json({
      error: {
        message: errorMessage,
        code: errorCode
      }
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const adminRepo = getAdminUserRepository();
    const user = await adminRepo.findById(req.user!.userId);
    
    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      });
    }
    
    const { password_hash, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      data: { user: userWithoutPassword },
      message: 'User information retrieved successfully'
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to retrieve user information',
        code: 'INTERNAL_ERROR'
      }
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change current user's password
 */
router.post('/change-password', 
  authenticate, 
  validatePasswordChange, 
  handleValidationErrors,
  logAdminAction('change_password'),
  async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const adminRepo = getAdminUserRepository();
      
      // Get current user
      const user = await adminRepo.findById(req.user!.userId);
      if (!user) {
        return res.status(404).json({
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        });
      }
      
      // Verify current password
      const isCurrentPasswordValid = await authService.verifyPassword(currentPassword, user.password_hash!);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          error: {
            message: 'Current password is incorrect',
            code: 'INVALID_CURRENT_PASSWORD'
          }
        });
      }
      
      // Hash new password
      const newPasswordHash = await authService.hashPassword(newPassword);
      
      // Update password
      await adminRepo.update(user.id!, { password_hash: newPasswordHash });
      
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        error: {
          message: 'Failed to change password',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
);

/**
 * POST /api/auth/create-admin
 * Create new admin user (super admin only)
 */
router.post('/create-admin',
  authenticate,
  requireRole('super_admin'),
  validateCreateUser,
  handleValidationErrors,
  logAdminAction('create_admin'),
  async (req: Request, res: Response) => {
    try {
      const { username, email, password, role } = req.body;
      const adminRepo = getAdminUserRepository();
      
      // Check if username already exists
      const existingUser = await adminRepo.findByUsername(username);
      if (existingUser) {
        return res.status(409).json({
          error: {
            message: 'Username already exists',
            code: 'USERNAME_EXISTS'
          }
        });
      }
      
      // Check if email already exists
      const existingEmail = await adminRepo.findByEmail(email);
      if (existingEmail) {
        return res.status(409).json({
          error: {
            message: 'Email already exists',
            code: 'EMAIL_EXISTS'
          }
        });
      }
      
      // Hash password
      const passwordHash = await authService.hashPassword(password);
      
      // Create user
      const newUser = await adminRepo.create({
        username,
        email,
        password_hash: passwordHash,
        role,
        is_active: true
      });
      
      const { password_hash, ...userWithoutPassword } = newUser;
      
      res.status(201).json({
        success: true,
        data: { user: userWithoutPassword },
        message: 'Admin user created successfully'
      });
    } catch (error) {
      console.error('Create admin error:', error);
      res.status(500).json({
        error: {
          message: 'Failed to create admin user',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent');
    
    if (user) {
      await authService.logout(user.userId, user.username, ipAddress, userAgent);
    }
    
    // In a more sophisticated implementation, you might maintain a blacklist of tokens
    // For now, we rely on client-side token removal
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    // Still return success even if logging fails
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  }
});

/**
 * GET /api/auth/check-password-strength
 * Check password strength
 */
router.post('/check-password-strength', (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        error: {
          message: 'Password is required',
          code: 'MISSING_PASSWORD'
        }
      });
    }
    
    const strength = PasswordUtils.checkPasswordStrength(password);
    
    res.json({
      success: true,
      data: { strength },
      message: 'Password strength checked'
    });
  } catch (error) {
    console.error('Password strength check error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to check password strength',
        code: 'INTERNAL_ERROR'
      }
    });
  }
});

export default router;