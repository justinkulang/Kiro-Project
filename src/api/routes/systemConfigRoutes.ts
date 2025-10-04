import { Router, Request, Response } from 'express';
import SystemConfigService from '../../services/systemConfigService';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware';
import AdminLogService, { AdminAction } from '../../services/adminLogService';
import { AdminUser } from '../../models/types';

const router = Router();
const systemConfigService = new SystemConfigService();
const adminLogService = new AdminLogService();

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: AdminUser;
}

/**
 * GET /api/system-config
 * Get all system configuration settings
 */
router.get('/', authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const config = await systemConfigService.getAll();
    
    // Log the action
    if (req.user) {
      await adminLogService.logSystemAction(
        req.user.id!,
        req.user.username,
        'CONFIG_VIEWED' as AdminAction,
        { action: 'view_all_config' },
        req.ip
      );
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error getting system configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve system configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/system-config/settings
 * Get all settings with pagination
 */
router.get('/settings', authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      page = '1',
      limit = '50',
      search
    } = req.query;

    const result = await systemConfigService.getAllSettings({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      search: search as string
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
    console.error('Error getting system settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve system settings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/system-config/:key
 * Get a specific configuration value
 */
router.get('/:key', authenticateToken, requireRole(['super_admin', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { key } = req.params;
    const value = await systemConfigService.get(key);

    if (value === null) {
      return res.status(404).json({
        success: false,
        message: 'Configuration key not found'
      });
    }

    res.json({
      success: true,
      data: {
        key,
        value
      }
    });
  } catch (error) {
    console.error('Error getting configuration value:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve configuration value',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/system-config
 * Update multiple configuration values
 */
router.put('/', authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const config = req.body;
    
    // Validate configuration
    const validation = systemConfigService.validateConfig(config);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid configuration',
        errors: validation.errors
      });
    }

    await systemConfigService.setMultiple(config);
    
    // Log the action
    if (req.user) {
      await adminLogService.logSystemAction(
        req.user.id!,
        req.user.username,
        'CONFIG_UPDATED' as AdminAction,
        { 
          action: 'update_multiple_config',
          keys: Object.keys(config),
          count: Object.keys(config).length
        },
        req.ip
      );
    }

    res.json({
      success: true,
      message: `Updated ${Object.keys(config).length} configuration values`
    });
  } catch (error) {
    console.error('Error updating system configuration:', error);
    
    // Log the error
    if (req.user) {
      await adminLogService.logSystemAction(
        req.user.id!,
        req.user.username,
        'CONFIG_UPDATE_FAILED' as AdminAction,
        { 
          action: 'update_multiple_config_failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        req.ip,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update system configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/system-config/:key
 * Update a specific configuration value
 */
router.put('/:key', authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Value is required'
      });
    }

    // Validate single configuration value
    const validation = systemConfigService.validateConfig({ [key]: value });
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid configuration value',
        errors: validation.errors
      });
    }

    await systemConfigService.set(key, value, description);
    
    // Log the action
    if (req.user) {
      await adminLogService.logSystemAction(
        req.user.id!,
        req.user.username,
        'CONFIG_UPDATED' as AdminAction,
        { 
          action: 'update_single_config',
          key,
          value
        },
        req.ip
      );
    }

    res.json({
      success: true,
      message: `Configuration ${key} updated successfully`
    });
  } catch (error) {
    console.error('Error updating configuration value:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update configuration value',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/system-config/:key
 * Delete a configuration value
 */
router.delete('/:key', authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { key } = req.params;
    const deleted = await systemConfigService.delete(key);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Configuration key not found'
      });
    }
    
    // Log the action
    if (req.user) {
      await adminLogService.logSystemAction(
        req.user.id!,
        req.user.username,
        'CONFIG_DELETED' as AdminAction,
        { 
          action: 'delete_config',
          key
        },
        req.ip
      );
    }

    res.json({
      success: true,
      message: `Configuration ${key} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting configuration value:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete configuration value',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/system-config/export
 * Export system configuration
 */
router.post('/export', authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const configJson = await systemConfigService.exportConfig();
    
    // Log the action
    if (req.user) {
      await adminLogService.logSystemAction(
        req.user.id!,
        req.user.username,
        AdminAction.DATA_EXPORTED,
        { 
          exportType: 'system_config',
          format: 'json'
        },
        req.ip
      );
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="system-config-${new Date().toISOString().split('T')[0]}.json"`);
    res.send(configJson);
  } catch (error) {
    console.error('Error exporting system configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export system configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/system-config/import
 * Import system configuration
 */
router.post('/import', authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { config } = req.body;
    
    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'Configuration data is required'
      });
    }

    await systemConfigService.importConfig(typeof config === 'string' ? config : JSON.stringify(config));
    
    // Log the action
    if (req.user) {
      await adminLogService.logSystemAction(
        req.user.id!,
        req.user.username,
        AdminAction.DATA_IMPORTED,
        { 
          importType: 'system_config',
          format: 'json'
        },
        req.ip
      );
    }

    res.json({
      success: true,
      message: 'System configuration imported successfully'
    });
  } catch (error) {
    console.error('Error importing system configuration:', error);
    
    // Log the error
    if (req.user) {
      await adminLogService.logSystemAction(
        req.user.id!,
        req.user.username,
        'CONFIG_IMPORT_FAILED' as AdminAction,
        { 
          action: 'import_config_failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        req.ip,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to import system configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/system-config/initialize
 * Initialize default configuration
 */
router.post('/initialize', authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    await systemConfigService.initializeDefaults();
    
    // Log the action
    if (req.user) {
      await adminLogService.logSystemAction(
        req.user.id!,
        req.user.username,
        'CONFIG_INITIALIZED' as AdminAction,
        { action: 'initialize_default_config' },
        req.ip
      );
    }

    res.json({
      success: true,
      message: 'Default configuration initialized successfully'
    });
  } catch (error) {
    console.error('Error initializing default configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize default configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/system-config/validate
 * Validate configuration values
 */
router.post('/validate', authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const config = req.body;
    const validation = systemConfigService.validateConfig(config);

    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Error validating configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/system-config/cache
 * Clear configuration cache
 */
router.delete('/cache', authenticateToken, requireRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    systemConfigService.clearCache();
    
    // Log the action
    if (req.user) {
      await adminLogService.logSystemAction(
        req.user.id!,
        req.user.username,
        'CACHE_CLEARED' as AdminAction,
        { action: 'clear_config_cache' },
        req.ip
      );
    }

    res.json({
      success: true,
      message: 'Configuration cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing configuration cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear configuration cache',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;