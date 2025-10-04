import request from 'supertest';
import express from 'express';
import { json } from 'express';
import adminRoutes from '../routes/adminRoutes';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware';

// Mock the middleware and services
jest.mock('../../middleware/authMiddleware');
jest.mock('../../services/authService');
jest.mock('../../services/adminLogService');
jest.mock('../../services/systemConfigService');

const mockAuthenticateToken = authenticateToken as jest.MockedFunction<typeof authenticateToken>;
const mockRequireRole = requireRole as jest.MockedFunction<typeof requireRole>;

// Create test app
const app = express();
app.use(json());
app.use('/api/admin', adminRoutes);

// Mock user for authenticated requests
const mockUser = {
  id: 1,
  username: 'superadmin',
  role: 'super_admin',
  isActive: true
};

describe('Admin Routes', () => {
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

  describe('GET /api/admin/users', () => {
    it('should get admin users with pagination', async () => {
      const mockAuthService = require('../../services/authService').AuthService;
      mockAuthService.prototype.getAdminUsers = jest.fn().mockResolvedValue({
        data: [
          { id: 1, username: 'admin1', role: 'admin', isActive: true },
          { id: 2, username: 'admin2', role: 'operator', isActive: true }
        ],
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1
      });

      const response = await request(app)
        .get('/api/admin/users')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
    });

    it('should handle query parameters', async () => {
      const mockAuthService = require('../../services/authService').AuthService;
      mockAuthService.prototype.getAdminUsers = jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      });

      await request(app)
        .get('/api/admin/users?page=1&limit=10&search=admin&role=admin&isActive=true')
        .expect(200);

      expect(mockAuthService.prototype.getAdminUsers).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: 'admin',
        role: 'admin',
        isActive: true,
        sortBy: undefined,
        sortOrder: undefined
      });
    });
  });

  describe('GET /api/admin/users/:id', () => {
    it('should get a specific admin user', async () => {
      const mockAuthService = require('../../services/authService').AuthService;
      mockAuthService.prototype.getAdminUserById = jest.fn().mockResolvedValue({
        id: 1,
        username: 'admin1',
        role: 'admin',
        isActive: true
      });

      const response = await request(app)
        .get('/api/admin/users/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
    });

    it('should return 404 for non-existent admin user', async () => {
      const mockAuthService = require('../../services/authService').AuthService;
      mockAuthService.prototype.getAdminUserById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/api/admin/users/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Admin user not found');
    });
  });

  describe('POST /api/admin/users', () => {
    it('should create a new admin user', async () => {
      const mockAuthService = require('../../services/authService').AuthService;
      const mockAdminLogService = require('../../services/adminLogService').default;
      
      const newAdminUser = {
        id: 2,
        username: 'newadmin',
        role: 'admin',
        isActive: true
      };

      mockAuthService.prototype.createAdminUser = jest.fn().mockResolvedValue(newAdminUser);
      mockAdminLogService.prototype.logSystemAction = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/admin/users')
        .send({
          username: 'newadmin',
          password: 'password123',
          role: 'admin'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe('newadmin');
      expect(mockAdminLogService.prototype.logSystemAction).toHaveBeenCalled();
    });
  });

  describe('PUT /api/admin/users/:id', () => {
    it('should update an admin user', async () => {
      const mockAuthService = require('../../services/authService').AuthService;
      const mockAdminLogService = require('../../services/adminLogService').default;
      
      const updatedAdminUser = {
        id: 1,
        username: 'updatedadmin',
        role: 'admin',
        isActive: true
      };

      mockAuthService.prototype.updateAdminUser = jest.fn().mockResolvedValue(updatedAdminUser);
      mockAdminLogService.prototype.logSystemAction = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .put('/api/admin/users/1')
        .send({
          username: 'updatedadmin'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe('updatedadmin');
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('should delete an admin user', async () => {
      const mockAuthService = require('../../services/authService').AuthService;
      const mockAdminLogService = require('../../services/adminLogService').default;
      
      mockAuthService.prototype.deleteAdminUser = jest.fn().mockResolvedValue(true);
      mockAdminLogService.prototype.logSystemAction = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/admin/users/2') // Different ID to avoid self-deletion
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Admin user deleted successfully');
    });

    it('should prevent self-deletion', async () => {
      const response = await request(app)
        .delete('/api/admin/users/1') // Same ID as mockUser
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot delete your own account');
    });
  });

  describe('POST /api/admin/users/:id/toggle-status', () => {
    it('should toggle admin user status', async () => {
      const mockAuthService = require('../../services/authService').AuthService;
      const mockAdminLogService = require('../../services/adminLogService').default;
      
      const toggledUser = {
        id: 2,
        username: 'admin2',
        role: 'admin',
        isActive: false
      };

      mockAuthService.prototype.toggleAdminUserStatus = jest.fn().mockResolvedValue(toggledUser);
      mockAdminLogService.prototype.logSystemAction = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/admin/users/2/toggle-status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);
    });

    it('should prevent self-status change', async () => {
      const response = await request(app)
        .post('/api/admin/users/1/toggle-status') // Same ID as mockUser
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot change your own status');
    });
  });

  describe('POST /api/admin/users/:id/reset-password', () => {
    it('should reset admin user password', async () => {
      const mockAuthService = require('../../services/authService').AuthService;
      const mockAdminLogService = require('../../services/adminLogService').default;
      
      mockAuthService.prototype.resetAdminPassword = jest.fn().mockResolvedValue(undefined);
      mockAdminLogService.prototype.logSystemAction = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/admin/users/2/reset-password')
        .send({ password: 'newpassword123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password reset successfully');
    });

    it('should require password', async () => {
      const response = await request(app)
        .post('/api/admin/users/2/reset-password')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Password is required');
    });
  });

  describe('GET /api/admin/stats', () => {
    it('should get admin statistics', async () => {
      const mockAuthService = require('../../services/authService').AuthService;
      mockAuthService.prototype.getAdminStats = jest.fn().mockResolvedValue({
        totalAdmins: 5,
        activeAdmins: 4,
        superAdmins: 1,
        admins: 2,
        operators: 2
      });

      const response = await request(app)
        .get('/api/admin/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalAdmins).toBe(5);
    });
  });

  describe('GET /api/admin/permissions', () => {
    it('should get available permissions', async () => {
      const mockAuthService = require('../../services/authService').AuthService;
      mockAuthService.prototype.getAvailablePermissions = jest.fn().mockResolvedValue([
        { key: 'user_read', name: 'Read Users', description: 'View user information' },
        { key: 'user_write', name: 'Write Users', description: 'Create and modify users' }
      ]);

      const response = await request(app)
        .get('/api/admin/permissions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('GET /api/admin/roles', () => {
    it('should get available roles', async () => {
      const mockAuthService = require('../../services/authService').AuthService;
      mockAuthService.prototype.getRoles = jest.fn().mockResolvedValue([
        { key: 'super_admin', name: 'Super Admin', description: 'Full system access' },
        { key: 'admin', name: 'Admin', description: 'Administrative access' }
      ]);

      const response = await request(app)
        .get('/api/admin/roles')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('Error handling', () => {
    it('should handle service errors', async () => {
      const mockAuthService = require('../../services/authService').AuthService;
      mockAuthService.prototype.getAdminUsers = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/admin/users')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to retrieve admin users');
    });
  });
});