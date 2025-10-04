import sqlite3 from 'sqlite3';
import DatabaseManager from '../database';
import { Repository, PaginationOptions, PaginatedResult, FilterOptions } from '../types';

export abstract class BaseRepository<T> implements Repository<T> {
  protected dbManager: DatabaseManager;
  protected abstract tableName: string;

  constructor() {
    this.dbManager = DatabaseManager.getInstance();
  }

  protected buildWhereClause(filters: FilterOptions): { clause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.search) {
      // This should be overridden in child classes for specific search logic
      conditions.push('1=1');
    }

    if (filters.is_active !== undefined) {
      conditions.push('is_active = ?');
      params.push(filters.is_active ? 1 : 0);
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

  protected buildOrderClause(): string {
    return 'ORDER BY created_at DESC';
  }

  protected buildPaginationClause(options: PaginationOptions): { clause: string; params: number[] } {
    const offset = (options.page - 1) * options.limit;
    return {
      clause: 'LIMIT ? OFFSET ?',
      params: [options.limit, offset]
    };
  }

  abstract create(entity: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T>;
  abstract findById(id: number): Promise<T | null>;
  abstract update(id: number, entity: Partial<T>): Promise<T | null>;

  async delete(id: number): Promise<boolean> {
    try {
      const result = await this.dbManager.run(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
      return (result.changes || 0) > 0;
    } catch (error) {
      console.error(`Error deleting from ${this.tableName}:`, error);
      throw error;
    }
  }

  async findAll(options: PaginationOptions & FilterOptions = { page: 1, limit: 50 }): Promise<PaginatedResult<T>> {
    try {
      // Optimize limit to prevent excessive data loading
      const optimizedLimit = Math.min(options.limit, 200);
      const optimizedOptions = { ...options, limit: optimizedLimit };
      
      const { clause: whereClause, params: whereParams } = this.buildWhereClause(optimizedOptions);
      const orderClause = this.buildOrderClause();
      const { clause: paginationClause, params: paginationParams } = this.buildPaginationClause(optimizedOptions);

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause}`;
      const countResult = await this.dbManager.get(countQuery, whereParams);
      const total = countResult?.total || 0;

      // Get paginated data
      const dataQuery = `SELECT * FROM ${this.tableName} ${whereClause} ${orderClause} ${paginationClause}`;
      const allParams = [...whereParams, ...paginationParams];
      const rows = await this.dbManager.all(dataQuery, allParams);

      return {
        data: rows as T[],
        total,
        page: optimizedOptions.page,
        limit: optimizedOptions.limit,
        totalPages: Math.ceil(total / optimizedOptions.limit)
      };
    } catch (error) {
      console.error(`Error finding all from ${this.tableName}:`, error);
      throw error;
    }
  }

  async findByCondition(conditions: Partial<T>): Promise<T[]> {
    try {
      const conditionKeys = Object.keys(conditions);
      if (conditionKeys.length === 0) {
        const rows = await this.dbManager.all(`SELECT * FROM ${this.tableName} LIMIT 1000`);
        return rows as T[];
      }

      const whereClause = conditionKeys.map(key => `${key} = ?`).join(' AND ');
      const params = Object.values(conditions);
      
      const query = `SELECT * FROM ${this.tableName} WHERE ${whereClause} LIMIT 1000`;
      const rows = await this.dbManager.all(query, params);
      return rows as T[];
    } catch (error) {
      console.error(`Error finding by condition from ${this.tableName}:`, error);
      throw error;
    }
  }

  protected async executeTransaction<R>(
    callback: (manager: DatabaseManager) => Promise<R>
  ): Promise<R> {
    return await this.dbManager.executeTransaction(callback);
  }

  /**
   * Batch operations for better performance
   */
  async createBatch(entities: Array<Omit<T, 'id' | 'created_at' | 'updated_at'>>): Promise<T[]> {
    const results: T[] = [];
    
    try {
      await this.executeTransaction(async (manager) => {
        for (const entity of entities) {
          const result = await this.create(entity);
          results.push(result);
        }
      });
      
      return results;
    } catch (error) {
      console.error(`Error creating batch in ${this.tableName}:`, error);
      throw error;
    }
  }

  async updateBatch(updates: Array<{ id: number; data: Partial<T> }>): Promise<T[]> {
    const results: T[] = [];
    
    try {
      await this.executeTransaction(async (manager) => {
        for (const update of updates) {
          const result = await this.update(update.id, update.data);
          if (result) {
            results.push(result);
          }
        }
      });
      
      return results;
    } catch (error) {
      console.error(`Error updating batch in ${this.tableName}:`, error);
      throw error;
    }
  }

  async deleteBatch(ids: number[]): Promise<number> {
    let deletedCount = 0;
    
    try {
      await this.executeTransaction(async (manager) => {
        for (const id of ids) {
          const deleted = await this.delete(id);
          if (deleted) {
            deletedCount++;
          }
        }
      });
      
      return deletedCount;
    } catch (error) {
      console.error(`Error deleting batch in ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Optimized count query
   */
  async count(conditions?: Partial<T>): Promise<number> {
    try {
      let query = `SELECT COUNT(*) as total FROM ${this.tableName}`;
      let params: any[] = [];
      
      if (conditions && Object.keys(conditions).length > 0) {
        const conditionKeys = Object.keys(conditions);
        const whereClause = conditionKeys.map(key => `${key} = ?`).join(' AND ');
        query += ` WHERE ${whereClause}`;
        params = Object.values(conditions);
      }
      
      const result = await this.dbManager.get(query, params);
      return result?.total || 0;
    } catch (error) {
      console.error(`Error counting in ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Check if entity exists (optimized)
   */
  async exists(id: number): Promise<boolean> {
    try {
      const query = `SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`;
      const result = await this.dbManager.get(query, [id]);
      return !!result;
    } catch (error) {
      console.error(`Error checking existence in ${this.tableName}:`, error);
      throw error;
    }
  }
}