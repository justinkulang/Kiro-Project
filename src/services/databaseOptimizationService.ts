import { Database } from 'sqlite3';
import { getDatabase } from '../models/database';

export interface QueryPerformanceMetrics {
  query: string;
  executionTime: number;
  rowsAffected: number;
  timestamp: number;
}

export interface IndexInfo {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
}

export class DatabaseOptimizationService {
  private db: Database;
  private queryMetrics: QueryPerformanceMetrics[] = [];
  private readonly maxMetricsHistory = 1000;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Create database indexes for performance optimization
   */
  async createOptimizationIndexes(): Promise<void> {
    const indexes = [
      // User-related indexes
      {
        name: 'idx_hotspot_users_username',
        table: 'hotspot_users',
        columns: ['username'],
        unique: true
      },
      {
        name: 'idx_hotspot_users_billing_plan',
        table: 'hotspot_users',
        columns: ['billing_plan_id']
      },
      {
        name: 'idx_hotspot_users_active',
        table: 'hotspot_users',
        columns: ['is_active']
      },
      {
        name: 'idx_hotspot_users_created',
        table: 'hotspot_users',
        columns: ['created_at']
      },
      
      // Session-related indexes
      {
        name: 'idx_user_sessions_username',
        table: 'user_sessions',
        columns: ['username']
      },
      {
        name: 'idx_user_sessions_start_time',
        table: 'user_sessions',
        columns: ['start_time']
      },
      {
        name: 'idx_user_sessions_end_time',
        table: 'user_sessions',
        columns: ['end_time']
      },
      {
        name: 'idx_user_sessions_active',
        table: 'user_sessions',
        columns: ['is_active']
      },
      
      // Voucher-related indexes
      {
        name: 'idx_vouchers_code',
        table: 'vouchers',
        columns: ['code'],
        unique: true
      },
      {
        name: 'idx_vouchers_billing_plan',
        table: 'vouchers',
        columns: ['billing_plan_id']
      },
      {
        name: 'idx_vouchers_status',
        table: 'vouchers',
        columns: ['status']
      },
      {
        name: 'idx_vouchers_created',
        table: 'vouchers',
        columns: ['created_at']
      },
      {
        name: 'idx_vouchers_expires',
        table: 'vouchers',
        columns: ['expires_at']
      },
      
      // Admin log indexes
      {
        name: 'idx_admin_logs_user',
        table: 'admin_logs',
        columns: ['admin_user_id']
      },
      {
        name: 'idx_admin_logs_action',
        table: 'admin_logs',
        columns: ['action']
      },
      {
        name: 'idx_admin_logs_timestamp',
        table: 'admin_logs',
        columns: ['timestamp']
      },
      {
        name: 'idx_admin_logs_success',
        table: 'admin_logs',
        columns: ['success']
      },
      
      // Billing plan indexes
      {
        name: 'idx_billing_plans_active',
        table: 'billing_plans',
        columns: ['is_active']
      },
      {
        name: 'idx_billing_plans_price',
        table: 'billing_plans',
        columns: ['price']
      },
      
      // Admin user indexes
      {
        name: 'idx_admin_users_username',
        table: 'admin_users',
        columns: ['username'],
        unique: true
      },
      {
        name: 'idx_admin_users_email',
        table: 'admin_users',
        columns: ['email'],
        unique: true
      },
      {
        name: 'idx_admin_users_role',
        table: 'admin_users',
        columns: ['role']
      },
      {
        name: 'idx_admin_users_active',
        table: 'admin_users',
        columns: ['is_active']
      }
    ];

    for (const index of indexes) {
      await this.createIndex(index);
    }
  }

  /**
   * Create a single index
   */
  private async createIndex(indexInfo: IndexInfo): Promise<void> {
    return new Promise((resolve, reject) => {
      const uniqueClause = indexInfo.unique ? 'UNIQUE' : '';
      const columnsClause = indexInfo.columns.join(', ');
      const sql = `CREATE ${uniqueClause} INDEX IF NOT EXISTS ${indexInfo.name} ON ${indexInfo.table} (${columnsClause})`;
      
      this.db.run(sql, (err) => {
        if (err) {
          console.error(`Failed to create index ${indexInfo.name}:`, err);
          reject(err);
        } else {
          console.log(`Created index: ${indexInfo.name}`);
          resolve();
        }
      });
    });
  }

  /**
   * Analyze database performance
   */
  async analyzePerformance(): Promise<{
    tableStats: any[];
    indexStats: any[];
    slowQueries: QueryPerformanceMetrics[];
  }> {
    const [tableStats, indexStats] = await Promise.all([
      this.getTableStatistics(),
      this.getIndexStatistics()
    ]);

    const slowQueries = this.queryMetrics
      .filter(metric => metric.executionTime > 100) // Queries taking more than 100ms
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    return {
      tableStats,
      indexStats,
      slowQueries
    };
  }

