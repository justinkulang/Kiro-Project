import request from 'supertest';
import express from 'express';
import adminLogRoutes from '../routes/adminLogRoutes';
import AdminLogService, { AdminAction } from '../../services/adminLogService';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware';

// Mock the dependencies
jest.mock('../../services/adminLogService');
jest.mock('../../middleware/authMiddleware');

const mockAdminLogService = {
  getAdminLogs: jest.fn(),
  getAdminLogStats: jest.fn(),
  getSecurityLogs: jest.fn(),
  getActionLogs: jest.fn(),
  getAdminUserLogs: jest.fn(),
  getAuditTrail: jest.fn(),
  exportLogs: jest.fn(),
  cleanupOldLogs: jest.fn(),
  getAdminLogById: jest.fn(),
  logSystemAction: jest.fn(),
} as jest.Mocked<AdminLogService>;

(AdminLogService as jest.Mock).mockImplementation(() => mockAdminLogService);

// Mock middleware
(authenticateToken as jest.Mock).mockImplementation((req: any, res: any, next: any) => {
  req.user = { id: 1, username: 'admin', role: 'super_admin' };
  next();
});

(requireRole as jest.Mock).mockImplementation((roles: string[]) => (req: any, res: any, next: any) => {
  next();
});

const app = express();
app.use(express.json());
app.use('/api/admin-logs', adminLogRoutes);

