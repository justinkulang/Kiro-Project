import { EventEmitter } from 'events';

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  checkPeriod?: number; // Cleanup interval in milliseconds
}

export interface CacheEntry<T> {
  value: T;
  expires: number;
  hits: number;
  created: number;
}

export class MemoryCache<T = any> extends EventEmitter {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly ttl: number;
  private readonly maxSize: number;
  private readonly checkPeriod: number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(options: CacheOptions = {}) {
    super();
    this.ttl = options.ttl || 300000; // 5 minutes default
    this.maxSize = options.maxSize || 1000;
    this.checkPeriod = options.checkPeriod || 60000; // 1 minute default
    
    this.startCleanup();
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const expires = now + (ttl || this.ttl);
    
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }
    
    this.cache.set(key, {
      value,
      expires,
      hits: 0,
      created: now
    });
    
    this.emit('set', key, value);
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.emit('miss', key);
      return undefined;
    }
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      this.emit('expired', key);
      return undefined;
    }
    
    entry.hits++;
    this.emit('hit', key);
    return entry.value;
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete a key from the cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.emit('delete', key);
    }
    return deleted;
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
    this.emit('clear');
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hits: number;
    totalEntries: number;
  } {
    let totalHits = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
    }
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: totalHits,
      totalEntries: this.cache.size
    };
  }

  /**
   * Get all keys in the cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache entry info
   */
  getEntryInfo(key: string): Omit<CacheEntry<T>, 'value'> | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    return {
      expires: entry.expires,
      hits: entry.hits,
      created: entry.created
    };
  }

  /**
   * Extend TTL for a key
   */
  touch(key: string, ttl?: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    entry.expires = Date.now() + (ttl || this.ttl);
    return true;
  }

  /**
   * Get or set pattern - fetch value if not in cache
   */
  async getOrSet<R = T>(
    key: string, 
    fetcher: () => Promise<R>, 
    ttl?: number
  ): Promise<R> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached as unknown as R;
    }
    
    const value = await fetcher();
    this.set(key, value as unknown as T, ttl);
    return value;
  }

  /**
   * Memoize a function with caching
   */
  memoize<Args extends any[], Return>(
    fn: (...args: Args) => Promise<Return>,
    keyGenerator?: (...args: Args) => string,
    ttl?: number
  ) {
    return async (...args: Args): Promise<Return> => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      return this.getOrSet(key, () => fn(...args), ttl);
    };
  }

  /**
   * Start cleanup timer
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.checkPeriod);
  }

  /**
   * Stop cleanup timer
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      this.emit('cleanup', expiredCount);
    }
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictOldest(): void {
    let oldestKey: string | undefined;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.created < oldestTime) {
        oldestTime = entry.created;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.emit('evict', oldestKey);
    }
  }

  /**
   * Destroy the cache and cleanup resources
   */
  destroy(): void {
    this.stopCleanup();
    this.clear();
    this.removeAllListeners();
  }
}

/**
 * Cache service with multiple cache instances
 */
export class CacheService {
  private caches = new Map<string, MemoryCache>();
  
  /**
   * Create or get a cache instance
   */
  getCache<T = any>(name: string, options?: CacheOptions): MemoryCache<T> {
    if (!this.caches.has(name)) {
      this.caches.set(name, new MemoryCache<T>(options));
    }
    return this.caches.get(name)! as MemoryCache<T>;
  }

  /**
   * Delete a cache instance
   */
  deleteCache(name: string): boolean {
    const cache = this.caches.get(name);
    if (cache) {
      cache.destroy();
      return this.caches.delete(name);
    }
    return false;
  }

  /**
   * Get all cache names
   */
  getCacheNames(): string[] {
    return Array.from(this.caches.keys());
  }

  /**
   * Get statistics for all caches
   */
  getAllStats(): { [cacheName: string]: ReturnType<MemoryCache['getStats']> } {
    const stats: { [cacheName: string]: ReturnType<MemoryCache['getStats']> } = {};
    
    for (const [name, cache] of this.caches.entries()) {
      stats[name] = cache.getStats();
    }
    
    return stats;
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }

  /**
   * Destroy all caches
   */
  destroy(): void {
    for (const cache of this.caches.values()) {
      cache.destroy();
    }
    this.caches.clear();
  }
}

// Global cache service instance
export const cacheService = new CacheService();

// Pre-configured cache instances for common use cases
export const userCache = cacheService.getCache('users', { ttl: 300000, maxSize: 500 }); // 5 minutes
export const sessionCache = cacheService.getCache('sessions', { ttl: 60000, maxSize: 1000 }); // 1 minute
export const billingPlanCache = cacheService.getCache('billingPlans', { ttl: 600000, maxSize: 100 }); // 10 minutes
export const systemConfigCache = cacheService.getCache('systemConfig', { ttl: 300000, maxSize: 50 }); // 5 minutes
export const reportCache = cacheService.getCache('reports', { ttl: 1800000, maxSize: 100 }); // 30 minutes

export default cacheService;