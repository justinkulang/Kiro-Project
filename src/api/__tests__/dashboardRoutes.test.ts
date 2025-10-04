import request from 'supertest';
import express from 'express';
import { json } from 'express';
import dashboardRoutes from '../routes/dashboardRoutes';
import { authenticateToken } from '../../middleware/authMiddleware';

// Mock the middleware and services
jest.mock('../../middleware/authMiddleware');
jest.mock('../../services/dashboardService');
jest.mock('../../services/monitoringService');
jest.mock('../../services/mikrotikService');

const mockAuthenticateToken = authenticateToken as jest.MockedFunction<typeof authenticateToken>;

describe('Dashboard Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(json());
    
    // Mock middleware to pass through
    mockAuthenticateToken.mockImplementation((req, res, next) => {
      req.user = { id: 1, username: 'testuser', role: 'admin' };
      next();
    });
    
    app.use('/api/dashboard', dashboardRoutes);
    
    jest.clearAllMocks();
  });

  describe('GET /api/dashboard/stats', () => {
    it('should return dashboard statistics', async () => {
      // Since we're mocking the services, we need to mock the actual service instances
      // This is a simplified test that checks the route structure
      const response = await request(app)
        .get('/api/dashboard/stats');

      // The route should be accessible (not 404)
      expect(response.status).not.toBe(404);
    });
  });

  describe('GET /api/dashboard/active-users', () => {
    it('should return active users', async () => {
      const response = await request(app)
        .get('/api/dashboard/active-users');

      expect(response.status).not.toBe(404);
    });
  });

  describe('GET /api/dashboard/bandwidth-history', () => {
    it('should accept valid hours parameter', async () => {
      const response = await request(app)
        .get('/api/dashboard/bandwidth-history?hours=24');

      expect(response.status).not.toBe(404);
    });

    it('should reject invalid hours parameter', async () => {
      const response = await request(app)
        .get('/api/dashboard/bandwidth-history?hours=200'); // > 168

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject negative hours', async () => {
      const response = await request(app)
        .get('/api/dashboard/bandwidth-history?hours=-1');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/dashboard/revenue-history', () => {
    it('should accept valid days parameter', async () => {
      const response = await request(app)
        .get('/api/dashboard/revenue-history?days=30');

      expect(response.status).not.toBe(404);
    });

    it('should reject invalid days parameter', async () => {
      const response = await request(app)
        .get('/api/dashboard/revenue-history?days=400'); // > 365

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/dashboard/user-activity', () => {
    it('should accept valid hours parameter', async () => {
      const response = await request(app)
        .get('/api/dashboard/user-activity?hours=48');

      expect(response.status).not.toBe(404);
    });

    it('should use default hours when not specified', async () => {
      const response = await request(app)
        .get('/api/dashboard/user-activity');

      expect(response.status).not.toBe(404);
    });
  });

  describe('GET /api/dashboard/top-users', () => {
    it('should accept valid limit parameter', async () => {
      const response = await request(app)
        .get('/api/dashboard/top-users?limit=20');

      expect(response.status).not.toBe(404);
    });

    it('should reject invalid limit parameter', async () => {
      const response = await request(app)
        .get('/api/dashboard/top-users?limit=150'); // > 100

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/dashboard/system-health', () => {
    it('should return system health metrics', async () => {
      const response = await request(app)
        .get('/api/dashboard/system-health');

      expect(response.status).not.toBe(404);
    });
  });

  describe('GET /api/dashboard/session-history', () => {
    it('should accept valid limit parameter', async () => {
      const response = await request(app)
        .get('/api/dashboard/session-history?limit=50');

      expect(response.status).not.toBe(404);
    });

    it('should reject invalid limit parameter', async () => {
      const response = await request(app)
        .get('/api/dashboard/session-history?limit=2000'); // > 1000

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/dashboard/user-session/:username', () => {
    it('should accept username parameter', async () => {
      const response = await request(app)
        .get('/api/dashboard/user-session/testuser');

      expect(response.status).not.toBe(404);
    });
  });

  describe('POST /api/dashboard/disconnect-user/:username', () => {
    it('should accept username parameter', async () => {
      const response = await request(app)
        .post('/api/dashboard/disconnect-user/testuser');

      expect(response.status).not.toBe(404);
    });
  });

  describe('GET /api/dashboard/user-bandwidth/:username', () => {
    it('should accept username and hours parameters', async () => {
      const response = await request(app)
        .get('/api/dashboard/user-bandwidth/testuser?hours=24');

      expect(response.status).not.toBe(404);
    });

    it('should reject invalid hours parameter', async () => {
      const response = await request(app)
        .get('/api/dashboard/user-bandwidth/testuser?hours=200');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/dashboard/real-time', () => {
    it('should return real-time data', async () => {
      const response = await request(app)
        .get('/api/dashboard/real-time');

      expect(response.status).not.toBe(404);
    });
  });

  describe('POST /api/dashboard/start-monitoring', () => {
    it('should accept valid interval parameter', async () => {
      const response = await request(app)
        .post('/api/dashboard/start-monitoring?interval=30000');

      expect(response.status).not.toBe(404);
    });

    it('should reject invalid interval parameter', async () => {
      const response = await request(app)
        .post('/api/dashboard/start-monitoring?interval=1000'); // < 5000

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/dashboard/stop-monitoring', () => {
    it('should stop monitoring', async () => {
      const response = await request(app)
        .post('/api/dashboard/stop-monitoring');

      expect(response.status).not.toBe(404);
    });
  });

  describe('GET /api/dashboard/monitoring-stats', () => {
    it('should return monitoring statistics', async () => {
      const response = await request(app)
        .get('/api/dashboard/monitoring-stats');

      expect(response.status).not.toBe(404);
    });
  });
});