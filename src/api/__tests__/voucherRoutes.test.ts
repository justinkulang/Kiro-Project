import request from 'supertest';
import express from 'express';
import { json } from 'express';
import voucherRoutes from '../routes/voucherRoutes';
import { voucherService } from '../../services/voucherService';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware';

// Mock the services and middleware
jest.mock('../../services/voucherService');
jest.mock('../../middleware/authMiddleware');

const mockVoucherService = voucherService as jest.Mocked<typeof voucherService>;
const mockAuthenticateToken = authenticateToken as jest.MockedFunction<typeof authenticateToken>;
const mockRequireRole = requireRole as jest.MockedFunction<typeof requireRole>;

describe('Voucher Routes', () => {
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
    
    app.use('/api/vouchers', voucherRoutes);
    
    jest.clearAllMocks();
  });

  describe('GET /api/vouchers/billing-plans', () => {
    it('should return all billing plans', async () => {
      const mockPlans = [
        {
          id: 1,
          name: 'Test Plan',
          price: 10.00,
          validity_period: 30,
          is_active: true,
          created_at: '2023-01-01T00:00:00Z'
        }
      ];

      mockVoucherService.getAllBillingPlans.mockResolvedValue(mockPlans);

      const response = await request(app)
        .get('/api/vouchers/billing-plans')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPlans);
      expect(mockVoucherService.getAllBillingPlans).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors', async () => {
      mockVoucherService.getAllBillingPlans.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/vouchers/billing-plans')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch billing plans');
    });
  });

  describe('POST /api/vouchers/billing-plans', () => {
    it('should create a new billing plan', async () => {
      const planData = {
        name: 'Test Plan',
        description: 'Test Description',
        price: 10.00,
        time_limit: 60,
        validity_period: 30
      };

      const mockCreatedPlan = {
        id: 1,
        ...planData,
        is_active: true,
        created_at: '2023-01-01T00:00:00Z'
      };

      mockVoucherService.createBillingPlan.mockResolvedValue(mockCreatedPlan);

      const response = await request(app)
        .post('/api/vouchers/billing-plans')
        .send(planData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCreatedPlan);
      expect(mockVoucherService.createBillingPlan).toHaveBeenCalledWith(planData);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: '', // Invalid: empty name
        price: -10, // Invalid: negative price
        validity_period: 0 // Invalid: zero validity period
      };

      const response = await request(app)
        .post('/api/vouchers/billing-plans')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });
  });

  describe('POST /api/vouchers/generate', () => {
    it('should generate vouchers successfully', async () => {
      const generateRequest = {
        quantity: 5,
        billing_plan_id: 1,
        validity_days: 30,
        prefix: 'TEST'
      };

      const mockVouchers = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        code: `TEST-${i + 1}`,
        billing_plan_id: 1,
        is_used: false,
        expires_at: '2023-02-01T00:00:00Z',
        created_at: '2023-01-01T00:00:00Z'
      }));

      mockVoucherService.generateVouchers.mockResolvedValue(mockVouchers);

      const response = await request(app)
        .post('/api/vouchers/generate')
        .send(generateRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockVouchers);
      expect(response.body.message).toContain('Generated 5 vouchers successfully');
      expect(mockVoucherService.generateVouchers).toHaveBeenCalledWith(generateRequest);
    });

    it('should validate voucher generation parameters', async () => {
      const invalidRequest = {
        quantity: 0, // Invalid: zero quantity
        billing_plan_id: 'invalid', // Invalid: not a number
        validity_days: -1 // Invalid: negative validity
      };

      const response = await request(app)
        .post('/api/vouchers/generate')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/vouchers/validate/:code', () => {
    it('should validate a valid voucher', async () => {
      const mockValidation = {
        isValid: true,
        voucher: {
          id: 1,
          code: 'TEST123',
          billing_plan_id: 1,
          is_used: false,
          expires_at: '2025-12-31T23:59:59Z'
        },
        billingPlan: {
          id: 1,
          name: 'Test Plan',
          price: 10.00
        }
      };

      mockVoucherService.validateVoucherCode.mockResolvedValue(mockValidation);

      const response = await request(app)
        .get('/api/vouchers/validate/TEST123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockValidation);
      expect(mockVoucherService.validateVoucherCode).toHaveBeenCalledWith('TEST123');
    });

    it('should handle invalid voucher', async () => {
      const mockValidation = {
        isValid: false,
        error: 'Voucher not found'
      };

      mockVoucherService.validateVoucherCode.mockResolvedValue(mockValidation);

      const response = await request(app)
        .get('/api/vouchers/validate/INVALID')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.error).toBe('Voucher not found');
    });
  });

  describe('POST /api/vouchers/use/:code', () => {
    it('should mark voucher as used', async () => {
      const mockUsedVoucher = {
        id: 1,
        code: 'TEST123',
        billing_plan_id: 1,
        is_used: true,
        used_at: '2023-01-01T12:00:00Z',
        expires_at: '2025-12-31T23:59:59Z'
      };

      mockVoucherService.useVoucher.mockResolvedValue(mockUsedVoucher);

      const response = await request(app)
        .post('/api/vouchers/use/TEST123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUsedVoucher);
      expect(response.body.message).toBe('Voucher marked as used successfully');
      expect(mockVoucherService.useVoucher).toHaveBeenCalledWith('TEST123');
    });

    it('should handle already used voucher', async () => {
      mockVoucherService.useVoucher.mockRejectedValue(new Error('Voucher has already been used'));

      const response = await request(app)
        .post('/api/vouchers/use/TEST123')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to use voucher');
      expect(response.body.message).toBe('Voucher has already been used');
    });
  });

  describe('GET /api/vouchers/statistics', () => {
    it('should return voucher statistics', async () => {
      const mockStats = {
        total_vouchers: 100,
        used_vouchers: 25,
        expired_vouchers: 10,
        active_vouchers: 65,
        revenue_generated: 250.00
      };

      mockVoucherService.getVoucherStatistics.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/vouchers/statistics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
      expect(mockVoucherService.getVoucherStatistics).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/vouchers', () => {
    it('should return vouchers with filters', async () => {
      const mockVouchers = [
        {
          id: 1,
          code: 'TEST123',
          billing_plan_id: 1,
          is_used: false,
          expires_at: '2025-12-31T23:59:59Z'
        }
      ];

      mockVoucherService.getVouchers.mockResolvedValue(mockVouchers);

      const response = await request(app)
        .get('/api/vouchers?billing_plan_id=1&is_used=false')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockVouchers);
      expect(mockVoucherService.getVouchers).toHaveBeenCalledWith({
        billing_plan_id: 1,
        is_used: false
      });
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/vouchers?billing_plan_id=invalid&is_used=notboolean')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });
});