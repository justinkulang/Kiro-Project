import MikroTikService, { MikroTikConfig } from './mikrotikService';
import MonitoringService from './monitoringService';
import { getAdminUserRepository } from '../models';

export interface MikroTikManagerConfig extends MikroTikConfig {
  monitoringInterval?: number;
  autoStartMonitoring?: boolean;
}

export interface SystemStatus {
  mikrotikConnected: boolean;
  monitoringActive: boolean;
  lastUpdate: Date;
  activeUsers: number;
  systemResources?: any;
  error?: string;
}

class MikroTikManager {
  private static instance: MikroTikManager;
  private mikrotikService: MikroTikService | null = null;
  private monitoringService: MonitoringService | null = null;
  private config: MikroTikManagerConfig | null = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): MikroTikManager {
    if (!MikroTikManager.instance) {
      MikroTikManager.instance = new MikroTikManager();
    }
    return MikroTikManager.instance;
  }

  /**
   * Initialize MikroTik services with configuration
   */
  async initialize(config: MikroTikManagerConfig): Promise<void> {
    try {
      console.log('Initializing MikroTik Manager...');
      
      this.config = {
        monitoringInterval: 30000,
        autoStartMonitoring: true,
        ...config
      };

      // Create MikroTik service
      this.mikrotikService = new MikroTikService(this.config);
      
      // Test connection
      await this.mikrotikService.testConnection();
      console.log('✅ MikroTik connection established');

      // Create monitoring service
      this.monitoringService = new MonitoringService(this.mikrotikService);

      // Auto-start monitoring if configured
      if (this.config.autoStartMonitoring) {
        this.monitoringService.startMonitoring(this.config.monitoringInterval);
        console.log('✅ MikroTik monitoring started');
      }

      this.isInitialized = true;
      console.log('🎉 MikroTik Manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize MikroTik Manager:', error);
      throw new Error(`MikroTik initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update configuration and reinitialize if needed
   */
  async updateConfig(newConfig: Partial<MikroTikManagerConfig>): Promise<void> {
    if (!this.config) {
      throw new Error('MikroTik Manager not initialized');
    }

    const updatedConfig = { ...this.config, ...newConfig };
    
    // Stop monitoring if running
    if (this.monitoringService?.isMonitoringActive()) {
      this.monitoringService.stopMonitoring();
    }

    // Reinitialize with new config
    await this.initialize(updatedConfig);
  }

  /**
   * Get MikroTik service instance
   */
  getMikroTikService(): MikroTikService {
    if (!this.mikrotikService) {
      throw new Error('MikroTik Manager not initialized. Call initialize() first.');
    }
    return this.mikrotikService;
  }

  /**
   * Get monitoring service instance
   */
  getMonitoringService(): MonitoringService {
    if (!this.monitoringService) {
      throw new Error('MikroTik Manager not initialized. Call initialize() first.');
    }
    return this.monitoringService;
  }

  /**
   * Check if manager is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.mikrotikService !== null && this.monitoringService !== null;
  }

  /**
   * Get system status
   */
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      if (!this.isReady()) {
        return {
          mikrotikConnected: false,
          monitoringActive: false,
          lastUpdate: new Date(),
          activeUsers: 0,
          error: 'MikroTik Manager not initialized'
        };
      }

      const connectionStatus = this.mikrotikService!.getConnectionStatus();
      const monitoringStats = await this.monitoringService!.getMonitoringStats();
      
      let systemResources;
      try {
        systemResources = await this.mikrotikService!.getSystemResources();
      } catch (error) {
        console.warn('Could not fetch system resources:', error);
      }

      return {
        mikrotikConnected: connectionStatus.connected,
        monitoringActive: this.monitoringService!.isMonitoringActive(),
        lastUpdate: monitoringStats.lastUpdate,
        activeUsers: monitoringStats.totalActiveUsers,
        systemResources,
        error: connectionStatus.error
      };
    } catch (error) {
      console.error('Failed to get system status:', error);
      return {
        mikrotikConnected: false,
        monitoringActive: false,
        lastUpdate: new Date(),
        activeUsers: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test connection to MikroTik router
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.mikrotikService) {
        return false;
      }
      
      const status = await this.mikrotikService.testConnection();
      return status.connected;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Start monitoring
   */
  startMonitoring(intervalMs?: number): void {
    if (!this.monitoringService) {
      throw new Error('MikroTik Manager not initialized');
    }

    const interval = intervalMs || this.config?.monitoringInterval || 30000;
    this.monitoringService.startMonitoring(interval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringService) {
      this.monitoringService.stopMonitoring();
    }
  }

  /**
   * Restart monitoring
   */
  restartMonitoring(intervalMs?: number): void {
    this.stopMonitoring();
    this.startMonitoring(intervalMs);
  }

  /**
   * Shutdown manager and cleanup resources
   */
  shutdown(): void {
    console.log('Shutting down MikroTik Manager...');
    
    if (this.monitoringService) {
      this.monitoringService.stopMonitoring();
    }

    this.mikrotikService = null;
    this.monitoringService = null;
    this.config = null;
    this.isInitialized = false;
    
    console.log('MikroTik Manager shutdown complete');
  }

  /**
   * Initialize from system settings
   */
  async initializeFromSettings(): Promise<void> {
    try {
      // In a real implementation, you would load these from system_settings table
      // For now, we'll use default values
      const config: MikroTikManagerConfig = {
        host: process.env.MIKROTIK_HOST || '192.168.1.1',
        port: parseInt(process.env.MIKROTIK_PORT || '8728'),
        username: process.env.MIKROTIK_USERNAME || 'admin',
        password: process.env.MIKROTIK_PASSWORD || '',
        timeout: 10000,
        monitoringInterval: 30000,
        autoStartMonitoring: true
      };

      await this.initialize(config);
    } catch (error) {
      console.error('Failed to initialize from settings:', error);
      throw error;
    }
  }

  /**
   * Health check for the entire system
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: {
      mikrotikConnection: boolean;
      monitoring: boolean;
      database: boolean;
    };
    details: any;
  }> {
    const checks = {
      mikrotikConnection: false,
      monitoring: false,
      database: false
    };

    const details: any = {};

    try {
      // Check MikroTik connection
      if (this.mikrotikService) {
        checks.mikrotikConnection = await this.testConnection();
        details.mikrotikStatus = this.mikrotikService.getConnectionStatus();
      }

      // Check monitoring
      if (this.monitoringService) {
        checks.monitoring = this.monitoringService.isMonitoringActive();
        details.monitoringStats = await this.monitoringService.getMonitoringStats();
      }

      // Check database (basic test)
      try {
        const adminRepo = getAdminUserRepository();
        await adminRepo.findAll({ page: 1, limit: 1 });
        checks.database = true;
      } catch (error) {
        details.databaseError = error instanceof Error ? error.message : 'Unknown error';
      }

      // Determine overall status
      const healthyChecks = Object.values(checks).filter(Boolean).length;
      let status: 'healthy' | 'degraded' | 'unhealthy';

      if (healthyChecks === 3) {
        status = 'healthy';
      } else if (healthyChecks >= 1) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      return { status, checks, details };
    } catch (error) {
      return {
        status: 'unhealthy',
        checks,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}

export default MikroTikManager;