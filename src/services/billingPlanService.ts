import { BillingPlan, PaginatedResult, FilterOptions } from '../models/types';
import { getBillingPlanRepository } from '../models';

export interface CreateBillingPlanRequest {
  name: string;
  description?: string;
  price: number;
  timeLimit?: number; // in minutes
  dataLimit?: number; // in bytes
  speedLimitUp?: number; // in kbps
  speedLimitDown?: number; // in kbps
  validityPeriod: number; // in days
  isActive?: boolean;
}

export interface UpdateBillingPlanRequest {
  name?: string;
  description?: string;
  price?: number;
  timeLimit?: number;
  dataLimit?: number;
  speedLimitUp?: number;
  speedLimitDown?: number;
  validityPeriod?: number;
  isActive?: boolean;
}

export interface BillingPlanValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface BillingPlanStats {
  totalPlans: number;
  activePlans: number;
  inactivePlans: number;
  averagePrice: number;
  mostPopularPlan?: BillingPlan;
}

class BillingPlanService {
  /**
   * Create a new billing plan
   */
  async createBillingPlan(planData: CreateBillingPlanRequest): Promise<BillingPlan> {
    try {
      const billingRepo = getBillingPlanRepository();

      // Validate input data
      const validation = this.validateBillingPlanData(planData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Check if plan name already exists
      const existingPlans = await billingRepo.findAll({ page: 1, limit: 1000 });
      const nameExists = existingPlans.data.some(plan => 
        plan.name.toLowerCase() === planData.name.toLowerCase()
      );

      if (nameExists) {
        throw new Error(`Billing plan with name '${planData.name}' already exists`);
      }

      // Create billing plan
      const newPlan = await billingRepo.create({
        name: planData.name,
        description: planData.description,
        price: planData.price,
        time_limit: planData.timeLimit,
        data_limit: planData.dataLimit,
        speed_limit_up: planData.speedLimitUp,
        speed_limit_down: planData.speedLimitDown,
        validity_period: planData.validityPeriod,
        is_active: planData.isActive !== false
      });

      return newPlan;
    } catch (error) {
      console.error('Failed to create billing plan:', error);
      throw error;
    }
  }

  /**
   * Update an existing billing plan
   */
  async updateBillingPlan(planId: number, updateData: UpdateBillingPlanRequest): Promise<BillingPlan> {
    try {
      const billingRepo = getBillingPlanRepository();

      // Get existing plan
      const existingPlan = await billingRepo.findById(planId);
      if (!existingPlan) {
        throw new Error('Billing plan not found');
      }

      // Validate update data
      if (Object.keys(updateData).length > 0) {
        const validation = this.validateBillingPlanData(updateData, true);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Check for name conflicts if name is being updated
      if (updateData.name && updateData.name !== existingPlan.name) {
        const existingPlans = await billingRepo.findAll({ page: 1, limit: 1000 });
        const nameExists = existingPlans.data.some(plan => 
          plan.id !== planId && plan.name.toLowerCase() === updateData.name!.toLowerCase()
        );

        if (nameExists) {
          throw new Error(`Billing plan with name '${updateData.name}' already exists`);
        }
      }

      // Update billing plan
      const updatedPlan = await billingRepo.update(planId, {
        name: updateData.name,
        description: updateData.description,
        price: updateData.price,
        time_limit: updateData.timeLimit,
        data_limit: updateData.dataLimit,
        speed_limit_up: updateData.speedLimitUp,
        speed_limit_down: updateData.speedLimitDown,
        validity_period: updateData.validityPeriod,
        is_active: updateData.isActive
      });

      if (!updatedPlan) {
        throw new Error('Failed to update billing plan');
      }

      return updatedPlan;
    } catch (error) {
      console.error('Failed to update billing plan:', error);
      throw error;
    }
  }

  /**
   * Delete a billing plan
   */
  async deleteBillingPlan(planId: number): Promise<boolean> {
    try {
      const billingRepo = getBillingPlanRepository();

      // Check if plan exists
      const existingPlan = await billingRepo.findById(planId);
      if (!existingPlan) {
        throw new Error('Billing plan not found');
      }

      // TODO: Check if plan is being used by any users or vouchers
      // In a full implementation, you would check the hotspot_users and vouchers tables

      // Delete the plan
      const deleted = await billingRepo.delete(planId);
      return deleted;
    } catch (error) {
      console.error('Failed to delete billing plan:', error);
      throw error;
    }
  }

  /**
   * Get billing plan by ID
   */
  async getBillingPlanById(planId: number): Promise<BillingPlan | null> {
    try {
      const billingRepo = getBillingPlanRepository();
      return await billingRepo.findById(planId);
    } catch (error) {
      console.error('Failed to get billing plan by ID:', error);
      throw error;
    }
  }

  /**
   * Get paginated list of billing plans with filtering
   */
  async getBillingPlans(options: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    minPrice?: number;
    maxPrice?: number;
  } = {}): Promise<PaginatedResult<BillingPlan>> {
    try {
      const billingRepo = getBillingPlanRepository();
      
      const result = await billingRepo.findAll({
        page: options.page || 1,
        limit: options.limit || 50,
        search: options.search,
        is_active: options.isActive
      });

      // Apply additional filtering for price range
      if (options.minPrice !== undefined || options.maxPrice !== undefined) {
        result.data = result.data.filter(plan => {
          if (options.minPrice !== undefined && plan.price < options.minPrice) return false;
          if (options.maxPrice !== undefined && plan.price > options.maxPrice) return false;
          return true;
        });
      }

      return result;
    } catch (error) {
      console.error('Failed to get billing plans:', error);
      throw error;
    }
  }

  /**
   * Get active billing plans
   */
  async getActiveBillingPlans(): Promise<BillingPlan[]> {
    try {
      const billingRepo = getBillingPlanRepository();
      return await billingRepo.findActive();
    } catch (error) {
      console.error('Failed to get active billing plans:', error);
      throw error;
    }
  }

  /**
   * Enable/disable billing plan
   */
  async setBillingPlanStatus(planId: number, isActive: boolean): Promise<BillingPlan> {
    return this.updateBillingPlan(planId, { isActive });
  }

  /**
   * Get billing plan statistics
   */
  async getBillingPlanStats(): Promise<BillingPlanStats> {
    try {
      const billingRepo = getBillingPlanRepository();
      const allPlans = await billingRepo.findAll({ page: 1, limit: 1000 });
      
      const totalPlans = allPlans.total;
      const activePlans = allPlans.data.filter(plan => plan.is_active).length;
      const inactivePlans = totalPlans - activePlans;
      
      const averagePrice = allPlans.data.length > 0 
        ? allPlans.data.reduce((sum, plan) => sum + plan.price, 0) / allPlans.data.length 
        : 0;

      // TODO: Determine most popular plan based on user count
      // This would require joining with hotspot_users table
      const mostPopularPlan = allPlans.data.length > 0 ? allPlans.data[0] : undefined;

      return {
        totalPlans,
        activePlans,
        inactivePlans,
        averagePrice,
        mostPopularPlan
      };
    } catch (error) {
      console.error('Failed to get billing plan stats:', error);
      throw error;
    }
  }

  /**
   * Validate billing plan data
   */
  private validateBillingPlanData(
    planData: CreateBillingPlanRequest | UpdateBillingPlanRequest, 
    isUpdate: boolean = false
  ): BillingPlanValidationResult {
    const errors: string[] = [];

    // Name validation (required for create, optional for update)
    if (!isUpdate || planData.name !== undefined) {
      if (!planData.name || planData.name.trim().length < 2) {
        errors.push('Plan name must be at least 2 characters long');
      }
      if (planData.name && planData.name.length > 100) {
        errors.push('Plan name must not exceed 100 characters');
      }
    }

    // Price validation (required for create, optional for update)
    if (!isUpdate || planData.price !== undefined) {
      if (planData.price === undefined || planData.price < 0) {
        errors.push('Price must be a non-negative number');
      }
      if (planData.price !== undefined && planData.price > 999999.99) {
        errors.push('Price must not exceed 999,999.99');
      }
    }

    // Time limit validation (optional)
    if (planData.timeLimit !== undefined) {
      if (planData.timeLimit < 0) {
        errors.push('Time limit must be a non-negative number');
      }
      if (planData.timeLimit > 525600) { // 1 year in minutes
        errors.push('Time limit must not exceed 525,600 minutes (1 year)');
      }
    }

    // Data limit validation (optional)
    if (planData.dataLimit !== undefined) {
      if (planData.dataLimit < 0) {
        errors.push('Data limit must be a non-negative number');
      }
      if (planData.dataLimit > 1099511627776) { // 1TB in bytes
        errors.push('Data limit must not exceed 1TB');
      }
    }

    // Speed limit validation (optional)
    if (planData.speedLimitUp !== undefined) {
      if (planData.speedLimitUp < 0 || planData.speedLimitUp > 1000000) {
        errors.push('Upload speed limit must be between 0 and 1,000,000 kbps');
      }
    }

    if (planData.speedLimitDown !== undefined) {
      if (planData.speedLimitDown < 0 || planData.speedLimitDown > 1000000) {
        errors.push('Download speed limit must be between 0 and 1,000,000 kbps');
      }
    }

    // Validity period validation (required for create, optional for update)
    if (!isUpdate || planData.validityPeriod !== undefined) {
      if (planData.validityPeriod === undefined || planData.validityPeriod < 1) {
        errors.push('Validity period must be at least 1 day');
      }
      if (planData.validityPeriod !== undefined && planData.validityPeriod > 3650) { // 10 years
        errors.push('Validity period must not exceed 3,650 days (10 years)');
      }
    }

    // Description validation (optional)
    if (planData.description !== undefined && planData.description.length > 500) {
      errors.push('Description must not exceed 500 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format data limit for display
   */
  static formatDataLimit(bytes: number | null | undefined): string {
    if (!bytes) return 'Unlimited';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(unitIndex > 0 ? 2 : 0)} ${units[unitIndex]}`;
  }

  /**
   * Format time limit for display
   */
  static formatTimeLimit(minutes: number | null | undefined): string {
    if (!minutes) return 'Unlimited';
    
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours} hours`;
    } else {
      const days = Math.floor(minutes / 1440);
      const remainingHours = Math.floor((minutes % 1440) / 60);
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} days`;
    }
  }

  /**
   * Format speed limit for display
   */
  static formatSpeedLimit(kbps: number | null | undefined): string {
    if (!kbps) return 'Unlimited';
    
    if (kbps < 1024) {
      return `${kbps} Kbps`;
    } else {
      const mbps = kbps / 1024;
      return `${mbps.toFixed(2)} Mbps`;
    }
  }

  /**
   * Parse data limit from string (e.g., "1GB", "500MB")
   */
  static parseDataLimit(dataStr: string): number | null {
    if (!dataStr || dataStr.toLowerCase() === 'unlimited') return null;
    
    const match = dataStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)$/i);
    if (!match) return null;
    
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    
    const multipliers = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
      'TB': 1024 * 1024 * 1024 * 1024
    };
    
    return Math.floor(value * multipliers[unit as keyof typeof multipliers]);
  }

  /**
   * Parse time limit from string (e.g., "2h", "30m", "1d")
   */
  static parseTimeLimit(timeStr: string): number | null {
    if (!timeStr || timeStr.toLowerCase() === 'unlimited') return null;
    
    const match = timeStr.match(/^(\d+(?:\.\d+)?)\s*(m|h|d)$/i);
    if (!match) return null;
    
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    
    const multipliers = {
      'm': 1,
      'h': 60,
      'd': 1440
    };
    
    return Math.floor(value * multipliers[unit as keyof typeof multipliers]);
  }
}

export default BillingPlanService;