import { BaseRepository } from './baseRepository';
import { BillingPlan, FilterOptions } from '../types';

export class BillingPlanRepository extends BaseRepository<BillingPlan> {
  protected tableName = 'billing_plans';

  protected buildWhereClause(filters: FilterOptions): { clause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.search) {
      conditions.push('(name LIKE ? OR description LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.is_active !== undefined) {
      conditions.push('is_active = ?');
      params.push(filters.is_active ? 1 : 0);
    }

    const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { clause, params };
  }

  async create(entity: Omit<BillingPlan, 'id' | 'created_at' | 'updated_at'>): Promise<BillingPlan> {
    try {
      const result = await this.dbManager.run(`
        INSERT INTO ${this.tableName} (
          name, description, price, time_limit, data_limit, 
          speed_limit_up, speed_limit_down, validity_period, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        entity.name,
        entity.description,
        entity.price,
        entity.time_limit,
        entity.data_limit,
        entity.speed_limit_up,
        entity.speed_limit_down,
        entity.validity_period,
        entity.is_active ? 1 : 0
      ]);

      const id = result.lastID;
      if (!id) {
        throw new Error('Failed to create billing plan');
      }

      const created = await this.findById(id);
      if (!created) {
        throw new Error('Failed to retrieve created billing plan');
      }

      return created;
    } catch (error) {
      console.error('Error creating billing plan:', error);
      throw error;
    }
  }

  async findById(id: number): Promise<BillingPlan | null> {
    try {
      const row = await this.dbManager.get(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
      return row ? this.mapRowToEntity(row) : null;
    } catch (error) {
      console.error('Error finding billing plan by id:', error);
      throw error;
    }
  }

  async findActive(): Promise<BillingPlan[]> {
    try {
      const rows = await this.dbManager.all(`SELECT * FROM ${this.tableName} WHERE is_active = 1 ORDER BY name`);
      return rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error finding active billing plans:', error);
      throw error;
    }
  }

  async update(id: number, entity: Partial<BillingPlan>): Promise<BillingPlan | null> {
    try {
      const updateFields: string[] = [];
      const params: any[] = [];

      if (entity.name !== undefined) {
        updateFields.push('name = ?');
        params.push(entity.name);
      }
      if (entity.description !== undefined) {
        updateFields.push('description = ?');
        params.push(entity.description);
      }
      if (entity.price !== undefined) {
        updateFields.push('price = ?');
        params.push(entity.price);
      }
      if (entity.time_limit !== undefined) {
        updateFields.push('time_limit = ?');
        params.push(entity.time_limit);
      }
      if (entity.data_limit !== undefined) {
        updateFields.push('data_limit = ?');
        params.push(entity.data_limit);
      }
      if (entity.speed_limit_up !== undefined) {
        updateFields.push('speed_limit_up = ?');
        params.push(entity.speed_limit_up);
      }
      if (entity.speed_limit_down !== undefined) {
        updateFields.push('speed_limit_down = ?');
        params.push(entity.speed_limit_down);
      }
      if (entity.validity_period !== undefined) {
        updateFields.push('validity_period = ?');
        params.push(entity.validity_period);
      }
      if (entity.is_active !== undefined) {
        updateFields.push('is_active = ?');
        params.push(entity.is_active ? 1 : 0);
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
      console.error('Error updating billing plan:', error);
      throw error;
    }
  }

  private mapRowToEntity(row: any): BillingPlan {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      time_limit: row.time_limit,
      data_limit: row.data_limit,
      speed_limit_up: row.speed_limit_up,
      speed_limit_down: row.speed_limit_down,
      validity_period: row.validity_period,
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}