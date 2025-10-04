import { apiClient } from './apiClient';

export interface Voucher {
  id: number;
  code: string;
  billingPlanId: number;
  billingPlan?: {
    id: number;
    name: string;
    price: number;
    timeLimit?: number;
    dataLimit?: number;
    validityPeriod: number;
  };
  isUsed: boolean;
  usedBy?: number;
  usedAt?: string;
  createdAt: string;
  expiresAt?: string;
  batchId?: string;
}

export interface BillingPlan {
  id: number;
  name: string;
  description?: string;
  price: number;
  timeLimit?: number;
  dataLimit?: number;
  validityPeriod: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVoucherData {
  billingPlanId: number;
  quantity?: number;
  expiresAt?: string;
  prefix?: string;
}

export interface VoucherFilters {
  page?: number;
  limit?: number;
  search?: string;
  isUsed?: boolean;
  billingPlanId?: number;
  batchId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface VoucherStats {
  totalVouchers: number;
  usedVouchers: number;
  unusedVouchers: number;
  expiredVouchers: number;
  vouchersCreatedToday: number;
  vouchersUsedToday: number;
}

export interface BatchVoucherOperation {
  voucherIds: number[];
  operation: 'delete' | 'extend_expiry';
  data?: any;
}

class VoucherService {
  private baseUrl = '/api/vouchers';

  /**
   * Get paginated list of vouchers with optional filters
   */
  async getVouchers(filters: VoucherFilters = {}): Promise<PaginatedResponse<Voucher>> {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.isUsed !== undefined) params.append('isUsed', filters.isUsed.toString());
    if (filters.billingPlanId) params.append('billingPlanId', filters.billingPlanId.toString());
    if (filters.batchId) params.append('batchId', filters.batchId);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const response = await apiClient.get(`${this.baseUrl}?${params.toString()}`);
    return response.data;
  }

  /**
   * Get a single voucher by ID
   */
  async getVoucher(id: number): Promise<Voucher> {
    const response = await apiClient.get(`${this.baseUrl}/${id}`);
    return response.data.data;
  }

  /**
   * Get voucher by code
   */
  async getVoucherByCode(code: string): Promise<Voucher> {
    const response = await apiClient.get(`${this.baseUrl}/code/${code}`);
    return response.data.data;
  }

  /**
   * Create vouchers (single or batch)
   */
  async createVouchers(voucherData: CreateVoucherData): Promise<Voucher[]> {
    const response = await apiClient.post(this.baseUrl, voucherData);
    return response.data.data;
  }

  /**
   * Delete a voucher
   */
  async deleteVoucher(id: number): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Get voucher statistics
   */
  async getVoucherStats(): Promise<VoucherStats> {
    const response = await apiClient.get(`${this.baseUrl}/stats`);
    return response.data.data;
  }

  /**
   * Get all billing plans
   */
  async getBillingPlans(): Promise<PaginatedResponse<BillingPlan>> {
    const response = await apiClient.get('/api/billing-plans');
    return response.data;
  }

  /**
   * Export vouchers to PDF/Excel
   */
  async exportVouchers(filters: VoucherFilters = {}, format: 'pdf' | 'excel' = 'pdf'): Promise<void> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.isUsed !== undefined) params.append('isUsed', filters.isUsed.toString());
    if (filters.billingPlanId) params.append('billingPlanId', filters.billingPlanId.toString());
    if (filters.batchId) params.append('batchId', filters.batchId);
    params.append('format', format);

    const response = await apiClient.get(`${this.baseUrl}/export?${params.toString()}`, {
      responseType: 'blob',
    });

    // Create download link
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vouchers_export_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Perform batch operations on multiple vouchers
   */
  async batchOperation(operation: BatchVoucherOperation): Promise<{ success: number; failed: number; errors: string[] }> {
    const response = await apiClient.post(`${this.baseUrl}/batch`, operation);
    return response.data.data;
  }

  /**
   * Validate voucher code
   */
  async validateVoucher(code: string): Promise<{ valid: boolean; voucher?: Voucher; error?: string }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/validate`, { code });
      return response.data.data;
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Validation failed' };
    }
  }

  /**
   * Use/redeem a voucher
   */
  async useVoucher(code: string, userId: number): Promise<Voucher> {
    const response = await apiClient.post(`${this.baseUrl}/use`, { code, userId });
    return response.data.data;
  }

  /**
   * Get vouchers by batch ID
   */
  async getVouchersByBatch(batchId: string, page = 1, limit = 50): Promise<PaginatedResponse<Voucher>> {
    const response = await apiClient.get(`${this.baseUrl}/batch/${batchId}?page=${page}&limit=${limit}`);
    return response.data;
  }

  /**
   * Get voucher usage history
   */
  async getVoucherUsageHistory(id: number): Promise<any[]> {
    const response = await apiClient.get(`${this.baseUrl}/${id}/usage-history`);
    return response.data.data;
  }

  /**
   * Extend voucher expiry date
   */
  async extendVoucherExpiry(id: number, days: number): Promise<Voucher> {
    const response = await apiClient.post(`${this.baseUrl}/${id}/extend`, { days });
    return response.data.data;
  }

  /**
   * Get expiring vouchers
   */
  async getExpiringVouchers(days = 7): Promise<Voucher[]> {
    const response = await apiClient.get(`${this.baseUrl}/expiring?days=${days}`);
    return response.data.data;
  }

  /**
   * Search vouchers by code
   */
  async searchVouchers(query: string, limit = 10): Promise<Voucher[]> {
    const response = await apiClient.get(`${this.baseUrl}/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data.data;
  }

  /**
   * Get vouchers by billing plan
   */
  async getVouchersByBillingPlan(billingPlanId: number, page = 1, limit = 50): Promise<PaginatedResponse<Voucher>> {
    const response = await apiClient.get(`${this.baseUrl}/by-billing-plan/${billingPlanId}?page=${page}&limit=${limit}`);
    return response.data;
  }

  /**
   * Generate voucher report
   */
  async generateVoucherReport(filters: VoucherFilters = {}, format: 'pdf' | 'excel' = 'pdf'): Promise<void> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.isUsed !== undefined) params.append('isUsed', filters.isUsed.toString());
    if (filters.billingPlanId) params.append('billingPlanId', filters.billingPlanId.toString());
    if (filters.batchId) params.append('batchId', filters.batchId);
    params.append('format', format);

    const response = await apiClient.get(`${this.baseUrl}/report?${params.toString()}`, {
      responseType: 'blob',
    });

    // Create download link
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `voucher_report_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Print vouchers (formatted for printing)
   */
  async printVouchers(voucherIds: number[]): Promise<void> {
    const response = await apiClient.post(`${this.baseUrl}/print`, { voucherIds }, {
      responseType: 'blob',
    });

    // Create download link for PDF
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vouchers_print_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Get voucher statistics by date range
   */
  async getVoucherStatsByDateRange(startDate: string, endDate: string): Promise<any> {
    const response = await apiClient.get(`${this.baseUrl}/stats/date-range?startDate=${startDate}&endDate=${endDate}`);
    return response.data.data;
  }

  /**
   * Get unused vouchers count
   */
  async getUnusedVouchersCount(): Promise<number> {
    const response = await apiClient.get(`${this.baseUrl}/unused-count`);
    return response.data.data.count;
  }

  /**
   * Bulk delete vouchers
   */
  async bulkDeleteVouchers(voucherIds: number[]): Promise<{ deleted: number; errors: string[] }> {
    const response = await apiClient.post(`${this.baseUrl}/bulk-delete`, { voucherIds });
    return response.data.data;
  }
}

export const voucherService = new VoucherService();