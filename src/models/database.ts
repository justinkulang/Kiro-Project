import sqlite3 from 'sqlite3';
import path from 'path';
import { promisify } from 'util';

export interface DatabaseConnection {
  db: sqlite3.Database;
  close(): Promise<void>;
}

class DatabaseManager {
  private static instance: DatabaseManager;
  private db: sqlite3.Database | null = null;
  private readonly dbPath: string;

  private constructor() {
    // Use different paths based on environment
    let dbDir: string;
    
    if (process.env.NODE_ENV === 'test') {
      dbDir = path.join(process.cwd(), 'test-data');
    } else if (process.env.NODE_ENV === 'production') {
      dbDir = path.join(process.env.APPDATA || '', 'MikroTikHotspotPlatform');
    } else {
      dbDir = path.join(process.cwd(), 'data');
    }
    
    this.dbPath = path.join(dbDir, 'hotspot.db');
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async connect(): Promise<sqlite3.Database> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      try {
        // Ensure directory exists
        const fs = require('fs');
        const dbDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dbDir)) {
          fs.mkdirSync(dbDir, { recursive: true });
        }

        this.db = new sqlite3.Database(this.dbPath, (err: Error | null) => {
          if (err) {
            console.error('Database connection failed:', err);
            reject(new Error(`Failed to connect to database: ${err.message}`));
            return;
          }

          // Enable foreign keys
          this.db!.run('PRAGMA foreign_keys = ON');
          
          // Set journal mode for better performance
          this.db!.run('PRAGMA journal_mode = WAL');
          
          console.log(`Database connected: ${this.dbPath}`);
          resolve(this.db!);
        });
      } catch (error) {
        console.error('Database connection failed:', error);
        reject(new Error(`Failed to connect to database: ${error}`));
      }
    });
  }

  public async close(): Promise<void> {
    if (this.db) {
      return new Promise<void>((resolve, reject) => {
        this.db!.close((err: Error | null) => {
          if (err) {
            console.error('Error closing database:', err);
            reject(err);
            return;
          }
          this.db = null;
          console.log('Database connection closed');
          resolve();
        });
      });
    }
  }

  public async getConnection(): Promise<sqlite3.Database> {
    if (!this.db) {
      return await this.connect();
    }
    return this.db;
  }

  public async run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
    const db = await this.getConnection();
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(this: sqlite3.RunResult, err: Error | null) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this);
      });
    });
  }

  public async get(sql: string, params: any[] = []): Promise<any> {
    const db = await this.getConnection();
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err: Error | null, row: any) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row);
      });
    });
  }

  public async all(sql: string, params: any[] = []): Promise<any[]> {
    const db = await this.getConnection();
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err: Error | null, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows || []);
      });
    });
  }

  public async executeTransaction<T>(
    callback: (manager: DatabaseManager) => Promise<T>
  ): Promise<T> {
    const db = await this.getConnection();
    
    return new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', async (err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }

        try {
          const result = await callback(this);
          db.run('COMMIT', (commitErr: Error | null) => {
            if (commitErr) {
              reject(commitErr);
              return;
            }
            resolve(result);
          });
        } catch (error) {
          db.run('ROLLBACK', (rollbackErr: Error | null) => {
            if (rollbackErr) {
              console.error('Rollback failed:', rollbackErr);
            }
            reject(error);
          });
        }
      });
    });
  }
}

export default DatabaseManager;