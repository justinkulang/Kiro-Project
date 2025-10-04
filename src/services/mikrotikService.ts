import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { HotspotUser } from '../models/types';
import NetworkUtils from '../utils/networkUtils';

export interface MikroTikConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  useHttps?: boolean;
  timeout?: number;
}

export interface MikroTikUser {
  '.id': string;
  name: string;
  password: string;
  profile?: string;
  'limit-uptime'?: string;
  'limit-bytes-total'?: string;
  'limit-bytes-in'?: string;
  'limit-bytes-out'?: string;
  disabled?: string;
  comment?: string;
}

export interface MikroTikActiveUser {
  '.id': string;
  user: string;
  address: string;
  'mac-address': string;
  uptime: string;
  'bytes-in': string;
  'bytes-out': string;
  'session-time-left'?: string;
}

export interface MikroTikProfile {
  '.id': string;
  name: string;
  'rate-limit'?: string;
  'session-timeout'?: string;
  'idle-timeout'?: string;
  'keepalive-timeout'?: string;
  'status-autorefresh'?: string;
  'shared-users'?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  lastConnected?: Date;
  error?: string;
  version?: string;
}

class MikroTikService {
  private client: AxiosInstance;
  private config: MikroTikConfig;
  private connectionStatus: ConnectionStatus = { connected: false };
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 5000; // 5 seconds

