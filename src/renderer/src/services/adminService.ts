import { apiClient } from './apiClient';

export interface AdminUser {
  id: number;
  username: string;
  email?: string;
  fullName?: string;
  role: 'super_admin' | 'admin' | 'operator';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  createdBy?: number;
  permissions?: string[];
}

export interface CreateAdminData {
  username: string;
  password: string;
  email?: string;
  fullName?: string;
  role: 'super_admin' | 'admin' | 'operator';
  isActive?: boolean;
  permissions?: string[];
}

export interface UpdateAdminData {
  username?: string;
  password?: string;
  email?: string;
  fullName?: string;
  role?: 'super_admin' | 'admin' | 'operator';
  isActive?: boolean;
  permissions?: string[];
}

export interface AdminFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
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

export interface AdminStats {
  totalAdmins: number;
  activeAdmins: number;
  superAdmins: number;
  admins: number;
  operators: number;
  recentLogins: number;
}

export interface SystemConfig {
  [key: string]: string;
}

export interface AdminLog {
  id: number;
  adminId: number;
  adminUsername: string;
  action: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  timestamp: string;
}

class AdminService {
  private baseUrl = '/api/admin';

  /**
   * Get paginated list of admin users
   */
  async getAdmins(filters: AdminFilters = {}): Promise<PaginatedResponse<AdminUser>> {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.role) params.append('role', filters.role);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const response = await apiClient.get(`${this.baseUrl}/users?${params.toString()}`);
    return response.data;
  }

  /**
   * Get a single admin user by ID
   */
  async getAdmin(id: number): Promise<AdminUser> {
    const response = await apiClient.get(`${this.baseUrl}/users/${id}`);
    return response.data.data;
  }

  /**
   * Create a new admin user
   */
  async createAdmin(adminData: CreateAdminData): Promise<AdminUser> {
    const response = await apiClient.post(`${this.baseUrl}/users`, adminData);
    return response.data.data;
  }

  /**
   * Update an existing admin user
   */
  async updateAdmin(id: number, adminData: UpdateAdminData): Promise<AdminUser> {
    const response = await apiClient.put(`${this.baseUrl}/users/${id}`, adminData);
    return response.data.data;
  }

  /**
   * Delete an admin user
   */
  async deleteAdmin(id: number): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/users/${id}`);
  }

  /**
   * Get admin statistics
   */
  async getAdminStats(): Promise<AdminStats> {
    const response = await apiClient.get(`${this.baseUrl}/stats`);
    return response.data.data;
  }

  /**
   * Get admin activity logs
   */
  async getAdminLogs(filters: {
    page?: number;
    limit?: number;
    adminId?: number;
    action?: string;
    startDate?: string;
    endDate?: string;
    success?: boolean;
  } = {}): Promise<PaginatedResponse<AdminLog>> {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.adminId) params.append('adminId', filters.adminId.toString());
    if (filters.action) params.append('action', filters.action);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.success !== undefined) params.append('success', filters.success.toString());

    const response = await apiClient.get(`/api/admin-logs?${params.toString()}`);
    return response.data;
  }

  /**
   * Get system configuration
   */
  async getSystemConfig(): Promise<SystemConfig> {
    const response = await apiClient.get('/api/system-config');
    return response.data.data;
  }

  /**
   * Update system configuration
   */
  async updateSystemConfig(config: SystemConfig): Promise<void> {
    await apiClient.put('/api/system-config', config);
  }

  /**
   * Reset admin password
   */
  async resetPassword(id: number, newPassword: string): Promise<void> {
    await apiClient.post(`${this.baseUrl}/users/${id}/reset-password`, { password: newPassword });
  }

  /**
   * Toggle admin status (activate/deactivate)
   */
  async toggleAdminStatus(id: number): Promise<AdminUser> {
    const response = await apiClient.post(`${this.baseUrl}/users/${id}/toggle-status`);
    return response.data.data;
  }

  /**
   * Get available permissions
   */
  async getAvailablePermissions(): Promise<Array<{
    key: string;
    name: string;
    description: string;
    category: string;
  }>> {
    const response = await apiClient.get(`${this.baseUrl}/permissions`);
    return response.data.data;
  }

  /**
   * Get role definitions
   */
  async getRoles(): Promise<Array<{
    key: string;
    name: string;
    description: string;
    permissions: string[];
    level: number;
  }>> {
    const response = await apiClient.get(`${this.baseUrl}/roles`);
    return response.data.data;
  }

  /**
   * Export admin users
   */
  async exportAdmins(filters: AdminFilters = {}, format: 'excel' | 'csv' = 'excel'): Promise<void> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.role) params.append('role', filters.role);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    params.append('format', format);

    const response = await apiClient.get(`${this.baseUrl}/users/export?${params.toString()}`, {
      responseType: 'blob',
    });

    // Create download link
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin_users_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Get admin session history
   */
  async getAdminSessions(adminId: number, page = 1, limit = 50): Promise<PaginatedResponse<any>> {
    const response = await apiClient.get(`${this.baseUrl}/users/${adminId}/sessions?page=${page}&limit=${limit}`);
    return response.data;
  }

  /**
   * Force logout admin user
   */
  async forceLogout(adminId: number): Promise<void> {
    await apiClient.post(`${this.baseUrl}/users/${adminId}/force-logout`);
  }

  /**
   * Get admin permissions for current user
   */
  async getMyPermissions(): Promise<string[]> {
    const response = await apiClient.get(`${this.baseUrl}/my-permissions`);
    return response.data.data;
  }

  /**
   * Update my profile
   */
  async updateMyProfile(data: {
    email?: string;
    fullName?: string;
    currentPassword?: string;
    newPassword?: string;
  }): Promise<AdminUser> {
    const response = await apiClient.put(`${this.baseUrl}/my-profile`, data);
    return response.data.data;
  }

  /**
   * Get system health check
   */
  async getSystemHealth(): Promise<{
    database: boolean;
    mikrotik: boolean;
    services: { [key: string]: boolean };
    uptime: number;
    version: string;
  }> {
    const response = await apiClient.get(`${this.baseUrl}/system-health`);
    return response.data.data;
  }

  /**
   * Backup system data
   */
  async createBackup(options: {
    includeUsers?: boolean;
    includeVouchers?: boolean;
    includeConfig?: boolean;
    includeLogs?: boolean;
  } = {}): Promise<{ backupId: string; filename: string }> {
    const response = await apiClient.post(`${this.baseUrl}/backup`, options);
    return response.data.data;
  }

  /**
   * Get backup history
   */
  async getBackupHistory(): Promise<Array<{
    id: string;
    filename: string;
    size: number;
    createdAt: string;
    type: string;
  }>> {
    const response = await apiClient.get(`${this.baseUrl}/backups`);
    return response.data.data;
  }

  /**
   * Download backup
   */
  async downloadBackup(backupId: string): Promise<void> {
    const response = await apiClient.get(`${this.baseUrl}/backups/${backupId}/download`, {
      responseType: 'blob',
    });

    // Create download link
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_${backupId}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Restore from backup
   */
  async restoreBackup(backupId: string, options: {
    restoreUsers?: boolean;
    restoreVouchers?: boolean;
    restoreConfig?: boolean;
  } = {}): Promise<void> {
    await apiClient.post(`${this.baseUrl}/backups/${backupId}/restore`, options);
  }
}

export const adminService = new AdminService();