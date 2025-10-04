import MonitoringService, { SessionData, MonitoringStats } from '../monitoringService';
import MikroTikService, { MikroTikActiveUser } from '../mikrotikService';
import { getHotspotUserRepository } from '../../models';

// Mock dependencies
jest.mock('../mikrotikService');
jest.mock('../../models');

describe('MonitoringService', () => {
  let monitoringService: MonitoringService;
  let mockMikrotikService: jest.Mocked<MikroTikService>;
  let mockUserRepo: jest.Mocked<any>;

  const mockActiveUsers: MikroTikActiveUser[] = [
    {
      '.id': '*1',
      user: 'testuser1',
      address: '192.168.1.100',
      'mac-address': '00:11:22:33:44:55',
      uptime: '1h30m45s',
      'bytes-in': '1.5M',
      'bytes-out': '500K',
      'session-time-left': '30m15s'
    },
    {
      '.id': '*2',
      user: 'testuser2',
      address: '192.168.1.101',
      'mac-address': '00:11:22:33:44:66',
      uptime: '45m20s',
      'bytes-in': '800K',
      'bytes-out': '200K'
    }
  ];

  beforeEach(() => {
    // Mock MikroTikService
    mockMikrotikService = {
      getActiveHotspotUsers: jest.fn(),
      disconnectHotspotUser: jest.fn(),
      getConnectionStatus: jest.fn()
    } as any;

    // Mock user repository
    mockUserRepo = {
      findByUsername: jest.fn(),
      update: jest.fn()
    };

    (getHotspotUserRepository as jest.Mock).mockReturnValue(mockUserRepo);

    monitoringService = new MonitoringService(mockMikrotikService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    monitoringService.stopMonitoring();
  });

  describe('Active User Monitoring', () => {
    test('should get active users with parsed data', async () => {
      mockMikrotikService.getActiveHotspotUsers.mockResolvedValue(mockActiveUsers);

      const activeUsers = await monitoringService.getActiveUsers();

      expect(activeUsers).toHaveLength(2);
      expect(activeUsers[0]).toEqual({
        username: 'testuser1',
        ipAddress: '192.168.1.100',
        macAddress: '00:11:22:33:44:55',
        bytesIn: 1572864, // 1.5M parsed
        bytesOut: 512000, // 500K parsed
        uptime: 5445, // 1h30m45s in seconds
        sessionTimeLeft: 1815 // 30m15s in seconds
      });
    });

    test('should handle empty active users list', async () => {
      mockMikrotikService.getActiveHotspotUsers.mockResolvedValue([]);

      const activeUsers = await monitoringService.getActiveUsers();

      expect(activeUsers).toEqual([]);
    });

    test('should get user session by username', async () => {
      mockMikrotikService.getActiveHotspotUsers.mockResolvedValue(mockActiveUsers);

      const session = await monitoringService.getUserSession('testuser1');

      expect(session).toBeDefined();
      expect(session?.username).toBe('testuser1');
      expect(session?.ipAddress).toBe('192.168.1.100');
    });

    test('should return null for non-existent user session', async () => {
      mockMikrotikService.getActiveHotspotUsers.mockResolvedValue(mockActiveUsers);

      const session = await monitoringService.getUserSession('nonexistent');

      expect(session).toBeNull();
    });

    test('should disconnect user successfully', async () => {
      mockMikrotikService.disconnectHotspotUser.mockResolvedValue(true);

      const result = await monitoringService.disconnectUser('testuser1');

      expect(result).toBe(true);
      expect(mockMikrotikService.disconnectHotspotUser).toHaveBeenCalledWith('testuser1');
    });
  });

  describe('Monitoring Statistics', () => {
    test('should calculate monitoring stats correctly', async () => {
      mockMikrotikService.getActiveHotspotUsers.mockResolvedValue(mockActiveUsers);
      mockMikrotikService.getConnectionStatus.mockReturnValue({
        connected: true,
        lastConnected: new Date()
      });

      const stats = await monitoringService.getMonitoringStats();

      expect(stats.totalActiveUsers).toBe(2);
      expect(stats.totalBandwidthIn).toBe(2396160); // 1.5M + 800K
      expect(stats.totalBandwidthOut).toBe(716800); // 500K + 200K
      expect(stats.averageSessionTime).toBeGreaterThan(0);
      expect(stats.connectionStatus.connected).toBe(true);
      expect(stats.lastUpdate).toBeInstanceOf(Date);
    });

    test('should handle zero active users in stats', async () => {
      mockMikrotikService.getActiveHotspotUsers.mockResolvedValue([]);
      mockMikrotikService.getConnectionStatus.mockReturnValue({
        connected: true,
        lastConnected: new Date()
      });

      const stats = await monitoringService.getMonitoringStats();

      expect(stats.totalActiveUsers).toBe(0);
      expect(stats.totalBandwidthIn).toBe(0);
      expect(stats.totalBandwidthOut).toBe(0);
      expect(stats.averageSessionTime).toBe(0);
    });
  });

  describe('Bandwidth Usage Tracking', () => {
    test('should get user bandwidth usage for active user', async () => {
      mockMikrotikService.getActiveHotspotUsers.mockResolvedValue(mockActiveUsers);

      const usage = await monitoringService.getUserBandwidthUsage('testuser1', 24);

      expect(usage.bytesIn).toBe(1572864);
      expect(usage.bytesOut).toBe(512000);
      expect(usage.totalBytes).toBe(2084864);
      expect(usage.timeRange).toContain('current session');
    });

    test('should return zero usage for inactive user', async () => {
      mockMikrotikService.getActiveHotspotUsers.mockResolvedValue([]);

      const usage = await monitoringService.getUserBandwidthUsage('testuser1', 24);

      expect(usage.bytesIn).toBe(0);
      expect(usage.bytesOut).toBe(0);
      expect(usage.totalBytes).toBe(0);
      expect(usage.timeRange).toContain('no active session');
    });
  });

  describe('Data Parsing', () => {
    test('should parse bytes correctly', async () => {
      const testCases = [
        { input: '1K', expected: 1024 },
        { input: '1.5M', expected: 1572864 },
        { input: '2G', expected: 2147483648 },
        { input: '500', expected: 500 },
        { input: '', expected: 0 }
      ];

      // We need to access the private method for testing
      // In a real scenario, we would test this through public methods
      mockMikrotikService.getActiveHotspotUsers.mockResolvedValue([
        {
          '.id': '*1',
          user: 'test',
          address: '192.168.1.1',
          'mac-address': '00:11:22:33:44:55',
          uptime: '1s',
          'bytes-in': '1.5M',
          'bytes-out': '500K'
        }
      ]);

      const users = await monitoringService.getActiveUsers();
      expect(users[0].bytesIn).toBe(1572864); // 1.5M
      expect(users[0].bytesOut).toBe(512000); // 500K
    });

    test('should parse uptime correctly', async () => {
      mockMikrotikService.getActiveHotspotUsers.mockResolvedValue([
        {
          '.id': '*1',
          user: 'test',
          address: '192.168.1.1',
          'mac-address': '00:11:22:33:44:55',
          uptime: '2h30m45s',
          'bytes-in': '0',
          'bytes-out': '0'
        }
      ]);

      const users = await monitoringService.getActiveUsers();
      expect(users[0].uptime).toBe(9045); // 2*3600 + 30*60 + 45
    });
  });

  describe('Continuous Monitoring', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should start monitoring with correct interval', () => {
      mockMikrotikService.getActiveHotspotUsers.mockResolvedValue([]);

      monitoringService.startMonitoring(5000);

      expect(monitoringService.isMonitoringActive()).toBe(true);

      // Fast-forward time
      jest.advanceTimersByTime(5000);

      expect(mockMikrotikService.getActiveHotspotUsers).toHaveBeenCalled();
    });

    test('should stop monitoring correctly', () => {
      monitoringService.startMonitoring(5000);
      expect(monitoringService.isMonitoringActive()).toBe(true);

      monitoringService.stopMonitoring();
      expect(monitoringService.isMonitoringActive()).toBe(false);
    });

    test('should not start monitoring if already running', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      monitoringService.startMonitoring(5000);
      monitoringService.startMonitoring(5000); // Try to start again

      expect(consoleSpy).toHaveBeenCalledWith('Monitoring is already running');
      consoleSpy.mockRestore();
    });

    test('should handle monitoring errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockMikrotikService.getActiveHotspotUsers.mockRejectedValue(new Error('Network error'));

      monitoringService.startMonitoring(1000);

      // Fast-forward time to trigger monitoring
      jest.advanceTimersByTime(1000);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(consoleSpy).toHaveBeenCalledWith('Error during monitoring update:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Session History', () => {
    test('should track session history', () => {
      const history = monitoringService.getSessionHistory(10);
      expect(Array.isArray(history)).toBe(true);
    });

    test('should limit session history results', () => {
      const history = monitoringService.getSessionHistory(5);
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Utility Methods', () => {
    test('should format bytes correctly', () => {
      expect(MonitoringService.formatBytes(0)).toBe('0 B');
      expect(MonitoringService.formatBytes(1024)).toBe('1 KB');
      expect(MonitoringService.formatBytes(1048576)).toBe('1 MB');
      expect(MonitoringService.formatBytes(1073741824)).toBe('1 GB');
    });

    test('should format uptime correctly', () => {
      expect(MonitoringService.formatUptime(30)).toBe('30s');
      expect(MonitoringService.formatUptime(90)).toBe('1m 30s');
      expect(MonitoringService.formatUptime(3661)).toBe('1h 1m 1s');
    });
  });

  describe('Database Integration', () => {
    test('should update user session in database', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser1',
        data_used: 1000000,
        time_used: 60
      };

      mockUserRepo.findByUsername.mockResolvedValue(mockUser);
      mockUserRepo.update.mockResolvedValue(mockUser);
      mockMikrotikService.getActiveHotspotUsers.mockResolvedValue(mockActiveUsers);

      // Start monitoring to trigger database updates
      monitoringService.startMonitoring(1000);

      // Fast-forward to trigger update
      jest.advanceTimersByTime(1000);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockUserRepo.findByUsername).toHaveBeenCalledWith('testuser1');
      expect(mockUserRepo.update).toHaveBeenCalled();
    });

    test('should handle user not found in database', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      mockUserRepo.findByUsername.mockResolvedValue(null);
      mockMikrotikService.getActiveHotspotUsers.mockResolvedValue(mockActiveUsers);

      monitoringService.startMonitoring(1000);
      jest.advanceTimersByTime(1000);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(consoleSpy).toHaveBeenCalledWith('User testuser1 not found in database');
      consoleSpy.mockRestore();
    });
  });
});