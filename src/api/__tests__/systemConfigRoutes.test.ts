import request from 'supertest';
import express from 'express';
import { json } from 'express';
import systemConfigRoutes from '../routes/systemConfigRoutes';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware';

// Mock the middleware and services
jest.mock('../../middleware/authMiddleware');
jest.mock('../../services/systemConfigService');
jest.mock('../../services/adminLogService');

const mockAuthenticateToken = authenticateToken as jest.MockedFunction<typeof authenticateToken>;
const mockRequireRole = requireRole as jest.MockedFunction<typeof requireRole>;

// Create test app
const app = express();
app.use(json());
app.use('/api/system-config', systemConfigRoutes);

// Mock user for authenticated requests
const mockUser = {
  id: 1,
  username: 'superadmin',
  role: 'super_admin',
  isActive: true
};

describe('System Config Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication middleware to pass through
    mockAuthenticateToken.mockImplementation((req: any, res: any, next: any) => {
      req.user = mockUser;
      next();
    });
    
    // Mock role middleware to pass through
    mockRequireRole.mockImplementation(() => (req: any, res: any, next: any) => {
      next();
    });
  });

  describe('GET /api/system-config', () => {
    it('should get all system configuration', async () => {
      const mockSystemConfigService = require('../../services/systemConfigService').default;
      const mockAdminLogService = require('../../services/adminLogService').default;
      
      mockSystemConfigService.prototype.getAll = jest.fn().mockResolvedValue({
        system_name: 'MikroTik Hotspot Platform',
        mikrotik_host: '192.168.1.1',
        mikrotik_port: '8728'
      });
      mockAdminLogService.prototype.logSystemAction = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .get('/api/system-config')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.system_name).toBe('MikroTik Hotspot Platform');
      expect(mockAdminLogService.prototype.logSystemAction).toHaveBeenCalled();
    });
  });

  describe('GET /api/system-config/settings', () => {
    it('should get settings with pagination', async () => {
      const mockSystemConfigService = require('../../services/systemConfigService').default;
      mockSystemConfigService.prototype.getAllSettings = jest.fn().mockResolvedValue({
        data: [
          { id: 1, key: 'system_name', value: 'Test System', description: 'System name' },
          { id: 2, key: 'mikrotik_host', value: '192.168.1.1', description: 'MikroTik host' }
        ],
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1
      });

      const response = await request(app)
        .get('/api/system-config/settings')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/system-config/:key', () => {
    it('should get a specific configuration value', async () => {
      const mockSystemConfigService = require('../../services/systemConfigService').default;
      mockSystemConfigService.prototype.get = jest.fn().mockResolvedValue('Test System');

      const response = await request(app)
        .get('/api/system-config/system_name')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.key).toBe('system_name');
      expect(response.body.data.value).toBe('Test System');
    });

    it('should return 404 for non-existent key', async () => {
      const mockSystemConfigService = require('../../services/systemConfigService').default;
      mockSystemConfigService.prototype.get = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/api/system-config/non_existent_key')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Configuration key not found');
    });
  });

  describe('PUT /api/system-config', () => {
    it('should update multiple configuration values', async () => {
      const mockSystemConfigService = require('../../services/systemConfigService').default;
      const mockAdminLogService = require('../../services/adminLogService').default;
      
      mockSystemConfigService.prototype.validateConfig = jest.fn().mockReturnValue({
        valid: true,
        errors: []
      });
      mockSystemConfigService.prototype.setMultiple = jest.fn().mockResolvedValue(undefined);
      mockAdminLogService.prototype.logSystemAction = jest.fn().mockResolvedValue(undefined);

      const configUpdate = {
        system_name: 'Updated System',
        mikrotik_host: '192.168.1.2'
      };

      const response = await request(app)
        .put('/api/system-config')
        .send(configUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Updated 2 configuration values');
      expect(mockSystemConfigService.prototype.setMultiple).toHaveBeenCalledWith(configUpdate);
    });

    it('should validate configuration before updating', async () => {
      const mockSystemConfigService = require('../../services/systemConfigService').default;
      mockSystemConfigService.prototype.validateConfig = jest.fn().mockReturnValue({
        valid: false,
        errors: ['Invalid host address']
      });

      const response = await request(app)
        .put('/api/system-config')
        .send({ mikrotik_host: 'invalid-host' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid configuration');
      expect(response.body.errors).toContain('Invalid host address');
    });
  });

  describe('PUT /api/system-config/:key', () => {
    it('should update a specific configuration value', async () => {
      const mockSystemConfigService = require('../../services/systemConfigService').default;
      const mockAdminLogService = require('../../services/adminLogService').default;
      
      mockSystemConfigService.prototype.validateConfig = jest.fn().mockReturnValue({
        valid: true,
        errors: []
      });
      mockSystemConfigService.prototype.set = jest.fn().mockResolvedValue(undefined);
      mockAdminLogService.prototype.logSystemAction = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .put('/api/system-config/system_name')
        .send({ value: 'New System Name', description: 'Updated system name' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Configuration system_name updated successfully');
    });

    it('should require value parameter', async () => {
      const response = await request(app)
        .put('/api/system-config/system_name')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Value is required');
    });
  });

  describe('DELETE /api/system-config/:key', () => {
    it('should delete a configuration value', async () => {
      const mockSystemConfigService = require('../../services/systemConfigService').default;
      const mockAdminLogService = require('../../services/adminLogService').default;
      
      mockSystemConfigService.prototype.delete = jest.fn().mockResolvedValue(true);
      mockAdminLogService.prototype.logSystemAction = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/system-config/test_key')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Configuration test_key deleted successfully');
    });

    it('should return 404 for non-existent key', async () => {
      const mockSystemConfigService = require('../../services/systemConfigService').default;
      mockSystemConfigService.prototype.delete = jest.fn().mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/system-config/non_existent_key')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Configuration key not found');
    });
  });

  describe('POST /api/system-config/export', () => {
    it('should export system configuration', async () => {
      const mockSystemConfigService = require('../../services/systemConfigService').default;
      const mockAdminLogService = require('../../services/adminLogService').default;
      
      const configJson = JSON.stringify({
        system_name: 'Test System',
        mikrotik_host: '192.168.1.1'
      }, null, 2);
      
      mockSystemConfigService.prototype.exportConfig = jest.fn().mockResolvedValue(configJson);
      mockAdminLogService.prototype.logSystemAction = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/system-config/export')
        .expect(200);

      expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
      expect(response.headers['content-disposition']).toMatch(/attachment; filename="system-config-\d{4}-\d{2}-\d{2}\.json"/);
    });
  });

  describe('POST /api/system-config/import', () => {
    it('should import system configuration', async () => {
      const mockSystemConfigService = require('../../services/systemConfigService').default;
      const mockAdminLogService = require('../../services/adminLogService').default;
      
      mockSystemConfigService.prototype.importConfig = jest.fn().mockResolvedValue(undefined);
      mockAdminLogService.prototype.logSystemAction = jest.fn().mockResolvedValue(undefined);

      const configData = {
        system_name: 'Imported System',
        mikrotik_host: '192.168.1.3'
      };

      const response = await request(app)
        .post('/api/system-config/import')
        .send({ config: configData })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('System configuration imported successfully');
    });

    it('should require config data', async () => {
      const response = await request(app)
        .post('/api/system-config/import')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Configuration data is required');
    });
  });

  describe('POST /api/system-config/initialize', () => {
    it('should initialize default configuration', async () => {
      const mockSystemConfigService = require('../../services/systemConfigService').default;
      const mockAdminLogService = require('../../services/adminLogService').default;
      
      mockSystemConfigService.prototype.initializeDefaults = jest.fn().mockResolvedValue(undefined);
      mockAdminLogService.prototype.logSystemAction = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/system-config/initialize')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Default configuration initialized successfully');
    });
  });

  describe('POST /api/system-config/validate', () => {
    it('should validate configuration values', async () => {
      const mockSystemConfigService = require('../../services/systemConfigService').default;
      mockSystemConfigService.prototype.validateConfig = jest.fn().mockReturnValue({
        valid: true,
        errors: []
      });

      const response = await request(app)
        .post('/api/system-config/validate')
        .send({ system_name: 'Valid System' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
    });
  });

  describe('DELETE /api/system-config/cache', () => {
    it('should clear configuration cache', async () => {
      const mockSystemConfigService = require('../../services/systemConfigService').default;
      const mockAdminLogService = require('../../services/adminLogService').default;
      
      mockSystemConfigService.prototype.clearCache = jest.fn().mockReturnValue(undefined);
      mockAdminLogService.prototype.logSystemAction = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/system-config/cache')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Configuration cache cleared successfully');
    });
  });

  describe('Error handling', () => {
    it('should handle service errors', async () => {
      const mockSystemConfigService = require('../../services/systemConfigService').default;
      mockSystemConfigService.prototype.getAll = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/system-config')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to retrieve system configuration');
    });
  });
});