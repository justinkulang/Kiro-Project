import DashboardService from '../dashboardService';
import MonitoringService from '../monitoringService';
import { voucherService } from '../voucherService';
import { getHotspotUserRepository, getVoucherRepository, getBillingPlanRepository } from '../../models';

// Mock dependencies
jest.mock('../monitoringService');
jest.mock('../voucherService');
jest.mock('../../models');

describe('DashboardService', () => {
  let dashboardService: DashboardService;
  let mockMonitoringService: jest.Mocked<MonitoringService>;
  let mockUserRepo: any;
  let mockVoucherRepo: any;
  let mockBillingPlanRepo: any;

  beforeEach(() => {
    mockMonitoringService = {
      getMonitoringStats: jest.fn(),
      getActiveUsers: jest.fn(),
      getSessionHistory: jest.fn(),
      isMonitoringActive: jest.fn(),
      getUserSession: jest.fn(),
      disconnectUser: jest.fn(),
      getUserBandwidthUsage: jest.fn(),
      startMonitoring: jest.fn(),
      stopMonitoring: jest.fn()
    } as any;

    mockUserRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn()
    };

    mockVoucherRepo = {
      findByCondition: jest.fn(),
      findAll: jest.fn()
    };

    mockBillingPlanRepo = {
      findAll: jest.fn()
    };

    (getHotspotUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
    (getVoucherRepository as jest.Mock).mockReturnValue(mockVoucherRepo);
    (getBillingPlanRepository as jest.Mock).mockReturnValue(mockBillingPlanRepo);

    dashboardService = new DashboardService(mockMonitoringService);

    jest.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    it('should return comprehensive dashboard statistics', async () => {
      // Mock monitoring stats
      const mockMonitoringStats = {
        totalActiveUsers: 5,
        totalBandwidthIn: 1024000,
        totalBandwidthOut: 2048000,
        averageSessionTime: 1800,
        connectionStatus: { status: 'connected' },
        lastUpdate: new Date()
      };

      // Mock user data
      const mockUsers = {
        total: 100,
        data: [
          { id: 1, username: 'user1', is_active: true, created_at: new Date().toISOString() },
          { id: 2, username: 'user2', is_active: true, created_at: new Date().toISOString() }
        ]
      };

      // Mock voucher stats
      const mockVoucherStats = {
        total_vouchers: 50,
        used_vouchers: 20,
        expired_vouchers: 5,
        active_vouchers: 25,
        revenue_generated: 500.00
      };

      mockMonitoringService.getMonitoringStats.mockResolvedValue(mockMonitoringStats);
      mockUserRepo.findAll.mockResolvedValue(mockUsers);
      (voucherService.getVoucherStatistics as jest.Mock).mockResolvedValue(mockVoucherStats);

      // Mock revenue statistics
      mockVoucherRepo.findByCondition.mockResolvedValue([]);
      mockBillingPlanRepo.findAll.mockResolvedValue({ data: [] });

      const result = await dashboardService.getDashboardStats();

      expect(result).toEqual({
        totalUsers: 100,
        activeUsers: 5,
        newUsersToday: 2, // Both users created today
        totalVouchers: 50,
        usedVouchers: 20,
        expiredVouchers: 5,
        activeVouchers: 25,
        totalRevenue: 500.00,
        revenueToday: 0,
        revenueThisMonth: 0,
        totalBandwidthIn: 1024000,
        totalBandwidthOut: 2048000,
        averageSessionTime: 1800,
        connectionStatus: 'connected',
        lastUpdate: expect.any(Date)
      });

      expect(mockMonitoringService.getMonitoringStats).toHaveBeenCalledTimes(1);
      expect(mockUserRepo.findAll).toHaveBeenCalledWith({ page: 1, limit: 10000 });
      expect(voucherService.getVoucherStatistics).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      mockMonitoringService.getMonitoringStats.mockRejectedValue(new Error('Connection failed'));

      await expect(dashboardService.getDashboardStats()).rejects.toThrow('Connection failed');
    });
  });

  describe('getRevenueStatistics', () => {
    it('should calculate revenue for different time periods', async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const mockUsedVouchers = [
        {
          id: 1,
          billing_plan_id: 1,
          used_at: today.toISOString(),
          is_used: true
        },
        {
          id: 2,
          billing_plan_id: 2,
          used_at: yesterday.toISOString(),
          is_used: true
        },
        {
          id: 3,
          billing_plan_id: 1,
          used_at: lastWeek.toISOString(),
          is_used: true
        }
      ];

      const mockBillingPlans = {
        data: [
          { id: 1, price: 10.00 },
          { id: 2, price: 20.00 }
        ]
      };

      mockVoucherRepo.findByCondition.mockResolvedValue(mockUsedVouchers);
      mockBillingPlanRepo.findAll.mockResolvedValue(mockBillingPlans);

      const result = await dashboardService.getRevenueStatistics();

      expect(result.revenueToday).toBe(10.00); // Only today's voucher
      expect(result.revenueThisWeek).toBe(30.00); // Yesterday + today
      expect(result.revenueThisMonth).toBe(40.00); // All vouchers
    });

    it('should handle missing billing plans', async () => {
      const mockUsedVouchers = [
        {
          id: 1,
          billing_plan_id: 999, // Non-existent plan
          used_at: new Date().toISOString(),
          is_used: true
        }
      ];

      mockVoucherRepo.findByCondition.mockResolvedValue(mockUsedVouchers);
      mockBillingPlanRepo.findAll.mockResolvedValue({ data: [] });

      const result = await dashboardService.getRevenueStatistics();

      expect(result.revenueToday).toBe(0);
      expect(result.revenueThisWeek).toBe(0);
      expect(result.revenueThisMonth).toBe(0);
    });
  });

  describe('getRevenueHistory', () => {
    it('should return revenue data grouped by date', async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      const mockUsedVouchers = [
        {
          id: 1,
          billing_plan_id: 1,
          used_at: today.toISOString(),
          is_used: true
        },
        {
          id: 2,
          billing_plan_id: 1,
          used_at: yesterday.toISOString(),
          is_used: true
        }
      ];

      const mockBillingPlans = {
        data: [
          { id: 1, price: 15.00 }
        ]
      };

      mockVoucherRepo.findByCondition.mockResolvedValue(mockUsedVouchers);
      mockBillingPlanRepo.findAll.mockResolvedValue(mockBillingPlans);

      const result = await dashboardService.getRevenueHistory(2);

      expect(result).toHaveLength(3); // 2 days + today
      expect(result.find(r => r.date === today.toISOString().split('T')[0])).toEqual({
        date: today.toISOString().split('T')[0],
        revenue: 15.00,
        vouchersUsed: 1
      });
      expect(result.find(r => r.date === yesterday.toISOString().split('T')[0])).toEqual({
        date: yesterday.toISOString().split('T')[0],
        revenue: 15.00,
        vouchersUsed: 1
      });
    });
  });

  describe('getTopUsers', () => {
    it('should return users sorted by data usage', async () => {
      const mockUsers = {
        data: [
          {
            username: 'user1',
            data_used: 1000000,
            time_used: 120,
            last_login: '2023-01-01T12:00:00Z',
            created_at: '2023-01-01T00:00:00Z'
          },
          {
            username: 'user2',
            data_used: 2000000,
            time_used: 240,
            last_login: '2023-01-01T13:00:00Z',
            created_at: '2023-01-01T00:00:00Z'
          },
          {
            username: 'user3',
            data_used: 0,
            time_used: 0,
            created_at: '2023-01-01T00:00:00Z'
          }
        ]
      };

      mockUserRepo.findAll.mockResolvedValue(mockUsers);

      const result = await dashboardService.getTopUsers(2);

      expect(result).toHaveLength(2);
      expect(result[0].username).toBe('user2'); // Highest usage first
      expect(result[0].totalBytes).toBe(2000000);
      expect(result[1].username).toBe('user1');
      expect(result[1].totalBytes).toBe(1000000);
    });

    it('should filter out users with zero usage', async () => {
      const mockUsers = {
        data: [
          {
            username: 'user1',
            data_used: 0,
            time_used: 0,
            created_at: '2023-01-01T00:00:00Z'
          }
        ]
      };

      mockUserRepo.findAll.mockResolvedValue(mockUsers);

      const result = await dashboardService.getTopUsers();

      expect(result).toHaveLength(0);
    });
  });

  describe('getSystemHealth', () => {
    it('should return system health metrics', async () => {
      const mockMonitoringStats = {
        connectionStatus: { status: 'connected' },
        lastUpdate: new Date()
      };

      mockMonitoringService.getMonitoringStats.mockResolvedValue(mockMonitoringStats);
      mockMonitoringService.isMonitoringActive.mockReturnValue(true);

      const result = await dashboardService.getSystemHealth();

      expect(result).toEqual({
        mikrotikConnection: true,
        databaseConnection: true,
        monitoringActive: true,
        lastDataUpdate: expect.any(Date),
        uptime: expect.any(Number)
      });
    });

    it('should handle connection failures', async () => {
      mockMonitoringService.getMonitoringStats.mockRejectedValue(new Error('Connection failed'));

      const result = await dashboardService.getSystemHealth();

      expect(result.mikrotikConnection).toBe(false);
      expect(result.databaseConnection).toBe(false);
      expect(result.monitoringActive).toBe(false);
    });
  });

  describe('getRealTimeData', () => {
    it('should return combined real-time data', async () => {
      const mockActiveUsers = [
        {
          username: 'user1',
          ipAddress: '192.168.1.100',
          macAddress: '00:11:22:33:44:55',
          bytesIn: 1024,
          bytesOut: 2048,
          uptime: 3600
        }
      ];

      const mockStats = {
        totalUsers: 100,
        activeUsers: 1,
        totalRevenue: 500
      };

      const mockSystemHealth = {
        mikrotikConnection: true,
        databaseConnection: true,
        monitoringActive: true
      };

      mockMonitoringService.getActiveUsers.mockResolvedValue(mockActiveUsers);
      
      // Mock the getDashboardStats method
      jest.spyOn(dashboardService, 'getDashboardStats').mockResolvedValue(mockStats as any);
      jest.spyOn(dashboardService, 'getSystemHealth').mockResolvedValue(mockSystemHealth as any);

      const result = await dashboardService.getRealTimeData();

      expect(result).toEqual({
        activeUsers: mockActiveUsers,
        stats: mockStats,
        systemHealth: mockSystemHealth
      });
    });
  });

  describe('recordBandwidthUsage', () => {
    it('should record bandwidth usage data point', async () => {
      const mockStats = {
        totalBandwidthIn: 1024000,
        totalBandwidthOut: 2048000,
        totalActiveUsers: 5
      };

      mockMonitoringService.getMonitoringStats.mockResolvedValue(mockStats);

      await dashboardService.recordBandwidthUsage();

      // Test that bandwidth history is recorded (we can't directly access private property)
      // But we can test that the method doesn't throw
      expect(mockMonitoringService.getMonitoringStats).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      mockMonitoringService.getMonitoringStats.mockRejectedValue(new Error('Connection failed'));

      // Should not throw
      await expect(dashboardService.recordBandwidthUsage()).resolves.toBeUndefined();
    });
  });
});