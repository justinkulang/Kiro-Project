import { BaseRepository } from './baseRepository';
import { Voucher, FilterOptions } from '../types';

export class VoucherRepository extends BaseRepository<Voucher> {
  protected tableName = 'vouchers';

  protected buildWhereClause(filters: FilterOptions): { clause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.search) {
      conditions.push('(code LIKE ? OR batch_id LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.is_active !== undefined) {
      // For vouchers, "active" means not used and not expired
      if (filters.is_active) {
        conditions.push('is_used = 0 AND expires_at > datetime("now")');
      } else {
        conditions.push('(is_used = 1 OR expires_at <= datetime("now"))');
      }
    }

    if (filters.billing_plan_id !== undefined) {
      conditions.push('billing_plan_id = ?');
      params.push(filters.billing_plan_id);
    }

    if (filters.date_from) {
      conditions.push('created_at >= ?');
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      conditions.push('created_at <= ?');
      params.push(filters.date_to);
    }

    const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { clause, params };
  }

  async create(entity: Omit<Voucher, 'id' | 'created_at' | 'updated_at'>): Promise<Voucher> {
    try {
      const result = await this.dbManager.run(`
        INSERT INTO ${this.tableName} (
          code, billing_plan_id, batch_id, is_used, 
          used_by_user_id, used_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        entity.code,
        entity.billing_plan_id,
        entity.batch_id,
        entity.is_used ? 1 : 0,
        entity.used_by_user_id,
        entity.used_at,
        entity.expires_at
      ]);

      const id = result.lastID;
      if (!id) {
        throw new Error('Failed to create voucher');
      }

      const created = await this.findById(id);
      if (!created) {
        throw new Error('Failed to retrieve created voucher');
      }

      return created;
    } catch (error) {
      console.error('Error creating voucher:', error);
      throw error;
    }
  }

  async findById(id: number): Promise<Voucher | null> {
    try {
      const row = await this.dbManager.get(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
      return row ? this.mapRowToEntity(row) : null;
    } catch (error) {
      console.error('Error finding voucher by id:', error);
      throw error;
    }
  }

  async findByCode(code: string): Promise<Voucher | null> {
    try {
      const row = await this.dbManager.get(`SELECT * FROM ${this.tableName} WHERE code = ?`, [code]);
      return row ? this.mapRowToEntity(row) : null;
    } catch (error) {
      console.error('Error finding voucher by code:', error);
      throw error;
    }
  }

  async findByBatch(batchId: string): Promise<Voucher[]> {
    try {
      const rows = await this.dbManager.all(`SELECT * FROM ${this.tableName} WHERE batch_id = ? ORDER BY created_at`, [batchId]);
      return rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error finding vouchers by batch:', error);
      throw error;
    }
  }

  async findUnused(): Promise<Voucher[]> {
    try {
      const rows = await this.dbManager.all(`
        SELECT * FROM ${this.tableName} 
        WHERE is_used = 0 AND expires_at > datetime('now') 
        ORDER BY created_at DESC
      `);
      return rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error finding unused vouchers:', error);
      throw error;
    }
  }

  async findExpired(): Promise<Voucher[]> {
    try {
      const rows = await this.dbManager.all(`
        SELECT * FROM ${this.tableName} 
        WHERE is_used = 0 AND expires_at <= datetime('now') 
        ORDER BY expires_at DESC
      `);
      return rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error finding expired vouchers:', error);
      throw error;
    }
  }

  async update(id: number, entity: Partial<Voucher>): Promise<Voucher | null> {
    try {
      const updateFields: string[] = [];
      const params: any[] = [];

      if (entity.code !== undefined) {
        updateFields.push('code = ?');
        params.push(entity.code);
      }
      if (entity.billing_plan_id !== undefined) {
        updateFields.push('billing_plan_id = ?');
        params.push(entity.billing_plan_id);
      }
      if (entity.batch_id !== undefined) {
        updateFields.push('batch_id = ?');
        params.push(entity.batch_id);
      }
      if (entity.is_used !== undefined) {
        updateFields.push('is_used = ?');
        params.push(entity.is_used ? 1 : 0);
      }
      if (entity.used_by_user_id !== undefined) {
        updateFields.push('used_by_user_id = ?');
        params.push(entity.used_by_user_id);
      }
      if (entity.used_at !== undefined) {
        updateFields.push('used_at = ?');
        params.push(entity.used_at);
      }
      if (entity.expires_at !== undefined) {
        updateFields.push('expires_at = ?');
        params.push(entity.expires_at);
      }

      if (updateFields.length === 0) {
        return await this.findById(id);
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      await this.dbManager.run(`
        UPDATE ${this.tableName} 
        SET ${updateFields.join(', ')} 
        WHERE id = ?
      `, params);

      return await this.findById(id);
    } catch (error) {
      console.error('Error updating voucher:', error);
      throw error;
    }
  }

  async getStatistics(): Promise<{
    total: number;
    used: number;
    expired: number;
    active: number;
  }> {
    try {
      const stats = await this.dbManager.get(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN is_used = 1 THEN 1 ELSE 0 END) as used,
          SUM(CASE WHEN is_used = 0 AND expires_at <= datetime('now') THEN 1 ELSE 0 END) as expired,
          SUM(CASE WHEN is_used = 0 AND expires_at > datetime('now') THEN 1 ELSE 0 END) as active
        FROM ${this.tableName}
      `);

      return {
        total: stats?.total || 0,
        used: stats?.used || 0,
        expired: stats?.expired || 0,
        active: stats?.active || 0
      };
    } catch (error) {
      console.error('Error getting voucher statistics:', error);
      throw error;
    }
  }

  private mapRowToEntity(row: any): Voucher {
    return {
      id: row.id,
      code: row.code,
      billing_plan_id: row.billing_plan_id,
      batch_id: row.batch_id,
      is_used: Boolean(row.is_used),
      used_by_user_id: row.used_by_user_id,
      used_at: row.used_at,
      expires_at: row.expires_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}