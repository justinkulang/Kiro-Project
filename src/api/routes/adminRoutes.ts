import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware';
import { AuthService } from '../../services/authService';
import AdminLogService, { AdminAction } from '../../services/adminLogService';
import SystemConfigService from '../../services/systemConfigService';
import { AdminUser } from '../../models/types';

const router = Router();
const authService = new AuthService();
const adminLogService = new AdminLogService();
const systemConfigService = new SystemConfigService();

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: AdminUser;
}

/**
 * GET /api/admin/users
 * Get all admin users with pagination
 */
router.get('/users', authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      page = '1',
      limit = '50',
      search,
      role,
      isActive,
      sortBy,
      sortOrder
    } = req.query;

    const result = await authService.getAdminUsers({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      search: search as string,
      role: role as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    });

    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    console.error('Error getting admin users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin users',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/users/:id
 * Get a specific admin user
 */
router.get('/users/:id', authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = await authService.getAdminUserById(parseInt(id));

    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    res.json({
      success: true,
      data: adminUser
    });
  } catch (error) {
    console.error('Error getting admin user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/users
 * Create a new admin user
 */
router.post('/users', authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminData = req.body;
    const adminUser = await authService.createAdminUser(adminData);

    // Log the action
    if (req.user) {
      await adminLogService.logSystemAction(
        req.user.id!,
        req.user.username,
        AdminAction.ADMIN_USER_CREATED,
        {
          createdUserId: adminUser.id,
          username: adminUser.username,
          role: adminUser.role
        },
        req.ip
      );
    }

    res.status(201).json({
      success: true,
      data: adminUser,
      message: 'Admin user created successfully'
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/admin/users/:id
 * Update an admin user
 */
router.put('/users/:id', authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const adminUser = await authService.updateAdminUser(parseInt(id), updateData);

    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    // Log the action
    if (req.user) {
      await adminLogService.logSystemAction(
        req.user.id!,
        req.user.username,
        AdminAction.ADMIN_USER_UPDATED,
        {
          updatedUserId: adminUser.id,
          username: adminUser.username,
          changes: updateData
        },
        req.ip
      );
    }

    res.json({
      success: true,
      data: adminUser,
      message: 'Admin user updated successfully'
    });
  } catch (error) {
    console.error('Error updating admin user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update admin user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete an admin user
 */
router.delete('/users/:id', authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Prevent self-deletion
    if (req.user?.id === parseInt(id)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const deleted = await authService.deleteAdminUser(parseInt(id));

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    // Log the action
    if (req.user) {
      await adminLogService.logSystemAction(
        req.user.id!,
        req.user.username,
        AdminAction.ADMIN_USER_DELETED,
        { deletedUserId: parseInt(id) },
        req.ip
      );
    }

    res.json({
      success: true,
      message: 'Admin user deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting admin user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete admin user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/users/:id/toggle-status
 * Toggle admin user active status
 */
router.post('/users/:id/toggle-status', authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Prevent self-deactivation
    if (req.user?.id === parseInt(id)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own status'
      });
    }

    const adminUser = await authService.toggleAdminUserStatus(parseInt(id));

    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    // Log the action
    if (req.user) {
      await adminLogService.logSystemAction(
        req.user.id!,
        req.user.username,
        adminUser.isActive ? AdminAction.ADMIN_USER_ACTIVATED : AdminAction.ADMIN_USER_DEACTIVATED,
        {
          targetUserId: adminUser.id,
          username: adminUser.username,
          newStatus: adminUser.isActive
        },
        req.ip
      );
    }

    res.json({
      success: true,
      data: adminUser,
      message: `Admin user ${adminUser.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error toggling admin user status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update admin user status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/users/:id/reset-password
 * Reset admin user password
 */
router.post('/users/:id/reset-password', authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    await authService.resetAdminPassword(parseInt(id), password);

    // Log the action
    if (req.user) {
      await adminLogService.logSystemAction(
        req.user.id!,
        req.user.username,
        AdminAction.PASSWORD_RESET,
        { targetUserId: parseInt(id) },
        req.ip
      );
    }

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/users/:id/force-logout
 * Force logout admin user
 */
router.post('/users/:id/force-logout', authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    await authService.forceLogoutAdminUser(parseInt(id));

    // Log the action
    if (req.user) {
      await adminLogService.logSystemAction(
        req.user.id!,
        req.user.username,
        AdminAction.FORCE_LOGOUT,
        { targetUserId: parseInt(id) },
        req.ip
      );
    }

    res.json({
      success: true,
      message: 'User logged out successfully'
    });
  } catch (error) {
    console.error('Error forcing logout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to logout user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/stats
 * Get admin statistics
 */
router.get('/stats', authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await authService.getAdminStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/permissions
 * Get available permissions
 */
router.get('/permissions', authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const permissions = await authService.getAvailablePermissions();

    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Error getting permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve permissions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/roles
 * Get available roles
 */
router.get('/roles', authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const roles = await authService.getRoles();

    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    console.error('Error getting roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve roles',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/my-permissions
 * Get current user's permissions
 */
router.get('/my-permissions', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const permissions = await authService.getUserPermissions(req.user!.id!);

    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Error getting user permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve permissions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/admin/my-profile
 * Update current user's profile
 */
router.put('/my-profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updateData = req.body;
    const adminUser = await authService.updateMyProfile(req.user!.id!, updateData);

    // Log the action
    await adminLogService.logSystemAction(
      req.user!.id!,
      req.user!.username,
      AdminAction.PROFILE_UPDATED,
      { changes: updateData },
      req.ip
    );

    res.json({
      success: true,
      data: adminUser,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/system-health
 * Get system health status
 */
router.get('/system-health', authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const health = await authService.getSystemHealth();

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Error getting system health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve system health',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;