import { apiClient } from './apiClient';

export interface HotspotUser {
  id: number;
  username: string;
  email?: string;
  fullName?: string;
  phone?: string;
  address?: string;
  billingPlanId?: number;
  billingPlan?: {
    id: number;
    name: string;
    price: number;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  dataUsed: number;
  timeUsed: number;
  lastLogin?: string;
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

export interface CreateUserData {
  username: string;
  password: string;
  email?: string;
  fullName?: string;
  phone?: string;
  address?: string;
  billingPlanId: number;
  isActive?: boolean;
  expiresAt?: string;
}

export interface UpdateUserData {
  username?: string;
  password?: string;
  email?: string;
  fullName?: string;
  phone?: string;
  address?: string;
  billingPlanId?: number;
  isActive?: boolean;
  expiresAt?: string;
}

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  billingPlanId?: number;
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

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}

export interface BatchUserOperation {
  userIds: number[];
  operation: 'activate' | 'deactivate' | 'delete' | 'update_billing_plan';
  data?: any;
}

class UserService {
  private baseUrl = '/api/users';

  /**
   * Get paginated list of users with optional filters
   */
  async getUsers(filters: UserFilters = {}): Promise<PaginatedResponse<HotspotUser>> {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.billingPlanId) params.append('billingPlanId', filters.billingPlanId.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const response = await apiClient.get(`${this.baseUrl}?${params.toString()}`);
    return response.data;
  }

  /**
   * Get a single user by ID
   */
  async getUser(id: number): Promise<HotspotUser> {
    const response = await apiClient.get(`${this.baseUrl}/${id}`);
    return response.data.data;
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserData): Promise<HotspotUser> {
    const response = await apiClient.post(this.baseUrl, userData);
    return response.data.data;
  }

  /**
   * Update an existing user
   */
  async updateUser(id: number, userData: UpdateUserData): Promise<HotspotUser> {
    const response = await apiClient.put(`${this.baseUrl}/${id}`, userData);
    return response.data.data;
  }

  /**
   * Delete a user
   */
  async deleteUser(id: number): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<UserStats> {
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
   * Export users to Excel/CSV
   */
  async exportUsers(filters: UserFilters = {}, format: 'excel' | 'csv' = 'excel'): Promise<void> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.billingPlanId) params.append('billingPlanId', filters.billingPlanId.toString());
    params.append('format', format);

    const response = await apiClient.get(`${this.baseUrl}/export?${params.toString()}`, {
      responseType: 'blob',
    });

    // Create download link
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users_export_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Perform batch operations on multiple users
   */
  async batchOperation(operation: BatchUserOperation): Promise<{ success: number; failed: number; errors: string[] }> {
    const response = await apiClient.post(`${this.baseUrl}/batch`, operation);
    return response.data.data;
  }

  /**
   * Reset user password
   */
  async resetPassword(id: number, newPassword: string): Promise<void> {
    await apiClient.post(`${this.baseUrl}/${id}/reset-password`, { password: newPassword });
  }

  /**
   * Get user session history
   */
  async getUserSessions(id: number, page = 1, limit = 50): Promise<PaginatedResponse<any>> {
    const response = await apiClient.get(`${this.baseUrl}/${id}/sessions?page=${page}&limit=${limit}`);
    return response.data;
  }

  /**
   * Disconnect user session
   */
  async disconnectUser(id: number): Promise<void> {
    await apiClient.post(`${this.baseUrl}/${id}/disconnect`);
  }

  /**
   * Get user usage statistics
   */
  async getUserUsage(id: number, period: 'day' | 'week' | 'month' = 'month'): Promise<any> {
    const response = await apiClient.get(`${this.baseUrl}/${id}/usage?period=${period}`);
    return response.data.data;
  }

  /**
   * Extend user expiration date
   */
  async extendExpiration(id: number, days: number): Promise<HotspotUser> {
    const response = await apiClient.post(`${this.baseUrl}/${id}/extend`, { days });
    return response.data.data;
  }

  /**
   * Reset user usage counters
   */
  async resetUsage(id: number, resetData = true, resetTime = true): Promise<void> {
    await apiClient.post(`${this.baseUrl}/${id}/reset-usage`, { resetData, resetTime });
  }

  /**
   * Search users by username or email
   */
  async searchUsers(query: string, limit = 10): Promise<HotspotUser[]> {
    const response = await apiClient.get(`${this.baseUrl}/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data.data;
  }

  /**
   * Get users by billing plan
   */
  async getUsersByBillingPlan(billingPlanId: number, page = 1, limit = 50): Promise<PaginatedResponse<HotspotUser>> {
    const response = await apiClient.get(`${this.baseUrl}/by-billing-plan/${billingPlanId}?page=${page}&limit=${limit}`);
    return response.data;
  }

  /**
   * Get active users count
   */
  async getActiveUsersCount(): Promise<number> {
    const response = await apiClient.get(`${this.baseUrl}/active-count`);
    return response.data.data.count;
  }

  /**
   * Get users expiring soon
   */
  async getExpiringUsers(days = 7): Promise<HotspotUser[]> {
    const response = await apiClient.get(`${this.baseUrl}/expiring?days=${days}`);
    return response.data.data;
  }

  /**
   * Bulk import users from CSV/Excel
   */
  async importUsers(file: File): Promise<{ success: number; failed: number; errors: string[] }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`${this.baseUrl}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  }

  /**
   * Generate user report
   */
  async generateUserReport(filters: UserFilters = {}, format: 'pdf' | 'excel' = 'pdf'): Promise<void> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.billingPlanId) params.append('billingPlanId', filters.billingPlanId.toString());
    params.append('format', format);

    const response = await apiClient.get(`${this.baseUrl}/report?${params.toString()}`, {
      responseType: 'blob',
    });

    // Create download link
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `user_report_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const userService = new UserService();