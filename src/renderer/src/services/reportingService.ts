import { apiClient } from './apiClient';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  userIds?: number[];
  billingPlanIds?: number[];
  includeInactive?: boolean;
}

export interface UserReport {
  id: number;
  username: string;
  email?: string;
  fullName?: string;
  billingPlan?: {
    id: number;
    name: string;
    price: number;
  };
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  totalSessions: number;
  totalDataUsed: number;
  totalTimeUsed: number;
  totalRevenue: number;
}

export interface RevenueReport {
  date: string;
  totalRevenue: number;
  voucherRevenue: number;
  subscriptionRevenue: number;
  userCount: number;
  vouchersSold: number;
  newUsers: number;
}

export interface UsageReport {
  date: string;
  totalDataTransferred: number;
  totalSessionTime: number;
  uniqueUsers: number;
  peakConcurrentUsers: number;
  averageSessionDuration: number;
}

export interface BillingPlanReport {
  id: number;
  name: string;
  price: number;
  activeUsers: number;
  totalRevenue: number;
  vouchersSold: number;
  averageUsage: {
    dataUsed: number;
    timeUsed: number;
  };
  conversionRate: number;
}

export interface SessionReport {
  id: number;
  username: string;
  ipAddress: string;
  macAddress: string;
  sessionStart: string;
  sessionEnd?: string;
  duration: number;
  dataUsed: number;
  billingPlan?: {
    id: number;
    name: string;
  };
  disconnectReason?: string;
}

export interface VoucherReport {
  id: number;
  code: string;
  billingPlan: {
    id: number;
    name: string;
    price: number;
  };
  isUsed: boolean;
  usedBy?: number;
  usedAt?: string;
  createdAt: string;
  expiresAt?: string;
  batchId?: string;
}

export interface ReportSummary {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  totalDataTransferred: number;
  totalSessions: number;
  averageSessionDuration: number;
  topBillingPlans: Array<{
    name: string;
    userCount: number;
    revenue: number;
  }>;
  revenueGrowth: number;
  userGrowth: number;
}

class ReportingService {
  private baseUrl = '/api/reports';

  /**
   * Generate user report
   */
  async generateUserReport(filters: ReportFilters = {}): Promise<UserReport[]> {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.userIds?.length) params.append('userIds', filters.userIds.join(','));
    if (filters.billingPlanIds?.length) params.append('billingPlanIds', filters.billingPlanIds.join(','));
    if (filters.includeInactive !== undefined) params.append('includeInactive', filters.includeInactive.toString());

