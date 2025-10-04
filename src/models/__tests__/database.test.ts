import DatabaseManager from '../database';
import MigrationManager from '../migrationManager';
import { AdminUserRepository } from '../repositories/adminUserRepository';
import { BillingPlanRepository } from '../repositories/billingPlanRepository';
import { HotspotUserRepository } from '../repositories/hotspotUserRepository';

describe('Database Layer Tests', () => {
  let dbManager: DatabaseManager;
  let migrationManager: MigrationManager;
  let adminRepo: AdminUserRepository;
  let billingRepo: BillingPlanRepository;
  let userRepo: HotspotUserRepository;

  beforeAll(async () => {
    // Use in-memory database for testing
    process.env.NODE_ENV = 'test';
    dbManager = DatabaseManager.getInstance();
    migrationManager = new MigrationManager();
    
    // Initialize repositories
    adminRepo = new AdminUserRepository();
    billingRepo = new BillingPlanRepository();
    userRepo = new HotspotUserRepository();

    // Run migrations
    await migrationManager.runMigrations();
  });

  afterAll(async () => {
    await dbManager.close();
  });

  describe('Database Connection', () => {
    test('should connect to database successfully', async () => {
      const db = await dbManager.getConnection();
      expect(db).toBeDefined();
    });

    test('should execute transaction successfully', async () => {
      const result = await dbManager.executeTransaction(async (db) => {
        const result = await db.get('SELECT 1 as test');
        return result.test;
      });
      expect(result).toBe(1);
    });

    test('should rollback transaction on error', async () => {
      await expect(
        dbManager.executeTransaction(async (db) => {
          await db.run('INSERT INTO admin_users (username, email, password_hash, role) VALUES (?, ?, ?, ?)', 
            ['test', 'test@test.com', 'hash', 'admin']);
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');

      // Verify rollback worked
      const user = await adminRepo.findByUsername('test');
      expect(user).toBeNull();
    });
  });

  describe('Migration Manager', () => {
    test('should track migration status', async () => {
      const status = await migrationManager.getMigrationStatus();
      expect(status).toHaveLength(1);
      expect(status[0].version).toBe(1);
      expect(status[0].filename).toBe('001_initial_schema.sql');
    });
  });

  describe('Admin User Repository', () => {
    test('should create admin user', async () => {
      const adminData = {
        username: 'testadmin',
        email: 'admin@test.com',
        password_hash: 'hashedpassword',
        role: 'admin' as const,
        is_active: true
      };

      const created = await adminRepo.create(adminData);
      expect(created.id).toBeDefined();
      expect(created.username).toBe(adminData.username);
      expect(created.email).toBe(adminData.email);
      expect(created.role).toBe(adminData.role);
    });

    test('should find admin user by username', async () => {
      const user = await adminRepo.findByUsername('testadmin');
      expect(user).toBeDefined();
      expect(user?.username).toBe('testadmin');
    });

    test('should update admin user', async () => {
      const user = await adminRepo.findByUsername('testadmin');
      expect(user).toBeDefined();

      const updated = await adminRepo.update(user!.id!, { 
        email: 'updated@test.com',
        is_active: false 
      });
      
      expect(updated?.email).toBe('updated@test.com');
      expect(updated?.is_active).toBe(false);
    });

    test('should handle duplicate username error', async () => {
      const adminData = {
        username: 'testadmin', // Duplicate
        email: 'another@test.com',
        password_hash: 'hashedpassword',
        role: 'admin' as const,
        is_active: true
      };

      await expect(adminRepo.create(adminData)).rejects.toThrow();
    });
  });

  describe('Billing Plan Repository', () => {
    test('should create billing plan', async () => {
      const planData = {
        name: 'Test Plan',
        description: 'Test billing plan',
        price: 10.00,
        time_limit: 60,
        data_limit: 1073741824, // 1GB
        speed_limit_up: 1024,
        speed_limit_down: 2048,
        validity_period: 1,
        is_active: true
      };

      const created = await billingRepo.create(planData);
      expect(created.id).toBeDefined();
      expect(created.name).toBe(planData.name);
      expect(created.price).toBe(planData.price);
    });

    test('should find active billing plans', async () => {
      const activePlans = await billingRepo.findActive();
      expect(activePlans.length).toBeGreaterThan(0);
      expect(activePlans.every(plan => plan.is_active)).toBe(true);
    });

    test('should update billing plan', async () => {
      const plans = await billingRepo.findActive();
      const plan = plans.find(p => p.name === 'Test Plan');
      expect(plan).toBeDefined();

      const updated = await billingRepo.update(plan!.id!, { 
        price: 15.00,
        description: 'Updated test plan' 
      });
      
      expect(updated?.price).toBe(15.00);
      expect(updated?.description).toBe('Updated test plan');
    });
  });

  describe('Hotspot User Repository', () => {
    let testBillingPlanId: number;

    beforeAll(async () => {
      const plans = await billingRepo.findActive();
      testBillingPlanId = plans[0].id!;
    });

    test('should create hotspot user', async () => {
      const userData = {
        username: 'testuser',
        password: 'testpass',
        billing_plan_id: testBillingPlanId,
        email: 'user@test.com',
        phone: '1234567890',
        full_name: 'Test User',
        address: '123 Test St',
        is_active: true,
        data_used: 0,
        time_used: 0,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 1 day from now
      };

      const created = await userRepo.create(userData);
      expect(created.id).toBeDefined();
      expect(created.username).toBe(userData.username);
      expect(created.billing_plan_id).toBe(testBillingPlanId);
    });

    test('should find user by username', async () => {
      const user = await userRepo.findByUsername('testuser');
      expect(user).toBeDefined();
      expect(user?.username).toBe('testuser');
      expect(user?.billing_plan).toBeDefined();
    });

    test('should update usage stats', async () => {
      const user = await userRepo.findByUsername('testuser');
      expect(user).toBeDefined();

      await userRepo.updateUsageStats(user!.id!, 1048576, 30); // 1MB, 30 minutes

      const updated = await userRepo.findById(user!.id!);
      expect(updated?.data_used).toBe(1048576);
      expect(updated?.time_used).toBe(30);
    });

    test('should find expired users', async () => {
      // Create an expired user
      const expiredUserData = {
        username: 'expireduser',
        password: 'testpass',
        billing_plan_id: testBillingPlanId,
        is_active: true,
        data_used: 0,
        time_used: 0,
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      };

      await userRepo.create(expiredUserData);

      const expiredUsers = await userRepo.findExpiredUsers();
      expect(expiredUsers.length).toBeGreaterThan(0);
      expect(expiredUsers.some(u => u.username === 'expireduser')).toBe(true);
    });
  });

  describe('Repository Pagination and Filtering', () => {
    test('should paginate results', async () => {
      const result = await adminRepo.findAll({ page: 1, limit: 2 });
      expect(result.data).toHaveLength(Math.min(2, result.total));
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.totalPages).toBe(Math.ceil(result.total / 2));
    });

    test('should filter by search term', async () => {
      const result = await adminRepo.findAll({ 
        page: 1, 
        limit: 10, 
        search: 'testadmin' 
      });
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every(user => 
        user.username.includes('testadmin') || 
        user.email.includes('testadmin')
      )).toBe(true);
    });

    test('should filter by active status', async () => {
      const result = await billingRepo.findAll({ 
        page: 1, 
        limit: 10, 
        is_active: true 
      });
      expect(result.data.every(plan => plan.is_active)).toBe(true);
    });
  });
});