describe('Admin Log Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin-logs', () => {
    it('should get admin logs with default pagination', async () => {
      const mockResult = {
        data: [
          {
            id: 1,
            admin_user_id: 1,
            admin_username: 'admin',
            action: AdminAction.LOGIN,
            target_type: 'admin',
            success: true,
            timestamp: '2023-01-01T00:00:00.000Z'
          }
        ],
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1
      };

      mockAdminLogService.getAdminLogs.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/admin-logs')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockResult.data,
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          totalPages: 1
        }
      });

      expect(mockAdminLogService.getAdminLogs).toHaveBeenCalledWith({}, 1, 50);
    });

    it('should get admin logs with filters', async () => {
      const mockResult = {
        data: [],
        page: 1,
        limit: 25,
        total: 0,
        totalPages: 0
      };

      mockAdminLogService.getAdminLogs.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/admin-logs')
        .query({
          page: '1',
          limit: '25',
          admin_user_id: '1',
          action: AdminAction.LOGIN,
          target_type: 'admin',
          start_date: '2023-01-01',
          end_date: '2023-01-31',
          search: 'test'
        })
        .expect(200);

      expect(mockAdminLogService.getAdminLogs).toHaveBeenCalledWith(
        {
          adminUserId: 1,
          action: AdminAction.LOGIN,
          targetType: 'admin',
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-01-31'),
          search: 'test'
        },
        1,
        25
      );
    });

    it('should handle errors when getting admin logs', async () => {
      mockAdminLogService.getAdminLogs.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/admin-logs')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Failed to retrieve admin logs',
        error: 'Database error'
      });
    });
  });

  describe('GET /api/admin-logs/stats', () => {
    it('should get admin log statistics', async () => {
      const mockStats = {
        totalLogs: 100,
        uniqueAdmins: 5,
        topActions: [
          { action: AdminAction.LOGIN, count: 50 },
          { action: AdminAction.USER_CREATED, count: 25 }
        ],
        recentActivity: [],
        loginAttempts: {
          successful: 45,
          failed: 5,
          lastHour: 3
        }
      };

      mockAdminLogService.getAdminLogStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/admin-logs/stats')
        .query({ days: '7' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockStats
      });

      expect(mockAdminLogService.getAdminLogStats).toHaveBeenCalledWith(7);
    });

    it('should use default days parameter', async () => {
      const mockStats = {
        totalLogs: 100,
        uniqueAdmins: 5,
        topActions: [],
        recentActivity: [],
        loginAttempts: { successful: 0, failed: 0, lastHour: 0 }
      };

      mockAdminLogService.getAdminLogStats.mockResolvedValue(mockStats);

      await request(app)
        .get('/api/admin-logs/stats')
        .expect(200);

      expect(mockAdminLogService.getAdminLogStats).toHaveBeenCalledWith(30);
    });
  });

  describe('GET /api/admin-logs/security', () => {
    it('should get security logs', async () => {
      const mockResult = {
        data: [
          {
            id: 1,
            admin_user_id: 1,
            admin_username: 'admin',
            action: AdminAction.LOGIN,
            target_type: 'admin',
            success: true,
            timestamp: '2023-01-01T00:00:00.000Z'
          }
        ],
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1
      };

      mockAdminLogService.getSecurityLogs.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/admin-logs/security')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockResult.data,
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          totalPages: 1
        }
      });

      expect(mockAdminLogService.getSecurityLogs).toHaveBeenCalledWith(1, 50);
    });
  });

  describe('GET /api/admin-logs/actions/:action', () => {
    it('should get logs for specific action', async () => {
      const mockResult = {
        data: [
          {
            id: 1,
            admin_user_id: 1,
            admin_username: 'admin',
            action: AdminAction.LOGIN,
            target_type: 'admin',
            success: true,
            timestamp: '2023-01-01T00:00:00.000Z'
          }
        ],
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1
      };

      mockAdminLogService.getActionLogs.mockResolvedValue(mockResult);

      const response = await request(app)
        .get(`/api/admin-logs/actions/${AdminAction.LOGIN}`)
        .expect(200);

      expect(mockAdminLogService.getActionLogs).toHaveBeenCalledWith(AdminAction.LOGIN, 1, 50);
    });
  });

  describe('GET /api/admin-logs/admin/:adminId', () => {
    it('should get logs for specific admin user', async () => {
      const mockResult = {
        data: [],
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
      };

      mockAdminLogService.getAdminUserLogs.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/admin-logs/admin/1')
        .expect(200);

      expect(mockAdminLogService.getAdminUserLogs).toHaveBeenCalledWith(1, 1, 50);
    });
  });

  describe('GET /api/admin-logs/audit/:targetType/:targetId', () => {
    it('should get audit trail for target', async () => {
      const mockResult = {
        data: [],
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
      };

      mockAdminLogService.getAuditTrail.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/admin-logs/audit/user/123')
        .expect(200);

      expect(mockAdminLogService.getAuditTrail).toHaveBeenCalledWith('user', '123', 1, 50);
    });
  });

  describe('GET /api/admin-logs/export', () => {
    it('should export logs as JSON', async () => {
      const mockLogs = [
        {
          id: 1,
          admin_user_id: 1,
          admin_username: 'admin',
          action: AdminAction.LOGIN,
          target_type: 'admin',
          success: true,
          timestamp: '2023-01-01T00:00:00.000Z'
        }
      ];

      mockAdminLogService.exportLogs.mockResolvedValue(mockLogs);
      mockAdminLogService.logSystemAction.mockResolvedValue({} as any);

      const response = await request(app)
        .get('/api/admin-logs/export')
        .query({ format: 'json' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockLogs);
      expect(response.body.recordCount).toBe(1);

      expect(mockAdminLogService.logSystemAction).toHaveBeenCalledWith(
        1,
        'admin',
        AdminAction.DATA_EXPORTED,
        expect.objectContaining({
          exportType: 'admin_logs',
          format: 'json',
          recordCount: 1
        }),
        expect.any(String)
      );
    });

    it('should export logs as CSV', async () => {
      const mockLogs = [
        {
          id: 1,
          admin_user_id: 1,
          admin_username: 'admin',
          action: AdminAction.LOGIN,
          target_type: 'admin',
          target_id: '1',
          target_name: 'admin',
          details: '{}',
          ip_address: '127.0.0.1',
          success: true,
          timestamp: '2023-01-01T00:00:00.000Z'
        }
      ];

      mockAdminLogService.exportLogs.mockResolvedValue(mockLogs);
      mockAdminLogService.logSystemAction.mockResolvedValue({} as any);

      const response = await request(app)
        .get('/api/admin-logs/export')
        .query({ format: 'csv' })
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toMatch(/attachment; filename="admin_logs_\d{4}-\d{2}-\d{2}\.csv"/);
      expect(response.text).toContain('ID,Admin User,Action,Target Type');
      expect(response.text).toContain('1,"admin","LOGIN","admin"');
    });
  });

  describe('POST /api/admin-logs/cleanup', () => {
    it('should cleanup old logs', async () => {
      mockAdminLogService.cleanupOldLogs.mockResolvedValue(25);
      mockAdminLogService.logSystemAction.mockResolvedValue({} as any);

      const response = await request(app)
        .post('/api/admin-logs/cleanup')
        .send({ daysToKeep: 60 })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Successfully cleaned up 25 old log entries',
        deletedCount: 25
      });

      expect(mockAdminLogService.cleanupOldLogs).toHaveBeenCalledWith(60);
      expect(mockAdminLogService.logSystemAction).toHaveBeenCalledWith(
        1,
        'admin',
        'LOG_CLEANUP',
        { daysToKeep: 60, deletedCount: 25 },
        expect.any(String)
      );
    });

    it('should use default daysToKeep', async () => {
      mockAdminLogService.cleanupOldLogs.mockResolvedValue(10);
      mockAdminLogService.logSystemAction.mockResolvedValue({} as any);

      await request(app)
        .post('/api/admin-logs/cleanup')
        .send({})
        .expect(200);

      expect(mockAdminLogService.cleanupOldLogs).toHaveBeenCalledWith(90);
    });
  });

  describe('GET /api/admin-logs/:id', () => {
    it('should get admin log by ID', async () => {
      const mockLog = {
        id: 1,
        admin_user_id: 1,
        admin_username: 'admin',
        action: AdminAction.LOGIN,
        target_type: 'admin',
        success: true,
        timestamp: '2023-01-01T00:00:00.000Z'
      };

      mockAdminLogService.getAdminLogById.mockResolvedValue(mockLog);

      const response = await request(app)
        .get('/api/admin-logs/1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockLog
      });

      expect(mockAdminLogService.getAdminLogById).toHaveBeenCalledWith(1);
    });

    it('should return 404 if log not found', async () => {
      mockAdminLogService.getAdminLogById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/admin-logs/999')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Admin log not found'
      });
    });

    it('should handle errors when getting log by ID', async () => {
      mockAdminLogService.getAdminLogById.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/admin-logs/1')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Failed to retrieve admin log',
        error: 'Database error'
      });
    });
  });
});