    const response = await apiClient.get(`${this.baseUrl}/users?${params.toString()}`);
    return response.data.data;
  }

  /**
   * Generate revenue report
   */
  async generateRevenueReport(filters: ReportFilters = {}): Promise<RevenueReport[]> {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.billingPlanIds?.length) params.append('billingPlanIds', filters.billingPlanIds.join(','));

    const response = await apiClient.get(`${this.baseUrl}/revenue?${params.toString()}`);
    return response.data.data;
  }

  /**
   * Generate usage report
   */
  async generateUsageReport(filters: ReportFilters = {}): Promise<UsageReport[]> {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.userIds?.length) params.append('userIds', filters.userIds.join(','));

    const response = await apiClient.get(`${this.baseUrl}/usage?${params.toString()}`);
    return response.data.data;
  }

  /**
   * Generate billing plan report
   */
  async generateBillingPlanReport(filters: ReportFilters = {}): Promise<BillingPlanReport[]> {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.billingPlanIds?.length) params.append('billingPlanIds', filters.billingPlanIds.join(','));

    const response = await apiClient.get(`${this.baseUrl}/billing-plans?${params.toString()}`);
    return response.data.data;
  }

  /**
   * Generate session report
   */
  async generateSessionReport(filters: ReportFilters & {
    page?: number;
    limit?: number;
  } = {}): Promise<{
    data: SessionReport[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.userIds?.length) params.append('userIds', filters.userIds.join(','));
    if (filters.billingPlanIds?.length) params.append('billingPlanIds', filters.billingPlanIds.join(','));
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await apiClient.get(`${this.baseUrl}/sessions?${params.toString()}`);
    return response.data;
  }

  /**
   * Generate voucher report
   */
  async generateVoucherReport(filters: ReportFilters & {
    page?: number;
    limit?: number;
    isUsed?: boolean;
  } = {}): Promise<{
    data: VoucherReport[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.billingPlanIds?.length) params.append('billingPlanIds', filters.billingPlanIds.join(','));
    if (filters.isUsed !== undefined) params.append('isUsed', filters.isUsed.toString());
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await apiClient.get(`${this.baseUrl}/vouchers?${params.toString()}`);
    return response.data;
  }

  /**
   * Get report summary
   */
  async getReportSummary(filters: ReportFilters = {}): Promise<ReportSummary> {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await apiClient.get(`${this.baseUrl}/summary?${params.toString()}`);
    return response.data.data;
  }

  /**
   * Export report to PDF
   */
  async exportToPDF(reportType: 'users' | 'revenue' | 'usage' | 'billing-plans' | 'sessions' | 'vouchers', filters: ReportFilters = {}): Promise<void> {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.userIds?.length) params.append('userIds', filters.userIds.join(','));
    if (filters.billingPlanIds?.length) params.append('billingPlanIds', filters.billingPlanIds.join(','));
    if (filters.includeInactive !== undefined) params.append('includeInactive', filters.includeInactive.toString());

    const response = await apiClient.get(`${this.baseUrl}/${reportType}/export/pdf?${params.toString()}`, {
      responseType: 'blob',
    });

    // Create download link
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Export report to Excel
   */
  async exportToExcel(reportType: 'users' | 'revenue' | 'usage' | 'billing-plans' | 'sessions' | 'vouchers', filters: ReportFilters = {}): Promise<void> {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.userIds?.length) params.append('userIds', filters.userIds.join(','));
    if (filters.billingPlanIds?.length) params.append('billingPlanIds', filters.billingPlanIds.join(','));
    if (filters.includeInactive !== undefined) params.append('includeInactive', filters.includeInactive.toString());

    const response = await apiClient.get(`${this.baseUrl}/${reportType}/export/excel?${params.toString()}`, {
      responseType: 'blob',
    });

    // Create download link
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Schedule report generation
   */
  async scheduleReport(config: {
    reportType: 'users' | 'revenue' | 'usage' | 'billing-plans' | 'sessions' | 'vouchers';
    frequency: 'daily' | 'weekly' | 'monthly';
    format: 'pdf' | 'excel';
    email: string;
    filters?: ReportFilters;
  }): Promise<{ id: number; message: string }> {
    const response = await apiClient.post(`${this.baseUrl}/schedule`, config);
    return response.data.data;
  }

  /**
   * Get scheduled reports
   */
  async getScheduledReports(): Promise<Array<{
    id: number;
    reportType: string;
    frequency: string;
    format: string;
    email: string;
    nextRun: string;
    isActive: boolean;
    createdAt: string;
  }>> {
    const response = await apiClient.get(`${this.baseUrl}/scheduled`);
    return response.data.data;
  }

  /**
   * Cancel scheduled report
   */
  async cancelScheduledReport(id: number): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/scheduled/${id}`);
  }

  /**
   * Get report history
   */
  async getReportHistory(page = 1, limit = 50): Promise<{
    data: Array<{
      id: number;
      reportType: string;
      format: string;
      filters: any;
      generatedAt: string;
      fileSize: number;
      downloadUrl?: string;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const response = await apiClient.get(`${this.baseUrl}/history?page=${page}&limit=${limit}`);
    return response.data;
  }

  /**
   * Download report from history
   */
  async downloadHistoryReport(id: number): Promise<void> {
    const response = await apiClient.get(`${this.baseUrl}/history/${id}/download`, {
      responseType: 'blob',
    });

    // Get filename from response headers
    const contentDisposition = response.headers['content-disposition'];
    const filename = contentDisposition 
      ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
      : `report_${id}.pdf`;

    // Create download link
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Get available billing plans for filters
   */
  async getBillingPlans(): Promise<Array<{
    id: number;
    name: string;
    price: number;
    isActive: boolean;
  }>> {
    const response = await apiClient.get('/api/billing-plans');
    return response.data.data;
  }

  /**
   * Get available users for filters
   */
  async getUsers(search?: string): Promise<Array<{
    id: number;
    username: string;
    fullName?: string;
    email?: string;
  }>> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);

    const response = await apiClient.get(`/api/users/search?${params.toString()}`);
    return response.data.data;
  }
}

export const reportingService = new ReportingService();