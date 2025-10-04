# Testing Guide

## Overview

MikroTik Hotspot Platform uses a comprehensive testing strategy including unit tests, integration tests, and end-to-end tests to ensure reliability and quality.

## Test Structure

```
src/
├── __tests__/
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   ├── e2e/                  # End-to-end tests
│   └── performance.test.ts   # Performance tests
├── services/__tests__/       # Service-specific tests
├── models/__tests__/         # Model/repository tests
├── api/__tests__/           # API route tests
├── renderer/src/components/__tests__/  # Component tests
└── middleware/__tests__/     # Middleware tests
```

## Running Tests

### All Tests
```bash
npm run test:all
```

### Unit Tests
```bash
npm run test
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

### End-to-End Tests
```bash
npm run test:e2e
npm run test:e2e:ui      # Interactive UI mode
npm run test:e2e:debug   # Debug mode
```

### Performance Tests
```bash
npm run test:performance
```

### Specific Test Files
```bash
# Run specific test file
npm test -- userService.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="user creation"

# Run tests in specific directory
npm test -- src/services/__tests__/
```

## Test Configuration

### Jest Configuration

The project uses Jest for unit and integration testing. Configuration is in `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/main/**' // Exclude Electron main process
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts']
};
```

### Playwright Configuration

End-to-end tests use Playwright. Configuration is in `playwright.config.ts`:

```typescript
export default defineConfig({
  testDir: './src/__tests__/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'electron',
      use: { 
        launchOptions: {
          executablePath: require('electron'),
        }
      },
    },
  ],
});
```

## Writing Tests

### Unit Tests

#### Service Tests

```typescript
// src/services/__tests__/userService.test.ts
import UserManagementService from '../userManagementService';
import { getHotspotUserRepository } from '../../models';

jest.mock('../../models');

describe('UserManagementService', () => {
  let userService: UserManagementService;
  let mockUserRepo: jest.Mocked<any>;

  beforeEach(() => {
    mockUserRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUsername: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    
    (getHotspotUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
    userService = new UserManagementService();
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
        billingPlanId: 1,
      };

      const mockUser = { id: 1, ...userData };
      mockUserRepo.create.mockResolvedValue(mockUser);

      const result = await userService.createUser(userData);

      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining(userData)
      );
      expect(result).toEqual(expect.objectContaining(mockUser));
    });

    it('should throw error for duplicate username', async () => {
      const userData = {
        username: 'existing',
        password: 'password123',
        billingPlanId: 1,
      };

      mockUserRepo.findByUsername.mockResolvedValue({ id: 1 });

      await expect(userService.createUser(userData))
        .rejects.toThrow('Username already exists');
    });
  });
});
```

#### Repository Tests

```typescript
// src/models/repositories/__tests__/userRepository.test.ts
import { HotspotUserRepository } from '../hotspotUserRepository';
import { initializeTestDatabase, cleanupTestDatabase } from '../../__tests__/testUtils';

describe('HotspotUserRepository', () => {
  let repository: HotspotUserRepository;

  beforeAll(async () => {
    await initializeTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(() => {
    repository = new HotspotUserRepository();
  });

  describe('create', () => {
    it('should create a user', async () => {
      const userData = {
        username: 'testuser',
        password: 'hashedpassword',
        billing_plan_id: 1,
        is_active: true,
      };

      const user = await repository.create(userData);

      expect(user).toMatchObject(userData);
      expect(user.id).toBeDefined();
      expect(user.created_at).toBeDefined();
    });
  });

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      const userData = {
        username: 'findme',
        password: 'password',
        billing_plan_id: 1,
        is_active: true,
      };

      await repository.create(userData);
      const found = await repository.findByUsername('findme');

      expect(found).toMatchObject(userData);
    });

    it('should return null for non-existent user', async () => {
      const found = await repository.findByUsername('nonexistent');
      expect(found).toBeNull();
    });
  });
});
```

### Integration Tests

#### API Route Tests

```typescript
// src/api/__tests__/userRoutes.test.ts
import request from 'supertest';
import { app } from '../server';
import { initializeTestDatabase, cleanupTestDatabase } from '../../__tests__/testUtils';

describe('User Routes', () => {
  let authToken: string;

  beforeAll(async () => {
    await initializeTestDatabase();
    
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    
    authToken = loginResponse.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('POST /api/users', () => {
    it('should create a user', async () => {
      const userData = {
        username: 'newuser',
        password: 'password123',
        billingPlanId: 1,
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toMatchObject({
        username: userData.username,
      });
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ username: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 without auth token', async () => {
      await request(app)
        .post('/api/users')
        .send({ username: 'test' })
        .expect(401);
    });
  });

  describe('GET /api/users', () => {
    it('should return paginated users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 10,
      });
    });
  });
});
```

### Component Tests

#### React Component Tests

```typescript
// src/renderer/src/components/__tests__/UserCreateDialog.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme';
import UserCreateDialog from '../UserCreateDialog';

const MockedUserCreateDialog = ({ onClose, onUserCreated }: any) => (
  <ThemeProvider theme={theme}>
    <UserCreateDialog
      open={true}
      onClose={onClose}
      onUserCreated={onUserCreated}
    />
  </ThemeProvider>
);

describe('UserCreateDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnUserCreated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render form fields', () => {
    render(
      <MockedUserCreateDialog
        onClose={mockOnClose}
        onUserCreated={mockOnUserCreated}
      />
    );

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/billing plan/i)).toBeInTheDocument();
  });

  it('should show validation errors for empty required fields', async () => {
    render(
      <MockedUserCreateDialog
        onClose={mockOnClose}
        onUserCreated={mockOnUserCreated}
      />
    );

    const submitButton = screen.getByRole('button', { name: /create user/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/username is required/i)).toBeInTheDocument();
    });
  });

  it('should call onUserCreated when form is submitted successfully', async () => {
    // Mock API call
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { user: { id: 1, username: 'testuser' } }
      }),
    });

    render(
      <MockedUserCreateDialog
        onClose={mockOnClose}
        onUserCreated={mockOnUserCreated}
      />
    );

    // Fill form
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });

    // Submit
    const submitButton = screen.getByRole('button', { name: /create user/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnUserCreated).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'testuser' })
      );
    });
  });
});
```

### End-to-End Tests

#### Application Flow Tests

```typescript
// src/__tests__/e2e/userManagement.e2e.test.ts
import { test, expect, Page } from '@playwright/test';

test.describe('User Management E2E', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Login
    await page.goto('/');
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="dashboard"]');
  });

  test('should create a new user', async () => {
    // Navigate to users page
    await page.click('[data-testid="nav-users"]');
    await page.waitForSelector('[data-testid="users-page"]');

    // Open create dialog
    await page.click('[data-testid="create-user-button"]');
    await page.waitForSelector('[data-testid="create-user-dialog"]');

    // Fill form
    const timestamp = Date.now();
    await page.fill('[data-testid="username-input"]', `user${timestamp}`);
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.fill('[data-testid="email-input"]', `user${timestamp}@test.com`);

    // Select billing plan
    await page.click('[data-testid="billing-plan-select"]');
    await page.click('[data-testid="billing-plan-option"]:first-child');

    // Submit
    await page.click('[data-testid="create-user-submit"]');

    // Verify success
    await page.waitForSelector('[data-testid="success-message"]');
    await expect(page.locator(`[data-testid="user-row-user${timestamp}"]`))
      .toBeVisible();
  });

  test('should edit an existing user', async () => {
    // Navigate to users page
    await page.click('[data-testid="nav-users"]');
    await page.waitForSelector('[data-testid="users-page"]');

    // Click edit on first user
    await page.click('[data-testid="user-edit-button"]:first-child');
    await page.waitForSelector('[data-testid="edit-user-dialog"]');

    // Update email
    await page.fill('[data-testid="email-input"]', 'updated@test.com');

    // Submit
    await page.click('[data-testid="update-user-submit"]');

    // Verify success
    await page.waitForSelector('[data-testid="success-message"]');
  });

  test('should delete a user', async () => {
    // Navigate to users page
    await page.click('[data-testid="nav-users"]');
    await page.waitForSelector('[data-testid="users-page"]');

    // Get first user row
    const firstUserRow = page.locator('[data-testid^="user-row-"]:first-child');
    const userId = await firstUserRow.getAttribute('data-testid');

    // Click delete
    await page.click('[data-testid="user-delete-button"]:first-child');

    // Confirm deletion
    await page.click('[data-testid="confirm-delete-button"]');

    // Verify user is removed
    await expect(page.locator(`[data-testid="${userId}"]`)).not.toBeVisible();
  });
});
```

### Performance Tests

```typescript
// src/__tests__/performance/userManagement.perf.test.ts
import { performance } from 'perf_hooks';
import UserManagementService from '../../services/userManagementService';

describe('User Management Performance', () => {
  let userService: UserManagementService;

  beforeEach(() => {
    userService = new UserManagementService();
  });

  test('should create 1000 users within 10 seconds', async () => {
    const startTime = performance.now();
    const promises = [];

    for (let i = 0; i < 1000; i++) {
      promises.push(userService.createUser({
        username: `perfuser${i}`,
        password: 'password123',
        billingPlanId: 1,
      }));
    }

    await Promise.all(promises);
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(10000); // 10 seconds
  });

  test('should handle concurrent user creation', async () => {
    const concurrentUsers = 100;
    const startTime = performance.now();

    const promises = Array.from({ length: concurrentUsers }, (_, i) =>
      userService.createUser({
        username: `concurrent${i}`,
        password: 'password123',
        billingPlanId: 1,
      })
    );

    const results = await Promise.allSettled(promises);
    const endTime = performance.now();
    const duration = endTime - startTime;

    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    expect(successful).toBeGreaterThan(concurrentUsers * 0.9); // 90% success rate
    expect(duration).toBeLessThan(5000); // 5 seconds
  });
});
```

## Test Utilities

### Database Test Utilities

```typescript
// src/__tests__/testUtils.ts
import { Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { initializeDatabase } from '../models/database';

let testDb: Database<sqlite3.Database, sqlite3.Statement>;

export async function initializeTestDatabase(): Promise<void> {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_PATH = ':memory:';
  
  await initializeDatabase();
}

export async function cleanupTestDatabase(): Promise<void> {
  if (testDb) {
    await testDb.close();
  }
}

export async function seedTestData(): Promise<void> {
  // Create test admin user
  const adminRepo = getAdminUserRepository();
  await adminRepo.create({
    username: 'admin',
    password_hash: await hashPassword('admin123'),
    role: 'super_admin',
    is_active: true,
  });

  // Create test billing plans
  const billingRepo = getBillingPlanRepository();
  await billingRepo.create({
    name: 'Test Plan',
    price: 10.00,
    validity_period: 30,
    is_active: true,
  });
}
```

### Mock Utilities

```typescript
// src/__tests__/mocks.ts
export const mockMikroTikService = {
  testConnection: jest.fn().mockResolvedValue(true),
  createHotspotUser: jest.fn().mockResolvedValue(true),
  updateHotspotUser: jest.fn().mockResolvedValue(true),
  deleteHotspotUser: jest.fn().mockResolvedValue(true),
  getActiveUsers: jest.fn().mockResolvedValue([]),
  getUserSessions: jest.fn().mockResolvedValue([]),
};

export const mockUserRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findByUsername: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findAll: jest.fn(),
};

export function createMockUser(overrides = {}) {
  return {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    fullName: 'Test User',
    isActive: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
```

## Test Data Management

### Fixtures

```typescript
// src/__tests__/fixtures/users.ts
export const userFixtures = {
  validUser: {
    username: 'validuser',
    password: 'password123',
    email: 'valid@example.com',
    fullName: 'Valid User',
    billingPlanId: 1,
  },
  
  invalidUser: {
    username: '', // Invalid: empty username
    password: '123', // Invalid: too short
    email: 'invalid-email', // Invalid: bad format
  },
  
  adminUser: {
    username: 'admin',
    password: 'admin123',
    role: 'super_admin',
    isActive: true,
  },
};
```

### Test Factories

```typescript
// src/__tests__/factories/userFactory.ts
let userCounter = 0;

export function createTestUser(overrides = {}) {
  userCounter++;
  return {
    username: `testuser${userCounter}`,
    password: 'password123',
    email: `test${userCounter}@example.com`,
    fullName: `Test User ${userCounter}`,
    billingPlanId: 1,
    isActive: true,
    ...overrides,
  };
}

export function createTestUsers(count: number, overrides = {}) {
  return Array.from({ length: count }, () => createTestUser(overrides));
}
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm run test:coverage
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
```

## Coverage Reports

### Generating Coverage

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html
```

### Coverage Thresholds

The project maintains minimum coverage thresholds:
- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

## Best Practices

### Test Organization

1. **Group Related Tests**: Use `describe` blocks to group related tests
2. **Clear Test Names**: Use descriptive test names that explain what is being tested
3. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification phases
4. **One Assertion Per Test**: Focus each test on a single behavior

### Test Data

1. **Use Factories**: Create test data using factory functions for consistency
2. **Isolate Tests**: Each test should be independent and not rely on other tests
3. **Clean Up**: Always clean up test data after tests complete
4. **Realistic Data**: Use realistic test data that represents actual usage

### Mocking

1. **Mock External Dependencies**: Mock external services and APIs
2. **Verify Interactions**: Test that mocked functions are called correctly
3. **Reset Mocks**: Clear mock state between tests
4. **Mock at Boundaries**: Mock at service boundaries, not internal functions

### Performance Testing

1. **Set Realistic Targets**: Base performance targets on actual requirements
2. **Test Under Load**: Test with realistic data volumes and concurrent users
3. **Monitor Trends**: Track performance metrics over time
4. **Profile Bottlenecks**: Identify and address performance bottlenecks

## Debugging Tests

### Debug Unit Tests

```bash
# Run tests in debug mode
npm run test:debug

# Run specific test in debug mode
npm run test:debug -- --testNamePattern="user creation"
```

### Debug E2E Tests

```bash
# Run E2E tests in debug mode
npm run test:e2e:debug

# Run with browser visible
npm run test:e2e -- --headed

# Run specific test
npm run test:e2e -- --grep "user creation"
```

### Common Issues

1. **Async Test Timeouts**: Increase timeout for slow operations
2. **Database Locks**: Ensure proper cleanup of database connections
3. **Port Conflicts**: Use different ports for test environments
4. **Mock Leakage**: Reset mocks between tests to avoid interference

---

For more information on testing specific components, see the individual test files and documentation in the codebase.