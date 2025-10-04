import { VoucherService } from '../voucherService';
import { getBillingPlanRepository, getVoucherRepository } from '../../models';
import { BillingPlan, Voucher, CreateBillingPlanRequest, VoucherGenerationRequest } from '../../models/types';

// Mock the repositories
jest.mock('../../models', () => ({
  getBillingPlanRepository: jest.fn(),
  getVoucherRepository: jest.fn()
}));

describe('VoucherService', () => {
  let voucherService: VoucherService;
  let mockBillingPlanRepo: any;
  let mockVoucherRepo: any;

  beforeEach(() => {
    mockBillingPlanRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByCondition: jest.fn(),
      update: jest.fn()
    };

    mockVoucherRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByCondition: jest.fn(),
      update: jest.fn()
    };

    (getBillingPlanRepository as jest.Mock).mockReturnValue(mockBillingPlanRepo);
    (getVoucherRepository as jest.Mock).mockReturnValue(mockVoucherRepo);

    voucherService = new VoucherService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBillingPlan', () => {
    it('should create a billing plan successfully', async () => {
      const planData: CreateBillingPlanRequest = {
        name: 'Test Plan',
        description: 'Test Description',
        price: 10.00,
        time_limit: 60,
        data_limit: 1024,
        validity_period: 30
      };

      const expectedPlan: BillingPlan = {
        id: 1,
        ...planData,
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      mockBillingPlanRepo.create.mockResolvedValue(expectedPlan);

      const result = await voucherService.createBillingPlan(planData);

      expect(mockBillingPlanRepo.create).toHaveBeenCalledWith({
        name: planData.name,
        description: planData.description,
        time_limit: planData.time_limit,
        data_limit: planData.data_limit,
        speed_limit_up: planData.speed_limit_up,
        speed_limit_down: planData.speed_limit_down,
        validity_period: planData.validity_period,
        price: planData.price,
        is_active: true
      });
      expect(result).toEqual(expectedPlan);
    });

    it('should throw error for invalid plan data', async () => {
      const planData: CreateBillingPlanRequest = {
        name: '',
        price: -10,
        time_limit: -1,
        validity_period: 30
      };

      await expect(voucherService.createBillingPlan(planData)).rejects.toThrow('Billing plan name is required');
    });

    it('should throw error for negative price', async () => {
      const planData: CreateBillingPlanRequest = {
        name: 'Test Plan',
        price: -10,
        validity_period: 30
      };

      await expect(voucherService.createBillingPlan(planData)).rejects.toThrow('Price cannot be negative');
    });
  });

  describe('generateVouchers', () => {
    it('should generate vouchers successfully', async () => {
      const billingPlan: BillingPlan = {
        id: 1,
        name: 'Test Plan',
        price: 10.00,
        validity_period: 30,
        is_active: true,
        created_at: '2023-01-01T00:00:00Z'
      };

      const request: VoucherGenerationRequest = {
        quantity: 2,
        billing_plan_id: 1,
        validity_days: 30,
        prefix: 'TEST'
      };

      const mockVoucher: Voucher = {
        id: 1,
        code: 'TEST-ABC123',
        billing_plan_id: 1,
        batch_id: 'BATCH-123',
        is_used: false,
        used_at: null,
        used_by_user_id: null,
        expires_at: '2023-02-01T00:00:00Z',
        created_at: '2023-01-01T00:00:00Z'
      };

      mockBillingPlanRepo.findById.mockResolvedValue(billingPlan);
      mockVoucherRepo.create.mockResolvedValue(mockVoucher);

      const result = await voucherService.generateVouchers(request);

      expect(mockBillingPlanRepo.findById).toHaveBeenCalledWith(1);
      expect(mockVoucherRepo.create).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockVoucher);
    });

    it('should throw error for invalid billing plan', async () => {
      const request: VoucherGenerationRequest = {
        quantity: 1,
        billing_plan_id: 999,
        validity_days: 30
      };

      mockBillingPlanRepo.findById.mockResolvedValue(null);

      await expect(voucherService.generateVouchers(request)).rejects.toThrow('Invalid or inactive billing plan');
    });

    it('should throw error for invalid quantity', async () => {
      const request: VoucherGenerationRequest = {
        quantity: 0,
        billing_plan_id: 1,
        validity_days: 30
      };

      await expect(voucherService.generateVouchers(request)).rejects.toThrow('Quantity must be between 1 and 1000');
    });

    it('should throw error for invalid validity period', async () => {
      const request: VoucherGenerationRequest = {
        quantity: 1,
        billing_plan_id: 1,
        validity_days: 0
      };

      await expect(voucherService.generateVouchers(request)).rejects.toThrow('Validity period must be greater than 0 days');
    });
  });

  describe('useVoucher', () => {
    it('should mark voucher as used successfully', async () => {
      const voucher: Voucher = {
        id: 1,
        code: 'TEST123',
        billing_plan_id: 1,
        is_used: false,
        expires_at: '2025-12-31T23:59:59Z',
        created_at: '2023-01-01T00:00:00Z'
      };

      const updatedVoucher: Voucher = {
        ...voucher,
        is_used: true,
        used_at: '2023-01-01T12:00:00Z'
      };

      mockVoucherRepo.findByCondition.mockResolvedValue([voucher]);
      mockVoucherRepo.update.mockResolvedValue(updatedVoucher);

      const result = await voucherService.useVoucher('TEST123');

      expect(mockVoucherRepo.findByCondition).toHaveBeenCalledWith({ code: 'TEST123' });
      expect(mockVoucherRepo.update).toHaveBeenCalledWith(1, {
        is_used: true,
        used_at: expect.any(Date)
      });
      expect(result).toEqual(updatedVoucher);
    });

    it('should throw error for non-existent voucher', async () => {
      mockVoucherRepo.findByCondition.mockResolvedValue([]);

      await expect(voucherService.useVoucher('INVALID')).rejects.toThrow('Voucher not found');
    });

    it('should throw error for already used voucher', async () => {
      const voucher: Voucher = {
        id: 1,
        code: 'TEST123',
        billing_plan_id: 1,
        is_used: true,
        used_at: '2023-01-01T10:00:00Z',
        expires_at: '2025-12-31T23:59:59Z',
        created_at: '2023-01-01T00:00:00Z'
      };

      mockVoucherRepo.findByCondition.mockResolvedValue([voucher]);

      await expect(voucherService.useVoucher('TEST123')).rejects.toThrow('Voucher has already been used');
    });

    it('should throw error for expired voucher', async () => {
      const voucher: Voucher = {
        id: 1,
        code: 'TEST123',
        billing_plan_id: 1,
        is_used: false,
        expires_at: '2020-01-01T00:00:00Z',
        created_at: '2023-01-01T00:00:00Z'
      };

      mockVoucherRepo.findByCondition.mockResolvedValue([voucher]);

      await expect(voucherService.useVoucher('TEST123')).rejects.toThrow('Voucher has expired');
    });
  });

  describe('validateVoucherCode', () => {
    it('should validate valid voucher successfully', async () => {
      const voucher: Voucher = {
        id: 1,
        code: 'TEST123',
        billing_plan_id: 1,
        is_used: false,
        expires_at: '2025-12-31T23:59:59Z',
        created_at: '2023-01-01T00:00:00Z'
      };

      const billingPlan: BillingPlan = {
        id: 1,
        name: 'Test Plan',
        price: 10.00,
        validity_period: 30,
        is_active: true,
        created_at: '2023-01-01T00:00:00Z'
      };

      mockVoucherRepo.findByCondition.mockResolvedValue([voucher]);
      mockBillingPlanRepo.findById.mockResolvedValue(billingPlan);

      const result = await voucherService.validateVoucherCode('TEST123');

      expect(result.isValid).toBe(true);
      expect(result.voucher).toEqual(voucher);
      expect(result.billingPlan).toEqual(billingPlan);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for non-existent voucher', async () => {
      mockVoucherRepo.findByCondition.mockResolvedValue([]);

      const result = await voucherService.validateVoucherCode('INVALID');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Voucher not found');
    });

    it('should return invalid for used voucher', async () => {
      const voucher: Voucher = {
        id: 1,
        code: 'TEST123',
        billing_plan_id: 1,
        is_used: true,
        used_at: '2023-01-01T10:00:00Z',
        expires_at: '2025-12-31T23:59:59Z',
        created_at: '2023-01-01T00:00:00Z'
      };

      mockVoucherRepo.findByCondition.mockResolvedValue([voucher]);

      const result = await voucherService.validateVoucherCode('TEST123');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Voucher has already been used');
    });
  });

  describe('getVoucherStatistics', () => {
    it('should return correct statistics', async () => {
      const vouchers: Voucher[] = [
        {
          id: 1,
          code: 'USED1',
          billing_plan_id: 1,
          is_used: true,
          expires_at: '2025-12-31T23:59:59Z',
          created_at: '2023-01-01T00:00:00Z'
        },
        {
          id: 2,
          code: 'ACTIVE1',
          billing_plan_id: 1,
          is_used: false,
          expires_at: '2025-12-31T23:59:59Z',
          created_at: '2023-01-01T00:00:00Z'
        },
        {
          id: 3,
          code: 'EXPIRED1',
          billing_plan_id: 1,
          is_used: false,
          expires_at: '2020-01-01T00:00:00Z',
          created_at: '2023-01-01T00:00:00Z'
        }
      ];

      const billingPlans: BillingPlan[] = [
        {
          id: 1,
          name: 'Test Plan',
          price: 10.00,
          validity_period: 30,
          is_active: true,
          created_at: '2023-01-01T00:00:00Z'
        }
      ];

      mockVoucherRepo.findAll.mockResolvedValue(vouchers);
      mockBillingPlanRepo.findAll.mockResolvedValue(billingPlans);

      const result = await voucherService.getVoucherStatistics();

      expect(result.total_vouchers).toBe(3);
      expect(result.used_vouchers).toBe(1);
      expect(result.expired_vouchers).toBe(1);
      expect(result.active_vouchers).toBe(1);
      expect(result.revenue_generated).toBe(10.00);
    });
  });

  describe('deleteBillingPlan', () => {
    it('should delete billing plan when not used by vouchers', async () => {
      const billingPlan: BillingPlan = {
        id: 1,
        name: 'Test Plan',
        price: 10.00,
        validity_period: 30,
        is_active: true,
        created_at: '2023-01-01T00:00:00Z'
      };

      mockBillingPlanRepo.findById.mockResolvedValue(billingPlan);
      mockVoucherRepo.findByCondition.mockResolvedValue([]);
      mockBillingPlanRepo.update.mockResolvedValue({ ...billingPlan, is_active: false });

      await voucherService.deleteBillingPlan('1');

      expect(mockBillingPlanRepo.findById).toHaveBeenCalledWith('1');
      expect(mockVoucherRepo.findByCondition).toHaveBeenCalledWith({ billing_plan_id: 1 });
      expect(mockBillingPlanRepo.update).toHaveBeenCalledWith(1, { is_active: false });
    });

    it('should throw error when billing plan is used by vouchers', async () => {
      const billingPlan: BillingPlan = {
        id: 1,
        name: 'Test Plan',
        price: 10.00,
        validity_period: 30,
        is_active: true,
        created_at: '2023-01-01T00:00:00Z'
      };

      const voucher: Voucher = {
        id: 1,
        code: 'TEST123',
        billing_plan_id: 1,
        is_used: false,
        expires_at: '2025-12-31T23:59:59Z',
        created_at: '2023-01-01T00:00:00Z'
      };

      mockBillingPlanRepo.findById.mockResolvedValue(billingPlan);
      mockVoucherRepo.findByCondition.mockResolvedValue([voucher]);

      await expect(voucherService.deleteBillingPlan('1')).rejects.toThrow('Cannot delete billing plan that is being used by vouchers');
    });

    it('should throw error for non-existent billing plan', async () => {
      mockBillingPlanRepo.findById.mockResolvedValue(null);

      await expect(voucherService.deleteBillingPlan('999')).rejects.toThrow('Billing plan not found');
    });
  });
});