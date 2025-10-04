import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './src/__tests__/e2e',
  /* Run tests in files in parallel */
  fullyParallel: false, // Electron tests should run sequentially
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: 1, // Electron tests should run with single worker
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'electron',
      use: { 
        ...devices['Desktop Chrome'],
        // Electron-specific configuration
        launchOptions: {
          executablePath: require('electron'), // Path to Electron executable
        }
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'npm run dev:api',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000, // 2 minutes
    }
  ],

  /* Global setup and teardown */
  globalSetup: require.resolve('./src/__tests__/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./src/__tests__/e2e/global-teardown.ts'),

  /* Test timeout */
  timeout: 60 * 1000, // 60 seconds per test

  /* Expect timeout */
  expect: {
    timeout: 10 * 1000, // 10 seconds for assertions
  },

  /* Output directory for test artifacts */
  outputDir: 'test-results/',
});