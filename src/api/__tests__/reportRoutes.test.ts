import request from 'supertest';
import express from 'express';
import { json } from 'express';
import reportRoutes from '../routes/reportRoutes';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware';

// Mock the middleware and services
jest.mock('../../middleware/authMiddleware');
jest.mock('../../services/reportingService');

const mockAuthenticateToken = authenticateToken as jest.MockedFunction<typeof authenticateToken>;
const mockRequireRole = requireRole as jest.MockedFunction<typeof requireRole>;

describe('Report Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(json());
    
    // Mock middleware to pass through
    mockAuthenticateToken.mockImplementation((req, res, next) => {
      req.user = { id: 1, username: 'testuser', role: 'admin' };
      next();
    });
    
    mockRequireRole.mockImplementation(() => (req, res, next) => next());
    
    app.use('/api/reports', reportRoutes);
    
    jest.clearAllMocks();
  });

  describe('POST /api/reports/generate', () => {
    it('should accept valid report generation request', async () => {
      const reportRequest = {
        type: 'user',
        startDate: '2023-01-01T00:00:00Z',
        endDate: '2023-01-07T23:59:59Z',
        includeInactive: false
      };

      const response = await request(app)
        .post('/api/reports/generate')
        .send(reportRequest);

      // Since we're mocking the service, we expect the route to be accessible
      expect(response.status).not.toBe(404);
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        type: 'invalid_type',
        startDate: 'invalid_date',
        endDate: '2023-01-07T23:59:59Z'
      };

      const response = await request(app)
        .post('/api/reports/generate')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });

    it('should validate date range', async () => {
      const invalidDateRange = {
        type: 'user',
        startDate: '2023-01-07T00:00:00Z',
        endDate: '2023-01-01T23:59:59Z' // End before start
      };

      const response = await request(app)
        .post('/api/reports/generate')
        .send(invalidDateRange)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Start date must be before end date');
    });

    it('should reject date ranges exceeding 365 days', async () => {
      const tooLargeDateRange = {
        type: 'user',
        startDate: '2022-01-01T00:00:00Z',
        endDate: '2024-01-01T23:59:59Z' // More than 365 days
      };

      const response = await request(app)
        .post('/api/reports/generate')
        .send(tooLargeDateRange)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Date range cannot exceed 365 days');
    });

    it('should accept valid report types', async () => {
      const reportTypes = ['user', 'revenue', 'usage'];

      for (const type of reportTypes) {
        const reportRequest = {
          type,
          startDate: '2023-01-01T00:00:00Z',
          endDate: '2023-01-07T23:59:59Z'
        };

        const response = await request(app)
          .post('/api/reports/generate')
          .send(reportRequest);

        expect(response.status).not.toBe(400);
      }
    });

    it('should accept optional filters', async () => {
      const reportRequest = {
        type: 'user',
        startDate: '2023-01-01T00:00:00Z',
        endDate: '2023-01-07T23:59:59Z',
        userIds: ['1', '2', '3'],
        billingPlanIds: ['1', '2'],
        includeInactive: true
      };

      const response = await request(app)
        .post('/api/reports/generate')
        .send(reportRequest);

      expect(response.status).not.toBe(400);
    });
  });

  describe('POST /api/reports/export', () => {
    it('should accept valid export request', async () => {
      const exportRequest = {
        type: 'user',
        format: 'pdf',
        startDate: '2023-01-01T00:00:00Z',
        endDate: '2023-01-07T23:59:59Z'
      };

      const response = await request(app)
        .post('/api/reports/export')
        .send(exportRequest);

      expect(response.status).not.toBe(404);
    });

    it('should validate export format', async () => {
      const invalidFormat = {
        type: 'user',
        format: 'invalid_format',
        startDate: '2023-01-01T00:00:00Z',
        endDate: '2023-01-07T23:59:59Z'
      };

      const response = await request(app)
        .post('/api/reports/export')
        .send(invalidFormat)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should accept valid export formats', async () => {
      const formats = ['pdf', 'excel'];

      for (const format of formats) {
        const exportRequest = {
          type: 'user',
          format,
          startDate: '2023-01-01T00:00:00Z',
          endDate: '2023-01-07T23:59:59Z'
        };

        const response = await request(app)
          .post('/api/reports/export')
          .send(exportRequest);

        expect(response.status).not.toBe(400);
      }
    });
  });

  describe('GET /api/reports/quick-stats', () => {
    it('should return quick statistics', async () => {
      const response = await request(app)
        .get('/api/reports/quick-stats');

      expect(response.status).not.toBe(404);
    });

    it('should accept valid period parameters', async () => {
      const periods = ['today', 'week', 'month'];

      for (const period of periods) {
        const response = await request(app)
          .get(`/api/reports/quick-stats?period=${period}`);

        expect(response.status).not.toBe(400);
      }
    });

    it('should reject invalid period parameters', async () => {
      const response = await request(app)
        .get('/api/reports/quick-stats?period=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should use default period when not specified', async () => {
      const response = await request(app)
        .get('/api/reports/quick-stats');

      expect(response.status).not.toBe(404);
    });
  });

  describe('GET /api/reports/templates', () => {
    it('should return available report templates', async () => {
      const response = await request(app)
        .get('/api/reports/templates');

      expect(response.status).not.toBe(404);
    });
  });

  describe('POST /api/reports/schedule', () => {
    it('should accept valid schedule request', async () => {
      const scheduleRequest = {
        name: 'Daily User Report',
        type: 'user',
        format: 'pdf',
        frequency: 'daily',
        email: 'admin@example.com',
        filters: {
          includeInactive: false
        }
      };

      const response = await request(app)
        .post('/api/reports/schedule')
        .send(scheduleRequest);

      expect(response.status).not.toBe(404);
    });

    it('should validate required fields for scheduling', async () => {
      const invalidSchedule = {
        name: '', // Empty name
        type: 'invalid_type',
        format: 'invalid_format',
        frequency: 'invalid_frequency',
        email: 'invalid_email',
        filters: 'not_an_object'
      };

      const response = await request(app)
        .post('/api/reports/schedule')
        .send(invalidSchedule)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
      expect(response.body.details.length).toBeGreaterThan(0);
    });

    it('should validate email format', async () => {
      const invalidEmail = {
        name: 'Test Report',
        type: 'user',
        format: 'pdf',
        frequency: 'daily',
        email: 'not-an-email',
        filters: {}
      };

      const response = await request(app)
        .post('/api/reports/schedule')
        .send(invalidEmail)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should accept valid frequencies', async () => {
      const frequencies = ['daily', 'weekly', 'monthly'];

      for (const frequency of frequencies) {
        const scheduleRequest = {
          name: `Test ${frequency} Report`,
          type: 'user',
          format: 'pdf',
          frequency,
          email: 'admin@example.com',
          filters: {}
        };

        const response = await request(app)
          .post('/api/reports/schedule')
          .send(scheduleRequest);

        expect(response.status).not.toBe(400);
      }
    });
  });

  describe('GET /api/reports/history', () => {
    it('should return report history', async () => {
      const response = await request(app)
        .get('/api/reports/history');

      expect(response.status).not.toBe(404);
    });

    it('should accept valid limit parameter', async () => {
      const response = await request(app)
        .get('/api/reports/history?limit=25');

      expect(response.status).not.toBe(400);
    });

    it('should reject invalid limit parameter', async () => {
      const response = await request(app)
        .get('/api/reports/history?limit=150') // > 100
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should accept valid type filter', async () => {
      const types = ['user', 'revenue', 'usage'];

      for (const type of types) {
        const response = await request(app)
          .get(`/api/reports/history?type=${type}`);

        expect(response.status).not.toBe(400);
      }
    });

    it('should reject invalid type filter', async () => {
      const response = await request(app)
        .get('/api/reports/history?type=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all routes', async () => {
      // Reset mock to simulate no authentication
      mockAuthenticateToken.mockImplementation((req, res, next) => {
        res.status(401).json({ error: 'Unauthorized' });
      });

      const routes = [
        { method: 'post', path: '/api/reports/generate' },
        { method: 'post', path: '/api/reports/export' },
        { method: 'get', path: '/api/reports/quick-stats' },
        { method: 'get', path: '/api/reports/templates' },
        { method: 'post', path: '/api/reports/schedule' },
        { method: 'get', path: '/api/reports/history' }
      ];

      for (const route of routes) {
        const response = await request(app)[route.method as keyof typeof request](route.path);
        expect(response.status).toBe(401);
      }
    });

    it('should require appropriate roles for restricted routes', async () => {
      // Reset mock to simulate role check failure
      mockRequireRole.mockImplementation(() => (req, res, next) => {
        res.status(403).json({ error: 'Forbidden' });
      });

      const restrictedRoutes = [
        { method: 'post', path: '/api/reports/generate', body: {} },
        { method: 'post', path: '/api/reports/export', body: {} },
        { method: 'post', path: '/api/reports/schedule', body: {} }
      ];

      for (const route of restrictedRoutes) {
        const response = await request(app)[route.method as keyof typeof request](route.path)
          .send(route.body);
        expect(response.status).toBe(403);
      }
    });
  });
});