  /**
   * Get table statistics
   */
  private async getTableStatistics(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          name as table_name,
          (SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND tbl_name=m.name) as index_count
        FROM sqlite_master m 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `;
      
      this.db.all(sql, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Get index statistics
   */
  private async getIndexStatistics(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          name as index_name,
          tbl_name as table_name,
          sql
        FROM sqlite_master 
        WHERE type='index' AND name NOT LIKE 'sqlite_%'
        ORDER BY tbl_name, name
      `;
      
      this.db.all(sql, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Execute query with performance tracking
   */
  async executeWithMetrics<T = any>(
    sql: string, 
    params: any[] = []
  ): Promise<{ result: T[]; metrics: QueryPerformanceMetrics }> {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        const executionTime = Date.now() - startTime;
        
        const metrics: QueryPerformanceMetrics = {
          query: sql,
          executionTime,
          rowsAffected: rows ? rows.length : 0,
          timestamp: Date.now()
        };

        // Store metrics for analysis
        this.addQueryMetric(metrics);

        if (err) {
          reject(err);
        } else {
          resolve({ result: rows as T[], metrics });
        }
      });
    });
  }

  /**
   * Add query metric to history
   */
  private addQueryMetric(metric: QueryPerformanceMetrics): void {
    this.queryMetrics.push(metric);
    
    // Keep only recent metrics
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsHistory);
    }
  }

  /**
   * Get query performance statistics
   */
  getQueryStats(): {
    totalQueries: number;
    averageExecutionTime: number;
    slowestQuery: QueryPerformanceMetrics | null;
    fastestQuery: QueryPerformanceMetrics | null;
  } {
    if (this.queryMetrics.length === 0) {
      return {
        totalQueries: 0,
        averageExecutionTime: 0,
        slowestQuery: null,
        fastestQuery: null
      };
    }

    const totalTime = this.queryMetrics.reduce((sum, metric) => sum + metric.executionTime, 0);
    const averageExecutionTime = totalTime / this.queryMetrics.length;
    
    const slowestQuery = this.queryMetrics.reduce((slowest, current) => 
      current.executionTime > slowest.executionTime ? current : slowest
    );
    
    const fastestQuery = this.queryMetrics.reduce((fastest, current) => 
      current.executionTime < fastest.executionTime ? current : fastest
    );

    return {
      totalQueries: this.queryMetrics.length,
      averageExecutionTime,
      slowestQuery,
      fastestQuery
    };
  }

  /**
   * Optimize database settings
   */
  async optimizeDatabase(): Promise<void> {
    const optimizations = [
      'PRAGMA journal_mode = WAL',           // Write-Ahead Logging for better concurrency
      'PRAGMA synchronous = NORMAL',         // Balance between safety and performance
      'PRAGMA cache_size = 10000',          // Increase cache size (10MB)
      'PRAGMA temp_store = MEMORY',         // Store temporary tables in memory
      'PRAGMA mmap_size = 268435456',       // Use memory-mapped I/O (256MB)
      'PRAGMA optimize'                      // Run SQLite optimizer
    ];

    for (const pragma of optimizations) {
      await this.executePragma(pragma);
    }
  }

  /**
   * Execute PRAGMA statement
   */
  private async executePragma(pragma: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(pragma, (err) => {
        if (err) {
          console.error(`Failed to execute pragma: ${pragma}`, err);
          reject(err);
        } else {
          console.log(`Executed pragma: ${pragma}`);
          resolve();
        }
      });
    });
  }

  /**
   * Vacuum database to reclaim space and optimize
   */
  async vacuumDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Starting database vacuum...');
      this.db.run('VACUUM', (err) => {
        if (err) {
          console.error('Database vacuum failed:', err);
          reject(err);
        } else {
          console.log('Database vacuum completed successfully');
          resolve();
        }
      });
    });
  }

  /**
   * Analyze database and update statistics
   */
  async analyzeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Analyzing database...');
      this.db.run('ANALYZE', (err) => {
        if (err) {
          console.error('Database analysis failed:', err);
          reject(err);
        } else {
          console.log('Database analysis completed successfully');
          resolve();
        }
      });
    });
  }

  /**
   * Get database size information
   */
  async getDatabaseSize(): Promise<{
    pageCount: number;
    pageSize: number;
    totalSize: number;
    freePages: number;
  }> {
    const [pageCount, pageSize, freePages] = await Promise.all([
      this.getPragmaValue('page_count'),
      this.getPragmaValue('page_size'),
      this.getPragmaValue('freelist_count')
    ]);

    return {
      pageCount: parseInt(pageCount),
      pageSize: parseInt(pageSize),
      totalSize: parseInt(pageCount) * parseInt(pageSize),
      freePages: parseInt(freePages)
    };
  }

  /**
   * Get PRAGMA value
   */
  private async getPragmaValue(pragma: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.db.get(`PRAGMA ${pragma}`, (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(Object.values(row)[0] as string);
        }
      });
    });
  }

  /**
   * Clear query metrics history
   */
  clearMetrics(): void {
    this.queryMetrics = [];
  }
}

export default DatabaseOptimizationService;