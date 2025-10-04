import { BillingPlan, Voucher, CreateBillingPlanRequest, VoucherGenerationRequest, VoucherFilters, VoucherStatistics } from '../models/types';
import { getBillingPlanRepository, getVoucherRepository } from '../models';
import { generateRandomString } from '../utils/stringUtils';
import BillingPlanService from './billingPlanService';

const billingPlanRepository = getBillingPlanRepository();
const voucherRepository = getVoucherRepository();
const billingPlanService = new BillingPlanService();

export class VoucherService {
  /**
   * Create a new billing plan
   */
  async createBillingPlan(planData: CreateBillingPlanRequest): Promise<BillingPlan> {
    // Validate plan data
    this.validateBillingPlan(planData);

    const plan: Omit<BillingPlan, 'id' | 'created_at' | 'updated_at'> = {
      name: planData.name,
      description: planData.description || '',
      time_limit: planData.time_limit,
      data_limit: planData.data_limit,
      speed_limit_up: planData.speed_limit_up,
      speed_limit_down: planData.speed_limit_down,
      validity_period: planData.validity_period,
      price: planData.price,
      is_active: true
    };

    return await billingPlanRepository.create(plan);
  }

  /**
   * Update an existing billing plan
   */
  async updateBillingPlan(planId: string, updates: Partial<BillingPlan>): Promise<BillingPlan> {
    const existingPlan = await billingPlanRepository.findById(planId);
    if (!existingPlan) {
      throw new Error('Billing plan not found');
    }

    // Validate updates if they contain plan data
    if (updates.name || updates.time_limit !== undefined || updates.data_limit !== undefined) {
      this.validateBillingPlan(updates as CreateBillingPlanRequest);
    }

    return await billingPlanRepository.update(planId, updates);
  }

  /**
   * Get all billing plans
   */
  async getAllBillingPlans(): Promise<BillingPlan[]> {
    return await billingPlanRepository.findAll();
  }

  /**
   * Get active billing plans only
   */
  async getActiveBillingPlans(): Promise<BillingPlan[]> {
    return await billingPlanRepository.findByCondition({ is_active: true });
  }

  /**
   * Get billing plan by ID
   */
  async getBillingPlanById(planId: string): Promise<BillingPlan | null> {
    return await billingPlanRepository.findById(planId);
  }

  /**
   * Delete a billing plan (soft delete by setting isActive to false)
   */
  async deleteBillingPlan(planId: string): Promise<void> {
    const existingPlan = await billingPlanRepository.findById(planId);
    if (!existingPlan) {
      throw new Error('Billing plan not found');
    }

    // Check if plan is being used by any vouchers
    const vouchersUsingPlan = await voucherRepository.findByCondition({ billing_plan_id: parseInt(planId) });
    if (vouchersUsingPlan.length > 0) {
      throw new Error('Cannot delete billing plan that is being used by vouchers');
    }

    await billingPlanRepository.update(parseInt(planId), { is_active: false });
  }

  /**
   * Generate vouchers in batch
   */
  async generateVouchers(request: VoucherGenerationRequest): Promise<Voucher[]> {
    // Validate request
    this.validateVoucherRequest(request);

    // Verify billing plan exists
    const billingPlan = await billingPlanRepository.findById(request.billing_plan_id);
    if (!billingPlan || !billingPlan.is_active) {
      throw new Error('Invalid or inactive billing plan');
    }

    const vouchers: Voucher[] = [];
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (request.validity_days * 24 * 60 * 60 * 1000)); // validity in days

    for (let i = 0; i < request.quantity; i++) {
      const voucherCode = this.generateVoucherCode(request.prefix);

      const voucher: Omit<Voucher, 'id' | 'created_at' | 'updated_at'> = {
        code: voucherCode,
        billing_plan_id: request.billing_plan_id,
        batch_id: request.batch_id || this.generateBatchId(),
        expires_at: expiresAt.toISOString(),
        is_used: false,
        used_at: null,
        used_by_user_id: null
      };

      const createdVoucher = await voucherRepository.create(voucher);
      vouchers.push(createdVoucher);
    }

