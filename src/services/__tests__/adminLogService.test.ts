import AdminLogService, { AdminAction } from '../adminLogService';
import { AdminLogRepository } from '../../models/repositories/adminLogRepository';
import { getDatabase } from '../../models/database';

// Mock the database and repository
jest.mock('../../models/database');
jest.mock('../../models/repositories/adminLogRepository');

const mockDb = {} as any;
const mockAdminLogRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findByAdminUser: jest.fn(),
  findByAction: jest.fn(),
  findByTargetType: jest.fn(),
  findByDateRange: jest.fn(),
  getActionStatistics: jest.fn(),
  getAdminActivitySummary: jest.fn(),
  deleteOldLogs: jest.fn(),
} as jest.Mocked<AdminLogRepository>;

(getDatabase as jest.Mock).mockReturnValue(mockDb);
(AdminLogRepository as jest.Mock).mockImplementation(() => mockAdminLogRepository);

describe('AdminLogService', () => {
  let adminLogService: AdminLogService;

  beforeEach(() => {
    jest.clearAllMocks();
    adminLogService = new AdminLogService();
  });

  describe('logAction', () => {
    it('should log an admin action successfully', async () => {
      const mockLog = {
        id: 1,
        admin_user_id: 1,
        admin_username: 'admin',
        action: AdminAction.USER_CREATED,
        target_type: 'user' as const,
        target_id: '123',
        target_name: 'testuser',
        details: '{}',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        success: true,
        error_message: null,
        timestamp: '2023-01-01T00:00:00.000Z',
        created_at: '2023-01-01T00:00:00.000Z'
      };

      mockAdminLogRepository.create.mockResolvedValue(mockLog);

      const result = await adminLogService.logAction(
        1,
        'admin',
        AdminAction.USER_CREATED,
        'user',
        '123',
        'testuser',
        { userId: 123 },
        '192.168.1.1',
        'Mozilla/5.0',
        true
      );

      expect(mockAdminLogRepository.create).toHaveBeenCalledWith({
        admin_user_id: 1,
        admin_username: 'admin',
        action: AdminAction.USER_CREATED,
        target_type: 'user',
        target_id: '123',
        target_name: 'testuser',
        details: JSON.stringify({ userId: 123 }),
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        success: true,
        error_message: undefined,
        timestamp: expect.any(String)
      });

      expect(result).toEqual(mockLog);
    });

    it('should handle errors when logging actions', async () => {
      const error = new Error('Database error');
      mockAdminLogRepository.create.mockRejectedValue(error);

      await expect(
        adminLogService.logAction(
          1,
          'admin',
          AdminAction.USER_CREATED,
          'user',
          '123',
          'testuser'
        )
      ).rejects.toThrow('Database error');
    });
  });

  describe('logLogin', () => {
    it('should log successful login', async () => {
      const mockLog = {
        id: 1,
        admin_user_id: 1,
        admin_username: 'admin',
        action: AdminAction.LOGIN,
        target_type: 'admin' as const,
        success: true,
        timestamp: '2023-01-01T00:00:00.000Z'
      };

      mockAdminLogRepository.create.mockResolvedValue(mockLog);

      const result = await adminLogService.logLogin(
        1,
        'admin',
        true,
        '192.168.1.1',
        'Mozilla/5.0',
        { sessionId: 'abc123' }
      );

      expect(mockAdminLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          admin_user_id: 1,
          admin_username: 'admin',
          action: AdminAction.LOGIN,
          target_type: 'admin',
          success: true
        })
      );

      expect(result).toEqual(mockLog);
    });

    it('should log failed login', async () => {
      const mockLog = {
        id: 1,
        admin_user_id: 1,
        admin_username: 'admin',
        action: AdminAction.LOGIN_FAILED,
        target_type: 'admin' as const,
        success: false,
        timestamp: '2023-01-01T00:00:00.000Z'
      };

      mockAdminLogRepository.create.mockResolvedValue(mockLog);

      const result = await adminLogService.logLogin(
        1,
        'admin',
        false,
        '192.168.1.1',
        'Mozilla/5.0',
        { reason: 'Invalid password' },
        'Invalid credentials'
      );

      expect(mockAdminLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          admin_user_id: 1,
          admin_username: 'admin',
          action: AdminAction.LOGIN_FAILED,
          target_type: 'admin',
          success: false,
          error_message: 'Invalid credentials'
        })
      );

      expect(result).toEqual(mockLog);
    });
  });

  describe('logUserAction', () => {
    it('should log user management actions', async () => {
      const mockLog = {
        id: 1,
        admin_user_id: 1,
        admin_username: 'admin',
        action: AdminAction.USER_CREATED,
        target_type: 'user' as const,
        target_id: '123',
        target_name: 'testuser',
        success: true,
        timestamp: '2023-01-01T00:00:00.000Z'
      };

      mockAdminLogRepository.create.mockResolvedValue(mockLog);

      const result = await adminLogService.logUserAction(
        1,
        'admin',
        AdminAction.USER_CREATED,
        '123',
        'testuser',
        { billingPlan: 'premium' },
        '192.168.1.1'
      );

      expect(mockAdminLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          admin_user_id: 1,
          admin_username: 'admin',
          action: AdminAction.USER_CREATED,
          target_type: 'user',
          target_id: '123',
          target_name: 'testuser'
        })
      );

      expect(result).toEqual(mockLog);
    });
  });

  describe('getAdminLogs', () => {
    it('should retrieve admin logs with filters', async () => {
      const mockResult = {
        data: [
          {
            id: 1,
            admin_user_id: 1,
            admin_username: 'admin',
            action: AdminAction.USER_CREATED,
            target_type: 'user' as const,
            success: true,
            timestamp: '2023-01-01T00:00:00.000Z'
          }
        ],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1
      };

      mockAdminLogRepository.findAll.mockResolvedValue(mockResult);

      const filters = {
        adminUserId: 1,
        action: AdminAction.USER_CREATED,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31')
      };

      const result = await adminLogService.getAdminLogs(filters, 1, 50);

      expect(mockAdminLogRepository.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 50,
        admin_user_id: 1,
        action: AdminAction.USER_CREATED,
        target_type: undefined,
        date_from: '2023-01-01T00:00:00.000Z',
        date_to: '2023-01-31T00:00:00.000Z',
        search: undefined
      });

      expect(result).toEqual(mockResult);
    });

    it('should handle errors when retrieving logs', async () => {
      const error = new Error('Database error');
      mockAdminLogRepository.findAll.mockRejectedValue(error);

      await expect(
        adminLogService.getAdminLogs({}, 1, 50)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getAdminLogStats', () => {
    it('should calculate admin log statistics', async () => {
      const mockActionStats = [
        {
          action: AdminAction.LOGIN,
          count: 10,
          success_count: 9,
          failure_count: 1
        },
        {
          action: AdminAction.USER_CREATED,
          count: 5,
          success_count: 5,
          failure_count: 0
        }
      ];

      const mockAdminSummary = [
        {
          admin_username: 'admin1',
          total_actions: 10,
          successful_actions: 9,
          failed_actions: 1,
          last_activity: '2023-01-01T12:00:00.000Z'
        },
        {
          admin_username: 'admin2',
          total_actions: 5,
          successful_actions: 5,
          failed_actions: 0,
          last_activity: '2023-01-01T10:00:00.000Z'
        }
      ];

      const mockRecentActivity = {
        data: [
          {
            id: 1,
            admin_user_id: 1,
            admin_username: 'admin',
            action: AdminAction.LOGIN,
            target_type: 'admin' as const,
            target_id: '1',
            timestamp: '2023-01-01T12:00:00.000Z'
          }
        ],
        total: 15,
        page: 1,
        limit: 10,
        totalPages: 2
      };

      const mockLastHourResult = {
        data: [],
        total: 3,
        page: 1,
        limit: 1000,
        totalPages: 1
      };

      mockAdminLogRepository.getActionStatistics.mockResolvedValue(mockActionStats);
      mockAdminLogRepository.getAdminActivitySummary.mockResolvedValue(mockAdminSummary);
      mockAdminLogRepository.findAll
        .mockResolvedValueOnce(mockRecentActivity)
        .mockResolvedValueOnce(mockLastHourResult);

      const result = await adminLogService.getAdminLogStats(30);

      expect(result).toEqual({
        totalLogs: 15,
        uniqueAdmins: 2,
        topActions: [
          { action: AdminAction.LOGIN, count: 10 },
          { action: AdminAction.USER_CREATED, count: 5 }
        ],
        recentActivity: [
          {
            id: 1,
            adminUserId: 1,
            action: AdminAction.LOGIN,
            targetType: 'admin',
            targetId: 1,
            details: undefined,
            ipAddress: undefined,
            userAgent: undefined,
            createdAt: '2023-01-01T12:00:00.000Z'
          }
        ],
        loginAttempts: {
          successful: 9,
          failed: 1,
          lastHour: 3
        }
      });
    });
  });

  describe('cleanupOldLogs', () => {
    it('should cleanup old logs successfully', async () => {
      mockAdminLogRepository.deleteOldLogs.mockResolvedValue(25);

      const result = await adminLogService.cleanupOldLogs(90);

      expect(mockAdminLogRepository.deleteOldLogs).toHaveBeenCalledWith(90);
      expect(result).toBe(25);
    });

    it('should handle errors during cleanup', async () => {
      const error = new Error('Database error');
      mockAdminLogRepository.deleteOldLogs.mockRejectedValue(error);

      await expect(
        adminLogService.cleanupOldLogs(90)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getSecurityLogs', () => {
    it('should retrieve security-related logs', async () => {
      const mockAllLogs = {
        data: [
          {
            id: 1,
            admin_user_id: 1,
            admin_username: 'admin',
            action: AdminAction.LOGIN,
            target_type: 'admin' as const,
            success: true,
            timestamp: '2023-01-01T12:00:00.000Z'
          },
          {
            id: 2,
            admin_user_id: 1,
            admin_username: 'admin',
            action: AdminAction.USER_CREATED,
            target_type: 'user' as const,
            success: true,
            timestamp: '2023-01-01T11:00:00.000Z'
          },
          {
            id: 3,
            admin_user_id: 1,
            admin_username: 'admin',
            action: AdminAction.LOGIN_FAILED,
            target_type: 'admin' as const,
            success: false,
            timestamp: '2023-01-01T10:00:00.000Z'
          }
        ],
        total: 3,
        page: 1,
        limit: 10000,
        totalPages: 1
      };

      mockAdminLogRepository.findAll.mockResolvedValue(mockAllLogs);

      const result = await adminLogService.getSecurityLogs(1, 50);

      expect(result.data).toHaveLength(2); // Only LOGIN and LOGIN_FAILED
      expect(result.data[0].action).toBe(AdminAction.LOGIN);
      expect(result.data[1].action).toBe(AdminAction.LOGIN_FAILED);
      expect(result.total).toBe(2);
    });
  });

  describe('auto cleanup', () => {
    it('should start automatic cleanup', () => {
      jest.useFakeTimers();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      adminLogService.startAutoCleanup(1, 30); // 1 hour interval, 30 days retention

      expect(consoleSpy).toHaveBeenCalledWith(
        'Started automatic log cleanup: every 1 hours, keeping 30 days'
      );

      jest.useRealTimers();
      consoleSpy.mockRestore();
    });
  });
});