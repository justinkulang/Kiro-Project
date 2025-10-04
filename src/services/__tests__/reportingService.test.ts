import ReportingService from '../reportingService';
import { 
  getHotspotUserRepository, 
  getVoucherRepository, 
  getBillingPlanRepository, 
  getUserSessionRepository 
} from '../../models';

// Mock dependencies
jest.mock('../../models');
jest.mock('exceljs');
jest.mock('jspdf');

describe('ReportingService', () => {
  let reportingService: ReportingService;
  let mockUserRepo: any;
  let mockVoucherRepo: any;
  let mockBillingPlanRepo: any;
  let mockSessionRepo: any;

  beforeEach(() => {
    mockUserRepo = {
      findAll: jest.fn(),
      findById: jest.fn()
    };

    mockVoucherRepo = {
      findAll: jest.fn(),
      findByCondition: jest.fn()
    };

    mockBillingPlanRepo = {
      findAll: jest.fn()
    };

    mockSessionRepo = {
      findRecentSessions: jest.fn()
    };

    (getHotspotUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
    (getVoucherRepository as jest.Mock).mockReturnValue(mockVoucherRepo);
    (getBillingPlanRepository as jest.Mock).mockReturnValue(mockBillingPlanRepo);
    (getUserSessionRepository as jest.Mock).mockReturnValue(mockSessionRepo);

    reportingService = new ReportingService();

    jest.clearAllMocks();
  });

  describe('generateUserReport', () => {
    it('should generate a comprehensive user report', async () => {
      const filters = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-07'),
        includeInactive: false
      };

      const mockUsers = {
        data: [
          {
            id: 1,
            username: 'user1',
            email: 'user1@test.com',
            full_name: 'User One',
            billing_plan_id: 1,
            is_active: true,
            created_at: '2023-01-02T00:00:00Z',
            last_login: '2023-01-05T12:00:00Z',
            data_used: 1024000,
            time_used: 120
          },
          {
            id: 2,
            username: 'user2',
            email: 'user2@test.com',
            full_name: 'User Two',
            billing_plan_id: 2,
            is_active: true,
            created_at: '2023-01-03T00:00:00Z',
            last_login: '2023-01-06T14:00:00Z',
            data_used: 2048000,
            time_used: 240
          }
        ]
      };

      const mockBillingPlans = {
        data: [
          { id: 1, name: 'Basic Plan', price: 10.00 },
          { id: 2, name: 'Premium Plan', price: 20.00 }
        ]
      };

      const mockSessions = [
        {
          id: 1,
          user_id: 1,
          start_time: '2023-01-05T10:00:00Z',
          end_time: '2023-01-05T12:00:00Z',
          bytes_in: 512000,
          bytes_out: 512000
        },
        {
          id: 2,
          user_id: 2,
          start_time: '2023-01-06T13:00:00Z',
          end_time: '2023-01-06T15:00:00Z',
          bytes_in: 1024000,
          bytes_out: 1024000
        }
      ];

      mockUserRepo.findAll.mockResolvedValue(mockUsers);
      mockBillingPlanRepo.findAll.mockResolvedValue(mockBillingPlans);
      mockSessionRepo.findRecentSessions.mockResolvedValue(mockSessions);

      const result = await reportingService.generateUserReport(filters);

      expect(result.reportId).toMatch(/^USER-/);
      expect(result.title).toContain('User Report');
      expect(result.summary.totalUsers).toBe(2);
      expect(result.summary.activeUsers).toBe(2);
      expect(result.summary.newUsers).toBe(2);
      expect(result.summary.totalSessions).toBe(2);
      expect(result.users).toHaveLength(2);
      
      expect(result.users[0]).toEqual({
        id: 1,
        username: 'user1',
        email: 'user1@test.com',
        fullName: 'User One',
        billingPlan: 'Basic Plan',
        isActive: true,
        createdAt: new Date('2023-01-02T00:00:00Z'),
        lastLogin: new Date('2023-01-05T12:00:00Z'),
        totalSessions: 1,
        totalDataUsage: 1024000,
        totalTimeUsed: 120,
        averageSessionDuration: 120
      });

      expect(mockUserRepo.findAll).toHaveBeenCalledWith({ page: 1, limit: 10000 });
      expect(mockBillingPlanRepo.findAll).toHaveBeenCalledWith({ page: 1, limit: 1000 });
      expect(mockSessionRepo.findRecentSessions).toHaveBeenCalled();
    });

    it('should filter users by date range', async () => {
      const filters = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-07'),
        includeInactive: false
      };

      const mockUsers = {
        data: [
          {
            id: 1,
            username: 'user1',
            is_active: true,
            created_at: '2023-01-02T00:00:00Z', // Within range
            data_used: 0,
            time_used: 0
          },
          {
            id: 2,
            username: 'user2',
            is_active: true,
            created_at: '2023-01-10T00:00:00Z', // Outside range
            data_used: 0,
            time_used: 0
          }
        ]
      };

      mockUserRepo.findAll.mockResolvedValue(mockUsers);
      mockBillingPlanRepo.findAll.mockResolvedValue({ data: [] });
      mockSessionRepo.findRecentSessions.mockResolvedValue([]);

      const result = await reportingService.generateUserReport(filters);

      expect(result.summary.totalUsers).toBe(1);
      expect(result.users).toHaveLength(1);
      expect(result.users[0].username).toBe('user1');
    });

    it('should handle errors gracefully', async () => {
      const filters = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-07')
      };

      mockUserRepo.findAll.mockRejectedValue(new Error('Database error'));

      await expect(reportingService.generateUserReport(filters)).rejects.toThrow('Database error');
    });
  });

  describe('generateRevenueReport', () => {
    it('should generate a comprehensive revenue report', async () => {
      const filters = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-07')
      };

      const mockVouchers = [
        {
          id: 1,
          billing_plan_id: 1,
          is_used: true,
          used_at: '2023-01-02T10:00:00Z'
        },
        {
          id: 2,
          billing_plan_id: 2,
          is_used: true,
          used_at: '2023-01-03T14:00:00Z'
        },
        {
          id: 3,
          billing_plan_id: 1,
          is_used: true,
          used_at: '2023-01-04T16:00:00Z'
        }
      ];

      const mockBillingPlans = {
        data: [
          { id: 1, name: 'Basic Plan', price: 10.00 },
          { id: 2, name: 'Premium Plan', price: 20.00 }
        ]
      };

      const mockUsers = {
        data: [
          { id: 1, created_at: '2023-01-02T00:00:00Z' },
          { id: 2, created_at: '2023-01-03T00:00:00Z' }
        ]
      };

      mockVoucherRepo.findAll.mockResolvedValue(mockVouchers);
      mockBillingPlanRepo.findAll.mockResolvedValue(mockBillingPlans);
      mockUserRepo.findAll.mockResolvedValue(mockUsers);

      const result = await reportingService.generateRevenueReport(filters);

      expect(result.reportId).toMatch(/^REV-/);
      expect(result.title).toContain('Revenue Report');
      expect(result.summary.totalRevenue).toBe(40.00); // 10 + 20 + 10
      expect(result.summary.totalVouchers).toBe(3);
      expect(result.summary.usedVouchers).toBe(3);
      expect(result.summary.averageRevenuePerVoucher).toBe(40.00 / 3);
      expect(result.summary.topBillingPlan).toBe('Premium Plan'); // Highest revenue per plan

      expect(result.billingPlanBreakdown).toHaveLength(2);
      expect(result.billingPlanBreakdown[0].planName).toBe('Basic Plan');
      expect(result.billingPlanBreakdown[0].totalRevenue).toBe(20.00);
      expect(result.billingPlanBreakdown[0].vouchersUsed).toBe(2);
    });

    it('should handle vouchers without billing plans', async () => {
      const filters = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-07')
      };

      const mockVouchers = [
        {
          id: 1,
          billing_plan_id: 999, // Non-existent plan
          is_used: true,
          used_at: '2023-01-02T10:00:00Z'
        }
      ];

      mockVoucherRepo.findAll.mockResolvedValue(mockVouchers);
      mockBillingPlanRepo.findAll.mockResolvedValue({ data: [] });
      mockUserRepo.findAll.mockResolvedValue({ data: [] });

      const result = await reportingService.generateRevenueReport(filters);

      expect(result.summary.totalRevenue).toBe(0);
      expect(result.billingPlanBreakdown).toHaveLength(0);
    });
  });

  describe('generateUsageReport', () => {
    it('should generate a comprehensive usage report', async () => {
      const filters = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-07')
      };

      const mockSessions = [
        {
          id: 1,
          user_id: 1,
          start_time: '2023-01-02T10:00:00Z',
          end_time: '2023-01-02T12:00:00Z',
          bytes_in: 1024000,
          bytes_out: 1024000
        },
        {
          id: 2,
          user_id: 2,
          start_time: '2023-01-03T14:00:00Z',
          end_time: '2023-01-03T16:00:00Z',
          bytes_in: 2048000,
          bytes_out: 2048000
        }
      ];

      mockSessionRepo.findRecentSessions.mockResolvedValue(mockSessions);
      mockUserRepo.findById.mockImplementation((id) => {
        return Promise.resolve({
          id,
          username: `user${id}`,
          data_used: id * 1024000,
          time_used: id * 120
        });
      });

      const result = await reportingService.generateUsageReport(filters);

      expect(result.reportId).toMatch(/^USAGE-/);
      expect(result.title).toContain('Usage Report');
      expect(result.summary.totalBandwidth).toBe(6144000); // Total of all sessions
      expect(result.summary.topUser).toBe('user2'); // Highest bandwidth user
      
      expect(result.hourlyUsage).toHaveLength(24);
      expect(result.dailyUsage.length).toBeGreaterThan(0);
      expect(result.topUsers.length).toBeGreaterThan(0);
    });

    it('should calculate hourly usage correctly', async () => {
      const filters = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-02')
      };

      const mockSessions = [
        {
          id: 1,
          user_id: 1,
          start_time: '2023-01-01T10:00:00Z', // Hour 10
          bytes_in: 1024000,
          bytes_out: 1024000
        },
        {
          id: 2,
          user_id: 2,
          start_time: '2023-01-01T10:30:00Z', // Also hour 10
          bytes_in: 512000,
          bytes_out: 512000
        }
      ];

      mockSessionRepo.findRecentSessions.mockResolvedValue(mockSessions);
      mockUserRepo.findById.mockResolvedValue({ username: 'testuser' });

      const result = await reportingService.generateUsageReport(filters);

      const hour10Usage = result.hourlyUsage.find(h => h.hour === 10);
      expect(hour10Usage).toBeDefined();
      expect(hour10Usage!.totalBandwidth).toBe(3072000); // 2048000 + 1024000
      expect(hour10Usage!.sessions).toBe(2);
      expect(hour10Usage!.activeUsers).toBe(2);
    });
  });

  describe('exportToPDF', () => {
    it('should export user report to PDF', async () => {
      const mockReport = {
        reportId: 'USER-123',
        title: 'Test User Report',
        generatedAt: new Date(),
        filters: {
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-01-07')
        },
        summary: {
          totalUsers: 10,
          activeUsers: 8,
          newUsers: 2,
          totalSessions: 50,
          totalDataUsage: 1024000000,
          averageSessionDuration: 45
        },
        users: [
          {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            fullName: 'Test User',
            billingPlan: 'Basic Plan',
            isActive: true,
            createdAt: new Date(),
            totalSessions: 5,
            totalDataUsage: 102400000,
            totalTimeUsed: 300,
            averageSessionDuration: 60
          }
        ]
      };

      // Mock jsPDF
      const mockDoc = {
        setFontSize: jest.fn(),
        text: jest.fn(),
        autoTable: jest.fn(),
        output: jest.fn().mockReturnValue(new ArrayBuffer(1024)),
        lastAutoTable: { finalY: 100 }
      };

      // This would normally be mocked at the module level
      // For this test, we'll assume the PDF generation works
      const result = await reportingService.exportToPDF(mockReport as any);

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('exportToExcel', () => {
    it('should export user report to Excel', async () => {
      const mockReport = {
        reportId: 'USER-123',
        title: 'Test User Report',
        generatedAt: new Date(),
        filters: {
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-01-07')
        },
        summary: {
          totalUsers: 10,
          activeUsers: 8,
          newUsers: 2,
          totalSessions: 50,
          totalDataUsage: 1024000000,
          averageSessionDuration: 45
        },
        users: [
          {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            fullName: 'Test User',
            billingPlan: 'Basic Plan',
            isActive: true,
            createdAt: new Date(),
            totalSessions: 5,
            totalDataUsage: 102400000,
            totalTimeUsed: 300,
            averageSessionDuration: 60
          }
        ]
      };

      // This would normally be mocked at the module level
      // For this test, we'll assume the Excel generation works
      const result = await reportingService.exportToExcel(mockReport as any);

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('helper methods', () => {
    it('should format bytes correctly', () => {
      // Access private method through any cast for testing
      const service = reportingService as any;
      
      expect(service.formatBytes(0)).toBe('0 B');
      expect(service.formatBytes(1024)).toBe('1 KB');
      expect(service.formatBytes(1048576)).toBe('1 MB');
      expect(service.formatBytes(1073741824)).toBe('1 GB');
    });

    it('should generate unique report IDs', () => {
      const service = reportingService as any;
      
      const id1 = service.generateReportId('USER');
      const id2 = service.generateReportId('USER');
      
      expect(id1).toMatch(/^USER-/);
      expect(id2).toMatch(/^USER-/);
      expect(id1).not.toBe(id2);
    });
  });
});