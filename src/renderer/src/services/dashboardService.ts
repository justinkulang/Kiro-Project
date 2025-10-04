import { apiClient } from './apiClient';

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalVouchers: number;
  unusedVouchers: number;
  totalRevenue: number;
  monthlyRevenue: number;
  newUsersToday: number;
  vouchersUsedToday: number;
}

export interface ActiveUser {
  id: number;
  username: string;
  ipAddress: string;
  macAddress: string;
  sessionStart: string;
  dataUsed: number;
  timeUsed: number;
  billingPlan?: {
    id: number;
    name: string;
    price: number;
  };
}

export interface BandwidthData {
  timestamp: string;
  upload: number;
  download: number;
  total: number;
}

export interface SystemStatus {
  mikrotikConnected: boolean;
  databaseConnected: boolean;
  systemLoad: number;
  memoryUsage: number;
  diskUsage: number;
  uptime: number;
  lastBackup?: string;
}

export interface SessionLog {
  id: number;
  username: string;
  ipAddress: string;
  macAddress: string;
  sessionStart: string;
  sessionEnd?: string;
  dataUsed: number;
  timeUsed: number;
  disconnectReason?: string;
  billingPlan?: {
    id: number;
    name: string;
  };
}

export interface RevenueData {
  date: string;
  revenue: number;
  userCount: number;
  vouchersSold: number;
}

export interface UsageStats {
  totalDataTransferred: number;
  totalSessionTime: number;
  peakConcurrentUsers: number;
  averageSessionDuration: number;
  topUsers: Array<{
    username: string;
    dataUsed: number;
    timeUsed: number;
  }>;
}

class DashboardService {
  private baseUrl = '/api/dashboard';

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiClient.get(`${this.baseUrl}/stats`);
    return response.data.data;
  }

  /**
   * Get active users
   */
  async getActiveUsers(): Promise<ActiveUser[]> {
    const response = await apiClient.get(`${this.baseUrl}/active-users`);
    return response.data.data;
  }

  /**
   * Get bandwidth usage data
   */
  async getBandwidthData(period: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<BandwidthData[]> {
    const response = await apiClient.get(`${this.baseUrl}/bandwidth?period=${period}`);
    return response.data.data;
  }

  /**
   * Get system status
   */
  async getSystemStatus(): Promise<SystemStatus> {
    const response = await apiClient.get(`${this.baseUrl}/system-status`);
    return response.data.data;
  }

  /**
   * Get session logs with pagination
   */
  async getSessionLogs(page = 1, limit = 50, filters?: {
    username?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    data: SessionLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    if (filters?.username) params.append('username', filters.username);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const response = await apiClient.get(`${this.baseUrl}/session-logs?${params.toString()}`);
    return response.data;
  }

  /**
   * Get revenue data
   */
  async getRevenueData(period: 'week' | 'month' | 'year' = 'month'): Promise<RevenueData[]> {
    const response = await apiClient.get(`${this.baseUrl}/revenue?period=${period}`);
    return response.data.data;
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(period: 'day' | 'week' | 'month' = 'month'): Promise<UsageStats> {
    const response = await apiClient.get(`${this.baseUrl}/usage-stats?period=${period}`);
    return response.data.data;
  }

  /**
   * Disconnect a user session
   */
  async disconnectUser(userId: number): Promise<void> {
    await apiClient.post(`${this.baseUrl}/disconnect-user`, { userId });
  }

  /**
   * Get real-time metrics (for auto-refresh)
   */
  async getRealTimeMetrics(): Promise<{
    activeUsers: number;
    currentBandwidth: {
      upload: number;
      download: number;
    };
    systemLoad: number;
    memoryUsage: number;
  }> {
    const response = await apiClient.get(`${this.baseUrl}/realtime-metrics`);
    return response.data.data;
  }

  /**
   * Get user activity timeline
   */
  async getUserActivityTimeline(hours = 24): Promise<Array<{
    timestamp: string;
    activeUsers: number;
    newSessions: number;
    endedSessions: number;
  }>> {
    const response = await apiClient.get(`${this.baseUrl}/user-activity-timeline?hours=${hours}`);
    return response.data.data;
  }

  /**
   * Get top billing plans by usage
   */
  async getTopBillingPlans(): Promise<Array<{
    id: number;
    name: string;
    activeUsers: number;
    totalRevenue: number;
    usagePercentage: number;
  }>> {
    const response = await apiClient.get(`${this.baseUrl}/top-billing-plans`);
    return response.data.data;
  }

  /**
   * Get network interface statistics
   */
  async getNetworkStats(): Promise<Array<{
    interface: string;
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
    errors: number;
  }>> {
    const response = await apiClient.get(`${this.baseUrl}/network-stats`);
    return response.data.data;
  }

  /**
   * Get alerts and notifications
   */
  async getAlerts(): Promise<Array<{
    id: number;
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: string;
    acknowledged: boolean;
  }>> {
    const response = await apiClient.get(`${this.baseUrl}/alerts`);
    return response.data.data;
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: number): Promise<void> {
    await apiClient.post(`${this.baseUrl}/alerts/${alertId}/acknowledge`);
  }

  /**
   * Get data usage by time periods
   */
  async getDataUsageByPeriod(period: 'hour' | 'day' | 'week' = 'day'): Promise<Array<{
    period: string;
    upload: number;
    download: number;
    total: number;
    userCount: number;
  }>> {
    const response = await apiClient.get(`${this.baseUrl}/data-usage-by-period?period=${period}`);
    return response.data.data;
  }

  /**
   * Export dashboard data
   */
  async exportDashboardData(format: 'pdf' | 'excel' = 'pdf', period: 'day' | 'week' | 'month' = 'month'): Promise<void> {
    const response = await apiClient.get(`${this.baseUrl}/export?format=${format}&period=${period}`, {
      responseType: 'blob',
    });

    // Create download link
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard_report_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const dashboardService = new DashboardService();