import { BaseRepository } from './baseRepository';
import { AdminUser, FilterOptions } from '../types';

export class AdminUserRepository extends BaseRepository<AdminUser> {
  protected tableName = 'admin_users';

  protected buildWhereClause(filters: FilterOptions): { clause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.search) {
      conditions.push('(username LIKE ? OR email LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.is_active !== undefined) {
      conditions.push('is_active = ?');
      params.push(filters.is_active ? 1 : 0);
    }

    const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { clause, params };
  }

  async create(entity: Omit<AdminUser, 'id' | 'created_at' | 'updated_at'>): Promise<AdminUser> {
    try {
      const result = await this.dbManager.run(`
        INSERT INTO ${this.tableName} (username, email, password_hash, role, is_active)
        VALUES (?, ?, ?, ?, ?)
      `, [entity.username, entity.email, entity.password_hash, entity.role, entity.is_active ? 1 : 0]);

      const id = result.lastID;
      if (!id) {
        throw new Error('Failed to create admin user');
      }

      const created = await this.findById(id);
      if (!created) {
        throw new Error('Failed to retrieve created admin user');
      }

      return created;
    } catch (error) {
      console.error('Error creating admin user:', error);
      throw error;
    }
  }

  async findById(id: number): Promise<AdminUser | null> {
    try {
      const row = await this.dbManager.get(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
      return row ? this.mapRowToEntity(row) : null;
    } catch (error) {
      console.error('Error finding admin user by id:', error);
      throw error;
    }
  }

  async findByUsername(username: string): Promise<AdminUser | null> {
    try {
      const row = await this.dbManager.get(`SELECT * FROM ${this.tableName} WHERE username = ?`, [username]);
      return row ? this.mapRowToEntity(row) : null;
    } catch (error) {
      console.error('Error finding admin user by username:', error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<AdminUser | null> {
    try {
      const row = await this.dbManager.get(`SELECT * FROM ${this.tableName} WHERE email = ?`, [email]);
      return row ? this.mapRowToEntity(row) : null;
    } catch (error) {
      console.error('Error finding admin user by email:', error);
      throw error;
    }
  }

  async update(id: number, entity: Partial<AdminUser>): Promise<AdminUser | null> {
    try {
      const updateFields: string[] = [];
      const params: any[] = [];

      if (entity.username !== undefined) {
        updateFields.push('username = ?');
        params.push(entity.username);
      }
      if (entity.email !== undefined) {
        updateFields.push('email = ?');
        params.push(entity.email);
      }
      if (entity.password_hash !== undefined) {
        updateFields.push('password_hash = ?');
        params.push(entity.password_hash);
      }
      if (entity.role !== undefined) {
        updateFields.push('role = ?');
        params.push(entity.role);
      }
      if (entity.is_active !== undefined) {
        updateFields.push('is_active = ?');
        params.push(entity.is_active ? 1 : 0);
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
      console.error('Error updating admin user:', error);
      throw error;
    }
  }

  private mapRowToEntity(row: any): AdminUser {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      password_hash: row.password_hash,
      role: row.role,
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_login: row.last_login
    };
  }
}