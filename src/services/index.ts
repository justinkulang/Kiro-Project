import MikroTikManager from './mikrotikManager';
import AuthService from './authService';

// Service exports
export { default as AuthService } from './authService';
export { default as MikroTikService } from './mikrotikService';
export { default as MonitoringService } from './monitoringService';
export { default as MikroTikManager } from './mikrotikManager';
export { default as UserManagementService } from './userManagementService';
export { VoucherService, voucherService } from './voucherService';
export { default as DashboardService } from './dashboardService';
export { default as ReportingService } from './reportingService';
export { default as AdminLogService, AdminAction } from './adminLogService';

// Service instances (singleton pattern)
let authService: AuthService;

export const getAuthService = (): AuthService => {
  if (!authService) {
    authService = new AuthService();
  }
  return authService;
};

export const getMikroTikManager = () => {
  return MikroTikManager.getInstance();
};

// Type exports
export type { TokenPayload, AuthTokens, LoginCredentials, LoginResponse } from './authService';
export type { MikroTikConfig, MikroTikUser, MikroTikActiveUser, ConnectionStatus } from './mikrotikService';
export type { SessionData, MonitoringStats, UserActivity } from './monitoringService';
export type { MikroTikManagerConfig, SystemStatus } from './mikrotikManager';