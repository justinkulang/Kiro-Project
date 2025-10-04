import request from 'supertest';
import express from 'express';
import { json } from 'express';
import billingPlanRoutes from '../routes/billingPlanRoutes';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware';

// Mock the middleware
jest.mock('../../middleware/authMiddleware');
jest.mock('../../services/billingPlanService');
jest.mock('../../services/adminLogService');

const mockAuthenticateToken = authenticateToken as jest.MockedFunction<typeof authenticateToken>;
const mockRequireRole = requireRole as jest.MockedFunction<typeof requireRole>;

// Create test app
const app = express();
app.use(json());
app.use('/api/billing-plans', billingPlanRoutes);

// Mock user for authenticated requests
const mockUser = {
  id: 1,
  username: 'testadmin',
  role: 'super_admin',
  isActive: true
};

describe('Billing Plan Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication middleware to pass through
    mockAuthenticateToken.mockImplementation((req: any, res: any, next: any) => {
      req.user = mockUser;
      next();
    });
    
    // Mock role middleware to pass through
    mockRequireRole.mockImplementation(() => (req: any, res: any, next: any) => {
      next();
    });
  });

  describe('GET /api/billing-plans', () => {
    it('should get billing plans with pagination', async () => {
      const mockBillingPlanService = require('../../services/billingPlanService').BillingPlanService;
      mockBillingPlanService.prototype.getBillingPlans = jest.fn().mockResolvedValue({
        data: [
          { id: 1, name: 'Basic Plan', price: 10, isActive: true },
          { id: 2, name: 'Premium Plan', price: 20, isActive: true }
        ],
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1
      });

      const response = await request(app)
        .get('/api/billing-plans')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
    });

    it('should handle query parameters', async () => {
      const mockBillingPlanService = require('../../services/billingPlanService').BillingPlanService;
      mockBillingPlanService.prototype.getBillingPlans = jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      });

      await request(app)
        .get('/api/billing-plans?page=1&limit=10&search=basic&isActive=true')
        .expect(200);

      expect(mockBillingPlanService.prototype.getBillingPlans).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: 'basic',
        isActive: true
      });
    });
  });

  describe('GET /api/billing-plans/:id', () => {
    it('should get a specific billing plan', async () => {
      const mockBillingPlanService = require('../../services/billingPlanService').BillingPlanService;
      mockBillingPlanService.prototype.getBillingPlanById = jest.fn().mockResolvedValue({
        id: 1,
        name: 'Basic Plan',
        price: 10,
        isActive: true
      });

      const response = await request(app)
        .get('/api/billing-plans/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
    });

    it('should return 404 for non-existent billing plan', async () => {
      const mockBillingPlanService = require('../../services/billingPlanService').BillingPlanService;
      mockBillingPlanService.prototype.getBillingPlanById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/api/billing-plans/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Billing plan not found');
    });
  });

  describe('POST /api/billing-plans', () => {
    it('should create a new billing plan', async () => {
      const mockBillingPlanService = require('../../services/billingPlanService').BillingPlanService;
      const mockAdminLogService = require('../../services/adminLogService').default;
      
      const newBillingPlan = {
        id: 1,
        name: 'Test Plan',
        price: 15,
        isActive: true
      };

      mockBillingPlanService.prototype.createBillingPlan = jest.fn().mockResolvedValue(newBillingPlan);
      mockAdminLogService.prototype.logSystemAction = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/billing-plans')
        .send({
          name: 'Test Plan',
          price: 15,
          validityPeriod: 30
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Plan');
      expect(mockAdminLogService.prototype.logSystemAction).toHaveBeenCalled();
    });
  });

  describe('PUT /api/billing-plans/:id', () => {
    it('should update a billing plan', async () => {
      const mockBillingPlanService = require('../../services/billingPlanService').BillingPlanService;
      const mockAdminLogService = require('../../services/adminLogService').default;
      
      const updatedBillingPlan = {
        id: 1,
        name: 'Updated Plan',
        price: 25,
        isActive: true
      };

      mockBillingPlanService.prototype.updateBillingPlan = jest.fn().mockResolvedValue(updatedBillingPlan);
      mockAdminLogService.prototype.logSystemAction = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .put('/api/billing-plans/1')
        .send({
          name: 'Updated Plan',
          price: 25
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Plan');
    });

    it('should return 404 for non-existent billing plan', async () => {
      const mockBillingPlanService = require('../../services/billingPlanService').BillingPlanService;
      mockBillingPlanService.prototype.updateBillingPlan = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .put('/api/billing-plans/999')
        .send({ name: 'Updated Plan' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/billing-plans/:id', () => {
    it('should delete a billing plan', async () => {
      const mockBillingPlanService = require('../../services/billingPlanService').BillingPlanService;
      const mockAdminLogService = require('../../services/adminLogService').default;
      
      mockBillingPlanService.prototype.isBillingPlanInUse = jest.fn().mockResolvedValue(false);
      mockBillingPlanService.prototype.deleteBillingPlan = jest.fn().mockResolvedValue(true);
      mockAdminLogService.prototype.logSystemAction = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/billing-plans/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Billing plan deleted successfully');
    });

    it('should not delete billing plan in use', async () => {
      const mockBillingPlanService = require('../../services/billingPlanService').BillingPlanService;
      mockBillingPlanService.prototype.isBillingPlanInUse = jest.fn().mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/billing-plans/1')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot delete billing plan that is currently in use');
    });
  });

  describe('GET /api/billing-plans/stats', () => {
    it('should get billing plan statistics', async () => {
      const mockBillingPlanService = require('../../services/billingPlanService').BillingPlanService;
      mockBillingPlanService.prototype.getBillingPlanStats = jest.fn().mockResolvedValue({
        totalPlans: 5,
        activePlans: 4,
        totalRevenue: 1000,
        mostPopularPlan: 'Basic Plan'
      });

      const response = await request(app)
        .get('/api/billing-plans/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalPlans).toBe(5);
    });
  });

  describe('Error handling', () => {
    it('should handle service errors', async () => {
      const mockBillingPlanService = require('../../services/billingPlanService').BillingPlanService;
      mockBillingPlanService.prototype.getBillingPlans = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/billing-plans')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to retrieve billing plans');
    });
  });
});