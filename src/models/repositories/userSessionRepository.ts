import { BaseRepository } from './baseRepository';
import { UserSession, FilterOptions } from '../types';

export class UserSessionRepository extends BaseRepository<UserSession> {
  protected tableName = 'user_sessions';

  protected buildWhereClause(filters: FilterOptions): { clause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.search) {
      conditions.push('(session_id LIKE ? OR ip_address LIKE ? OR mac_address LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.is_active !== undefined) {
      conditions.push('is_active = ?');
      params.push(filters.is_active ? 1 : 0);
    }

    if (filters.date_from) {
      conditions.push('start_time >= ?');
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      conditions.push('start_time <= ?');
      params.push(filters.date_to);
    }

    const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { clause, params };
  }

  async create(entity: Omit<UserSession, 'id' | 'created_at' | 'updated_at'>): Promise<UserSession> {
    try {
      const result = await this.dbManager.run(`
        INSERT INTO ${this.tableName} (
          user_id, session_id, ip_address, mac_address, 
          start_time, end_time, bytes_in, bytes_out, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        entity.user_id,
        entity.session_id,
        entity.ip_address,
        entity.mac_address,
        entity.start_time,
        entity.end_time,
        entity.bytes_in,
        entity.bytes_out,
        entity.is_active ? 1 : 0
      ]);

      const id = result.lastID;
      if (!id) {
        throw new Error('Failed to create user session');
      }

      const created = await this.findById(id);
      if (!created) {
        throw new Error('Failed to retrieve created user session');
      }

      return created;
    } catch (error) {
      console.error('Error creating user session:', error);
      throw error;
    }
  }

  async findById(id: number): Promise<UserSession | null> {
    try {
      const row = await this.dbManager.get(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
      return row ? this.mapRowToEntity(row) : null;
    } catch (error) {
      console.error('Error finding user session by id:', error);
      throw error;
    }
  }

  async findBySessionId(sessionId: string): Promise<UserSession | null> {
    try {
      const row = await this.dbManager.get(`SELECT * FROM ${this.tableName} WHERE session_id = ?`, [sessionId]);
      return row ? this.mapRowToEntity(row) : null;
    } catch (error) {
      console.error('Error finding user session by session ID:', error);
      throw error;
    }
  }

  async findByUserId(userId: number): Promise<UserSession[]> {
    try {
      const rows = await this.dbManager.all(`
        SELECT * FROM ${this.tableName} 
        WHERE user_id = ? 
        ORDER BY start_time DESC
      `, [userId]);
      return rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error finding user sessions by user ID:', error);
      throw error;
    }
  }

  async findActiveSessions(): Promise<UserSession[]> {
    try {
      const rows = await this.dbManager.all(`
        SELECT * FROM ${this.tableName} 
        WHERE is_active = 1 
        ORDER BY start_time DESC
      `);
      return rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error finding active sessions:', error);
      throw error;
    }
  }

  async findRecentSessions(hours: number = 24): Promise<UserSession[]> {
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      const rows = await this.dbManager.all(`
        SELECT * FROM ${this.tableName} 
        WHERE start_time >= ? 
        ORDER BY start_time DESC
      `, [cutoffTime]);
      return rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error finding recent sessions:', error);
      throw error;
    }
  }

  async update(id: number, entity: Partial<UserSession>): Promise<UserSession | null> {
    try {
      const updateFields: string[] = [];
      const params: any[] = [];

      if (entity.user_id !== undefined) {
        updateFields.push('user_id = ?');
        params.push(entity.user_id);
      }
      if (entity.session_id !== undefined) {
        updateFields.push('session_id = ?');
        params.push(entity.session_id);
      }
      if (entity.ip_address !== undefined) {
        updateFields.push('ip_address = ?');
        params.push(entity.ip_address);
      }
      if (entity.mac_address !== undefined) {
        updateFields.push('mac_address = ?');
        params.push(entity.mac_address);
      }
      if (entity.start_time !== undefined) {
        updateFields.push('start_time = ?');
        params.push(entity.start_time);
      }
      if (entity.end_time !== undefined) {
        updateFields.push('end_time = ?');
        params.push(entity.end_time);
      }
      if (entity.bytes_in !== undefined) {
        updateFields.push('bytes_in = ?');
        params.push(entity.bytes_in);
      }
      if (entity.bytes_out !== undefined) {
        updateFields.push('bytes_out = ?');
        params.push(entity.bytes_out);
      }
      if (entity.is_active !== undefined) {
        updateFields.push('is_active = ?');
        params.push(entity.is_active ? 1 : 0);
      }

      if (updateFields.length === 0) {
        return await this.findById(id);
      }

      params.push(id);

      await this.dbManager.run(`
        UPDATE ${this.tableName} 
        SET ${updateFields.join(', ')} 
        WHERE id = ?
      `, params);

      return await this.findById(id);
    } catch (error) {
      console.error('Error updating user session:', error);
      throw error;
    }
  }

  async endSession(sessionId: string, bytesIn: number = 0, bytesOut: number = 0): Promise<UserSession | null> {
    try {
      const endTime = new Date().toISOString();
      
      await this.dbManager.run(`
        UPDATE ${this.tableName} 
        SET end_time = ?, bytes_in = ?, bytes_out = ?, is_active = 0 
        WHERE session_id = ? AND is_active = 1
      `, [endTime, bytesIn, bytesOut, sessionId]);

      return await this.findBySessionId(sessionId);
    } catch (error) {
      console.error('Error ending session:', error);
      throw error;
    }
  }

  async getSessionStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    averageSessionDuration: number;
    totalBandwidth: number;
  }> {
    try {
      const stats = await this.dbManager.get(`
        SELECT 
          COUNT(*) as totalSessions,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as activeSessions,
          AVG(
            CASE 
              WHEN end_time IS NOT NULL 
              THEN (julianday(end_time) - julianday(start_time)) * 24 * 60 
              ELSE (julianday('now') - julianday(start_time)) * 24 * 60 
            END
          ) as averageSessionDuration,
          SUM(bytes_in + bytes_out) as totalBandwidth
        FROM ${this.tableName}
      `);

      return {
        totalSessions: stats?.totalSessions || 0,
        activeSessions: stats?.activeSessions || 0,
        averageSessionDuration: stats?.averageSessionDuration || 0,
        totalBandwidth: stats?.totalBandwidth || 0
      };
    } catch (error) {
      console.error('Error getting session stats:', error);
      throw error;
    }
  }

  private mapRowToEntity(row: any): UserSession {
    return {
      id: row.id,
      user_id: row.user_id,
      session_id: row.session_id,
      ip_address: row.ip_address,
      mac_address: row.mac_address,
      start_time: row.start_time,
      end_time: row.end_time,
      bytes_in: row.bytes_in,
      bytes_out: row.bytes_out,
      is_active: Boolean(row.is_active)
    };
  }
}