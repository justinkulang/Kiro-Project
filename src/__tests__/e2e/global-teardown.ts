import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('Running global teardown...');

  // Stop API server
  const apiServer = (global as any).__API_SERVER__;
  if (apiServer) {
    console.log('Stopping API server...');
    apiServer.kill('SIGTERM');
    
    // Wait for graceful shutdown
    await new Promise<void>((resolve) => {
      apiServer.on('exit', () => {
        console.log('API server stopped');
        resolve();
      });
      
      // Force kill after 5 seconds
      setTimeout(() => {
        apiServer.kill('SIGKILL');
        resolve();
      }, 5000);
    });
  }

  // Clean up test database
  await cleanupTestDatabase();

  // Clean up test artifacts
  await cleanupTestArtifacts();

  console.log('Global teardown completed');
}

async function cleanupTestDatabase() {
  console.log('Cleaning up test database...');
  
  const testDbPath = path.join(__dirname, '../../../test.db');
  
  try {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
      console.log('Test database removed');
    }
  } catch (error) {
    console.error('Failed to remove test database:', error);
  }
}

async function cleanupTestArtifacts() {
  console.log('Cleaning up test artifacts...');
  
  const artifactDirs = [
    path.join(__dirname, '../../../test-results'),
    path.join(__dirname, '../../../playwright-report'),
    path.join(__dirname, '../../../coverage')
  ];
  
  for (const dir of artifactDirs) {
    try {
      if (fs.existsSync(dir)) {
        // Only clean up if not in CI (preserve artifacts for CI)
        if (!process.env.CI) {
          fs.rmSync(dir, { recursive: true, force: true });
          console.log(`Cleaned up ${dir}`);
        }
      }
    } catch (error) {
      console.error(`Failed to clean up ${dir}:`, error);
    }
  }
}

export default globalTeardown;