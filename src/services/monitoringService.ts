import MikroTikService, { MikroTikActiveUser, ConnectionStatus } from './mikrotikService';
import { getHotspotUserRepository } from '../models';
import { UserSession } from '../models/types';

export interface SessionData {
  username: string;
  ipAddress: string;
  macAddress: string;
  bytesIn: number;
  bytesOut: number;
  uptime: number; // in seconds
  sessionTimeLeft?: number; // in seconds
}

export interface MonitoringStats {
  totalActiveUsers: number;
  totalBandwidthIn: number;
  totalBandwidthOut: number;
  averageSessionTime: number;
  connectionStatus: ConnectionStatus;
  lastUpdate: Date;
}

export interface UserActivity {
  username: string;
  loginTime: Date;
  logoutTime?: Date;
  bytesTransferred: number;
  sessionDuration: number; // in minutes
  ipAddress: string;
  macAddress: string;
}

class MonitoringService {
  private mikrotikService: MikroTikService;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private monitoringIntervalMs = 30000; // 30 seconds
  private lastKnownSessions = new Map<string, SessionData>();
  private sessionHistory: UserActivity[] = [];

  constructor(mikrotikService: MikroTikService) {
    this.mikrotikService = mikrotikService;
  }

  /**
   * Start monitoring active users
   */
  startMonitoring(intervalMs: number = this.monitoringIntervalMs): void {
    if (this.isMonitoring) {
      console.log('Monitoring is already running');
      return;
    }

    this.monitoringIntervalMs = intervalMs;
    this.isMonitoring = true;

    console.log(`Starting user monitoring with ${intervalMs}ms interval`);

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.updateActiveUsers();
      } catch (error) {
        console.error('Error during monitoring update:', error);
      }
    }, intervalMs);

    // Initial update
    this.updateActiveUsers().catch(error => {
      console.error('Error during initial monitoring update:', error);
    });
  }

  /**
   * Stop monitoring active users
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      console.log('Monitoring is not running');
      return;
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    console.log('User monitoring stopped');
  }

  /**
   * Check if monitoring is active
   */
  isMonitoringActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Update active users data
   */
  private async updateActiveUsers(): Promise<void> {
    try {
      const activeUsers = await this.mikrotikService.getActiveHotspotUsers();
      const currentSessions = new Map<string, SessionData>();

      // Process current active users
      for (const user of activeUsers) {
        const sessionData: SessionData = {
          username: user.user,
          ipAddress: user.address,
          macAddress: user['mac-address'],
          bytesIn: this.parseBytes(user['bytes-in']),
          bytesOut: this.parseBytes(user['bytes-out']),
          uptime: this.parseUptime(user.uptime),
          sessionTimeLeft: user['session-time-left'] ? this.parseUptime(user['session-time-left']) : undefined
        };

        currentSessions.set(user.user, sessionData);

        // Update database with session data
        await this.updateUserSession(sessionData);
      }

      // Detect disconnected users
      await this.handleDisconnectedUsers(currentSessions);

      // Update last known sessions
      this.lastKnownSessions = currentSessions;

      console.log(`Monitoring update completed: ${activeUsers.length} active users`);
    } catch (error) {
      console.error('Failed to update active users:', error);
      throw error;
    }
  }

  /**
   * Update user session in database
   */
  private async updateUserSession(sessionData: SessionData): Promise<void> {
    try {
      const userRepo = getHotspotUserRepository();
      const user = await userRepo.findByUsername(sessionData.username);

      if (!user) {
        console.warn(`User ${sessionData.username} not found in database`);
        return;
      }

      // Update user's last login and usage stats
      const totalBytes = sessionData.bytesIn + sessionData.bytesOut;
      const sessionMinutes = Math.floor(sessionData.uptime / 60);

      await userRepo.update(user.id!, {
        last_login: new Date().toISOString(),
        data_used: user.data_used + totalBytes,
        time_used: user.time_used + sessionMinutes
      });

      // Note: In a full implementation, you would also update the user_sessions table
      // This would require additional database operations to track individual sessions
    } catch (error) {
      console.error(`Failed to update session for user ${sessionData.username}:`, error);
    }
  }

  /**
   * Handle users who have disconnected
   */
  private async handleDisconnectedUsers(currentSessions: Map<string, SessionData>): Promise<void> {
    for (const [username, lastSession] of this.lastKnownSessions) {
      if (!currentSessions.has(username)) {
        // User has disconnected
        const activity: UserActivity = {
          username,
          loginTime: new Date(Date.now() - lastSession.uptime * 1000),
          logoutTime: new Date(),
          bytesTransferred: lastSession.bytesIn + lastSession.bytesOut,
          sessionDuration: Math.floor(lastSession.uptime / 60),
          ipAddress: lastSession.ipAddress,
          macAddress: lastSession.macAddress
        };

        this.sessionHistory.push(activity);
        console.log(`User ${username} disconnected after ${activity.sessionDuration} minutes`);

        // Keep only last 1000 session records in memory
        if (this.sessionHistory.length > 1000) {
          this.sessionHistory = this.sessionHistory.slice(-1000);
        }
      }
    }
  }

  /**
   * Get current active users
   */
  async getActiveUsers(): Promise<SessionData[]> {
    try {
      const activeUsers = await this.mikrotikService.getActiveHotspotUsers();
      return activeUsers.map(user => ({
        username: user.user,
        ipAddress: user.address,
        macAddress: user['mac-address'],
        bytesIn: this.parseBytes(user['bytes-in']),
        bytesOut: this.parseBytes(user['bytes-out']),
        uptime: this.parseUptime(user.uptime),
        sessionTimeLeft: user['session-time-left'] ? this.parseUptime(user['session-time-left']) : undefined
      }));
    } catch (error) {
      console.error('Failed to get active users:', error);
      throw error;
    }
  }

  /**
   * Get monitoring statistics
   */
  async getMonitoringStats(): Promise<MonitoringStats> {
    try {
      const activeUsers = await this.getActiveUsers();
      const connectionStatus = this.mikrotikService.getConnectionStatus();

      const totalBandwidthIn = activeUsers.reduce((sum, user) => sum + user.bytesIn, 0);
      const totalBandwidthOut = activeUsers.reduce((sum, user) => sum + user.bytesOut, 0);
      const averageSessionTime = activeUsers.length > 0 
        ? activeUsers.reduce((sum, user) => sum + user.uptime, 0) / activeUsers.length 
        : 0;

      return {
        totalActiveUsers: activeUsers.length,
        totalBandwidthIn,
        totalBandwidthOut,
        averageSessionTime,
        connectionStatus,
        lastUpdate: new Date()
      };
    } catch (error) {
      console.error('Failed to get monitoring stats:', error);
      throw error;
    }
  }

  /**
   * Get session history
   */
  getSessionHistory(limit: number = 100): UserActivity[] {
    return this.sessionHistory
      .sort((a, b) => b.loginTime.getTime() - a.loginTime.getTime())
      .slice(0, limit);
  }

  /**
   * Get user session details
   */
  async getUserSession(username: string): Promise<SessionData | null> {
    const activeUsers = await this.getActiveUsers();
    return activeUsers.find(user => user.username === username) || null;
  }

  /**
   * Disconnect user session
   */
  async disconnectUser(username: string): Promise<boolean> {
    try {
      return await this.mikrotikService.disconnectHotspotUser(username);
    } catch (error) {
      console.error(`Failed to disconnect user ${username}:`, error);
      throw error;
    }
  }

  /**
   * Get bandwidth usage for a specific user
   */
  async getUserBandwidthUsage(username: string, timeRangeHours: number = 24): Promise<{
    bytesIn: number;
    bytesOut: number;
    totalBytes: number;
    timeRange: string;
  }> {
    // In a full implementation, this would query historical data
    // For now, we'll return current session data if user is active
    const currentSession = await this.getUserSession(username);
    
    if (currentSession) {
      return {
        bytesIn: currentSession.bytesIn,
        bytesOut: currentSession.bytesOut,
        totalBytes: currentSession.bytesIn + currentSession.bytesOut,
        timeRange: `Last ${timeRangeHours} hours (current session)`
      };
    }

    return {
      bytesIn: 0,
      bytesOut: 0,
      totalBytes: 0,
      timeRange: `Last ${timeRangeHours} hours (no active session)`
    };
  }

  /**
   * Parse bytes string to number
   */
  private parseBytes(bytesStr: string): number {
    if (!bytesStr) return 0;
    
    // Handle different formats like "1.2M", "500K", "1.5G"
    const match = bytesStr.match(/^([\d.]+)([KMGT]?)$/i);
    if (!match) return parseInt(bytesStr) || 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    switch (unit) {
      case 'K': return Math.floor(value * 1024);
      case 'M': return Math.floor(value * 1024 * 1024);
      case 'G': return Math.floor(value * 1024 * 1024 * 1024);
      case 'T': return Math.floor(value * 1024 * 1024 * 1024 * 1024);
      default: return Math.floor(value);
    }
  }

  /**
   * Parse uptime string to seconds
   */
  private parseUptime(uptimeStr: string): number {
    if (!uptimeStr) return 0;

    // Handle formats like "1h2m3s", "2m30s", "45s"
    let totalSeconds = 0;
    
    const hours = uptimeStr.match(/(\d+)h/);
    const minutes = uptimeStr.match(/(\d+)m/);
    const seconds = uptimeStr.match(/(\d+)s/);

    if (hours) totalSeconds += parseInt(hours[1]) * 3600;
    if (minutes) totalSeconds += parseInt(minutes[1]) * 60;
    if (seconds) totalSeconds += parseInt(seconds[1]);

    return totalSeconds;
  }

  /**
   * Format bytes for display
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format uptime for display
   */
  static formatUptime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
}

export default MonitoringService;