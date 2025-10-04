import { getUserSessionRepository, getHotspotUserRepository, getVoucherRepository } from '../models';

export interface HourlyStats {
  hour: string; // ISO string for the hour
  activeUsers: number;
  newSessions: number;
  totalBandwidth: number;
  revenue: number;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD format
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  totalSessions: number;
  totalBandwidth: number;
  revenue: number;
  averageSessionDuration: number;
}

export interface BandwidthTrend {
  timestamp: Date;
  bytesIn: number;
  bytesOut: number;
  totalBytes: number;
  activeUsers: number;
}

class DataAggregationService {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data or execute function and cache result
   */
  private async getCachedData<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < cached.ttl) {
      return cached.data as T;
    }

    const data = await fetchFunction();
    this.cache.set(key, { data, timestamp: now, ttl });
    
    return data;
  }

  /**
   * Clear cache for specific key or all cache
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get hourly statistics for the last N hours
   */
  async getHourlyStats(hours: number = 24): Promise<HourlyStats[]> {
    const cacheKey = `hourly_stats_${hours}`;
    
    return this.getCachedData(cacheKey, async () => {
      const sessionRepo = getUserSessionRepository();
      const voucherRepo = getVoucherRepository();
      
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);
      
      // Get sessions in the time range
      const sessions = await sessionRepo.findRecentSessions(hours);
      
      // Get vouchers used in the time range
      const usedVouchers = await voucherRepo.findByCondition({ is_used: true });
      
      // Group data by hour
      const hourlyData = new Map<string, {
        activeUsers: Set<number>;
        newSessions: number;
        totalBandwidth: number;
        revenue: number;
      }>();

      // Initialize all hours
      for (let i = 0; i < hours; i++) {
        const hourStart = new Date(startTime.getTime() + i * 60 * 60 * 1000);
        const hourKey = hourStart.toISOString().substring(0, 13) + ':00:00.000Z';
        hourlyData.set(hourKey, {
          activeUsers: new Set(),
          newSessions: 0,
          totalBandwidth: 0,
          revenue: 0
        });
      }

      // Process sessions
      for (const session of sessions) {
        const sessionStart = new Date(session.start_time!);
        if (sessionStart >= startTime && sessionStart <= endTime) {
          const hourKey = new Date(sessionStart.getFullYear(), sessionStart.getMonth(), 
            sessionStart.getDate(), sessionStart.getHours()).toISOString();
          
          const hourData = hourlyData.get(hourKey);
          if (hourData) {
            hourData.activeUsers.add(session.user_id);
            hourData.newSessions++;
            hourData.totalBandwidth += session.bytes_in + session.bytes_out;
          }
        }
      }

      // Process voucher revenue (simplified - would need billing plan data for accurate calculation)
      for (const voucher of usedVouchers) {
        if (voucher.used_at) {
          const usedTime = new Date(voucher.used_at);
          if (usedTime >= startTime && usedTime <= endTime) {
            const hourKey = new Date(usedTime.getFullYear(), usedTime.getMonth(), 
              usedTime.getDate(), usedTime.getHours()).toISOString();
            
            const hourData = hourlyData.get(hourKey);
            if (hourData) {
              // Note: This is simplified. In a real implementation, you'd join with billing_plans
              hourData.revenue += 10; // Placeholder value
            }
          }
        }
      }

      // Convert to array format
      return Array.from(hourlyData.entries()).map(([hour, data]) => ({
        hour,
        activeUsers: data.activeUsers.size,
        newSessions: data.newSessions,
        totalBandwidth: data.totalBandwidth,
        revenue: data.revenue
      }));
    }, 2 * 60 * 1000); // 2 minute cache
  }

  /**
   * Get daily statistics for the last N days
   */
  async getDailyStats(days: number = 30): Promise<DailyStats[]> {
    const cacheKey = `daily_stats_${days}`;
    
    return this.getCachedData(cacheKey, async () => {
      const userRepo = getHotspotUserRepository();
      const sessionRepo = getUserSessionRepository();
      const voucherRepo = getVoucherRepository();
      
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      // Get all relevant data
      const [allUsers, recentSessions, usedVouchers] = await Promise.all([
        userRepo.findAll({ page: 1, limit: 10000 }),
        sessionRepo.findRecentSessions(days * 24),
        voucherRepo.findByCondition({ is_used: true })
      ]);

      // Group data by date
      const dailyData = new Map<string, {
        totalUsers: number;
        activeUsers: Set<number>;
        newUsers: number;
        totalSessions: number;
        totalBandwidth: number;
        revenue: number;
        sessionDurations: number[];
      }>();

      // Initialize all dates
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dateKey = date.toISOString().split('T')[0];
        dailyData.set(dateKey, {
          totalUsers: 0,
          activeUsers: new Set(),
          newUsers: 0,
          totalSessions: 0,
          totalBandwidth: 0,
          revenue: 0,
          sessionDurations: []
        });
      }

      // Process users
      for (const user of allUsers.data) {
        const createdDate = new Date(user.created_at!).toISOString().split('T')[0];
        const dayData = dailyData.get(createdDate);
        if (dayData) {
          dayData.newUsers++;
        }
      }

      // Process sessions
      for (const session of recentSessions) {
        const sessionDate = new Date(session.start_time!).toISOString().split('T')[0];
        const dayData = dailyData.get(sessionDate);
        if (dayData) {
          dayData.activeUsers.add(session.user_id);
          dayData.totalSessions++;
          dayData.totalBandwidth += session.bytes_in + session.bytes_out;
          
          // Calculate session duration
          if (session.end_time) {
            const duration = new Date(session.end_time).getTime() - new Date(session.start_time!).getTime();
            dayData.sessionDurations.push(duration / 1000 / 60); // Convert to minutes
          }
        }
      }

      // Process voucher revenue
      for (const voucher of usedVouchers) {
        if (voucher.used_at) {
          const usedDate = new Date(voucher.used_at).toISOString().split('T')[0];
          const dayData = dailyData.get(usedDate);
          if (dayData) {
            dayData.revenue += 10; // Placeholder - would need billing plan data
          }
        }
      }

      // Convert to array format
      return Array.from(dailyData.entries()).map(([date, data]) => ({
        date,
        totalUsers: allUsers.total,
        activeUsers: data.activeUsers.size,
        newUsers: data.newUsers,
        totalSessions: data.totalSessions,
        totalBandwidth: data.totalBandwidth,
        revenue: data.revenue,
        averageSessionDuration: data.sessionDurations.length > 0 
          ? data.sessionDurations.reduce((sum, duration) => sum + duration, 0) / data.sessionDurations.length 
          : 0
      }));
    }, 10 * 60 * 1000); // 10 minute cache
  }

  /**
   * Get bandwidth trends over time
   */
  async getBandwidthTrends(hours: number = 24, intervalMinutes: number = 30): Promise<BandwidthTrend[]> {
    const cacheKey = `bandwidth_trends_${hours}_${intervalMinutes}`;
    
    return this.getCachedData(cacheKey, async () => {
      const sessionRepo = getUserSessionRepository();
      
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);
      const intervalMs = intervalMinutes * 60 * 1000;
      
      const sessions = await sessionRepo.findRecentSessions(hours);
      
      // Create time intervals
      const intervals: BandwidthTrend[] = [];
      for (let time = startTime.getTime(); time <= endTime.getTime(); time += intervalMs) {
        intervals.push({
          timestamp: new Date(time),
          bytesIn: 0,
          bytesOut: 0,
          totalBytes: 0,
          activeUsers: 0
        });
      }

      // Aggregate data into intervals
      for (const session of sessions) {
        const sessionStart = new Date(session.start_time!).getTime();
        const sessionEnd = session.end_time ? new Date(session.end_time).getTime() : endTime.getTime();
        
        // Find which intervals this session overlaps with
        for (const interval of intervals) {
          const intervalStart = interval.timestamp.getTime();
          const intervalEnd = intervalStart + intervalMs;
          
          // Check if session overlaps with this interval
          if (sessionStart < intervalEnd && sessionEnd > intervalStart) {
            interval.bytesIn += session.bytes_in;
            interval.bytesOut += session.bytes_out;
            interval.totalBytes += session.bytes_in + session.bytes_out;
            interval.activeUsers++;
          }
        }
      }

      return intervals;
    }, 5 * 60 * 1000); // 5 minute cache
  }

  /**
   * Get user activity patterns
   */
  async getUserActivityPatterns(): Promise<{
    peakHours: number[];
    averageSessionDuration: number;
    mostActiveDay: string;
    userGrowthRate: number;
  }> {
    const cacheKey = 'user_activity_patterns';
    
    return this.getCachedData(cacheKey, async () => {
      const sessionRepo = getUserSessionRepository();
      const userRepo = getHotspotUserRepository();
      
      const [recentSessions, allUsers] = await Promise.all([
        sessionRepo.findRecentSessions(7 * 24), // Last 7 days
        userRepo.findAll({ page: 1, limit: 10000 })
      ]);

      // Analyze peak hours
      const hourlyActivity = new Array(24).fill(0);
      const dailyActivity = new Map<string, number>();
      const sessionDurations: number[] = [];

      for (const session of recentSessions) {
        const sessionStart = new Date(session.start_time!);
        const hour = sessionStart.getHours();
        const day = sessionStart.toISOString().split('T')[0];
        
        hourlyActivity[hour]++;
        dailyActivity.set(day, (dailyActivity.get(day) || 0) + 1);
        
        if (session.end_time) {
          const duration = new Date(session.end_time).getTime() - sessionStart.getTime();
          sessionDurations.push(duration / 1000 / 60); // Convert to minutes
        }
      }

      // Find peak hours (top 3 hours with most activity)
      const peakHours = hourlyActivity
        .map((count, hour) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(item => item.hour);

      // Find most active day
      const mostActiveDay = Array.from(dailyActivity.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || '';

      // Calculate average session duration
      const averageSessionDuration = sessionDurations.length > 0
        ? sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length
        : 0;

      // Calculate user growth rate (users created in last 7 days vs previous 7 days)
      const now = new Date();
      const last7Days = allUsers.data.filter(user => {
        const createdAt = new Date(user.created_at!);
        return createdAt >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }).length;

      const previous7Days = allUsers.data.filter(user => {
        const createdAt = new Date(user.created_at!);
        return createdAt >= new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) &&
               createdAt < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }).length;

      const userGrowthRate = previous7Days > 0 ? ((last7Days - previous7Days) / previous7Days) * 100 : 0;

      return {
        peakHours,
        averageSessionDuration,
        mostActiveDay,
        userGrowthRate
      };
    }, 30 * 60 * 1000); // 30 minute cache
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    cacheHitRate: number;
    cacheSize: number;
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
  }> {
    return {
      cacheHitRate: 0, // Would need to track hits/misses
      cacheSize: this.cache.size,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  /**
   * Cleanup expired cache entries
   */
  cleanupCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if ((now - cached.timestamp) >= cached.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Start automatic cache cleanup
   */
  startCacheCleanup(intervalMs: number = 5 * 60 * 1000): void {
    setInterval(() => {
      this.cleanupCache();
    }, intervalMs);
  }
}

export default DataAggregationService;