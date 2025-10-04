import ReportingService, { ReportFilters, ReportFormat, ReportType } from './reportingService';
import { getAdminUserRepository } from '../models';

export interface ScheduledReport {
  id: string;
  name: string;
  type: ReportType;
  format: ReportFormat;
  frequency: 'daily' | 'weekly' | 'monthly';
  filters: ReportFilters;
  email: string;
  createdAt: Date;
  createdBy: string;
  isActive: boolean;
  nextRun: Date;
  lastRun?: Date;
  lastRunStatus?: 'success' | 'failed';
  lastRunError?: string;
}

export interface ReportExecution {
  id: string;
  scheduledReportId: string;
  executedAt: Date;
  status: 'running' | 'completed' | 'failed';
  processingTime?: number;
  recordCount?: number;
  fileSize?: number;
  error?: string;
  filePath?: string;
}

class ReportSchedulerService {
  private reportingService: ReportingService;
  private scheduledReports: Map<string, ScheduledReport> = new Map();
  private executions: Map<string, ReportExecution> = new Map();
  private schedulerInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    this.reportingService = new ReportingService();
  }

  /**
   * Schedule a new report
   */
  async scheduleReport(
    name: string,
    type: ReportType,
    format: ReportFormat,
    frequency: 'daily' | 'weekly' | 'monthly',
    filters: Partial<ReportFilters>,
    email: string,
    createdBy: string
  ): Promise<ScheduledReport> {
    const id = this.generateScheduleId();
    const now = new Date();
    
    // Calculate default date range based on frequency
    const defaultFilters = this.calculateDefaultFilters(frequency, filters);
    
    const scheduledReport: ScheduledReport = {
      id,
      name,
      type,
      format,
      frequency,
      filters: defaultFilters,
      email,
      createdAt: now,
      createdBy,
      isActive: true,
      nextRun: this.calculateNextRun(frequency, now)
    };

    this.scheduledReports.set(id, scheduledReport);
    
    // In a production system, this would be saved to database
    console.log(`Report scheduled: ${name} (${id})`);
    
    return scheduledReport;
  }

  /**
   * Update a scheduled report
   */
  async updateScheduledReport(
    id: string, 
    updates: Partial<Omit<ScheduledReport, 'id' | 'createdAt' | 'createdBy'>>
  ): Promise<ScheduledReport> {
    const existing = this.scheduledReports.get(id);
    if (!existing) {
      throw new Error('Scheduled report not found');
    }

    const updated: ScheduledReport = {
      ...existing,
      ...updates
    };

    // Recalculate next run if frequency changed
    if (updates.frequency && updates.frequency !== existing.frequency) {
      updated.nextRun = this.calculateNextRun(updates.frequency, new Date());
    }

    this.scheduledReports.set(id, updated);
    return updated;
  }

  /**
   * Delete a scheduled report
   */
  async deleteScheduledReport(id: string): Promise<boolean> {
    return this.scheduledReports.delete(id);
  }

  /**
   * Get all scheduled reports
   */
  async getScheduledReports(): Promise<ScheduledReport[]> {
    return Array.from(this.scheduledReports.values());
  }

  /**
   * Get scheduled report by ID
   */
  async getScheduledReport(id: string): Promise<ScheduledReport | null> {
    return this.scheduledReports.get(id) || null;
  }

  /**
   * Start the scheduler
   */
  startScheduler(intervalMs: number = 60000): void { // Check every minute
    if (this.isRunning) {
      console.log('Report scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting report scheduler...');

    this.schedulerInterval = setInterval(async () => {
      try {
        await this.checkAndExecuteReports();
      } catch (error) {
        console.error('Error in report scheduler:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop the scheduler
   */
  stopScheduler(): void {
    if (!this.isRunning) {
      console.log('Report scheduler is not running');
      return;
    }

    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }

    this.isRunning = false;
    console.log('Report scheduler stopped');
  }

  /**
   * Execute a scheduled report immediately
   */
  async executeReport(scheduledReportId: string): Promise<ReportExecution> {
    const scheduledReport = this.scheduledReports.get(scheduledReportId);
    if (!scheduledReport) {
      throw new Error('Scheduled report not found');
    }

    const executionId = this.generateExecutionId();
    const startTime = Date.now();

    const execution: ReportExecution = {
      id: executionId,
      scheduledReportId,
      executedAt: new Date(),
      status: 'running'
    };

    this.executions.set(executionId, execution);

    try {
      // Generate the report
      let report;
      switch (scheduledReport.type) {
        case 'user':
          report = await this.reportingService.generateUserReport(scheduledReport.filters);
          break;
        case 'revenue':
          report = await this.reportingService.generateRevenueReport(scheduledReport.filters);
          break;
        case 'usage':
          report = await this.reportingService.generateUsageReport(scheduledReport.filters);
          break;
        default:
          throw new Error(`Unsupported report type: ${scheduledReport.type}`);
      }

      // Export the report
      let buffer: Buffer;
      if (scheduledReport.format === 'pdf') {
        buffer = await this.reportingService.exportToPDF(report);
      } else {
        buffer = await this.reportingService.exportToExcel(report);
      }

      const processingTime = Date.now() - startTime;
      const recordCount = this.getRecordCount(report);

      // Update execution status
      execution.status = 'completed';
      execution.processingTime = processingTime;
      execution.recordCount = recordCount;
      execution.fileSize = buffer.length;

      // In a production system, you would:
      // 1. Save the file to storage
      // 2. Send email with attachment
      // 3. Update database records

      console.log(`Report executed successfully: ${scheduledReport.name} (${executionId})`);

      // Update scheduled report
      scheduledReport.lastRun = new Date();
      scheduledReport.lastRunStatus = 'success';
      scheduledReport.nextRun = this.calculateNextRun(scheduledReport.frequency, new Date());
      delete scheduledReport.lastRunError;

      this.scheduledReports.set(scheduledReportId, scheduledReport);
      this.executions.set(executionId, execution);

      return execution;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Update execution status
      execution.status = 'failed';
      execution.processingTime = processingTime;
      execution.error = error instanceof Error ? error.message : 'Unknown error';

      // Update scheduled report
      scheduledReport.lastRun = new Date();
      scheduledReport.lastRunStatus = 'failed';
      scheduledReport.lastRunError = execution.error;
      scheduledReport.nextRun = this.calculateNextRun(scheduledReport.frequency, new Date());

      this.scheduledReports.set(scheduledReportId, scheduledReport);
      this.executions.set(executionId, execution);

      console.error(`Report execution failed: ${scheduledReport.name} (${executionId})`, error);
      
      throw error;
    }
  }

  /**
   * Get execution history
   */
  async getExecutionHistory(limit: number = 50): Promise<ReportExecution[]> {
    return Array.from(this.executions.values())
      .sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get execution by ID
   */
  async getExecution(id: string): Promise<ReportExecution | null> {
    return this.executions.get(id) || null;
  }

  /**
   * Get scheduler status
   */
  getSchedulerStatus(): {
    isRunning: boolean;
    scheduledReportsCount: number;
    nextExecution?: Date;
    lastExecution?: Date;
  } {
    const scheduledReports = Array.from(this.scheduledReports.values()).filter(r => r.isActive);
    const nextExecution = scheduledReports.length > 0 
      ? scheduledReports.sort((a, b) => a.nextRun.getTime() - b.nextRun.getTime())[0].nextRun
      : undefined;

    const executions = Array.from(this.executions.values());
    const lastExecution = executions.length > 0
      ? executions.sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime())[0].executedAt
      : undefined;

    return {
      isRunning: this.isRunning,
      scheduledReportsCount: scheduledReports.length,
      nextExecution,
      lastExecution
    };
  }

  // Private helper methods

  private async checkAndExecuteReports(): Promise<void> {
    const now = new Date();
    const dueReports = Array.from(this.scheduledReports.values())
      .filter(report => report.isActive && report.nextRun <= now);

    for (const report of dueReports) {
      try {
        await this.executeReport(report.id);
      } catch (error) {
        console.error(`Failed to execute scheduled report ${report.id}:`, error);
      }
    }
  }

  private calculateDefaultFilters(frequency: string, customFilters: Partial<ReportFilters>): ReportFilters {
    const now = new Date();
    let startDate: Date;
    let endDate = now;

    switch (frequency) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    }

    return {
      startDate: customFilters.startDate || startDate,
      endDate: customFilters.endDate || endDate,
      userIds: customFilters.userIds,
      billingPlanIds: customFilters.billingPlanIds,
      includeInactive: customFilters.includeInactive || false
    };
  }

  private calculateNextRun(frequency: string, from: Date): Date {
    const next = new Date(from);
    
    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        next.setHours(6, 0, 0, 0); // 6 AM next day
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        next.setHours(6, 0, 0, 0); // 6 AM next week
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1, 1);
        next.setHours(6, 0, 0, 0); // 6 AM first day of next month
        break;
      default:
        next.setDate(next.getDate() + 1);
        next.setHours(6, 0, 0, 0);
    }

    return next;
  }

  private generateScheduleId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `SCHED-${timestamp}-${random}`.toUpperCase();
  }

  private generateExecutionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `EXEC-${timestamp}-${random}`.toUpperCase();
  }

  private getRecordCount(report: any): number {
    if ('users' in report) {
      return report.users.length;
    } else if ('dailyRevenue' in report) {
      return report.dailyRevenue.length;
    } else if ('topUsers' in report) {
      return report.topUsers.length;
    }
    return 0;
  }
}

export default ReportSchedulerService;