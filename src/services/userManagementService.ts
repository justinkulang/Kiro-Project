import { HotspotUser, BillingPlan, PaginatedResult } from '../models/types';
import { getHotspotUserRepository, getBillingPlanRepository } from '../models';
import { getMikroTikManager } from './index';
import PasswordUtils from '../utils/passwordUtils';
import { userCache, billingPlanCache } from './cacheService';
import PaginationService, { PaginationOptions, PaginationResult } from '../utils/paginationUtils';
import MikrotikOptimizationService from './mikrotikOptimizationService';

export interface CreateUserRequest {
  username: string;
  password?: string; // Optional, will generate if not provided
  billingPlanId: number;
  email?: string;
  phone?: string;
  fullName?: string;
  address?: string;
  expiresAt?: string;
  isActive?: boolean;
}

export interface UpdateUserRequest {
  password?: string;
  billingPlanId?: number;
  email?: string;
  phone?: string;
  fullName?: string;
  address?: string;
  expiresAt?: string;
  isActive?: boolean;
}

export interface UserWithBillingPlan extends HotspotUser {
  billingPlan?: BillingPlan;
}

export interface BatchCreateRequest {
  prefix: string;
  count: number;
  billingPlanId: number;
  passwordLength?: number;
  expiresAt?: string;
}

