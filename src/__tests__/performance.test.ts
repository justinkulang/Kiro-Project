import { performance } from 'perf_hooks';
import DatabaseOptimizationService from '../services/databaseOptimizationService';
import MikrotikOptimizationService from '../services/mikrotikOptimizationService';
import { cacheService, userCache, sessionCache } from '../services/cacheService';
import PaginationService from '../utils/paginationUtils';
import { initializeDatabase } from '../models/database';

// Mock data generators
const generateMockUsers = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    username: `user${i + 1}`,
    password: 'password123',
    email: `user${i + 1}@example.com`,
    fullName: `User ${i + 1}`,
    billingPlanId: Math.floor(Math.random() * 5) + 1,
    isActive: Math.random() > 0.2,
    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
  }));
};

const generateMockSessions = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    username: `user${Math.floor(Math.random() * 1000) + 1}`,
    startTime: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
    endTime: Math.random() > 0.3 ? new Date().toISOString() : null,
    bytesIn: Math.floor(Math.random() * 1000000000),
    bytesOut: Math.floor(Math.random() * 1000000000),
    isActive: Math.random() > 0.7
  }));
};

describe('Performance Tests', () => {
  let dbOptimization: DatabaseOptimizationService;
  let mikrotikOptimization: MikrotikOptimizationService;

  beforeAll(async () => {
    await initializeDatabase();
    dbOptimization = new DatabaseOptimizationService();
    mikrotikOptimization = new MikrotikOptimizationService();
  });

  afterAll(() => {
    cacheService.destroy();
    mikrotikOptimization.destroy();
  });

  describe('Cache Performance', () => {
    beforeEach(() => {
      userCache.clear();
      sessionCache.clear();
    });

    it('should handle high-volume cache operations within performance targets', () => {
      const iterations = 10000;
      const testData = generateMockUsers(iterations);
      
      // Test cache write performance
      const writeStart = performance.now();
      testData.forEach((user, index) => {
        userCache.set(`user_${index}`, user);
      });
      const writeTime = performance.now() - writeStart;
      
      // Should complete 10k writes in under 100ms
      expect(writeTime).toBeLessThan(100);
      
      // Test cache read performance
      const readStart = performance.now();
      testData.forEach((_, index) => {
        userCache.get(`user_${index}`);
      });
      const readTime = performance.now() - readStart;
      
      // Should complete 10k reads in under 50ms
      expect(readTime).toBeLessThan(50);
      
      // Verify cache hit rate
      const stats = userCache.getStats();
      expect(stats.size).toBe(iterations);
    });

    it('should maintain performance under memory pressure', () => {
      const cacheWithLimit = cacheService.getCache('limited', { 
        maxSize: 1000, 
        ttl: 60000 
      });
      
      // Fill cache beyond limit
      const iterations = 2000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        cacheWithLimit.set(`key_${i}`, { data: `value_${i}` });
      }
      
      const time = performance.now() - start;
      
      // Should handle eviction efficiently
      expect(time).toBeLessThan(200);
      expect(cacheWithLimit.getStats().size).toBeLessThanOrEqual(1000);
    });

    it('should efficiently handle cache expiration', async () => {
      const shortTtlCache = cacheService.getCache('shortTtl', { 
        ttl: 10, // 10ms
        checkPeriod: 5 
      });
      
      // Add items that will expire quickly
      for (let i = 0; i < 100; i++) {
        shortTtlCache.set(`key_${i}`, { data: i });
      }
      
      expect(shortTtlCache.getStats().size).toBe(100);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Try to access expired items
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        shortTtlCache.get(`key_${i}`);
      }
      const time = performance.now() - start;
      
      // Should handle expired item cleanup efficiently
      expect(time).toBeLessThan(10);
    });
  });

  describe('Pagination Performance', () => {
    it('should handle large dataset pagination efficiently', () => {
      const largeDataset = generateMockUsers(50000);
      
      // Test pagination performance
      const start = performance.now();
      const result = PaginationService.paginateArray(largeDataset, {
        page: 100,
        limit: 50,
        sortBy: 'username',
        sortOrder: 'ASC',
        search: 'user1'
      });
      const time = performance.now() - start;
      
      // Should paginate 50k items in under 100ms
      expect(time).toBeLessThan(100);
      expect(result.data.length).toBeLessThanOrEqual(50);
      expect(result.pagination.totalItems).toBeGreaterThan(0);
    });

    it('should optimize page size calculation', () => {
      const start = performance.now();
      
      // Test various scenarios
      const scenarios = [
        { totalItems: 1000, averageSize: 1024 },
        { totalItems: 100000, averageSize: 512 },
        { totalItems: 1000000, averageSize: 2048 }
      ];
      
      scenarios.forEach(scenario => {
        const pageSize = PaginationService.calculateOptimalPageSize(
          scenario.totalItems,
          scenario.averageSize
        );
        expect(pageSize).toBeGreaterThan(0);
        expect(pageSize).toBeLessThanOrEqual(1000);
      });
      
      const time = performance.now() - start;
      expect(time).toBeLessThan(10);
    });

    it('should handle complex filtering efficiently', () => {
      const dataset = generateMockUsers(10000);
      
      const start = performance.now();
      const result = PaginationService.paginateArray(dataset, {
        page: 1,
        limit: 100,
        search: 'user',
        filters: {
          isActive: true,
          billingPlanId: [1, 2, 3]
        },
        sortBy: 'createdAt',
        sortOrder: 'DESC'
      });
      const time = performance.now() - start;
      
      // Should handle complex filtering in under 50ms
      expect(time).toBeLessThan(50);
      expect(result.data.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Database Query Performance', () => {
    it('should execute queries within performance targets', async () => {
      // Test query execution with metrics
      const testQuery = 'SELECT COUNT(*) as count FROM sqlite_master WHERE type = ?';
      const params = ['table'];
      
      const start = performance.now();
      const { result, metrics } = await dbOptimization.executeWithMetrics(testQuery, params);
      const time = performance.now() - start;
      
      // Should execute simple query in under 10ms
      expect(time).toBeLessThan(10);
      expect(metrics.executionTime).toBeLessThan(10);
      expect(result).toBeDefined();
    });

    it('should maintain performance after optimization', async () => {
      // Run optimization
      await dbOptimization.optimizeDatabase();
      
      // Test query performance after optimization
      const queries = [
        'SELECT COUNT(*) FROM sqlite_master',
        'PRAGMA table_info(sqlite_master)',
        'PRAGMA database_list'
      ];
      
      const start = performance.now();
      
      for (const query of queries) {
        await dbOptimization.executeWithMetrics(query);
      }
      
      const totalTime = performance.now() - start;
      
      // All queries should complete in under 50ms
      expect(totalTime).toBeLessThan(50);
      
      const stats = dbOptimization.getQueryStats();
      expect(stats.averageExecutionTime).toBeLessThan(20);
    });

    it('should handle concurrent queries efficiently', async () => {
      const concurrentQueries = 10;
      const query = 'SELECT name FROM sqlite_master WHERE type = ? LIMIT 1';
      
      const start = performance.now();
      
      const promises = Array.from({ length: concurrentQueries }, () =>
        dbOptimization.executeWithMetrics(query, ['table'])
      );
      
      await Promise.all(promises);
      
      const time = performance.now() - start;
      
      // Should handle 10 concurrent queries in under 100ms
      expect(time).toBeLessThan(100);
    });
  });

  describe('MikroTik API Optimization', () => {
    beforeEach(() => {
      mikrotikOptimization.clearCaches();
      mikrotikOptimization.resetMetrics();
    });

    it('should demonstrate cache effectiveness', async () => {
      // Mock the MikroTik service methods
      const originalGetActiveUsers = mikrotikOptimization['mikrotikService'].getActiveUsers;
      let callCount = 0;
      
      mikrotikOptimization['mikrotikService'].getActiveUsers = jest.fn().mockImplementation(async () => {
        callCount++;
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 50));
        return generateMockSessions(100);
      });
      
      // First call - should hit API
      const start1 = performance.now();
      await mikrotikOptimization.getActiveUsers();
      const time1 = performance.now() - start1;
      
      // Second call - should hit cache
      const start2 = performance.now();
      await mikrotikOptimization.getActiveUsers();
      const time2 = performance.now() - start2;
      
      // Cache hit should be significantly faster
      expect(time2).toBeLessThan(time1 / 2);
      expect(callCount).toBe(1); // API called only once
      
      const metrics = mikrotikOptimization.getMetrics();
      expect(metrics.cacheHitRate).toBeGreaterThan(0);
      
      // Restore original method
      mikrotikOptimization['mikrotikService'].getActiveUsers = originalGetActiveUsers;
    });

    it('should handle batch operations efficiently', async () => {
      const users = generateMockUsers(100);
      
      // Mock batch operation
      mikrotikOptimization['mikrotikService'].createUsersBatch = jest.fn().mockResolvedValue(undefined);
      
      const start = performance.now();
      await mikrotikOptimization.createUsersBatch(users);
      const time = performance.now() - start;
      
      // Should handle batch creation efficiently
      expect(time).toBeLessThan(100);
      expect(mikrotikOptimization['mikrotikService'].createUsersBatch).toHaveBeenCalled();
    });

    it('should maintain performance under load', async () => {
      // Mock multiple concurrent operations
      const operations = Array.from({ length: 20 }, (_, i) => 
        mikrotikOptimization.getUserInfo(`user${i}`)
      );
      
      // Mock the getUserInfo method
      mikrotikOptimization['mikrotikService'].getUserInfo = jest.fn().mockImplementation(async (username) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { username, status: 'active' };
      });
      
      const start = performance.now();
      await Promise.all(operations);
      const time = performance.now() - start;
      
      // Should handle concurrent operations efficiently
      expect(time).toBeLessThan(500);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should maintain reasonable memory usage under load', () => {
      const initialMemory = process.memoryUsage();
      
      // Simulate heavy cache usage
      const iterations = 10000;
      for (let i = 0; i < iterations; i++) {
        userCache.set(`test_${i}`, generateMockUsers(1)[0]);
      }
      
      const afterCacheMemory = process.memoryUsage();
      
      // Clear cache
      userCache.clear();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const afterClearMemory = process.memoryUsage();
      
      // Memory should not grow excessively
      const memoryGrowth = afterCacheMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
      
      // Memory should be released after clearing
      const memoryAfterClear = afterClearMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryAfterClear).toBeLessThan(memoryGrowth);
    });

    it('should handle cache eviction without memory leaks', () => {
      const limitedCache = cacheService.getCache('memoryTest', { 
        maxSize: 1000,
        ttl: 60000 
      });
      
      const initialMemory = process.memoryUsage();
      
      // Fill cache beyond limit multiple times
      for (let round = 0; round < 5; round++) {
        for (let i = 0; i < 2000; i++) {
          limitedCache.set(`round${round}_item${i}`, {
            data: new Array(1000).fill(`data_${round}_${i}`)
          });
        }
      }
      
      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory growth should be bounded despite multiple rounds
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
      expect(limitedCache.getStats().size).toBeLessThanOrEqual(1000);
    });
  });

  describe('Response Time Performance', () => {
    it('should meet API response time targets', async () => {
      const testCases = [
        { name: 'Simple query', target: 10 },
        { name: 'Complex pagination', target: 100 },
        { name: 'Cache operation', target: 5 }
      ];
      
      for (const testCase of testCases) {
        const start = performance.now();
        
        switch (testCase.name) {
          case 'Simple query':
            await dbOptimization.executeWithMetrics('SELECT 1');
            break;
          case 'Complex pagination':
            PaginationService.paginateArray(generateMockUsers(1000), {
              page: 5,
              limit: 50,
              search: 'user',
              sortBy: 'username'
            });
            break;
          case 'Cache operation':
            userCache.set('test', { data: 'test' });
            userCache.get('test');
            break;
        }
        
        const time = performance.now() - start;
        expect(time).toBeLessThan(testCase.target);
      }
    });

    it('should maintain consistent performance over time', async () => {
      const measurements: number[] = [];
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        // Perform a standard operation
        PaginationService.paginateArray(generateMockUsers(1000), {
          page: Math.floor(Math.random() * 10) + 1,
          limit: 20
        });
        
        const time = performance.now() - start;
        measurements.push(time);
      }
      
      // Calculate statistics
      const average = measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
      const max = Math.max(...measurements);
      const min = Math.min(...measurements);
      const variance = measurements.reduce((sum, time) => sum + Math.pow(time - average, 2), 0) / measurements.length;
      const standardDeviation = Math.sqrt(variance);
      
      // Performance should be consistent
      expect(average).toBeLessThan(50);
      expect(max).toBeLessThan(100);
      expect(standardDeviation).toBeLessThan(average * 0.5); // Less than 50% of average
    });
  });

  describe('Scalability Performance', () => {
    it('should scale linearly with data size', () => {
      const dataSizes = [100, 1000, 10000];
      const times: number[] = [];
      
      dataSizes.forEach(size => {
        const data = generateMockUsers(size);
        
        const start = performance.now();
        PaginationService.paginateArray(data, {
          page: 1,
          limit: 50,
          sortBy: 'username'
        });
        const time = performance.now() - start;
        
        times.push(time);
      });
      
      // Time should not increase exponentially
      // Allow for some variance but expect roughly linear scaling
      const ratio1 = times[1] / times[0]; // 1000 vs 100
      const ratio2 = times[2] / times[1]; // 10000 vs 1000
      
      expect(ratio1).toBeLessThan(20); // Should not be more than 20x slower
      expect(ratio2).toBeLessThan(20); // Should not be more than 20x slower
    });

    it('should handle increasing cache load gracefully', () => {
      const cacheSizes = [100, 1000, 5000];
      const times: number[] = [];
      
      cacheSizes.forEach(size => {
        const testCache = cacheService.getCache(`scale_test_${size}`, {
          maxSize: size * 2,
          ttl: 300000
        });
        
        // Fill cache
        for (let i = 0; i < size; i++) {
          testCache.set(`key_${i}`, { data: `value_${i}` });
        }
        
        // Measure access time
        const start = performance.now();
        for (let i = 0; i < 100; i++) {
          testCache.get(`key_${Math.floor(Math.random() * size)}`);
        }
        const time = performance.now() - start;
        
        times.push(time);
      });
      
      // Access time should remain relatively constant
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      expect(maxTime / minTime).toBeLessThan(3); // Should not vary by more than 3x
    });
  });
});