  constructor(config: MikroTikConfig) {
    this.config = {
      timeout: 10000,
      useHttps: false,
      ...config
    };

    this.client = axios.create({
      baseURL: `${this.config.useHttps ? 'https' : 'http'}://${this.config.host}:${this.config.port}`,
      timeout: this.config.timeout,
      auth: {
        username: this.config.username,
        password: this.config.password
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`MikroTik API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('MikroTik API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        this.connectionStatus = {
          connected: true,
          lastConnected: new Date()
        };
        this.reconnectAttempts = 0;
        return response;
      },
      async (error) => {
        console.error('MikroTik API Response Error:', error.message);
        
        this.connectionStatus = {
          connected: false,
          error: error.message
        };

        // Handle connection errors with retry logic
        if (this.shouldRetry(error)) {
          return this.retryRequest(error.config);
        }

        return Promise.reject(this.formatError(error));
      }
    );
  }

  private shouldRetry(error: any): boolean {
    return (
      this.reconnectAttempts < this.maxReconnectAttempts &&
      (error.code === 'ECONNREFUSED' ||
       error.code === 'ETIMEDOUT' ||
       error.response?.status >= 500)
    );
  }

  private async retryRequest(config: any): Promise<AxiosResponse> {
    this.reconnectAttempts++;
    console.log(`Retrying MikroTik connection (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
    
    return this.client.request(config);
  }

  private formatError(error: any): Error {
    const userMessage = NetworkUtils.getErrorMessage(error);
    return new Error(`MikroTik Error: ${userMessage}`);
  }

  /**
   * Test connection to MikroTik router
   */
  async testConnection(): Promise<ConnectionStatus> {
    try {
      // Try to get system identity to test connection
      const response = await this.client.get('/rest/system/identity');
      
      this.connectionStatus = {
        connected: true,
        lastConnected: new Date(),
        version: response.data?.version || 'Unknown'
      };
      
      return this.connectionStatus;
    } catch (error) {
      this.connectionStatus = {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      throw error;
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<MikroTikConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Recreate client with new config
    this.client = axios.create({
      baseURL: `${this.config.useHttps ? 'https' : 'http'}://${this.config.host}:${this.config.port}`,
      timeout: this.config.timeout,
      auth: {
        username: this.config.username,
        password: this.config.password
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    this.setupInterceptors();
    this.reconnectAttempts = 0;
  }

  /**
   * Generic API request method with retry logic
   */
  private async request<T = any>(method: string, endpoint: string, data?: any): Promise<T> {
    return NetworkUtils.withRetry(async () => {
      try {
        const response = await this.client.request({
          method,
          url: endpoint,
          data
        });
        
        return response.data;
      } catch (error) {
        console.error(`MikroTik ${method.toUpperCase()} ${endpoint} failed:`, error);
        throw error;
      }
    }, {
      maxAttempts: 3,
      baseDelay: 1000,
      backoffFactor: 2
    });
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>('GET', endpoint);
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>('POST', endpoint, data);
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>('PUT', endpoint, data);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>('DELETE', endpoint);
  }

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>('PATCH', endpoint, data);
  }

  /**
   * Get all hotspot users
   */
  async getHotspotUsers(): Promise<MikroTikUser[]> {
    try {
      const users = await this.get<MikroTikUser[]>('/rest/ip/hotspot/user');
      return Array.isArray(users) ? users : [];
    } catch (error) {
      console.error('Failed to get hotspot users:', error);
      throw new Error('Failed to retrieve hotspot users from MikroTik');
    }
  }

  /**
   * Get hotspot user by name
   */
  async getHotspotUser(username: string): Promise<MikroTikUser | null> {
    try {
      const users = await this.getHotspotUsers();
      return users.find(user => user.name === username) || null;
    } catch (error) {
      console.error(`Failed to get hotspot user ${username}:`, error);
      throw error;
    }
  }

  /**
   * Create hotspot user
   */
  async createHotspotUser(userData: {
    name: string;
    password: string;
    profile?: string;
    limitUptime?: string;
    limitBytesTotal?: string;
    comment?: string;
    disabled?: boolean;
  }): Promise<MikroTikUser> {
    try {
      const mikrotikUser: Partial<MikroTikUser> = {
        name: userData.name,
        password: userData.password,
        profile: userData.profile,
        'limit-uptime': userData.limitUptime,
        'limit-bytes-total': userData.limitBytesTotal,
        comment: userData.comment,
        disabled: userData.disabled ? 'true' : 'false'
      };

      // Remove undefined values
      Object.keys(mikrotikUser).forEach(key => {
        if (mikrotikUser[key as keyof MikroTikUser] === undefined) {
          delete mikrotikUser[key as keyof MikroTikUser];
        }
      });

      const response = await this.post('/rest/ip/hotspot/user', mikrotikUser);
      
      // Get the created user
      const createdUser = await this.getHotspotUser(userData.name);
      if (!createdUser) {
        throw new Error('User created but could not be retrieved');
      }

      return createdUser;
    } catch (error) {
      console.error(`Failed to create hotspot user ${userData.name}:`, error);
      throw new Error(`Failed to create hotspot user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update hotspot user
   */
  async updateHotspotUser(username: string, updateData: {
    password?: string;
    profile?: string;
    limitUptime?: string;
    limitBytesTotal?: string;
    comment?: string;
    disabled?: boolean;
  }): Promise<MikroTikUser> {
    try {
      // First get the user to get their ID
      const existingUser = await this.getHotspotUser(username);
      if (!existingUser) {
        throw new Error(`User ${username} not found`);
      }

      const mikrotikUpdate: Partial<MikroTikUser> = {};
      
      if (updateData.password !== undefined) mikrotikUpdate.password = updateData.password;
      if (updateData.profile !== undefined) mikrotikUpdate.profile = updateData.profile;
      if (updateData.limitUptime !== undefined) mikrotikUpdate['limit-uptime'] = updateData.limitUptime;
      if (updateData.limitBytesTotal !== undefined) mikrotikUpdate['limit-bytes-total'] = updateData.limitBytesTotal;
      if (updateData.comment !== undefined) mikrotikUpdate.comment = updateData.comment;
      if (updateData.disabled !== undefined) mikrotikUpdate.disabled = updateData.disabled ? 'true' : 'false';

      await this.patch(`/rest/ip/hotspot/user/${existingUser['.id']}`, mikrotikUpdate);
      
      // Get the updated user
      const updatedUser = await this.getHotspotUser(username);
      if (!updatedUser) {
        throw new Error('User updated but could not be retrieved');
      }

      return updatedUser;
    } catch (error) {
      console.error(`Failed to update hotspot user ${username}:`, error);
      throw new Error(`Failed to update hotspot user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete hotspot user
   */
  async deleteHotspotUser(username: string): Promise<boolean> {
    try {
      // First get the user to get their ID
      const existingUser = await this.getHotspotUser(username);
      if (!existingUser) {
        throw new Error(`User ${username} not found`);
      }

      await this.delete(`/rest/ip/hotspot/user/${existingUser['.id']}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete hotspot user ${username}:`, error);
      throw new Error(`Failed to delete hotspot user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enable/disable hotspot user
   */
  async setHotspotUserStatus(username: string, enabled: boolean): Promise<MikroTikUser> {
    return this.updateHotspotUser(username, { disabled: !enabled });
  }

  /**
   * Get active hotspot users
   */
  async getActiveHotspotUsers(): Promise<MikroTikActiveUser[]> {
    try {
      const activeUsers = await this.get<MikroTikActiveUser[]>('/rest/ip/hotspot/active');
      return Array.isArray(activeUsers) ? activeUsers : [];
    } catch (error) {
      console.error('Failed to get active hotspot users:', error);
      throw new Error('Failed to retrieve active hotspot users from MikroTik');
    }
  }

  /**
   * Disconnect active user
   */
  async disconnectHotspotUser(username: string): Promise<boolean> {
    try {
      const activeUsers = await this.getActiveHotspotUsers();
      const activeUser = activeUsers.find(user => user.user === username);
      
      if (!activeUser) {
        throw new Error(`Active user ${username} not found`);
      }

      await this.delete(`/rest/ip/hotspot/active/${activeUser['.id']}`);
      return true;
    } catch (error) {
      console.error(`Failed to disconnect hotspot user ${username}:`, error);
      throw new Error(`Failed to disconnect hotspot user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get hotspot profiles
   */
  async getHotspotProfiles(): Promise<MikroTikProfile[]> {
    try {
      const profiles = await this.get<MikroTikProfile[]>('/rest/ip/hotspot/user/profile');
      return Array.isArray(profiles) ? profiles : [];
    } catch (error) {
      console.error('Failed to get hotspot profiles:', error);
      throw new Error('Failed to retrieve hotspot profiles from MikroTik');
    }
  }

  /**
   * Create hotspot profile
   */
  async createHotspotProfile(profileData: {
    name: string;
    rateLimit?: string;
    sessionTimeout?: string;
    idleTimeout?: string;
    sharedUsers?: number;
  }): Promise<MikroTikProfile> {
    try {
      const mikrotikProfile: Partial<MikroTikProfile> = {
        name: profileData.name,
        'rate-limit': profileData.rateLimit,
        'session-timeout': profileData.sessionTimeout,
        'idle-timeout': profileData.idleTimeout,
        'shared-users': profileData.sharedUsers?.toString()
      };

      // Remove undefined values
      Object.keys(mikrotikProfile).forEach(key => {
        if (mikrotikProfile[key as keyof MikroTikProfile] === undefined) {
          delete mikrotikProfile[key as keyof MikroTikProfile];
        }
      });

      await this.post('/rest/ip/hotspot/user/profile', mikrotikProfile);
      
      // Get the created profile
      const profiles = await this.getHotspotProfiles();
      const createdProfile = profiles.find(profile => profile.name === profileData.name);
      
      if (!createdProfile) {
        throw new Error('Profile created but could not be retrieved');
      }

      return createdProfile;
    } catch (error) {
      console.error(`Failed to create hotspot profile ${profileData.name}:`, error);
      throw new Error(`Failed to create hotspot profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get system resource information
   */
  async getSystemResources(): Promise<any> {
    try {
      return await this.get('/rest/system/resource');
    } catch (error) {
      console.error('Failed to get system resources:', error);
      throw new Error('Failed to retrieve system resources from MikroTik');
    }
  }

  /**
   * Get interface statistics
   */
  async getInterfaceStats(): Promise<any[]> {
    try {
      const interfaces = await this.get('/rest/interface');
      return Array.isArray(interfaces) ? interfaces : [];
    } catch (error) {
      console.error('Failed to get interface stats:', error);
      throw new Error('Failed to retrieve interface statistics from MikroTik');
    }
  }
}

export default MikroTikService;