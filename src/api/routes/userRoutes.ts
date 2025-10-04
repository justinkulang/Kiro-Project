import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import UserManagementService from '../../services/userManagementService';
import { authenticate, requirePermission, logAdminAction } from '../../middleware/authMiddleware';

const router = Router();
const userService = new UserManagementService();

/**
 * Validation middleware for user creation
 */
const validateCreateUser = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, hyphens, and underscores'),
  
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('billingPlanId')
    .isInt({ min: 1 })
    .withMessage('Valid billing plan ID is required'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email format required'),
  
  body('phone')
    .optional()
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('Invalid phone number format'),
  
  body('fullName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Full name must not exceed 100 characters'),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must not exceed 500 characters'),
  
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expiration date must be in ISO 8601 format'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

/**
 * Validation middleware for user updates
 */
const validateUpdateUser = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required'),
  
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('billingPlanId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid billing plan ID is required'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email format required'),
  
  body('phone')
    .optional()
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('Invalid phone number format'),
  
  body('fullName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Full name must not exceed 100 characters'),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must not exceed 500 characters'),
  
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expiration date must be in ISO 8601 format'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

/**
 * Validation middleware for batch creation
 */
const validateBatchCreate = [
  body('prefix')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Prefix must be between 1 and 20 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Prefix can only contain letters, numbers, hyphens, and underscores'),
  
  body('count')
    .isInt({ min: 1, max: 100 })
    .withMessage('Count must be between 1 and 100'),
  
  body('billingPlanId')
    .isInt({ min: 1 })
    .withMessage('Valid billing plan ID is required'),
  
  body('passwordLength')
    .optional()
    .isInt({ min: 6, max: 20 })
    .withMessage('Password length must be between 6 and 20'),
  
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expiration date must be in ISO 8601 format')
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
 * GET /api/users
 * Get paginated list of users with filtering
 */
router.get('/',
  authenticate,
  requirePermission('view_users'),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('search').optional().trim().isLength({ max: 100 }).withMessage('Search term too long'),
    query('billingPlanId').optional().isInt({ min: 1 }).withMessage('Invalid billing plan ID'),
    query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    query('dateFrom').optional().isISO8601().withMessage('dateFrom must be in ISO 8601 format'),
    query('dateTo').optional().isISO8601().withMessage('dateTo must be in ISO 8601 format')
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const options = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
        search: req.query.search as string,
        billingPlanId: req.query.billingPlanId ? parseInt(req.query.billingPlanId as string) : undefined,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string
      };

      const result = await userService.getUsers(options);

      res.json({
        success: true,
        data: result,
        message: 'Users retrieved successfully'
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        error: {
          message: 'Failed to retrieve users',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
);

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get('/:id',
  authenticate,
  requirePermission('view_users'),
  [param('id').isInt({ min: 1 }).withMessage('Valid user ID is required')],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await userService.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      res.json({
        success: true,
        data: { user },
        message: 'User retrieved successfully'
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        error: {
          message: 'Failed to retrieve user',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
);

/**
 * POST /api/users
 * Create new user
 */
router.post('/',
  authenticate,
  requirePermission('create_user'),
  validateCreateUser,
  handleValidationErrors,
  logAdminAction('create_user'),
  async (req: Request, res: Response) => {
    try {
      const userData = {
        username: req.body.username,
        password: req.body.password,
        billingPlanId: req.body.billingPlanId,
        email: req.body.email,
        phone: req.body.phone,
        fullName: req.body.fullName,
        address: req.body.address,
        expiresAt: req.body.expiresAt,
        isActive: req.body.isActive
      };

      const user = await userService.createUser(userData);

      res.status(201).json({
        success: true,
        data: { user },
        message: 'User created successfully'
      });
    } catch (error) {
      console.error('Create user error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_ERROR';
      let errorMessage = 'Failed to create user';

      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          statusCode = 409;
          errorCode = 'USERNAME_EXISTS';
          errorMessage = error.message;
        } else if (error.message.includes('Validation failed')) {
          statusCode = 400;
          errorCode = 'VALIDATION_ERROR';
          errorMessage = error.message;
        } else if (error.message.includes('billing plan')) {
          statusCode = 400;
          errorCode = 'INVALID_BILLING_PLAN';
          errorMessage = error.message;
        }
      }

      res.status(statusCode).json({
        error: {
          message: errorMessage,
          code: errorCode
        }
      });
    }
  }
);

/**
 * PUT /api/users/:id
 * Update user
 */
router.put('/:id',
  authenticate,
  requirePermission('update_user'),
  validateUpdateUser,
  handleValidationErrors,
  logAdminAction('update_user', (req) => ({ type: 'user', id: parseInt(req.params.id) })),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const updateData = {
        password: req.body.password,
        billingPlanId: req.body.billingPlanId,
        email: req.body.email,
        phone: req.body.phone,
        fullName: req.body.fullName,
        address: req.body.address,
        expiresAt: req.body.expiresAt,
        isActive: req.body.isActive
      };

      const user = await userService.updateUser(userId, updateData);

      res.json({
        success: true,
        data: { user },
        message: 'User updated successfully'
      });
    } catch (error) {
      console.error('Update user error:', error);
      
      let statusCode = 500;
      let errorCode = 'INTERNAL_ERROR';
      let errorMessage = 'Failed to update user';

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          statusCode = 404;
          errorCode = 'USER_NOT_FOUND';
          errorMessage = error.message;
        } else if (error.message.includes('billing plan')) {
          statusCode = 400;
          errorCode = 'INVALID_BILLING_PLAN';
          errorMessage = error.message;
        }
      }

      res.status(statusCode).json({
        error: {
          message: errorMessage,
          code: errorCode
        }
      });
    }
  }
);

/**
 * DELETE /api/users/:id
 * Delete user
 */
router.delete('/:id',
  authenticate,
  requirePermission('delete_user'),
  [param('id').isInt({ min: 1 }).withMessage('Valid user ID is required')],
  handleValidationErrors,
  logAdminAction('delete_user', (req) => ({ type: 'user', id: parseInt(req.params.id) })),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const deleted = await userService.deleteUser(userId);

      if (!deleted) {
        return res.status(404).json({
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        error: {
          message: 'Failed to delete user',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
);

/**
 * POST /api/users/batch
 * Create multiple users in batch
 */
router.post('/batch',
  authenticate,
  requirePermission('create_user'),
  validateBatchCreate,
  handleValidationErrors,
  logAdminAction('batch_create_users'),
  async (req: Request, res: Response) => {
    try {
      const batchRequest = {
        prefix: req.body.prefix,
        count: req.body.count,
        billingPlanId: req.body.billingPlanId,
        passwordLength: req.body.passwordLength,
        expiresAt: req.body.expiresAt
      };

      const result = await userService.createUsersBatch(batchRequest);

      res.status(201).json({
        success: true,
        data: result,
        message: `Batch creation completed: ${result.summary.successful} successful, ${result.summary.failed} failed`
      });
    } catch (error) {
      console.error('Batch create users error:', error);
      res.status(500).json({
        error: {
          message: 'Failed to create users in batch',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
);

/**
 * PATCH /api/users/:id/status
 * Enable/disable user
 */
router.patch('/:id/status',
  authenticate,
  requirePermission('update_user'),
  [
    param('id').isInt({ min: 1 }).withMessage('Valid user ID is required'),
    body('isActive').isBoolean().withMessage('isActive must be a boolean')
  ],
  handleValidationErrors,
  logAdminAction('update_user_status', (req) => ({ type: 'user', id: parseInt(req.params.id) })),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const { isActive } = req.body;

      const user = await userService.setUserStatus(userId, isActive);

      res.json({
        success: true,
        data: { user },
        message: `User ${isActive ? 'enabled' : 'disabled'} successfully`
      });
    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({
        error: {
          message: 'Failed to update user status',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
);

/**
 * POST /api/users/:id/reset-password
 * Reset user password
 */
router.post('/:id/reset-password',
  authenticate,
  requirePermission('update_user'),
  [
    param('id').isInt({ min: 1 }).withMessage('Valid user ID is required'),
    body('newPassword').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
  ],
  handleValidationErrors,
  logAdminAction('reset_user_password', (req) => ({ type: 'user', id: parseInt(req.params.id) })),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const { newPassword } = req.body;

      const result = await userService.resetUserPassword(userId, newPassword);

      res.json({
        success: true,
        data: result,
        message: 'Password reset successfully'
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        error: {
          message: 'Failed to reset password',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
);

/**
 * GET /api/users/expired
 * Get expired users
 */
router.get('/expired',
  authenticate,
  requirePermission('view_users'),
  async (req: Request, res: Response) => {
    try {
      const expiredUsers = await userService.getExpiredUsers();

      res.json({
        success: true,
        data: { users: expiredUsers },
        message: 'Expired users retrieved successfully'
      });
    } catch (error) {
      console.error('Get expired users error:', error);
      res.status(500).json({
        error: {
          message: 'Failed to retrieve expired users',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
);

/**
 * POST /api/users/:id/extend
 * Extend user expiration
 */
router.post('/:id/extend',
  authenticate,
  requirePermission('update_user'),
  [
    param('id').isInt({ min: 1 }).withMessage('Valid user ID is required'),
    body('additionalDays').isInt({ min: 1, max: 365 }).withMessage('Additional days must be between 1 and 365')
  ],
  handleValidationErrors,
  logAdminAction('extend_user_expiration', (req) => ({ type: 'user', id: parseInt(req.params.id) })),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const { additionalDays } = req.body;

      const user = await userService.extendUserExpiration(userId, additionalDays);

      res.json({
        success: true,
        data: { user },
        message: `User expiration extended by ${additionalDays} days`
      });
    } catch (error) {
      console.error('Extend user expiration error:', error);
      res.status(500).json({
        error: {
          message: 'Failed to extend user expiration',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
);

/**
 * POST /api/users/:id/sync
 * Sync user with MikroTik
 */
router.post('/:id/sync',
  authenticate,
  requirePermission('update_user'),
  [param('id').isInt({ min: 1 }).withMessage('Valid user ID is required')],
  handleValidationErrors,
  logAdminAction('sync_user_mikrotik', (req) => ({ type: 'user', id: parseInt(req.params.id) })),
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const result = await userService.syncUserWithMikroTik(userId);

      if (result.success) {
        res.json({
          success: true,
          data: result,
          message: result.message
        });
      } else {
        res.status(400).json({
          error: {
            message: result.message,
            code: 'SYNC_FAILED'
          }
        });
      }
    } catch (error) {
      console.error('Sync user error:', error);
      res.status(500).json({
        error: {
          message: 'Failed to sync user with MikroTik',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
);

export default router;