export interface BatchCreateResult {
  created: UserWithBillingPlan[];
  failed: { username: string; error: string }[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export interface UserValidationResult {
  isValid: boolean;
  errors: string[];
}

class UserManagementService {
  private mikrotikOptimization: MikrotikOptimizationService;

  constructor() {
    this.mikrotikOptimization = new MikrotikOptimizationService();
  }
  /**
   * Create a new hotspot user
   */
  async createUser(userData: CreateUserRequest): Promise<UserWithBillingPlan> {
    try {
      const userRepo = getHotspotUserRepository();
      const billingRepo = getBillingPlanRepository();

      // Validate input data
      const validation = await this.validateUserData(userData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Check if username already exists
      const existingUser = await userRepo.findByUsername(userData.username);
      if (existingUser) {
        throw new Error(`Username '${userData.username}' already exists`);
      }

      // Get billing plan
      const billingPlan = await billingRepo.findById(userData.billingPlanId);
      if (!billingPlan || !billingPlan.is_active) {
        throw new Error('Invalid or inactive billing plan');
      }

      // Generate password if not provided
      const password = userData.password || PasswordUtils.generateRandomPassword(8);

      // Calculate expiration date based on billing plan
      const expiresAt = userData.expiresAt || this.calculateExpirationDate(billingPlan);

      // Create user in database
      const newUser = await userRepo.create({
        username: userData.username,
        password,
        billing_plan_id: userData.billingPlanId,
        email: userData.email,
        phone: userData.phone,
        full_name: userData.fullName,
        address: userData.address,
        is_active: userData.isActive !== false,
        expires_at: expiresAt,
        data_used: 0,
        time_used: 0
      });

      // Create user in MikroTik using optimized service
      try {
        await this.mikrotikOptimization.createUser(newUser);
      } catch (mikrotikError) {
        console.warn('Failed to create user in MikroTik:', mikrotikError);
        // Don't fail the entire operation, but log the issue
      }

      // Cache the new user
      this.cacheUser(newUser);

      // Return user with billing plan info
      return {
        ...newUser,
        billingPlan
      };
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }

  /**
   * Update an existing hotspot user
   */
  async updateUser(userId: number, updateData: UpdateUserRequest): Promise<UserWithBillingPlan> {
    try {
      const userRepo = getHotspotUserRepository();
      const billingRepo = getBillingPlanRepository();

      // Get existing user
      const existingUser = await userRepo.findById(userId);
      if (!existingUser) {
        throw new Error('User not found');
      }

      // Validate billing plan if provided
      let billingPlan: BillingPlan | undefined;
      if (updateData.billingPlanId) {
        billingPlan = await billingRepo.findById(updateData.billingPlanId);
        if (!billingPlan || !billingPlan.is_active) {
          throw new Error('Invalid or inactive billing plan');
        }
      }

      // Update user in database
      const updatedUser = await userRepo.update(userId, {
        password: updateData.password,
        billing_plan_id: updateData.billingPlanId,
        email: updateData.email,
        phone: updateData.phone,
        full_name: updateData.fullName,
        address: updateData.address,
        expires_at: updateData.expiresAt,
        is_active: updateData.isActive
      });

      if (!updatedUser) {
        throw new Error('Failed to update user');
      }

      // Update user in MikroTik using optimized service
      try {
        await this.mikrotikOptimization.updateUser(updatedUser);
      } catch (mikrotikError) {
        console.warn('Failed to update user in MikroTik:', mikrotikError);
      }

      // Invalidate and update cache
      this.invalidateUserCache(existingUser.username, userId);
      this.cacheUser(updatedUser);

      // Get billing plan for response
      if (!billingPlan && updatedUser.billing_plan_id) {
        billingPlan = await billingRepo.findById(updatedUser.billing_plan_id);
      }

      return {
        ...updatedUser,
        billingPlan
      };
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  }

  /**
   * Delete a hotspot user
   */
  async deleteUser(userId: number): Promise<boolean> {
    try {
      const userRepo = getHotspotUserRepository();

      // Get user before deletion
      const user = await userRepo.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Delete from MikroTik using optimized service
      try {
        await this.mikrotikOptimization.deleteUser(user);
      } catch (mikrotikError) {
        console.warn('Failed to delete user from MikroTik:', mikrotikError);
        // Continue with database deletion
      }

      // Delete from database
      const deleted = await userRepo.delete(userId);
      
      // Invalidate cache
      if (deleted) {
        this.invalidateUserCache(user.username, userId);
      }
      
      return deleted;
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw error;
    }
  }

  /**
   * Get user by ID with billing plan info (with caching)
   */
  async getUserById(userId: number, useCache = true): Promise<UserWithBillingPlan | null> {
    try {
      const cacheKey = `user_${userId}`;
      
      if (useCache) {
        const cached = userCache.get(cacheKey);
        if (cached) {
          return cached;
        }
      }

      const userRepo = getHotspotUserRepository();
      const user = await userRepo.findById(userId);
      
      if (!user) {
        return null;
      }

      const userWithBillingPlan = user as UserWithBillingPlan;
      
      // Cache for 5 minutes
      if (useCache) {
        userCache.set(cacheKey, userWithBillingPlan, 300000);
      }

      return userWithBillingPlan;
    } catch (error) {
      console.error('Failed to get user by ID:', error);
      throw error;
    }
  }

  /**
   * Get user by username (with caching)
   */
  async getUserByUsername(username: string, useCache = true): Promise<UserWithBillingPlan | null> {
    try {
      const cacheKey = `user_username_${username}`;
      
      if (useCache) {
        const cached = userCache.get(cacheKey);
        if (cached) {
          return cached;
        }
      }

      const userRepo = getHotspotUserRepository();
      const user = await userRepo.findByUsername(username);
      
      if (!user) {
        return null;
      }

      const userWithBillingPlan = user as UserWithBillingPlan;
      
      // Cache for 5 minutes
      if (useCache) {
        userCache.set(cacheKey, userWithBillingPlan, 300000);
      }

      return userWithBillingPlan;
    } catch (error) {
      console.error('Failed to get user by username:', error);
      throw error;
    }
  }

  /**
   * Get paginated list of users with filtering (optimized)
   */
  async getUsers(options: {
    page?: number;
    limit?: number;
    search?: string;
    billingPlanId?: number;
    isActive?: boolean;
    dateFrom?: string;
    dateTo?: string;
  } = {}): Promise<PaginatedResult<UserWithBillingPlan>> {
    try {
      // Optimize page size based on request
      const optimizedLimit = Math.min(options.limit || 50, 200); // Cap at 200 for performance
      
      const userRepo = getHotspotUserRepository();
      
      const result = await userRepo.findAll({
        page: options.page || 1,
        limit: optimizedLimit,
        search: options.search,
        billing_plan_id: options.billingPlanId,
        is_active: options.isActive,
        date_from: options.dateFrom,
        date_to: options.dateTo
      });

      return result as PaginatedResult<UserWithBillingPlan>;
    } catch (error) {
      console.error('Failed to get users:', error);
      throw error;
    }
  }

  /**
   * Create multiple users in batch
   */
  async createUsersBatch(request: BatchCreateRequest): Promise<BatchCreateResult> {
    const result: BatchCreateResult = {
      created: [],
      failed: [],
      summary: {
        total: request.count,
        successful: 0,
        failed: 0
      }
    };

    try {
      // Validate billing plan
      const billingRepo = getBillingPlanRepository();
      const billingPlan = await billingRepo.findById(request.billingPlanId);
      if (!billingPlan || !billingPlan.is_active) {
        throw new Error('Invalid or inactive billing plan');
      }

      // Generate users
      for (let i = 1; i <= request.count; i++) {
        const username = `${request.prefix}${i.toString().padStart(3, '0')}`;
        
        try {
          const user = await this.createUser({
            username,
            billingPlanId: request.billingPlanId,
            expiresAt: request.expiresAt,
            isActive: true
          });

          result.created.push(user);
          result.summary.successful++;
        } catch (error) {
          result.failed.push({
            username,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          result.summary.failed++;
        }
      }

      return result;
    } catch (error) {
      console.error('Batch user creation failed:', error);
      throw error;
    }
  }

  /**
   * Enable/disable user
   */
  async setUserStatus(userId: number, isActive: boolean): Promise<UserWithBillingPlan> {
    return this.updateUser(userId, { isActive });
  }

  /**
   * Reset user password
   */
  async resetUserPassword(userId: number, newPassword?: string): Promise<{ password: string }> {
    try {
      const password = newPassword || PasswordUtils.generateRandomPassword(8);
      
      await this.updateUser(userId, { password });
      
      return { password };
    } catch (error) {
      console.error('Failed to reset user password:', error);
      throw error;
    }
  }

  /**
   * Get expired users
   */
  async getExpiredUsers(): Promise<UserWithBillingPlan[]> {
    try {
      const userRepo = getHotspotUserRepository();
      const expiredUsers = await userRepo.findExpiredUsers();
      return expiredUsers as UserWithBillingPlan[];
    } catch (error) {
      console.error('Failed to get expired users:', error);
      throw error;
    }
  }

  /**
   * Extend user expiration
   */
  async extendUserExpiration(userId: number, additionalDays: number): Promise<UserWithBillingPlan> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const currentExpiry = user.expires_at ? new Date(user.expires_at) : new Date();
      const newExpiry = new Date(currentExpiry.getTime() + (additionalDays * 24 * 60 * 60 * 1000));

      return this.updateUser(userId, {
        expiresAt: newExpiry.toISOString()
      });
    } catch (error) {
      console.error('Failed to extend user expiration:', error);
      throw error;
    }
  }

  /**
   * Validate user data
   */
  private async validateUserData(userData: CreateUserRequest): Promise<UserValidationResult> {
    const errors: string[] = [];

    // Username validation
    if (!userData.username || userData.username.trim().length < 3) {
      errors.push('Username must be at least 3 characters long');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(userData.username)) {
      errors.push('Username can only contain letters, numbers, hyphens, and underscores');
    }

    // Password validation (if provided)
    if (userData.password && !PasswordUtils.meetsMinimumRequirements(userData.password)) {
      errors.push('Password does not meet minimum requirements');
    }

    // Email validation (if provided)
    if (userData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.push('Invalid email format');
    }

    // Phone validation (if provided)
    if (userData.phone && !/^[\d\s\-\+\(\)]+$/.test(userData.phone)) {
      errors.push('Invalid phone number format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate expiration date based on billing plan
   */
  private calculateExpirationDate(billingPlan: BillingPlan): string {
    const now = new Date();
    const expiryDate = new Date(now.getTime() + (billingPlan.validity_period * 24 * 60 * 60 * 1000));
    return expiryDate.toISOString();
  }

  /**
   * Sync user with MikroTik (useful for fixing inconsistencies)
   */
  async syncUserWithMikroTik(userId: number): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      const mikrotikManager = getMikroTikManager();
      if (!mikrotikManager.isReady()) {
        return { success: false, message: 'MikroTik not connected' };
      }

      const mikrotikService = mikrotikManager.getMikroTikService();
      
      // Check if user exists in MikroTik
      const mikrotikUser = await mikrotikService.getHotspotUser(user.username);
      
      if (!mikrotikUser) {
        // Create user in MikroTik
        await mikrotikService.createHotspotUser({
          name: user.username,
          password: user.password,
          profile: user.billingPlan?.name || 'default',
          comment: `Synced: ${new Date().toISOString()}`,
          disabled: !user.is_active
        });
        return { success: true, message: 'User created in MikroTik' };
      } else {
        // Update user in MikroTik
        await mikrotikService.updateHotspotUser(user.username, {
          password: user.password,
          profile: user.billingPlan?.name,
          disabled: !user.is_active
        });
        return { success: true, message: 'User updated in MikroTik' };
      }
    } catch (error) {
      console.error('Failed to sync user with MikroTik:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Sync failed' 
      };
    }
  }

  /**
   * Cache user data
   */
  private cacheUser(user: UserWithBillingPlan): void {
    if (user.id) {
      userCache.set(`user_${user.id}`, user, 300000); // 5 minutes
    }
    userCache.set(`user_username_${user.username}`, user, 300000);
  }

  /**
   * Invalidate user cache
   */
  private invalidateUserCache(username: string, userId?: number): void {
    userCache.delete(`user_username_${username}`);
    if (userId) {
      userCache.delete(`user_${userId}`);
    }
  }

  /**
   * Get cached billing plan
   */
  private async getCachedBillingPlan(billingPlanId: number): Promise<BillingPlan | null> {
    const cacheKey = `billing_plan_${billingPlanId}`;
    
    let billingPlan = billingPlanCache.get(cacheKey);
    if (billingPlan) {
      return billingPlan;
    }

    const billingRepo = getBillingPlanRepository();
    billingPlan = await billingRepo.findById(billingPlanId);
    
    if (billingPlan) {
      billingPlanCache.set(cacheKey, billingPlan, 600000); // 10 minutes
    }

    return billingPlan;
  }

  /**
   * Batch create users with optimization
   */
  async createUsersBatchOptimized(request: BatchCreateRequest): Promise<BatchCreateResult> {
    const result: BatchCreateResult = {
      created: [],
      failed: [],
      summary: {
        total: request.count,
        successful: 0,
        failed: 0
      }
    };

    try {
      // Validate billing plan (cached)
      const billingPlan = await this.getCachedBillingPlan(request.billingPlanId);
      if (!billingPlan || !billingPlan.is_active) {
        throw new Error('Invalid or inactive billing plan');
      }

      // Create users in batches for better performance
      const batchSize = 50;
      const batches = Math.ceil(request.count / batchSize);

      for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
        const batchStart = batchIndex * batchSize + 1;
        const batchEnd = Math.min((batchIndex + 1) * batchSize, request.count);
        
        const batchUsers: HotspotUser[] = [];
        
        // Prepare batch data
        for (let i = batchStart; i <= batchEnd; i++) {
          const username = `${request.prefix}${i.toString().padStart(3, '0')}`;
          const password = PasswordUtils.generateRandomPassword(request.passwordLength || 8);
          
          try {
            const userRepo = getHotspotUserRepository();
            
            // Check if username exists (batch check would be better)
            const existingUser = await userRepo.findByUsername(username);
            if (existingUser) {
              result.failed.push({
                username,
                error: 'Username already exists'
              });
              result.summary.failed++;
              continue;
            }

            const expiresAt = request.expiresAt || this.calculateExpirationDate(billingPlan);

            const newUser = await userRepo.create({
              username,
              password,
              billing_plan_id: request.billingPlanId,
              is_active: true,
              expires_at: expiresAt,
              data_used: 0,
              time_used: 0
            });

            batchUsers.push(newUser);
            result.created.push({ ...newUser, billingPlan });
            result.summary.successful++;

            // Cache the user
            this.cacheUser({ ...newUser, billingPlan });
          } catch (error) {
            result.failed.push({
              username,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            result.summary.failed++;
          }
        }

        // Create users in MikroTik in batch
        if (batchUsers.length > 0) {
          try {
            await this.mikrotikOptimization.createUsersBatch(batchUsers);
          } catch (mikrotikError) {
            console.warn('Failed to create batch in MikroTik:', mikrotikError);
          }
        }
      }

      return result;
    } catch (error) {
      console.error('Batch user creation failed:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    cacheStats: any;
    mikrotikMetrics: any;
  } {
    return {
      cacheStats: {
        userCache: userCache.getStats(),
        billingPlanCache: billingPlanCache.getStats()
      },
      mikrotikMetrics: this.mikrotikOptimization.getMetrics()
    };
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    userCache.clear();
    billingPlanCache.clear();
    this.mikrotikOptimization.clearCaches();
  }
}

export default UserManagementService;