import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware';
import ReportingService, { ReportFilters, ReportFormat, ReportType } from '../../services/reportingService';

const router = Router();
const reportingService = new ReportingService();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * POST /api/reports/generate
 * Generate a report based on type and filters
 */
router.post('/generate',
  requireRole(['super_admin', 'admin', 'viewer']),
  [
    body('type').isIn(['user', 'revenue', 'usage']).withMessage('Report type must be user, revenue, or usage'),
    body('startDate').isISO8601().withMessage('Start date must be a valid ISO date'),
    body('endDate').isISO8601().withMessage('End date must be a valid ISO date'),
    body('userIds').optional().isArray().withMessage('User IDs must be an array'),
    body('billingPlanIds').optional().isArray().withMessage('Billing plan IDs must be an array'),
    body('includeInactive').optional().isBoolean().withMessage('Include inactive must be boolean')
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    try {
      const { type, startDate, endDate, userIds, billingPlanIds, includeInactive } = req.body;
      
      // Validate date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start >= end) {
        return res.status(400).json({
          success: false,
          error: 'Start date must be before end date'
        });
      }

      // Check if date range is too large (max 1 year)
      const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 365) {
        return res.status(400).json({
          success: false,
          error: 'Date range cannot exceed 365 days'
        });
      }

      const filters: ReportFilters = {
        startDate: start,
        endDate: end,
        userIds: userIds?.map((id: string) => parseInt(id)),
        billingPlanIds: billingPlanIds?.map((id: string) => parseInt(id)),
        includeInactive: includeInactive || false
      };

      let report;
      const startTime = Date.now();

      switch (type as ReportType) {
        case 'user':
          report = await reportingService.generateUserReport(filters);
          break;
        case 'revenue':
          report = await reportingService.generateRevenueReport(filters);
          break;
        case 'usage':
          report = await reportingService.generateUsageReport(filters);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid report type'
          });
      }

      const processingTime = Date.now() - startTime;

      res.json({
        success: true,
        data: report,
        processingTime: `${processingTime}ms`
      });
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate report',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/reports/export
 * Export a report to PDF or Excel format
 */
