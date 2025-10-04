// Jest setup file for global test configuration

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific console methods in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Mock Date.now for consistent testing
const mockDate = new Date('2023-01-01T12:00:00Z');
jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
Date.now = jest.fn(() => mockDate.getTime());

// Setup global test timeout
jest.setTimeout(10000);