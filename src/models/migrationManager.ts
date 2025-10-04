import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import DatabaseManager from './database';

interface Migration {
  version: number;
  filename: string;
  sql: string;
}

class MigrationManager {
  private dbManager: DatabaseManager;
  private migrationsPath: string;

  constructor() {
    this.dbManager = DatabaseManager.getInstance();
    this.migrationsPath = path.join(__dirname, 'migrations');
  }

  private async createMigrationsTable(): Promise<void> {
    await this.dbManager.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER UNIQUE NOT NULL,
        filename VARCHAR(255) NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private async getExecutedMigrations(): Promise<number[]> {
    try {
      const rows = await this.dbManager.all('SELECT version FROM migrations ORDER BY version');
      return rows.map(row => row.version);
    } catch (error) {
      // If migrations table doesn't exist, return empty array
      return [];
    }
  }

  private async loadMigrations(): Promise<Migration[]> {
    const migrations: Migration[] = [];
    
    if (!fs.existsSync(this.migrationsPath)) {
      console.warn(`Migrations directory not found: ${this.migrationsPath}`);
      return migrations;
    }

    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const filename of files) {
      const match = filename.match(/^(\d+)_/);
      if (!match) {
        console.warn(`Invalid migration filename format: ${filename}`);
        continue;
      }

      const version = parseInt(match[1], 10);
      const filePath = path.join(this.migrationsPath, filename);
      const sql = fs.readFileSync(filePath, 'utf8');

      migrations.push({
        version,
        filename,
        sql
      });
    }

    return migrations;
  }

  private async executeMigration(migration: Migration): Promise<void> {
    try {
      console.log(`Executing migration: ${migration.filename}`);
      
      // Split SQL into individual statements and execute them
      const statements = migration.sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      for (const statement of statements) {
        await this.dbManager.run(statement);
      }
      
      // Record the migration as executed
      await this.dbManager.run(
        'INSERT INTO migrations (version, filename) VALUES (?, ?)',
        [migration.version, migration.filename]
      );
      
      console.log(`Migration completed: ${migration.filename}`);
    } catch (error) {
      console.error(`Migration failed: ${migration.filename}`, error);
      throw error;
    }
  }

  public async runMigrations(): Promise<void> {
    try {
      console.log('Starting database migrations...');
      
      // Create migrations table if it doesn't exist
      await this.createMigrationsTable();
      
      // Get executed migrations
      const executedVersions = await this.getExecutedMigrations();
      
      // Load all available migrations
      const availableMigrations = await this.loadMigrations();
      
      // Filter out already executed migrations
      const pendingMigrations = availableMigrations.filter(
        migration => !executedVersions.includes(migration.version)
      );

      if (pendingMigrations.length === 0) {
        console.log('No pending migrations found');
        return;
      }

      console.log(`Found ${pendingMigrations.length} pending migrations`);

      // Execute pending migrations in order
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }

      console.log('All migrations completed successfully');
    } catch (error) {
      console.error('Migration process failed:', error);
      throw error;
    }
  }

  public async rollbackMigration(version: number): Promise<void> {
    try {
      console.log(`Rolling back migration version: ${version}`);
      
      // Remove migration record
      await this.dbManager.run('DELETE FROM migrations WHERE version = ?', [version]);
      
      console.log(`Migration ${version} rolled back successfully`);
      console.warn('Note: This only removes the migration record. Manual schema changes may be required.');
    } catch (error) {
      console.error(`Rollback failed for version ${version}:`, error);
      throw error;
    }
  }

  public async getMigrationStatus(): Promise<{ version: number; filename: string; executed_at: string }[]> {
    try {
      const rows = await this.dbManager.all(`
        SELECT version, filename, executed_at 
        FROM migrations 
        ORDER BY version DESC
      `);
      return rows;
    } catch (error) {
      console.error('Failed to get migration status:', error);
      return [];
    }
  }
}

export default MigrationManager;