router.post('/export',
  requireRole(['super_admin', 'admin', 'viewer']),
  [
    body('type').isIn(['user', 'revenue', 'usage']).withMessage('Report type must be user, revenue, or usage'),
    body('format').isIn(['pdf', 'excel']).withMessage('Format must be pdf or excel'),
    body('startDate').isISO8601().withMessage('Start date must be a valid ISO date'),
    body('endDate').isISO8601().withMessage('End date must be a valid ISO date'),
    body('userIds').optional().isArray().withMessage('User IDs must be an array'),
    body('billingPlanIds').optional().isArray().withMessage('Billing plan IDs must be an array'),
    body('includeInactive').optional().isBoolean().withMessage('Include inactive must be boolean')
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    try {
      const { type, format, startDate, endDate, userIds, billingPlanIds, includeInactive } = req.body;
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start >= end) {
        return res.status(400).json({
          success: false,
          error: 'Start date must be before end date'
        });
      }

      const filters: ReportFilters = {
        startDate: start,
        endDate: end,
        userIds: userIds?.map((id: string) => parseInt(id)),
        billingPlanIds: billingPlanIds?.map((id: string) => parseInt(id)),
        includeInactive: includeInactive || false
      };

      // Generate the report first
      let report;
      switch (type as ReportType) {
        case 'user':
          report = await reportingService.generateUserReport(filters);
          break;
        case 'revenue':
          report = await reportingService.generateRevenueReport(filters);
          break;
        case 'usage':
          report = await reportingService.generateUsageReport(filters);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid report type'
          });
      }

      // Export the report
      let buffer: Buffer;
      let contentType: string;
      let filename: string;

      if (format === 'pdf') {
        buffer = await reportingService.exportToPDF(report);
        contentType = 'application/pdf';
        filename = `${type}-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.pdf`;
      } else {
        buffer = await reportingService.exportToExcel(report);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `${type}-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.xlsx`;
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      
      res.send(buffer);
    } catch (error) {
      console.error('Error exporting report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export report',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/reports/quick-stats
 * Get quick statistics for dashboard
 */
router.get('/quick-stats',
  [
    query('period').optional().isIn(['today', 'week', 'month']).withMessage('Period must be today, week, or month')
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    try {
      const period = req.query.period as string || 'today';
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      }

      const filters: ReportFilters = {
        startDate,
        endDate: now,
        includeInactive: false
      };

      // Generate quick reports
      const [userReport, revenueReport, usageReport] = await Promise.all([
        reportingService.generateUserReport(filters),
        reportingService.generateRevenueReport(filters),
        reportingService.generateUsageReport(filters)
      ]);

      const quickStats = {
        period,
        users: {
          total: userReport.summary.totalUsers,
          active: userReport.summary.activeUsers,
          new: userReport.summary.newUsers,
          totalSessions: userReport.summary.totalSessions
        },
        revenue: {
          total: revenueReport.summary.totalRevenue,
          vouchers: revenueReport.summary.totalVouchers,
          usedVouchers: revenueReport.summary.usedVouchers,
          averagePerVoucher: revenueReport.summary.averageRevenuePerVoucher
        },
        usage: {
          totalBandwidth: usageReport.summary.totalBandwidth,
          peakHour: usageReport.summary.peakUsageHour,
          averageDaily: usageReport.summary.averageDailyUsage,
          topUser: usageReport.summary.topUser
        }
      };

      res.json({
        success: true,
        data: quickStats
      });
    } catch (error) {
      console.error('Error getting quick stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get quick statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/reports/templates
 * Get available report templates
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const templates = [
      {
        id: 'daily-summary',
        name: 'Daily Summary Report',
        description: 'Summary of users, revenue, and usage for a single day',
        type: 'user',
        defaultFilters: {
          period: 'today',
          includeInactive: false
        }
      },
      {
        id: 'weekly-revenue',
        name: 'Weekly Revenue Report',
        description: 'Revenue analysis for the past week',
        type: 'revenue',
        defaultFilters: {
          period: 'week',
          includeInactive: false
        }
      },
      {
        id: 'monthly-usage',
        name: 'Monthly Usage Report',
        description: 'Bandwidth usage patterns for the current month',
        type: 'usage',
        defaultFilters: {
          period: 'month',
          includeInactive: false
        }
      },
      {
        id: 'user-activity',
        name: 'User Activity Report',
        description: 'Detailed user activity and session information',
        type: 'user',
        defaultFilters: {
          period: 'week',
          includeInactive: true
        }
      },
      {
        id: 'billing-analysis',
        name: 'Billing Plan Analysis',
        description: 'Performance analysis of different billing plans',
        type: 'revenue',
        defaultFilters: {
          period: 'month',
          includeInactive: false
        }
      }
    ];

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error getting report templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get report templates',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/reports/schedule
 * Schedule a report to be generated automatically
 */
router.post('/schedule',
  requireRole(['super_admin', 'admin']),
  [
    body('name').isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('type').isIn(['user', 'revenue', 'usage']).withMessage('Report type must be user, revenue, or usage'),
    body('format').isIn(['pdf', 'excel']).withMessage('Format must be pdf or excel'),
    body('frequency').isIn(['daily', 'weekly', 'monthly']).withMessage('Frequency must be daily, weekly, or monthly'),
    body('email').isEmail().withMessage('Valid email address is required'),
    body('filters').isObject().withMessage('Filters must be an object')
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    try {
      const { name, type, format, frequency, email, filters } = req.body;
      
      // In a full implementation, this would save the schedule to database
      // and set up a cron job or similar scheduling mechanism
      
      const scheduleId = `SCHED-${Date.now().toString(36).toUpperCase()}`;
      
      const schedule = {
        id: scheduleId,
        name,
        type,
        format,
        frequency,
        email,
        filters,
        createdAt: new Date(),
        createdBy: req.user?.username,
        isActive: true,
        nextRun: this.calculateNextRun(frequency)
      };

      // TODO: Implement actual scheduling logic
      console.log('Report scheduled:', schedule);

      res.status(201).json({
        success: true,
        data: schedule,
        message: 'Report scheduled successfully'
      });
    } catch (error) {
      console.error('Error scheduling report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to schedule report',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/reports/history
 * Get report generation history
 */
router.get('/history',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('type').optional().isIn(['user', 'revenue', 'usage']).withMessage('Type must be user, revenue, or usage')
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const type = req.query.type as string;

      // In a full implementation, this would query the database for report history
      // For now, return mock data
      const history = [
        {
          id: 'USER-123456',
          type: 'user',
          title: 'User Report - Jan 1 to Jan 7',
          generatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          generatedBy: req.user?.username,
          processingTime: '1.2s',
          recordCount: 150,
          fileSize: '2.3 MB'
        },
        {
          id: 'REV-789012',
          type: 'revenue',
          title: 'Revenue Report - Dec 2023',
          generatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          generatedBy: req.user?.username,
          processingTime: '0.8s',
          recordCount: 89,
          fileSize: '1.1 MB'
        }
      ];

      const filteredHistory = type ? history.filter(h => h.type === type) : history;
      const limitedHistory = filteredHistory.slice(0, limit);

      res.json({
        success: true,
        data: limitedHistory,
        total: filteredHistory.length
      });
    } catch (error) {
      console.error('Error getting report history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get report history',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Helper method for calculating next run time
function calculateNextRun(frequency: string): Date {
  const now = new Date();
  switch (frequency) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'monthly':
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return nextMonth;
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}

export default router;