import { test, expect, Page, ElectronApplication, _electron as electron } from '@playwright/test';
import * as path from 'path';

let electronApp: ElectronApplication;
let page: Page;

test.describe('MikroTik Hotspot Platform E2E Tests', () => {
  test.beforeAll(async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../main/main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    // Get the first window
    page = await electronApp.firstWindow();
    
    // Wait for the app to load
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('should launch application successfully', async () => {
    // Check if the app window is visible
    expect(await page.isVisible('body')).toBeTruthy();
    
    // Check window title
    const title = await page.title();
    expect(title).toContain('MikroTik Hotspot Platform');
  });

  test('should display login page initially', async () => {
    // Wait for login form to be visible
    await page.waitForSelector('[data-testid="login-form"]', { timeout: 10000 });
    
    // Check if login form elements are present
    expect(await page.isVisible('[data-testid="username-input"]')).toBeTruthy();
    expect(await page.isVisible('[data-testid="password-input"]')).toBeTruthy();
    expect(await page.isVisible('[data-testid="login-button"]')).toBeTruthy();
  });

  test('should show validation errors for empty login', async () => {
    // Click login button without entering credentials
    await page.click('[data-testid="login-button"]');
    
    // Wait for validation errors
    await page.waitForSelector('[data-testid="error-message"]', { timeout: 5000 });
    
    // Check if error message is displayed
    const errorMessage = await page.textContent('[data-testid="error-message"]');
    expect(errorMessage).toContain('required');
  });

  test('should perform successful login with valid credentials', async () => {
    // Fill in login credentials
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'admin123');
    
    // Click login button
    await page.click('[data-testid="login-button"]');
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 });
    
    // Check if we're on the dashboard
    expect(await page.isVisible('[data-testid="dashboard"]')).toBeTruthy();
  });

  test('should navigate between different pages', async () => {
    // Navigate to Users page
    await page.click('[data-testid="nav-users"]');
    await page.waitForSelector('[data-testid="users-page"]', { timeout: 5000 });
    expect(await page.isVisible('[data-testid="users-page"]')).toBeTruthy();
    
    // Navigate to Vouchers page
    await page.click('[data-testid="nav-vouchers"]');
    await page.waitForSelector('[data-testid="vouchers-page"]', { timeout: 5000 });
    expect(await page.isVisible('[data-testid="vouchers-page"]')).toBeTruthy();
    
    // Navigate to Reports page
    await page.click('[data-testid="nav-reports"]');
    await page.waitForSelector('[data-testid="reports-page"]', { timeout: 5000 });
    expect(await page.isVisible('[data-testid="reports-page"]')).toBeTruthy();
    
    // Navigate back to Dashboard
    await page.click('[data-testid="nav-dashboard"]');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 5000 });
    expect(await page.isVisible('[data-testid="dashboard"]')).toBeTruthy();
  });

  test('should display system statistics on dashboard', async () => {
    // Check if dashboard stats are visible
    await page.waitForSelector('[data-testid="dashboard-stats"]', { timeout: 5000 });
    
    // Check individual stat cards
    expect(await page.isVisible('[data-testid="total-users-stat"]')).toBeTruthy();
    expect(await page.isVisible('[data-testid="active-users-stat"]')).toBeTruthy();
    expect(await page.isVisible('[data-testid="total-vouchers-stat"]')).toBeTruthy();
    expect(await page.isVisible('[data-testid="revenue-stat"]')).toBeTruthy();
  });

  test('should create a new user', async () => {
    // Navigate to Users page
    await page.click('[data-testid="nav-users"]');
    await page.waitForSelector('[data-testid="users-page"]', { timeout: 5000 });
    
    // Click create user button
    await page.click('[data-testid="create-user-button"]');
    
    // Wait for create user dialog
    await page.waitForSelector('[data-testid="create-user-dialog"]', { timeout: 5000 });
    
    // Fill in user details
    const timestamp = Date.now();
    await page.fill('[data-testid="username-input"]', `testuser${timestamp}`);
    await page.fill('[data-testid="password-input"]', 'testpass123');
    await page.fill('[data-testid="email-input"]', `test${timestamp}@example.com`);
    await page.fill('[data-testid="fullname-input"]', 'Test User');
    
    // Select billing plan
    await page.click('[data-testid="billing-plan-select"]');
    await page.click('[data-testid="billing-plan-option"]:first-child');
    
    // Submit form
    await page.click('[data-testid="create-user-submit"]');
    
    // Wait for success message
    await page.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });
    
    // Check if user appears in the list
    await page.waitForSelector(`[data-testid="user-row-testuser${timestamp}"]`, { timeout: 5000 });
    expect(await page.isVisible(`[data-testid="user-row-testuser${timestamp}"]`)).toBeTruthy();
  });

  test('should generate vouchers', async () => {
    // Navigate to Vouchers page
    await page.click('[data-testid="nav-vouchers"]');
    await page.waitForSelector('[data-testid="vouchers-page"]', { timeout: 5000 });
    
    // Click generate vouchers button
    await page.click('[data-testid="generate-vouchers-button"]');
    
    // Wait for generate vouchers dialog
    await page.waitForSelector('[data-testid="generate-vouchers-dialog"]', { timeout: 5000 });
    
    // Fill in voucher generation details
    await page.fill('[data-testid="voucher-prefix-input"]', 'TEST');
    await page.fill('[data-testid="voucher-count-input"]', '5');
    
    // Select billing plan
    await page.click('[data-testid="billing-plan-select"]');
    await page.click('[data-testid="billing-plan-option"]:first-child');
    
    // Submit form
    await page.click('[data-testid="generate-vouchers-submit"]');
    
    // Wait for success message
    await page.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });
    
    // Check if vouchers appear in the list
    await page.waitForSelector('[data-testid="voucher-row"]', { timeout: 5000 });
    const voucherRows = await page.locator('[data-testid="voucher-row"]').count();
    expect(voucherRows).toBeGreaterThan(0);
  });

  test('should generate and download reports', async () => {
    // Navigate to Reports page
    await page.click('[data-testid="nav-reports"]');
    await page.waitForSelector('[data-testid="reports-page"]', { timeout: 5000 });
    
    // Select report type
    await page.click('[data-testid="report-type-select"]');
    await page.click('[data-testid="report-type-users"]');
    
    // Set date range
    await page.fill('[data-testid="date-from-input"]', '2024-01-01');
    await page.fill('[data-testid="date-to-input"]', '2024-12-31');
    
    // Generate report
    await page.click('[data-testid="generate-report-button"]');
    
    // Wait for report to be generated
    await page.waitForSelector('[data-testid="report-preview"]', { timeout: 15000 });
    
    // Check if report preview is visible
    expect(await page.isVisible('[data-testid="report-preview"]')).toBeTruthy();
    
    // Check if download buttons are available
    expect(await page.isVisible('[data-testid="download-pdf-button"]')).toBeTruthy();
    expect(await page.isVisible('[data-testid="download-excel-button"]')).toBeTruthy();
  });

  test('should handle system configuration', async () => {
    // Navigate to Admin page
    await page.click('[data-testid="nav-admin"]');
    await page.waitForSelector('[data-testid="admin-page"]', { timeout: 5000 });
    
    // Click on System Configuration tab
    await page.click('[data-testid="system-config-tab"]');
    await page.waitForSelector('[data-testid="system-config-form"]', { timeout: 5000 });
    
    // Update system name
    await page.fill('[data-testid="system-name-input"]', 'Test Hotspot System');
    
    // Update MikroTik settings
    await page.fill('[data-testid="mikrotik-host-input"]', '192.168.1.1');
    await page.fill('[data-testid="mikrotik-port-input"]', '8728');
    await page.fill('[data-testid="mikrotik-username-input"]', 'admin');
    
    // Save configuration
    await page.click('[data-testid="save-config-button"]');
    
    // Wait for success message
    await page.waitForSelector('[data-testid="success-message"]', { timeout: 5000 });
  });

  test('should test MikroTik connection', async () => {
    // Navigate to Admin page if not already there
    await page.click('[data-testid="nav-admin"]');
    await page.waitForSelector('[data-testid="admin-page"]', { timeout: 5000 });
    
    // Click test connection button
    await page.click('[data-testid="test-mikrotik-connection"]');
    
    // Wait for connection test result
    await page.waitForSelector('[data-testid="connection-test-result"]', { timeout: 10000 });
    
    // Check if result is displayed
    expect(await page.isVisible('[data-testid="connection-test-result"]')).toBeTruthy();
  });

  test('should handle logout', async () => {
    // Click logout button
    await page.click('[data-testid="logout-button"]');
    
    // Wait for login page to appear
    await page.waitForSelector('[data-testid="login-form"]', { timeout: 5000 });
    
    // Check if we're back to login page
    expect(await page.isVisible('[data-testid="login-form"]')).toBeTruthy();
  });

  test('should handle application menu actions', async () => {
    // Test keyboard shortcuts and menu actions
    // This would require the app to be logged in first
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 });
    
    // Test navigation shortcuts
    await page.keyboard.press('Control+1'); // Dashboard
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 2000 });
    
    await page.keyboard.press('Control+2'); // Users
    await page.waitForSelector('[data-testid="users-page"]', { timeout: 2000 });
    
    await page.keyboard.press('Control+3'); // Vouchers
    await page.waitForSelector('[data-testid="vouchers-page"]', { timeout: 2000 });
    
    await page.keyboard.press('Control+4'); // Reports
    await page.waitForSelector('[data-testid="reports-page"]', { timeout: 2000 });
  });

  test('should handle error scenarios gracefully', async () => {
    // Test network error handling
    // This would involve mocking network failures
    
    // Navigate to Users page
    await page.click('[data-testid="nav-users"]');
    await page.waitForSelector('[data-testid="users-page"]', { timeout: 5000 });
    
    // Try to create user with invalid data
    await page.click('[data-testid="create-user-button"]');
    await page.waitForSelector('[data-testid="create-user-dialog"]', { timeout: 5000 });
    
    // Submit empty form
    await page.click('[data-testid="create-user-submit"]');
    
    // Check for validation errors
    await page.waitForSelector('[data-testid="validation-error"]', { timeout: 5000 });
    expect(await page.isVisible('[data-testid="validation-error"]')).toBeTruthy();
  });

  test('should maintain responsive design', async () => {
    // Test different viewport sizes
    await page.setViewportSize({ width: 1200, height: 800 });
    expect(await page.isVisible('[data-testid="sidebar"]')).toBeTruthy();
    
    await page.setViewportSize({ width: 768, height: 600 });
    // On smaller screens, sidebar might be collapsed
    // Check if mobile navigation is working
    
    await page.setViewportSize({ width: 1400, height: 900 });
    // Back to desktop size
  });
});