    return vouchers;
  }

  /**
   * Get vouchers with optional filtering
   */
  async getVouchers(filters?: VoucherFilters): Promise<Voucher[]> {
    if (!filters) {
      return await voucherRepository.findAll();
    }

    const conditions: any = {};
    
    if (filters.billing_plan_id) {
      conditions.billing_plan_id = filters.billing_plan_id;
    }
    
    if (filters.is_used !== undefined) {
      conditions.is_used = filters.is_used;
    }

    if (filters.batch_id) {
      conditions.batch_id = filters.batch_id;
    }

    let vouchers = await voucherRepository.findByCondition(conditions);

    // Apply date filtering if provided
    if (filters.start_date || filters.end_date) {
      vouchers = vouchers.filter(voucher => {
        const createdAt = new Date(voucher.created_at!);
        if (filters.start_date && createdAt < filters.start_date) return false;
        if (filters.end_date && createdAt > filters.end_date) return false;
        return true;
      });
    }

    return vouchers;
  }

  /**
   * Mark voucher as used
   */
  async useVoucher(voucherCode: string): Promise<Voucher> {
    const voucher = await voucherRepository.findByCondition({ code: voucherCode });
    if (voucher.length === 0) {
      throw new Error('Voucher not found');
    }

    const voucherToUse = voucher[0];
    
    if (voucherToUse.is_used) {
      throw new Error('Voucher has already been used');
    }

    if (new Date() > new Date(voucherToUse.expires_at!)) {
      throw new Error('Voucher has expired');
    }

    return await voucherRepository.update(voucherToUse.id!, {
      is_used: true,
      used_at: new Date().toISOString()
    });
  }

  /**
   * Get voucher by code
   */
  async getVoucherByCode(code: string): Promise<Voucher | null> {
    const vouchers = await voucherRepository.findByCondition({ code });
    return vouchers.length > 0 ? vouchers[0] : null;
  }

  /**
   * Validate voucher code and return voucher details
   */
  async validateVoucherCode(code: string): Promise<{
    isValid: boolean;
    voucher?: Voucher;
    billingPlan?: BillingPlan;
    error?: string;
  }> {
    const voucher = await this.getVoucherByCode(code);
    
    if (!voucher) {
      return { isValid: false, error: 'Voucher not found' };
    }

    if (voucher.is_used) {
      return { isValid: false, voucher, error: 'Voucher has already been used' };
    }

    if (new Date() > new Date(voucher.expires_at!)) {
      return { isValid: false, voucher, error: 'Voucher has expired' };
    }

    const billingPlan = await billingPlanRepository.findById(voucher.billing_plan_id);
    if (!billingPlan || !billingPlan.is_active) {
      return { isValid: false, voucher, error: 'Associated billing plan is inactive' };
    }

    return { isValid: true, voucher, billingPlan };
  }

  /**
   * Get voucher statistics
   */
  async getVoucherStatistics(): Promise<VoucherStatistics> {
    const allVouchers = await voucherRepository.findAll();
    const allPlans = await billingPlanRepository.findAll();
    const now = new Date();

    // Calculate revenue from used vouchers
    let revenueGenerated = 0;
    for (const voucher of allVouchers.filter(v => v.is_used)) {
      const plan = allPlans.find(p => p.id === voucher.billing_plan_id);
      if (plan) {
        revenueGenerated += plan.price;
      }
    }

    const stats: VoucherStatistics = {
      total_vouchers: allVouchers.length,
      used_vouchers: allVouchers.filter(v => v.is_used).length,
      expired_vouchers: allVouchers.filter(v => !v.is_used && new Date(v.expires_at!) < now).length,
      active_vouchers: allVouchers.filter(v => !v.is_used && new Date(v.expires_at!) >= now).length,
      revenue_generated: revenueGenerated
    };

    return stats;
  }

  // Private helper methods

  private validateBillingPlan(planData: Partial<CreateBillingPlanRequest>): void {
    if (planData.name && planData.name.trim().length === 0) {
      throw new Error('Billing plan name is required');
    }

    if (planData.time_limit !== undefined && planData.time_limit <= 0) {
      throw new Error('Time limit must be greater than 0 minutes');
    }

    if (planData.data_limit !== undefined && planData.data_limit < 0) {
      throw new Error('Data limit cannot be negative');
    }

    if (planData.price !== undefined && planData.price < 0) {
      throw new Error('Price cannot be negative');
    }

    if (planData.validity_period !== undefined && planData.validity_period <= 0) {
      throw new Error('Validity period must be greater than 0 days');
    }
  }

  private validateVoucherRequest(request: VoucherGenerationRequest): void {
    if (request.quantity <= 0 || request.quantity > 1000) {
      throw new Error('Quantity must be between 1 and 1000');
    }

    if (request.validity_days <= 0) {
      throw new Error('Validity period must be greater than 0 days');
    }

    if (request.prefix && request.prefix.length > 10) {
      throw new Error('Prefix cannot be longer than 10 characters');
    }
  }

  private generateVoucherCode(prefix?: string): string {
    const randomPart = generateRandomString(8, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
    return prefix ? `${prefix}-${randomPart}` : randomPart;
  }

  private generateUsername(prefix?: string): string {
    const randomPart = generateRandomString(6, 'abcdefghijklmnopqrstuvwxyz0123456789');
    return prefix ? `${prefix.toLowerCase()}${randomPart}` : `user${randomPart}`;
  }

  private generatePassword(): string {
    return generateRandomString(8, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789');
  }

  private generateBatchId(): string {
    const timestamp = Date.now().toString(36);
    const random = generateRandomString(4, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
    return `BATCH-${timestamp}-${random}`;
  }
}

export const voucherService = new VoucherService();