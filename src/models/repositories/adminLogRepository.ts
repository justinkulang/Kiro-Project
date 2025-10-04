import { BaseRepository } from './baseRepository';
import { AdminLog, PaginatedResult, PaginationOptions } from '../types';

export interface AdminLogFilters {
  admin_user_id?: number;
  action?: string;
  target_type?: string;
  success?: boolean;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export class AdminLogRepository extends BaseRepository<AdminLog> {
  protected tableName = 'admin_logs';

  async create(logData: Omit<AdminLog, 'id' | 'created_at'>): Promise<AdminLog> {
    const sql = `
      INSERT INTO admin_logs (
        admin_user_id, admin_username, action, target_type, target_id, 
        target_name, details, ip_address, user_agent, success, 
        error_message, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      logData.admin_user_id,
      logData.admin_username,
      logData.action,
      logData.target_type,
      logData.target_id || null,
      logData.target_name || null,
      logData.details,
      logData.ip_address,
      logData.user_agent || null,
      logData.success ? 1 : 0,
      logData.error_message || null,
      logData.timestamp
    ];

    return new Promise(async (resolve, reject) => {
      try {
        const db = await this.dbManager.getConnection();
        db.run(sql, params, function(err: any) {
          if (err) {
            reject(err);
            return;
          }

          const createdLog: AdminLog = {
            id: this.lastID,
            ...logData,
            created_at: new Date().toISOString()
          };

          resolve(createdLog);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async findAll(
    options: PaginationOptions & AdminLogFilters = { page: 1, limit: 50 }
  ): Promise<PaginatedResult<AdminLog>> {
    const { page = 1, limit = 50, ...filters } = options;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    // Apply filters
    if (filters.admin_user_id) {
      whereClause += ' AND admin_user_id = ?';
      params.push(filters.admin_user_id);
    }

    if (filters.action) {
      whereClause += ' AND action LIKE ?';
      params.push(`%${filters.action}%`);
    }

    if (filters.target_type) {
      whereClause += ' AND target_type = ?';
      params.push(filters.target_type);
    }

    if (filters.success !== undefined) {
      whereClause += ' AND success = ?';
      params.push(filters.success ? 1 : 0);
    }

    if (filters.date_from) {
      whereClause += ' AND timestamp >= ?';
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      whereClause += ' AND timestamp <= ?';
      params.push(filters.date_to);
    }

    if (filters.search) {
      whereClause += ' AND (admin_username LIKE ? OR action LIKE ? OR target_name LIKE ? OR details LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM admin_logs ${whereClause}`;
    const total = await new Promise<number>(async (resolve, reject) => {
      try {
        const db = await this.dbManager.getConnection();
        db.get(countSql, params, (err: any, row: any) => {
          if (err) reject(err);
          else resolve(row.total);
        });
      } catch (error) {
        reject(error);
      }
    });

    // Get paginated data
    const dataSql = `
      SELECT al.*, au.username as admin_username_full, au.email as admin_email
      FROM admin_logs al
      LEFT JOIN admin_users au ON al.admin_user_id = au.id
      ${whereClause}
      ORDER BY al.timestamp DESC
      LIMIT ? OFFSET ?
    `;

    const dataParams = [...params, limit, offset];

    const data = await new Promise<AdminLog[]>(async (resolve, reject) => {
      try {
        const db = await this.dbManager.getConnection();
        db.all(dataSql, dataParams, (err: any, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows.map(row => this.mapRowToEntity(row)));
        });
      } catch (error) {
        reject(error);
      }
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findByAdminUser(
    adminUserId: number,
    options: PaginationOptions = { page: 1, limit: 50 }
  ): Promise<PaginatedResult<AdminLog>> {
    return this.findAll({ ...options, admin_user_id: adminUserId });
  }

  async findByAction(
    action: string,
    options: PaginationOptions = { page: 1, limit: 50 }
  ): Promise<PaginatedResult<AdminLog>> {
    return this.findAll({ ...options, action });
  }

  async findByTargetType(
    targetType: string,
    options: PaginationOptions = { page: 1, limit: 50 }
  ): Promise<PaginatedResult<AdminLog>> {
    return this.findAll({ ...options, target_type: targetType });
  }

  async findByDateRange(
    dateFrom: string,
    dateTo: string,
    options: PaginationOptions = { page: 1, limit: 50 }
  ): Promise<PaginatedResult<AdminLog>> {
    return this.findAll({ ...options, date_from: dateFrom, date_to: dateTo });
  }

  async findById(id: number): Promise<AdminLog | null> {
    const sql = `
      SELECT al.*, au.username as admin_username_full, au.email as admin_email
      FROM admin_logs al
      LEFT JOIN admin_users au ON al.admin_user_id = au.id
      WHERE al.id = ?
    `;

    return new Promise(async (resolve, reject) => {
      try {
        const db = await this.dbManager.getConnection();
        db.get(sql, [id], (err: any, row: any) => {
          if (err) reject(err);
          else resolve(row ? this.mapRowToEntity(row) : null);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async update(id: number, logData: Partial<AdminLog>): Promise<AdminLog | null> {
    // Admin logs are typically immutable for audit purposes
    // This method is implemented to satisfy the interface but should not be used
    throw new Error('Admin logs cannot be updated for audit integrity');
  }

  async getActionStatistics(dateFrom?: string, dateTo?: string): Promise<{
    action: string;
    count: number;
    success_count: number;
    failure_count: number;
  }[]> {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (dateFrom) {
      whereClause += ' AND timestamp >= ?';
      params.push(dateFrom);
    }

    if (dateTo) {
      whereClause += ' AND timestamp <= ?';
      params.push(dateTo);
    }

    const sql = `
      SELECT 
        action,
        COUNT(*) as count,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failure_count
      FROM admin_logs
      ${whereClause}
      GROUP BY action
      ORDER BY count DESC
    `;

    return new Promise(async (resolve, reject) => {
      try {
        const db = await this.dbManager.getConnection();
        db.all(sql, params, (err: any, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async getAdminActivitySummary(dateFrom?: string, dateTo?: string): Promise<{
    admin_username: string;
    total_actions: number;
    successful_actions: number;
    failed_actions: number;
    last_activity: string;
  }[]> {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (dateFrom) {
      whereClause += ' AND timestamp >= ?';
      params.push(dateFrom);
    }

    if (dateTo) {
      whereClause += ' AND timestamp <= ?';
      params.push(dateTo);
    }

    const sql = `
      SELECT 
        admin_username,
        COUNT(*) as total_actions,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_actions,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_actions,
        MAX(timestamp) as last_activity
      FROM admin_logs
      ${whereClause}
      GROUP BY admin_username
      ORDER BY total_actions DESC
    `;

    return new Promise(async (resolve, reject) => {
      try {
        const db = await this.dbManager.getConnection();
        db.all(sql, params, (err: any, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async deleteOldLogs(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    const cutoffTimestamp = cutoffDate.toISOString();

    const sql = 'DELETE FROM admin_logs WHERE timestamp < ?';

    return new Promise(async (resolve, reject) => {
      try {
        const db = await this.dbManager.getConnection();
        db.run(sql, [cutoffTimestamp], function(err: any) {
          if (err) reject(err);
          else resolve(this.changes || 0);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  protected mapRowToEntity(row: any): AdminLog {
    return {
      id: row.id,
      admin_user_id: row.admin_user_id,
      admin_username: row.admin_username,
      action: row.action,
      target_type: row.target_type,
      target_id: row.target_id,
      target_name: row.target_name,
      details: row.details,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      success: Boolean(row.success),
      error_message: row.error_message,
      timestamp: row.timestamp,
      created_at: row.created_at
    };
  }
}