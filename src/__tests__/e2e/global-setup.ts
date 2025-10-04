import { FullConfig } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

let apiServer: ChildProcess | null = null;

async function globalSetup(config: FullConfig) {
  console.log('Setting up global test environment...');

  // Create test database
  await setupTestDatabase();

  // Start API server for testing
  await startTestApiServer();

  // Wait for services to be ready
  await waitForServices();

  console.log('Global setup completed');
}

async function setupTestDatabase() {
  console.log('Setting up test database...');
  
  const testDbPath = path.join(__dirname, '../../../test.db');
  
  // Remove existing test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  // Initialize test database with schema
  const { initializeDatabase } = require('../../models/database');
  
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_PATH = testDbPath;
  
  await initializeDatabase();
  
  // Seed test data
  await seedTestData();
  
  console.log('Test database setup completed');
}

async function seedTestData() {
  console.log('Seeding test data...');
  
  const { getAdminUserRepository, getBillingPlanRepository } = require('../../models');
  const AuthService = require('../../services/authService').default;
  
  try {
    // Create test admin user
    const adminRepo = getAdminUserRepository();
    const authService = new AuthService();
    
    const hashedPassword = await authService.hashPassword('admin123');
    
    await adminRepo.create({
      username: 'admin',
      password_hash: hashedPassword,
      email: 'admin@test.com',
      full_name: 'Test Admin',
      role: 'super_admin',
      is_active: true
    });

    // Create test billing plans
    const billingRepo = getBillingPlanRepository();
    
    await billingRepo.create({
      name: 'Basic Plan',
      description: 'Basic internet access',
      price: 10.00,
      time_limit: 3600, // 1 hour
      data_limit: 1073741824, // 1 GB
      validity_period: 30,
      is_active: true
    });

    await billingRepo.create({
      name: 'Premium Plan',
      description: 'Premium internet access',
      price: 25.00,
      time_limit: 0, // Unlimited
      data_limit: 5368709120, // 5 GB
      validity_period: 30,
      is_active: true
    });

    console.log('Test data seeded successfully');
  } catch (error) {
    console.error('Failed to seed test data:', error);
    throw error;
  }
}

async function startTestApiServer() {
  console.log('Starting test API server...');
  
  return new Promise<void>((resolve, reject) => {
    const serverPath = path.join(__dirname, '../../api/server.js');
    
    apiServer = spawn('node', [serverPath], {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: '3001'
      },
      stdio: 'pipe'
    });

    apiServer.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log(`API Server: ${output}`);
      
      if (output.includes('Server running on port 3001')) {
        resolve();
      }
    });

    apiServer.stderr?.on('data', (data) => {
      console.error(`API Server Error: ${data}`);
    });

    apiServer.on('error', (error) => {
      console.error('Failed to start API server:', error);
      reject(error);
    });

    apiServer.on('exit', (code) => {
      console.log(`API Server exited with code ${code}`);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      reject(new Error('API server startup timeout'));
    }, 30000);
  });
}

async function waitForServices() {
  console.log('Waiting for services to be ready...');
  
  // Wait for API server to be responsive
  const maxAttempts = 30;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const response = await fetch('http://localhost:3001/api/health');
      if (response.ok) {
        console.log('API server is ready');
        break;
      }
    } catch (error) {
      // Service not ready yet
    }
    
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  if (attempts >= maxAttempts) {
    throw new Error('Services failed to become ready within timeout');
  }
}

// Store reference for cleanup
(global as any).__API_SERVER__ = apiServer;

export default globalSetup;