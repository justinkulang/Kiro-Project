import MikrotikService from './mikrotikService';
import { userCache, sessionCache } from './cacheService';
import { HotspotUser } from '../models/types';

export interface MikrotikApiMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageResponseTime: number;
  cacheHitRate: number;
  lastCallTime: number;
}

export interface BatchOperation {
  type: 'create' | 'update' | 'delete';
  users: HotspotUser[];
}

export class MikrotikOptimizationService {
  private mikrotikService: MikrotikService;
  private metrics: MikrotikApiMetrics = {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    averageResponseTime: 0,
    cacheHitRate: 0,
    lastCallTime: 0
  };
  private responseTimes: number[] = [];
  private cacheHits = 0;
  private cacheMisses = 0;
  private batchQueue: BatchOperation[] = [];
  private batchTimer?: NodeJS.Timeout;
  private readonly batchDelay = 5000; // 5 seconds
  private readonly maxBatchSize = 50;

  constructor() {
    this.mikrotikService = new MikrotikService();
  }

  /**
   * Get active users with caching
   */
  async getActiveUsers(forceRefresh = false): Promise<any[]> {
    const cacheKey = 'active_users';
    
    if (!forceRefresh) {
      const cached = sessionCache.get(cacheKey);
      if (cached) {
        this.recordCacheHit();
        return cached;
      }
    }
    
    this.recordCacheMiss();
    const startTime = Date.now();
    
    try {
      const users = await this.mikrotikService.getActiveUsers();
      const responseTime = Date.now() - startTime;
      
      // Cache for 30 seconds
      sessionCache.set(cacheKey, users, 30000);
      
      this.recordApiCall(true, responseTime);
      return users;
    } catch (error) {
      this.recordApiCall(false, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Get user sessions with caching and pagination
   */
  async getUserSessions(
    username?: string, 
    limit = 100, 
    offset = 0,
    forceRefresh = false
  ): Promise<any[]> {
    const cacheKey = `user_sessions_${username || 'all'}_${limit}_${offset}`;
    
    if (!forceRefresh) {
      const cached = sessionCache.get(cacheKey);
      if (cached) {
        this.recordCacheHit();
        return cached;
      }
    }
    
    this.recordCacheMiss();
    const startTime = Date.now();
    
    try {
      const sessions = await this.mikrotikService.getUserSessions(username);
      const responseTime = Date.now() - startTime;
      
      // Apply pagination
      const paginatedSessions = sessions.slice(offset, offset + limit);
      
      // Cache for 1 minute
      sessionCache.set(cacheKey, paginatedSessions, 60000);
      
      this.recordApiCall(true, responseTime);
      return paginatedSessions;
    } catch (error) {
      this.recordApiCall(false, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Get user info with caching
   */
  async getUserInfo(username: string, forceRefresh = false): Promise<any> {
    const cacheKey = `user_info_${username}`;
    
    if (!forceRefresh) {
      const cached = userCache.get(cacheKey);
      if (cached) {
        this.recordCacheHit();
        return cached;
      }
    }
    
    this.recordCacheMiss();
    const startTime = Date.now();
    
    try {
      const userInfo = await this.mikrotikService.getUserInfo(username);
      const responseTime = Date.now() - startTime;
      
      // Cache for 5 minutes
      userCache.set(cacheKey, userInfo, 300000);
      
      this.recordApiCall(true, responseTime);
      return userInfo;
    } catch (error) {
      this.recordApiCall(false, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Create user with batch optimization
   */
  async createUser(user: HotspotUser): Promise<void> {
    // Add to batch queue
    this.addToBatch('create', [user]);
    
    // Invalidate related caches
    this.invalidateUserCaches(user.username);
  }

  /**
   * Update user with batch optimization
   */
  async updateUser(user: HotspotUser): Promise<void> {
    // Add to batch queue
    this.addToBatch('update', [user]);
    
    // Invalidate related caches
    this.invalidateUserCaches(user.username);
  }

  /**
   * Delete user with batch optimization
   */
  async deleteUser(user: HotspotUser): Promise<void> {
    // Add to batch queue
    this.addToBatch('delete', [user]);
    
    // Invalidate related caches
    this.invalidateUserCaches(user.username);
  }

  /**
   * Create multiple users in batch
   */
  async createUsersBatch(users: HotspotUser[]): Promise<void> {
    const batches = this.chunkArray(users, this.maxBatchSize);
    
    for (const batch of batches) {
      const startTime = Date.now();
      
      try {
        await this.mikrotikService.createUsersBatch(batch);
        const responseTime = Date.now() - startTime;
        
        this.recordApiCall(true, responseTime);
        
        // Invalidate caches for all users
        batch.forEach(user => this.invalidateUserCaches(user.username));
      } catch (error) {
        this.recordApiCall(false, Date.now() - startTime);
        throw error;
      }
    }
  }

  /**
   * Update multiple users in batch
   */
  async updateUsersBatch(users: HotspotUser[]): Promise<void> {
    const batches = this.chunkArray(users, this.maxBatchSize);
    
    for (const batch of batches) {
      const startTime = Date.now();
      
      try {
        await this.mikrotikService.updateUsersBatch(batch);
        const responseTime = Date.now() - startTime;
        
        this.recordApiCall(true, responseTime);
        
        // Invalidate caches for all users
        batch.forEach(user => this.invalidateUserCaches(user.username));
      } catch (error) {
        this.recordApiCall(false, Date.now() - startTime);
        throw error;
      }
    }
  }

  /**
   * Delete multiple users in batch
   */
  async deleteUsersBatch(users: HotspotUser[]): Promise<void> {
    const batches = this.chunkArray(users, this.maxBatchSize);
    
    for (const batch of batches) {
      const startTime = Date.now();
      
      try {
        await this.mikrotikService.deleteUsersBatch(batch);
        const responseTime = Date.now() - startTime;
        
        this.recordApiCall(true, responseTime);
        
        // Invalidate caches for all users
        batch.forEach(user => this.invalidateUserCaches(user.username));
      } catch (error) {
        this.recordApiCall(false, Date.now() - startTime);
        throw error;
      }
    }
  }

  /**
   * Disconnect user session with caching invalidation
   */
  async disconnectUser(username: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.mikrotikService.disconnectUser(username);
      const responseTime = Date.now() - startTime;
      
      this.recordApiCall(true, responseTime);
      
      // Invalidate session caches
      this.invalidateSessionCaches(username);
    } catch (error) {
      this.recordApiCall(false, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Get router resource usage with caching
   */
  async getRouterResources(forceRefresh = false): Promise<any> {
    const cacheKey = 'router_resources';
    
    if (!forceRefresh) {
      const cached = sessionCache.get(cacheKey);
      if (cached) {
        this.recordCacheHit();
        return cached;
      }
    }
    
    this.recordCacheMiss();
    const startTime = Date.now();
    
    try {
      const resources = await this.mikrotikService.getRouterResources();
      const responseTime = Date.now() - startTime;
      
      // Cache for 2 minutes
      sessionCache.set(cacheKey, resources, 120000);
      
      this.recordApiCall(true, responseTime);
      return resources;
    } catch (error) {
      this.recordApiCall(false, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Test connection with minimal overhead
   */
  async testConnection(): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const result = await this.mikrotikService.testConnection();
      const responseTime = Date.now() - startTime;
      
      this.recordApiCall(true, responseTime);
      return result;
    } catch (error) {
      this.recordApiCall(false, Date.now() - startTime);
      return false;
    }
  }

  /**
   * Add operation to batch queue
   */
  private addToBatch(type: BatchOperation['type'], users: HotspotUser[]): void {
    // Find existing batch of same type or create new one
    let batch = this.batchQueue.find(b => b.type === type);
    
    if (!batch) {
      batch = { type, users: [] };
      this.batchQueue.push(batch);
    }
    
    batch.users.push(...users);
    
    // Process batch if it reaches max size
    if (batch.users.length >= this.maxBatchSize) {
      this.processBatch(batch);
      this.batchQueue = this.batchQueue.filter(b => b !== batch);
    } else {
      // Set timer to process batch
      this.scheduleBatchProcessing();
    }
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatchProcessing(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    this.batchTimer = setTimeout(() => {
      this.processAllBatches();
    }, this.batchDelay);
  }

  /**
   * Process all pending batches
   */
  private async processAllBatches(): Promise<void> {
    const batches = [...this.batchQueue];
    this.batchQueue = [];
    
    for (const batch of batches) {
      await this.processBatch(batch);
    }
  }

  /**
   * Process a single batch
   */
  private async processBatch(batch: BatchOperation): Promise<void> {
    try {
      switch (batch.type) {
        case 'create':
          await this.createUsersBatch(batch.users);
          break;
        case 'update':
          await this.updateUsersBatch(batch.users);
          break;
        case 'delete':
          await this.deleteUsersBatch(batch.users);
          break;
      }
    } catch (error) {
      console.error(`Batch ${batch.type} operation failed:`, error);
    }
  }

  /**
   * Invalidate user-related caches
   */
  private invalidateUserCaches(username: string): void {
    // Remove specific user cache
    userCache.delete(`user_info_${username}`);
    
    // Remove session caches that might include this user
    const sessionKeys = sessionCache.keys().filter(key => 
      key.includes('user_sessions') || key.includes('active_users')
    );
    
    sessionKeys.forEach(key => sessionCache.delete(key));
  }

  /**
   * Invalidate session-related caches
   */
  private invalidateSessionCaches(username?: string): void {
    if (username) {
      // Remove specific user session caches
      const keys = sessionCache.keys().filter(key => 
        key.includes(`user_sessions_${username}`)
      );
      keys.forEach(key => sessionCache.delete(key));
    }
    
    // Remove active users cache
    sessionCache.delete('active_users');
  }

  /**
   * Record API call metrics
   */
  private recordApiCall(success: boolean, responseTime: number): void {
    this.metrics.totalCalls++;
    this.metrics.lastCallTime = Date.now();
    
    if (success) {
      this.metrics.successfulCalls++;
    } else {
      this.metrics.failedCalls++;
    }
    
    // Track response times
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 100) {
      this.responseTimes = this.responseTimes.slice(-100);
    }
    
    // Calculate average response time
    this.metrics.averageResponseTime = 
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
  }

  /**
   * Record cache hit
   */
  private recordCacheHit(): void {
    this.cacheHits++;
    this.updateCacheHitRate();
  }

  /**
   * Record cache miss
   */
  private recordCacheMiss(): void {
    this.cacheMisses++;
    this.updateCacheHitRate();
  }

  /**
   * Update cache hit rate
   */
  private updateCacheHitRate(): void {
    const totalCacheRequests = this.cacheHits + this.cacheMisses;
    this.metrics.cacheHitRate = totalCacheRequests > 0 
      ? (this.cacheHits / totalCacheRequests) * 100 
      : 0;
  }

  /**
   * Get optimization metrics
   */
  getMetrics(): MikrotikApiMetrics & {
    batchQueueSize: number;
    cacheStats: any;
  } {
    return {
      ...this.metrics,
      batchQueueSize: this.batchQueue.reduce((sum, batch) => sum + batch.users.length, 0),
      cacheStats: {
        userCache: userCache.getStats(),
        sessionCache: sessionCache.getStats()
      }
    };
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    userCache.clear();
    sessionCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.updateCacheHitRate();
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      lastCallTime: 0
    };
    this.responseTimes = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Utility function to chunk array
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    this.processAllBatches(); // Process any pending batches
  }
}

export default MikrotikOptimizationService;