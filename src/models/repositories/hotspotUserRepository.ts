import { BaseRepository } from './baseRepository';
import { HotspotUser, FilterOptions } from '../types';

export class HotspotUserRepository extends BaseRepository<HotspotUser> {
  protected tableName = 'hotspot_users';

  protected buildWhereClause(filters: FilterOptions & { billing_plan_id?: number }): { clause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.search) {
      conditions.push('(username LIKE ? OR email LIKE ? OR full_name LIKE ? OR phone LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.is_active !== undefined) {
      conditions.push('is_active = ?');
      params.push(filters.is_active ? 1 : 0);
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

  async create(entity: Omit<HotspotUser, 'id' | 'created_at' | 'updated_at'>): Promise<HotspotUser> {
    try {
      const result = await this.dbManager.run(`
        INSERT INTO ${this.tableName} (
          username, password, billing_plan_id, email, phone, full_name, 
          address, is_active, expires_at, data_used, time_used
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        entity.username,
        entity.password,
        entity.billing_plan_id,
        entity.email,
        entity.phone,
        entity.full_name,
        entity.address,
        entity.is_active ? 1 : 0,
        entity.expires_at,
        entity.data_used || 0,
        entity.time_used || 0
      ]);

      const id = result.lastID;
      if (!id) {
        throw new Error('Failed to create hotspot user');
      }

      const created = await this.findById(id);
      if (!created) {
        throw new Error('Failed to retrieve created hotspot user');
      }

      return created;
    } catch (error) {
      console.error('Error creating hotspot user:', error);
      throw error;
    }
  }

  async findById(id: number): Promise<HotspotUser | null> {
    try {
      const row = await this.dbManager.get(`
        SELECT u.*, bp.name as billing_plan_name, bp.price as billing_plan_price
        FROM ${this.tableName} u
        LEFT JOIN billing_plans bp ON u.billing_plan_id = bp.id
        WHERE u.id = ?
      `, [id]);
      
      return row ? this.mapRowToEntity(row) : null;
    } catch (error) {
      console.error('Error finding hotspot user by id:', error);
      throw error;
    }
  }

  async findByUsername(username: string): Promise<HotspotUser | null> {
    try {
      const row = await this.dbManager.get(`
        SELECT u.*, bp.name as billing_plan_name, bp.price as billing_plan_price
        FROM ${this.tableName} u
        LEFT JOIN billing_plans bp ON u.billing_plan_id = bp.id
        WHERE u.username = ?
      `, [username]);
      
      return row ? this.mapRowToEntity(row) : null;
    } catch (error) {
      console.error('Error finding hotspot user by username:', error);
      throw error;
    }
  }

  async findExpiredUsers(): Promise<HotspotUser[]> {
    try {
      const rows = await this.dbManager.all(`
        SELECT u.*, bp.name as billing_plan_name, bp.price as billing_plan_price
        FROM ${this.tableName} u
        LEFT JOIN billing_plans bp ON u.billing_plan_id = bp.id
        WHERE u.expires_at < datetime('now') AND u.is_active = 1
      `);
      
      return rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error finding expired users:', error);
      throw error;
    }
  }

  async update(id: number, entity: Partial<HotspotUser>): Promise<HotspotUser | null> {
    try {
      const updateFields: string[] = [];
      const params: any[] = [];

      if (entity.username !== undefined) {
        updateFields.push('username = ?');
        params.push(entity.username);
      }
      if (entity.password !== undefined) {
        updateFields.push('password = ?');
        params.push(entity.password);
      }
      if (entity.billing_plan_id !== undefined) {
        updateFields.push('billing_plan_id = ?');
        params.push(entity.billing_plan_id);
      }
      if (entity.email !== undefined) {
        updateFields.push('email = ?');
        params.push(entity.email);
      }
      if (entity.phone !== undefined) {
        updateFields.push('phone = ?');
        params.push(entity.phone);
      }
      if (entity.full_name !== undefined) {
        updateFields.push('full_name = ?');
        params.push(entity.full_name);
      }
      if (entity.address !== undefined) {
        updateFields.push('address = ?');
        params.push(entity.address);
      }
      if (entity.is_active !== undefined) {
        updateFields.push('is_active = ?');
        params.push(entity.is_active ? 1 : 0);
      }
      if (entity.expires_at !== undefined) {
        updateFields.push('expires_at = ?');
        params.push(entity.expires_at);
      }
      if (entity.data_used !== undefined) {
        updateFields.push('data_used = ?');
        params.push(entity.data_used);
      }
      if (entity.time_used !== undefined) {
        updateFields.push('time_used = ?');
        params.push(entity.time_used);
      }
      if (entity.last_login !== undefined) {
        updateFields.push('last_login = ?');
        params.push(entity.last_login);
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
      console.error('Error updating hotspot user:', error);
      throw error;
    }
  }

  async updateUsageStats(id: number, dataUsed: number, timeUsed: number): Promise<void> {
    try {
      await this.dbManager.run(`
        UPDATE ${this.tableName} 
        SET data_used = data_used + ?, time_used = time_used + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [dataUsed, timeUsed, id]);
    } catch (error) {
      console.error('Error updating usage stats:', error);
      throw error;
    }
  }

  private mapRowToEntity(row: any): HotspotUser {
    const user: HotspotUser = {
      id: row.id,
      username: row.username,
      password: row.password,
      billing_plan_id: row.billing_plan_id,
      email: row.email,
      phone: row.phone,
      full_name: row.full_name,
      address: row.address,
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      updated_at: row.updated_at,
      expires_at: row.expires_at,
      data_used: row.data_used || 0,
      time_used: row.time_used || 0,
      last_login: row.last_login
    };

    // Add billing plan info if available
    if (row.billing_plan_name) {
      user.billing_plan = {
        id: row.billing_plan_id,
        name: row.billing_plan_name,
        price: parseFloat(row.billing_plan_price || 0),
        validity_period: 0, // Will be filled by full billing plan query if needed
        is_active: true
      };
    }

    return user;
  }
}