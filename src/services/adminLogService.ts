import { getAdminUserRepository } from '../models';
import { AdminLogRepository } from '../models/repositories/adminLogRepository';
import { AdminLog, AdminUser, PaginatedResult } from '../models/types';
import { getDatabase } from '../models/database';

export interface AdminLogEntry {
  id?: number;
  adminUserId: number;
  action: string;
  targetType?: string;
  targetId?: number;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: string;
  adminUser?: AdminUser;
}

export interface AdminLogFilters {
  adminUserId?: number;
  action?: string;
  targetType?: string;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  search?: string;
}

export interface AdminLogStats {
  totalLogs: number;
  uniqueAdmins: number;
  topActions: { action: string; count: number }[];
  recentActivity: AdminLogEntry[];
  loginAttempts: {
    successful: number;
    failed: number;
    lastHour: number;
  };
}

export enum AdminAction {
  // Authentication
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  
  // User Management
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  USER_PASSWORD_RESET = 'USER_PASSWORD_RESET',
  
  // Billing Plans
  BILLING_PLAN_CREATED = 'BILLING_PLAN_CREATED',
  BILLING_PLAN_UPDATED = 'BILLING_PLAN_UPDATED',
  BILLING_PLAN_DELETED = 'BILLING_PLAN_DELETED',
  
  // Vouchers
  VOUCHERS_GENERATED = 'VOUCHERS_GENERATED',
  VOUCHER_USED = 'VOUCHER_USED',
  VOUCHER_VALIDATED = 'VOUCHER_VALIDATED',
  
  // System Configuration
  SYSTEM_SETTINGS_UPDATED = 'SYSTEM_SETTINGS_UPDATED',
  MIKROTIK_CONFIG_UPDATED = 'MIKROTIK_CONFIG_UPDATED',
  
  // Monitoring
  MONITORING_STARTED = 'MONITORING_STARTED',
  MONITORING_STOPPED = 'MONITORING_STOPPED',
  USER_DISCONNECTED = 'USER_DISCONNECTED',
  
  // Reports
  REPORT_GENERATED = 'REPORT_GENERATED',
  REPORT_EXPORTED = 'REPORT_EXPORTED',
  REPORT_SCHEDULED = 'REPORT_SCHEDULED',
  
  // Admin Management
  ADMIN_CREATED = 'ADMIN_CREATED',
  ADMIN_UPDATED = 'ADMIN_UPDATED',
  ADMIN_DELETED = 'ADMIN_DELETED',
  ADMIN_ROLE_CHANGED = 'ADMIN_ROLE_CHANGED',
  
  // Data Operations
  DATA_IMPORTED = 'DATA_IMPORTED',
  DATA_EXPORTED = 'DATA_EXPORTED',
  DATABASE_BACKUP = 'DATABASE_BACKUP',
  DATABASE_RESTORE = 'DATABASE_RESTORE'
}

class AdminLogService {
  private adminLogRepository: AdminLogRepository;

  constructor() {
    const db = getDatabase();
    this.adminLogRepository = new AdminLogRepository(db);
  }

