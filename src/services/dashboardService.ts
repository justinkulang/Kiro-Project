import MonitoringService, { SessionData, MonitoringStats } from './monitoringService';
import { voucherService } from './voucherService';
import { getHotspotUserRepository, getVoucherRepository, getBillingPlanRepository } from '../models';
import { VoucherStatistics } from '../models/types';

export interface DashboardStats {
  // User Statistics
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  
  // Voucher Statistics
  totalVouchers: number;
  usedVouchers: number;
  expiredVouchers: number;
  activeVouchers: number;
  
  // Revenue Statistics
  totalRevenue: number;
  revenueToday: number;
  revenueThisMonth: number;
  
  // Network Statistics
  totalBandwidthIn: number;
  totalBandwidthOut: number;
  averageSessionTime: number;
  
  // System Status
  connectionStatus: string;
  lastUpdate: Date;
}

export interface BandwidthDataPoint {
  timestamp: Date;
  bytesIn: number;
  bytesOut: number;
  activeUsers: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  vouchersUsed: number;
}

export interface UserActivitySummary {
  hour: number;
  activeUsers: number;
  newSessions: number;
  totalBandwidth: number;
}

export interface TopUser {
  username: string;
  totalBytes: number;
  sessionTime: number;
  lastSeen: Date;
}

class DashboardService {
  private monitoringService: MonitoringService;
  private bandwidthHistory: BandwidthDataPoint[] = [];
  private maxHistoryPoints = 288; // 24 hours at 5-minute intervals

  constructor(monitoringService: MonitoringService) {
    this.monitoringService = monitoringService;
  }

  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      // Get monitoring stats
      const monitoringStats = await this.monitoringService.getMonitoringStats();
      
      // Get user statistics
      const userRepo = getHotspotUserRepository();
      const allUsers = await userRepo.findAll({ page: 1, limit: 10000 });
      const activeUsers = allUsers.data.filter(user => user.is_active);
      
