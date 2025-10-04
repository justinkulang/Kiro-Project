// Database and migration imports
import DatabaseManager from './database';
import MigrationManager from './migrationManager';

// Repository imports
import { AdminUserRepository } from './repositories/adminUserRepository';
import { AdminLogRepository } from './repositories/adminLogRepository';
import { BillingPlanRepository } from './repositories/billingPlanRepository';
import { HotspotUserRepository } from './repositories/hotspotUserRepository';
import { VoucherRepository } from './repositories/voucherRepository';
import { UserSessionRepository } from './repositories/userSessionRepository';

// Type exports
export * from './types';

// Database and migration exports
export { default as DatabaseManager } from './database';
export { default as MigrationManager } from './migrationManager';

// Repository exports
export { BaseRepository } from './repositories/baseRepository';
export { AdminUserRepository } from './repositories/adminUserRepository';
export { AdminLogRepository } from './repositories/adminLogRepository';
export { BillingPlanRepository } from './repositories/billingPlanRepository';
export { HotspotUserRepository } from './repositories/hotspotUserRepository';
export { VoucherRepository } from './repositories/voucherRepository';
export { UserSessionRepository } from './repositories/userSessionRepository';

// Repository instances (singleton pattern)
let adminUserRepo: AdminUserRepository;
let adminLogRepo: AdminLogRepository;
let billingPlanRepo: BillingPlanRepository;
let hotspotUserRepo: HotspotUserRepository;
let voucherRepo: VoucherRepository;
let userSessionRepo: UserSessionRepository;

export const getAdminUserRepository = (): AdminUserRepository => {
  if (!adminUserRepo) {
    adminUserRepo = new AdminUserRepository();
  }
  return adminUserRepo;
};

export const getAdminLogRepository = (): AdminLogRepository => {
  if (!adminLogRepo) {
    adminLogRepo = new AdminLogRepository();
  }
  return adminLogRepo;
};

export const getBillingPlanRepository = (): BillingPlanRepository => {
  if (!billingPlanRepo) {
    billingPlanRepo = new BillingPlanRepository();
  }
  return billingPlanRepo;
};

export const getHotspotUserRepository = (): HotspotUserRepository => {
  if (!hotspotUserRepo) {
    hotspotUserRepo = new HotspotUserRepository();
  }
  return hotspotUserRepo;
};

export const getVoucherRepository = (): VoucherRepository => {
  if (!voucherRepo) {
    voucherRepo = new VoucherRepository();
  }
  return voucherRepo;
};

export const getUserSessionRepository = (): UserSessionRepository => {
  if (!userSessionRepo) {
    userSessionRepo = new UserSessionRepository();
  }
  return userSessionRepo;
};

// Initialize database and run migrations
export const initializeDatabase = async (): Promise<void> => {
  try {
    console.log('Initializing database...');
    
    // Connect to database
    const dbManager = DatabaseManager.getInstance();
    await dbManager.connect();
    
    // Run migrations
    const migrationManager = new MigrationManager();
    await migrationManager.runMigrations();
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};