  /**
   * Log an admin action
   */
  async logAction(
    adminUserId: number,
    adminUsername: string,
    action: AdminAction | string,
    targetType: 'user' | 'voucher' | 'billing_plan' | 'admin' | 'system' | 'report',
    targetId?: string,
    targetName?: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<AdminLog> {
    try {
      const logData: Omit<AdminLog, 'id' | 'created_at'> = {
        admin_user_id: adminUserId,
        admin_username: adminUsername,
        action,
        target_type: targetType,
        target_id: targetId,
        target_name: targetName,
        details: details ? JSON.stringify(details) : JSON.stringify({}),
        ip_address: ipAddress || 'unknown',
        user_agent: userAgent,
        success,
        error_message: errorMessage,
        timestamp: new Date().toISOString()
      };

      const logEntry = await this.adminLogRepository.create(logData);
      console.log(`Admin action logged: ${action} by ${adminUsername} (${adminUserId})`);
      
      return logEntry;
    } catch (error) {
      console.error('Error logging admin action:', error);
      throw error;
    }
  }

  /**
   * Log authentication events
   */
  async logLogin(
    adminUserId: number, 
    adminUsername: string,
    success: boolean, 
    ipAddress?: string, 
    userAgent?: string, 
    details?: any,
    errorMessage?: string
  ): Promise<AdminLog> {
    const action = success ? AdminAction.LOGIN : AdminAction.LOGIN_FAILED;
    return this.logAction(
      adminUserId, 
      adminUsername,
      action, 
      'admin', 
      adminUserId.toString(), 
      adminUsername,
      details, 
      ipAddress, 
      userAgent,
      success,
      errorMessage
    );
  }

  async logLogout(adminUserId: number, adminUsername: string, ipAddress?: string, userAgent?: string): Promise<AdminLog> {
    return this.logAction(
      adminUserId, 
      adminUsername,
      AdminAction.LOGOUT, 
      'admin', 
      adminUserId.toString(), 
      adminUsername,
      undefined, 
      ipAddress, 
      userAgent
    );
  }

  /**
   * Log user management actions
   */
  async logUserAction(
    adminUserId: number,
    adminUsername: string,
    action: AdminAction,
    targetUserId: string,
    targetUserName?: string,
    details?: any,
    ipAddress?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<AdminLog> {
    return this.logAction(
      adminUserId, 
      adminUsername,
      action, 
      'user', 
      targetUserId, 
      targetUserName,
      details, 
      ipAddress, 
      undefined,
      success,
      errorMessage
    );
  }

  /**
   * Log billing plan actions
   */
  async logBillingPlanAction(
    adminUserId: number,
    adminUsername: string,
    action: AdminAction,
    planId: string,
    planName?: string,
    details?: any,
    ipAddress?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<AdminLog> {
    return this.logAction(
      adminUserId, 
      adminUsername,
      action, 
      'billing_plan', 
      planId, 
      planName,
      details, 
      ipAddress, 
      undefined,
      success,
      errorMessage
    );
  }

  /**
   * Log voucher actions
   */
  async logVoucherAction(
    adminUserId: number,
    adminUsername: string,
    action: AdminAction,
    voucherId?: string,
    voucherCode?: string,
    details?: any,
    ipAddress?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<AdminLog> {
    return this.logAction(
      adminUserId, 
      adminUsername,
      action, 
      'voucher', 
      voucherId, 
      voucherCode,
      details, 
      ipAddress, 
      undefined,
      success,
      errorMessage
    );
  }

  /**
   * Log system configuration actions
   */
  async logSystemAction(
    adminUserId: number,
    adminUsername: string,
    action: AdminAction,
    details?: any,
    ipAddress?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<AdminLog> {
    return this.logAction(
      adminUserId, 
      adminUsername,
      action, 
      'system', 
      undefined, 
      undefined,
      details, 
      ipAddress, 
      undefined,
      success,
      errorMessage
    );
  }

  /**
   * Log report actions
   */
  async logReportAction(
    adminUserId: number,
    adminUsername: string,
    action: AdminAction,
    reportId?: string,
    reportName?: string,
    details?: any,
    ipAddress?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<AdminLog> {
    return this.logAction(
      adminUserId, 
      adminUsername,
      action, 
      'report', 
      reportId, 
      reportName,
      details, 
      ipAddress, 
      undefined,
      success,
      errorMessage
    );
  }

  /**
   * Get admin logs with filtering and pagination
   */
  async getAdminLogs(
    filters: AdminLogFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResult<AdminLog>> {
    try {
      const repositoryFilters = {
        admin_user_id: filters.adminUserId,
        action: filters.action,
        target_type: filters.targetType,
        date_from: filters.startDate?.toISOString(),
        date_to: filters.endDate?.toISOString(),
        search: filters.search
      };

      return await this.adminLogRepository.findAll({
        page,
        limit,
        ...repositoryFilters
      });
    } catch (error) {
      console.error('Error getting admin logs:', error);
      throw error;
    }
  }

  /**
   * Get admin log by ID
   */
  async getAdminLogById(id: number): Promise<AdminLog | null> {
    try {
      return await this.adminLogRepository.findById(id);
    } catch (error) {
      console.error('Error getting admin log by ID:', error);
      throw error;
    }
  }

  /**
   * Get admin activity statistics
   */
  async getAdminLogStats(days: number = 30): Promise<AdminLogStats> {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const dateFrom = cutoffDate.toISOString();

      // Get action statistics
      const actionStats = await this.adminLogRepository.getActionStatistics(dateFrom);
      const topActions = actionStats.map(stat => ({
        action: stat.action,
        count: stat.count
      }));

      // Get admin activity summary
      const adminSummary = await this.adminLogRepository.getAdminActivitySummary(dateFrom);
      const uniqueAdmins = adminSummary.length;

      // Get recent activity
      const recentActivityResult = await this.adminLogRepository.findAll({
        page: 1,
        limit: 10,
        date_from: dateFrom
      });

      // Calculate login statistics
      const loginStats = actionStats.filter(stat => 
        stat.action === AdminAction.LOGIN || stat.action === AdminAction.LOGIN_FAILED
      );
      
      const successful = loginStats
        .filter(stat => stat.action === AdminAction.LOGIN)
        .reduce((sum, stat) => sum + stat.success_count, 0);
      
      const failed = loginStats
        .filter(stat => stat.action === AdminAction.LOGIN_FAILED)
        .reduce((sum, stat) => sum + stat.count, 0);

      // Get last hour login attempts
      const lastHour = new Date(Date.now() - 60 * 60 * 1000);
      const lastHourResult = await this.adminLogRepository.findAll({
        page: 1,
        limit: 1000,
        date_from: lastHour.toISOString(),
        action: AdminAction.LOGIN
      });

      const totalLogs = recentActivityResult.total;

      return {
        totalLogs,
        uniqueAdmins,
        topActions,
        recentActivity: recentActivityResult.data.map(log => ({
          id: log.id,
          adminUserId: log.admin_user_id,
          action: log.action,
          targetType: log.target_type,
          targetId: log.target_id ? parseInt(log.target_id) : undefined,
          details: log.details,
          ipAddress: log.ip_address,
          userAgent: log.user_agent,
          createdAt: log.timestamp
        })),
        loginAttempts: {
          successful,
          failed,
          lastHour: lastHourResult.total
        }
      };
    } catch (error) {
      console.error('Error getting admin log stats:', error);
      throw error;
    }
  }

  /**
   * Get logs for a specific admin user
   */
  async getAdminUserLogs(
    adminUserId: number,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResult<AdminLog>> {
    return this.adminLogRepository.findByAdminUser(adminUserId, { page, limit });
  }

  /**
   * Get logs for a specific action
   */
  async getActionLogs(
    action: AdminAction | string,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResult<AdminLog>> {
    return this.adminLogRepository.findByAction(action, { page, limit });
  }

  /**
   * Get security-related logs
   */
  async getSecurityLogs(
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResult<AdminLog>> {
    // Get all logs and filter on the client side for security actions
    // In a production system, you might want to add this as a database query
    const allLogs = await this.adminLogRepository.findAll({ page: 1, limit: 10000 });
    
    const securityActions = [
      AdminAction.LOGIN,
      AdminAction.LOGOUT,
      AdminAction.LOGIN_FAILED,
      AdminAction.PASSWORD_CHANGED,
      AdminAction.ADMIN_CREATED,
      AdminAction.ADMIN_UPDATED,
      AdminAction.ADMIN_DELETED,
      AdminAction.ADMIN_ROLE_CHANGED
    ];

    const filteredLogs = allLogs.data.filter(log => 
      securityActions.includes(log.action as AdminAction)
    );

    const total = filteredLogs.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

    return {
      data: paginatedLogs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Delete old logs (cleanup)
   */
  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    try {
      const deletedCount = await this.adminLogRepository.deleteOldLogs(daysToKeep);
      console.log(`Cleaned up ${deletedCount} old admin logs`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old logs:', error);
      throw error;
    }
  }

  /**
   * Export logs to JSON
   */
  async exportLogs(filters: AdminLogFilters = {}): Promise<AdminLog[]> {
    const result = await this.getAdminLogs(filters, 1, 10000); // Get all matching logs
    return result.data;
  }

  /**
   * Get audit trail for a specific target
   */
  async getAuditTrail(
    targetType: string,
    targetId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResult<AdminLog>> {
    return this.adminLogRepository.findAll({
      page,
      limit,
      target_type: targetType,
      search: targetId // Use search to find target_id
    });
  }

  // Helper methods

  /**
   * Get logs by date range
   */
  async getLogsByDateRange(
    dateFrom: Date,
    dateTo: Date,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResult<AdminLog>> {
    return this.adminLogRepository.findByDateRange(
      dateFrom.toISOString(),
      dateTo.toISOString(),
      { page, limit }
    );
  }

  /**
   * Start automatic cleanup of old logs
   */
  startAutoCleanup(intervalHours: number = 24, daysToKeep: number = 90): void {
    setInterval(async () => {
      try {
        await this.cleanupOldLogs(daysToKeep);
      } catch (error) {
        console.error('Error during automatic log cleanup:', error);
      }
    }, intervalHours * 60 * 60 * 1000);

    console.log(`Started automatic log cleanup: every ${intervalHours} hours, keeping ${daysToKeep} days`);
  }
}

export default AdminLogService;