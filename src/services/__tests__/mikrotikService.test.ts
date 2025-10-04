import MikroTikService, { MikroTikConfig, MikroTikUser, MikroTikActiveUser } from '../mikrotikService';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MikroTikService', () => {
  let mikrotikService: MikroTikService;
  let mockAxiosInstance: jest.Mocked<any>;

  const mockConfig: MikroTikConfig = {
    host: '192.168.1.1',
    port: 8728,
    username: 'admin',
    password: 'password',
    timeout: 5000
  };

  beforeEach(() => {
    // Mock axios instance
    mockAxiosInstance = {
      request: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    mikrotikService = new MikroTikService(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration and Connection', () => {
    test('should create service with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://192.168.1.1:8728',
        timeout: 5000,
        auth: {
          username: 'admin',
          password: 'password'
        },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
    });

    test('should use HTTPS when configured', () => {
      const httpsConfig = { ...mockConfig, useHttps: true };
      new MikroTikService(httpsConfig);

      expect(mockedAxios.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          baseURL: 'https://192.168.1.1:8728'
        })
      );
    });

    test('should test connection successfully', async () => {
      const mockResponse = {
        data: { version: '6.49.6', identity: 'MikroTik' }
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const status = await mikrotikService.testConnection();

      expect(status.connected).toBe(true);
      expect(status.version).toBe('6.49.6');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/rest/system/identity');
    });

    test('should handle connection failure', async () => {
      const mockError = new Error('Connection refused');
      mockError.code = 'ECONNREFUSED';
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(mikrotikService.testConnection()).rejects.toThrow();
      
      const status = mikrotikService.getConnectionStatus();
      expect(status.connected).toBe(false);
      expect(status.error).toBeDefined();
    });
  });

  describe('Hotspot User Management', () => {
    const mockUsers: MikroTikUser[] = [
      {
        '.id': '*1',
        name: 'testuser1',
        password: 'pass123',
        profile: 'default',
        disabled: 'false'
      },
      {
        '.id': '*2',
        name: 'testuser2',
        password: 'pass456',
        profile: 'premium',
        disabled: 'true'
      }
    ];

    test('should get all hotspot users', async () => {
      mockAxiosInstance.request.mockResolvedValue({ data: mockUsers });

      const users = await mikrotikService.getHotspotUsers();

      expect(users).toEqual(mockUsers);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/rest/ip/hotspot/user',
        data: undefined
      });
    });

    test('should get specific hotspot user', async () => {
      mockAxiosInstance.request.mockResolvedValue({ data: mockUsers });

      const user = await mikrotikService.getHotspotUser('testuser1');

      expect(user).toEqual(mockUsers[0]);
    });

    test('should return null for non-existent user', async () => {
      mockAxiosInstance.request.mockResolvedValue({ data: mockUsers });

      const user = await mikrotikService.getHotspotUser('nonexistent');

      expect(user).toBeNull();
    });

    test('should create hotspot user', async () => {
      const newUserData = {
        name: 'newuser',
        password: 'newpass',
        profile: 'default',
        comment: 'Test user'
      };

      const createdUser: MikroTikUser = {
        '.id': '*3',
        name: 'newuser',
        password: 'newpass',
        profile: 'default',
        comment: 'Test user',
        disabled: 'false'
      };

      // Mock POST request for creation
      mockAxiosInstance.request
        .mockResolvedValueOnce({ data: { success: true } }) // POST response
        .mockResolvedValueOnce({ data: [createdUser] }); // GET response for retrieval

      const result = await mikrotikService.createHotspotUser(newUserData);

      expect(result).toEqual(createdUser);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/rest/ip/hotspot/user',
        data: {
          name: 'newuser',
          password: 'newpass',
          profile: 'default',
          comment: 'Test user',
          disabled: 'false'
        }
      });
    });

    test('should update hotspot user', async () => {
      const updateData = {
        password: 'newpassword',
        disabled: true
      };

      const updatedUser: MikroTikUser = {
        '.id': '*1',
        name: 'testuser1',
        password: 'newpassword',
        profile: 'default',
        disabled: 'true'
      };

      // Mock GET for finding user, PATCH for update, GET for retrieval
      mockAxiosInstance.request
        .mockResolvedValueOnce({ data: mockUsers }) // GET for finding user
        .mockResolvedValueOnce({ data: { success: true } }) // PATCH response
        .mockResolvedValueOnce({ data: [updatedUser] }); // GET for retrieval

      const result = await mikrotikService.updateHotspotUser('testuser1', updateData);

      expect(result).toEqual(updatedUser);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'PATCH',
        url: '/rest/ip/hotspot/user/*1',
        data: {
          password: 'newpassword',
          disabled: 'true'
        }
      });
    });

    test('should delete hotspot user', async () => {
      // Mock GET for finding user, DELETE for removal
      mockAxiosInstance.request
        .mockResolvedValueOnce({ data: mockUsers }) // GET for finding user
        .mockResolvedValueOnce({ data: { success: true } }); // DELETE response

      const result = await mikrotikService.deleteHotspotUser('testuser1');

      expect(result).toBe(true);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'DELETE',
        url: '/rest/ip/hotspot/user/*1',
        data: undefined
      });
    });

    test('should handle user not found during update', async () => {
      mockAxiosInstance.request.mockResolvedValue({ data: [] });

      await expect(mikrotikService.updateHotspotUser('nonexistent', { password: 'new' }))
        .rejects.toThrow('User nonexistent not found');
    });
  });

  describe('Active User Monitoring', () => {
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

    test('should get active hotspot users', async () => {
      mockAxiosInstance.request.mockResolvedValue({ data: mockActiveUsers });

      const activeUsers = await mikrotikService.getActiveHotspotUsers();

      expect(activeUsers).toEqual(mockActiveUsers);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/rest/ip/hotspot/active',
        data: undefined
      });
    });

    test('should disconnect active user', async () => {
      // Mock GET for finding active user, DELETE for disconnection
      mockAxiosInstance.request
        .mockResolvedValueOnce({ data: mockActiveUsers }) // GET active users
        .mockResolvedValueOnce({ data: { success: true } }); // DELETE response

      const result = await mikrotikService.disconnectHotspotUser('testuser1');

      expect(result).toBe(true);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'DELETE',
        url: '/rest/ip/hotspot/active/*1',
        data: undefined
      });
    });

    test('should handle disconnect user not found', async () => {
      mockAxiosInstance.request.mockResolvedValue({ data: [] });

      await expect(mikrotikService.disconnectHotspotUser('nonexistent'))
        .rejects.toThrow('Active user nonexistent not found');
    });
  });

  describe('Profile Management', () => {
    const mockProfiles = [
      {
        '.id': '*1',
        name: 'default',
        'rate-limit': '1M/2M',
        'session-timeout': '1h',
        'shared-users': '1'
      },
      {
        '.id': '*2',
        name: 'premium',
        'rate-limit': '5M/10M',
        'session-timeout': '24h',
        'shared-users': '3'
      }
    ];

    test('should get hotspot profiles', async () => {
      mockAxiosInstance.request.mockResolvedValue({ data: mockProfiles });

      const profiles = await mikrotikService.getHotspotProfiles();

      expect(profiles).toEqual(mockProfiles);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/rest/ip/hotspot/user/profile',
        data: undefined
      });
    });

    test('should create hotspot profile', async () => {
      const profileData = {
        name: 'newprofile',
        rateLimit: '2M/4M',
        sessionTimeout: '2h',
        sharedUsers: 2
      };

      const createdProfile = {
        '.id': '*3',
        name: 'newprofile',
        'rate-limit': '2M/4M',
        'session-timeout': '2h',
        'shared-users': '2'
      };

      // Mock POST for creation, GET for retrieval
      mockAxiosInstance.request
        .mockResolvedValueOnce({ data: { success: true } }) // POST response
        .mockResolvedValueOnce({ data: [createdProfile] }); // GET response

      const result = await mikrotikService.createHotspotProfile(profileData);

      expect(result).toEqual(createdProfile);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/rest/ip/hotspot/user/profile',
        data: {
          name: 'newprofile',
          'rate-limit': '2M/4M',
          'session-timeout': '2h',
          'shared-users': '2'
        }
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      const networkError = new Error('Network Error');
      networkError.code = 'ECONNREFUSED';
      mockAxiosInstance.request.mockRejectedValue(networkError);

      await expect(mikrotikService.getHotspotUsers())
        .rejects.toThrow('MikroTik Error:');
    });

    test('should handle API errors gracefully', async () => {
      const apiError = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: { message: 'Invalid credentials' }
        }
      };
      mockAxiosInstance.request.mockRejectedValue(apiError);

      await expect(mikrotikService.getHotspotUsers())
        .rejects.toThrow('MikroTik Error:');
    });

    test('should handle empty responses', async () => {
      mockAxiosInstance.request.mockResolvedValue({ data: null });

      const users = await mikrotikService.getHotspotUsers();
      expect(users).toEqual([]);
    });
  });

  describe('System Information', () => {
    test('should get system resources', async () => {
      const mockResources = {
        'cpu-load': '5%',
        'free-memory': '128MB',
        'total-memory': '256MB',
        uptime: '1w2d3h'
      };

      mockAxiosInstance.request.mockResolvedValue({ data: mockResources });

      const resources = await mikrotikService.getSystemResources();

      expect(resources).toEqual(mockResources);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/rest/system/resource',
        data: undefined
      });
    });

    test('should get interface statistics', async () => {
      const mockInterfaces = [
        {
          '.id': '*1',
          name: 'ether1',
          'rx-byte': '1000000',
          'tx-byte': '500000',
          running: 'true'
        }
      ];

      mockAxiosInstance.request.mockResolvedValue({ data: mockInterfaces });

      const interfaces = await mikrotikService.getInterfaceStats();

      expect(interfaces).toEqual(mockInterfaces);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/rest/interface',
        data: undefined
      });
    });
  });
});