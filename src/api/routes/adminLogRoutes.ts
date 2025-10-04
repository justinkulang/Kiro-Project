import { Router, Request, Response } from 'express';
import AdminLogService, { AdminAction, AdminLogFilters } from '../../services/adminLogService';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware';
import { AdminUser } from '../../models/types';

const router = Router();
const adminLogService = new AdminLogService();

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: AdminUser;
}

/**
 * GET /api/admin-logs
 * Get admin logs with filtering and pagination
 */
router.get('/', authenticateToken, requireRole(['super_admin', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      page = '1',
      limit = '50',
      admin_user_id,
      action,
      target_type,
      start_date,
      end_date,
      search
    } = req.query;

    const filters: AdminLogFilters = {};

    if (admin_user_id) {
      filters.adminUserId = parseInt(admin_user_id as string);
    }

    if (action) {
      filters.action = action as string;
    }

    if (target_type) {
      filters.targetType = target_type as string;
    }

    if (start_date) {
      filters.startDate = new Date(start_date as string);
    }

    if (end_date) {
      filters.endDate = new Date(end_date as string);
    }

    if (search) {
      filters.search = search as string;
    }

    const result = await adminLogService.getAdminLogs(
      filters,
      parseInt(page as string),
      parseInt(limit as string)
    );

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
    console.error('Error getting admin logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin logs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin-logs/stats
 * Get admin log statistics
 */
router.get('/stats', authenticateToken, requireRole(['super_admin', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { days = '30' } = req.query;
    
    const stats = await adminLogService.getAdminLogStats(parseInt(days as string));

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting admin log stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin log statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin-logs/security
 * Get security-related logs
 */
router.get('/security', authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = '1', limit = '50' } = req.query;

    const result = await adminLogService.getSecurityLogs(
      parseInt(page as string),
      parseInt(limit as string)
    );

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
    console.error('Error getting security logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve security logs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin-logs/actions
 * Get logs for a specific action
 */
router.get('/actions/:action', authenticateToken, requireRole(['super_admin', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { action } = req.params;
    const { page = '1', limit = '50' } = req.query;

    const result = await adminLogService.getActionLogs(
      action,
      parseInt(page as string),
      parseInt(limit as string)
    );

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
    console.error('Error getting action logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve action logs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin-logs/admin/:adminId
 * Get logs for a specific admin user
 */
router.get('/admin/:adminId', authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { adminId } = req.params;
    const { page = '1', limit = '50' } = req.query;

    const result = await adminLogService.getAdminUserLogs(
      parseInt(adminId),
      parseInt(page as string),
      parseInt(limit as string)
    );

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
    console.error('Error getting admin user logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin user logs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin-logs/audit/:targetType/:targetId
 * Get audit trail for a specific target
 */
router.get('/audit/:targetType/:targetId', authenticateToken, requireRole(['super_admin', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetType, targetId } = req.params;
    const { page = '1', limit = '50' } = req.query;

    const result = await adminLogService.getAuditTrail(
      targetType,
      targetId,
      parseInt(page as string),
      parseInt(limit as string)
    );

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
    console.error('Error getting audit trail:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit trail',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin-logs/export
 * Export admin logs
 */
router.get('/export', authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      admin_user_id,
      action,
      target_type,
      start_date,
      end_date,
      search,
      format = 'json'
    } = req.query;

    const filters: AdminLogFilters = {};

    if (admin_user_id) {
      filters.adminUserId = parseInt(admin_user_id as string);
    }

    if (action) {
      filters.action = action as string;
    }

    if (target_type) {
      filters.targetType = target_type as string;
    }

    if (start_date) {
      filters.startDate = new Date(start_date as string);
    }

    if (end_date) {
      filters.endDate = new Date(end_date as string);
    }

    if (search) {
      filters.search = search as string;
    }

    const logs = await adminLogService.exportLogs(filters);

    // Log the export action
    if (req.user) {
      await adminLogService.logSystemAction(
        req.user.id!,
        req.user.username,
        AdminAction.DATA_EXPORTED,
        { 
          exportType: 'admin_logs',
          format,
          recordCount: logs.length,
          filters 
        },
        req.ip
      );
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeader = 'ID,Admin User,Action,Target Type,Target ID,Target Name,Details,IP Address,Success,Timestamp\n';
      const csvRows = logs.map(log => 
        `${log.id},"${log.admin_username}","${log.action}","${log.target_type || ''}","${log.target_id || ''}","${log.target_name || ''}","${log.details}","${log.ip_address}",${log.success},"${log.timestamp}"`
      ).join('\n');
      
      const csv = csvHeader + csvRows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="admin_logs_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="admin_logs_${new Date().toISOString().split('T')[0]}.json"`);
      res.json({
        success: true,
        exportDate: new Date().toISOString(),
        recordCount: logs.length,
        filters,
        data: logs
      });
    }
  } catch (error) {
    console.error('Error exporting admin logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export admin logs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin-logs/cleanup
 * Cleanup old admin logs
 */
router.post('/cleanup', authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { daysToKeep = 90 } = req.body;

    const deletedCount = await adminLogService.cleanupOldLogs(daysToKeep);

    // Log the cleanup action
    if (req.user) {
      await adminLogService.logSystemAction(
        req.user.id!,
        req.user.username,
        'LOG_CLEANUP' as AdminAction,
        { 
          daysToKeep,
          deletedCount 
        },
        req.ip
      );
    }

    res.json({
      success: true,
      message: `Successfully cleaned up ${deletedCount} old log entries`,
      deletedCount
    });
  } catch (error) {
    console.error('Error cleaning up admin logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup admin logs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin-logs/:id
 * Get a specific admin log by ID
 */
router.get('/:id', authenticateToken, requireRole(['super_admin', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const log = await adminLogService.getAdminLogById(parseInt(id));

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Admin log not found'
      });
    }

    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('Error getting admin log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin log',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;