      // Get users created today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const newUsersToday = allUsers.data.filter(user => 
        new Date(user.created_at!) >= today
      ).length;

      // Get voucher statistics
      const voucherStats = await voucherService.getVoucherStatistics();
      
      // Get revenue statistics
      const revenueStats = await this.getRevenueStatistics();

      return {
        // User Statistics
        totalUsers: allUsers.total,
        activeUsers: monitoringStats.totalActiveUsers,
        newUsersToday,
        
        // Voucher Statistics
        totalVouchers: voucherStats.total_vouchers,
        usedVouchers: voucherStats.used_vouchers,
        expiredVouchers: voucherStats.expired_vouchers,
        activeVouchers: voucherStats.active_vouchers,
        
        // Revenue Statistics
        totalRevenue: voucherStats.revenue_generated,
        revenueToday: revenueStats.revenueToday,
        revenueThisMonth: revenueStats.revenueThisMonth,
        
        // Network Statistics
        totalBandwidthIn: monitoringStats.totalBandwidthIn,
        totalBandwidthOut: monitoringStats.totalBandwidthOut,
        averageSessionTime: monitoringStats.averageSessionTime,
        
        // System Status
        connectionStatus: monitoringStats.connectionStatus.status,
        lastUpdate: new Date()
      };
    } catch (error) {
      console.error('Failed to get dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Get bandwidth usage over time
   */
  async getBandwidthHistory(hours: number = 24): Promise<BandwidthDataPoint[]> {
    // In a production system, this would query historical data from database
    // For now, we'll return the in-memory history
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return this.bandwidthHistory.filter(point => point.timestamp >= cutoffTime);
  }

  /**
   * Record current bandwidth usage
   */
  async recordBandwidthUsage(): Promise<void> {
    try {
      const stats = await this.monitoringService.getMonitoringStats();
      
      const dataPoint: BandwidthDataPoint = {
        timestamp: new Date(),
        bytesIn: stats.totalBandwidthIn,
        bytesOut: stats.totalBandwidthOut,
        activeUsers: stats.totalActiveUsers
      };

      this.bandwidthHistory.push(dataPoint);

      // Keep only the last maxHistoryPoints
      if (this.bandwidthHistory.length > this.maxHistoryPoints) {
        this.bandwidthHistory = this.bandwidthHistory.slice(-this.maxHistoryPoints);
      }
    } catch (error) {
      console.error('Failed to record bandwidth usage:', error);
    }
  }

  /**
   * Get revenue statistics by time period
   */
  async getRevenueStatistics(): Promise<{
    revenueToday: number;
    revenueThisWeek: number;
    revenueThisMonth: number;
  }> {
    try {
      const voucherRepo = getVoucherRepository();
      const billingPlanRepo = getBillingPlanRepository();
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get all used vouchers
      const usedVouchers = await voucherRepo.findByCondition({ is_used: true });
      const allPlans = await billingPlanRepo.findAll({ page: 1, limit: 1000 });

      let revenueToday = 0;
      let revenueThisWeek = 0;
      let revenueThisMonth = 0;

      for (const voucher of usedVouchers) {
        if (!voucher.used_at) continue;
        
        const usedDate = new Date(voucher.used_at);
        const plan = allPlans.data.find(p => p.id === voucher.billing_plan_id);
        
        if (!plan) continue;

        if (usedDate >= today) {
          revenueToday += plan.price;
        }
        if (usedDate >= thisWeek) {
          revenueThisWeek += plan.price;
        }
        if (usedDate >= thisMonth) {
          revenueThisMonth += plan.price;
        }
      }

      return {
        revenueToday,
        revenueThisWeek,
        revenueThisMonth
      };
    } catch (error) {
      console.error('Failed to get revenue statistics:', error);
      return {
        revenueToday: 0,
        revenueThisWeek: 0,
        revenueThisMonth: 0
      };
    }
  }

  /**
   * Get revenue data by day for charts
   */
  async getRevenueHistory(days: number = 30): Promise<RevenueDataPoint[]> {
    try {
      const voucherRepo = getVoucherRepository();
      const billingPlanRepo = getBillingPlanRepository();
      
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      const usedVouchers = await voucherRepo.findByCondition({ is_used: true });
      const allPlans = await billingPlanRepo.findAll({ page: 1, limit: 1000 });
      
      // Group vouchers by date
      const revenueByDate = new Map<string, { revenue: number; count: number }>();
      
      // Initialize all dates with zero values
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        revenueByDate.set(dateStr, { revenue: 0, count: 0 });
      }

      // Calculate revenue for each date
      for (const voucher of usedVouchers) {
        if (!voucher.used_at) continue;
        
        const usedDate = new Date(voucher.used_at);
        if (usedDate < startDate || usedDate > endDate) continue;
        
        const dateStr = usedDate.toISOString().split('T')[0];
        const plan = allPlans.data.find(p => p.id === voucher.billing_plan_id);
        
        if (plan && revenueByDate.has(dateStr)) {
          const current = revenueByDate.get(dateStr)!;
          revenueByDate.set(dateStr, {
            revenue: current.revenue + plan.price,
            count: current.count + 1
          });
        }
      }

      // Convert to array format
      return Array.from(revenueByDate.entries()).map(([date, data]) => ({
        date,
        revenue: data.revenue,
        vouchersUsed: data.count
      }));
    } catch (error) {
      console.error('Failed to get revenue history:', error);
      return [];
    }
  }

  /**
   * Get user activity summary by hour
   */
  async getUserActivitySummary(hours: number = 24): Promise<UserActivitySummary[]> {
    try {
      const sessionHistory = this.monitoringService.getSessionHistory(1000);
      const now = new Date();
      const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
      
      // Group sessions by hour
      const activityByHour = new Map<number, {
        activeUsers: Set<string>;
        newSessions: number;
        totalBandwidth: number;
      }>();

      // Initialize all hours
      for (let i = 0; i < hours; i++) {
        const hour = new Date(startTime.getTime() + i * 60 * 60 * 1000).getHours();
        activityByHour.set(hour, {
          activeUsers: new Set(),
          newSessions: 0,
          totalBandwidth: 0
        });
      }

      // Process session history
      for (const session of sessionHistory) {
        if (session.loginTime < startTime) continue;
        
        const hour = session.loginTime.getHours();
        const hourData = activityByHour.get(hour);
        
        if (hourData) {
          hourData.activeUsers.add(session.username);
          hourData.newSessions++;
          hourData.totalBandwidth += session.bytesTransferred;
        }
      }

      // Convert to array format
      return Array.from(activityByHour.entries()).map(([hour, data]) => ({
        hour,
        activeUsers: data.activeUsers.size,
        newSessions: data.newSessions,
        totalBandwidth: data.totalBandwidth
      }));
    } catch (error) {
      console.error('Failed to get user activity summary:', error);
      return [];
    }
  }

  /**
   * Get top users by bandwidth usage
   */
  async getTopUsers(limit: number = 10): Promise<TopUser[]> {
    try {
      const userRepo = getHotspotUserRepository();
      const allUsers = await userRepo.findAll({ page: 1, limit: 1000 });
      
      // Sort users by data usage and get top users
      const topUsers = allUsers.data
        .filter(user => user.data_used > 0)
        .sort((a, b) => b.data_used - a.data_used)
        .slice(0, limit)
        .map(user => ({
          username: user.username,
          totalBytes: user.data_used,
          sessionTime: user.time_used,
          lastSeen: user.last_login ? new Date(user.last_login) : new Date(user.created_at!)
        }));

      return topUsers;
    } catch (error) {
      console.error('Failed to get top users:', error);
      return [];
    }
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth(): Promise<{
    mikrotikConnection: boolean;
    databaseConnection: boolean;
    monitoringActive: boolean;
    lastDataUpdate: Date;
    uptime: number;
  }> {
    try {
      const monitoringStats = await this.monitoringService.getMonitoringStats();
      
      return {
        mikrotikConnection: monitoringStats.connectionStatus.status === 'connected',
        databaseConnection: true, // If we got here, DB is working
        monitoringActive: this.monitoringService.isMonitoringActive(),
        lastDataUpdate: monitoringStats.lastUpdate,
        uptime: process.uptime()
      };
    } catch (error) {
      console.error('Failed to get system health:', error);
      return {
        mikrotikConnection: false,
        databaseConnection: false,
        monitoringActive: false,
        lastDataUpdate: new Date(),
        uptime: 0
      };
    }
  }

  /**
   * Start automatic data collection
   */
  startDataCollection(intervalMs: number = 300000): void { // 5 minutes default
    setInterval(() => {
      this.recordBandwidthUsage().catch(error => {
        console.error('Failed to record bandwidth usage:', error);
      });
    }, intervalMs);
  }

  /**
   * Get real-time dashboard data (for WebSocket updates)
   */
  async getRealTimeData(): Promise<{
    activeUsers: SessionData[];
    stats: DashboardStats;
    systemHealth: any;
  }> {
    try {
      const [activeUsers, stats, systemHealth] = await Promise.all([
        this.monitoringService.getActiveUsers(),
        this.getDashboardStats(),
        this.getSystemHealth()
      ]);

      return {
        activeUsers,
        stats,
        systemHealth
      };
    } catch (error) {
      console.error('Failed to get real-time data:', error);
      throw error;
    }
  }
}

export default DashboardService;