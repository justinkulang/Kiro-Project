// Simple validation script to test database layer
import { initializeDatabase, getAdminUserRepository, getBillingPlanRepository } from './index';

async function validateDatabase(): Promise<void> {
  try {
    console.log('🔄 Validating database layer...');
    
    // Initialize database
    await initializeDatabase();
    console.log('✅ Database initialized successfully');
    
    // Test repositories
    const adminRepo = getAdminUserRepository();
    const billingRepo = getBillingPlanRepository();
    
    // Test admin user repository
    const adminUsers = await adminRepo.findAll({ page: 1, limit: 5 });
    console.log(`✅ Found ${adminUsers.total} admin users`);
    
    // Test billing plan repository
    const billingPlans = await billingRepo.findActive();
    console.log(`✅ Found ${billingPlans.length} active billing plans`);
    
    // Test creating a new admin user
    const newAdmin = await adminRepo.create({
      username: 'testvalidation',
      email: 'test@validation.com',
      password_hash: 'hashedpassword123',
      role: 'admin',
      is_active: true
    });
    console.log(`✅ Created test admin user with ID: ${newAdmin.id}`);
    
    // Clean up test user
    await adminRepo.delete(newAdmin.id!);
    console.log('✅ Cleaned up test admin user');
    
    console.log('🎉 Database layer validation completed successfully!');
    
  } catch (error) {
    console.error('❌ Database validation failed:', error);
    throw error;
  }
}

export default validateDatabase;

// Self-executing validation
validateDatabase().catch(console.error);