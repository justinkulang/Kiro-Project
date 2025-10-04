// Test setup file
import path from 'path';
import fs from 'fs';

// Set test environment
process.env.NODE_ENV = 'test';

// Create test data directory
const testDataDir = path.join(process.cwd(), 'test-data');
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

// Clean up test database before each test suite
beforeEach(() => {
  const testDbPath = path.join(testDataDir, 'hotspot.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});

// Global test cleanup
afterAll(() => {
  // Clean up test data directory
  if (fs.existsSync(testDataDir)) {
    fs.rmSync(testDataDir, { recursive: true, force: true });
  }
});