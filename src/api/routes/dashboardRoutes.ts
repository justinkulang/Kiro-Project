import { Router, Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { authenticateToken } from '../../middleware/authMiddleware';
import DashboardService from '../../services/dashboardService';
import MonitoringService from '../../services/monitoringService';
import MikroTikService from '../../services/mikrotikService';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Initialize services
const mikrotikService = new MikroTikService();
const monitoringService = new MonitoringService(mikrotikService);
const dashboardService = new DashboardService(monitoringService);

/**
 * GET /api/dashboard/stats
 * Get comprehensive dashboard statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await dashboardService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/dashboard/active-users
 * Get currently active users
 */
router.get('/active-users', async (req: Request, res: Response) => {
  try {
    const activeUsers = await monitoringService.getActiveUsers();
    res.json({ success: true, data: activeUsers });
  } catch (error) {
    console.error('Error fetching active users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active users',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/dashboard/bandwidth-history
 * Get bandwidth usage history
 */
router.get('/bandwidth-history',
  [
    query('hours').optional().isInt({ min: 1, max: 168 }).withMessage('Hours must be between 1 and 168')
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
      const hours = parseInt(req.query.hours as string) || 24;
      const history = await dashboardService.getBandwidthHistory(hours);
      res.json({ success: true, data: history });
    } catch (error) {
      console.error('Error fetching bandwidth history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch bandwidth history',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/dashboard/revenue-history
 * Get revenue history for charts
 */
router.get('/revenue-history',
  [
    query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365')
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
      const days = parseInt(req.query.days as string) || 30;
      const history = await dashboardService.getRevenueHistory(days);
      res.json({ success: true, data: history });
    } catch (error) {
      console.error('Error fetching revenue history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch revenue history',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/dashboard/user-activity
 * Get user activity summary by hour
 */
router.get('/user-activity',
  [
    query('hours').optional().isInt({ min: 1, max: 168 }).withMessage('Hours must be between 1 and 168')
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
      const hours = parseInt(req.query.hours as string) || 24;
      const activity = await dashboardService.getUserActivitySummary(hours);
      res.json({ success: true, data: activity });
    } catch (error) {
      console.error('Error fetching user activity:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user activity',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/dashboard/top-users
 * Get top users by bandwidth usage
 */
router.get('/top-users',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
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
      const limit = parseInt(req.query.limit as string) || 10;
      const topUsers = await dashboardService.getTopUsers(limit);
      res.json({ success: true, data: topUsers });
    } catch (error) {
      console.error('Error fetching top users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch top users',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/dashboard/system-health
 * Get system health metrics
 */
router.get('/system-health', async (req: Request, res: Response) => {
  try {
    const health = await dashboardService.getSystemHealth();
    res.json({ success: true, data: health });
  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system health',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/dashboard/session-history
 * Get session history
 */
router.get('/session-history',
  [
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000')
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
      const limit = parseInt(req.query.limit as string) || 100;
      const history = monitoringService.getSessionHistory(limit);
      res.json({ success: true, data: history });
    } catch (error) {
      console.error('Error fetching session history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch session history',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/dashboard/monitoring-stats
 * Get detailed monitoring statistics
 */
router.get('/monitoring-stats', async (req: Request, res: Response) => {
  try {
    const stats = await monitoringService.getMonitoringStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching monitoring stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monitoring statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/dashboard/user-session/:username
 * Get specific user session details
 */
router.get('/user-session/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const session = await monitoringService.getUserSession(username);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'User session not found'
      });
    }

    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error fetching user session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user session',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/dashboard/disconnect-user/:username
 * Disconnect a specific user
 */
router.post('/disconnect-user/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const success = await monitoringService.disconnectUser(username);
    
    if (success) {
      res.json({ 
        success: true, 
        message: `User ${username} disconnected successfully` 
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to disconnect user'
      });
    }
  } catch (error) {
    console.error('Error disconnecting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect user',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/dashboard/user-bandwidth/:username
 * Get bandwidth usage for specific user
 */
router.get('/user-bandwidth/:username',
  [
    query('hours').optional().isInt({ min: 1, max: 168 }).withMessage('Hours must be between 1 and 168')
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
      const { username } = req.params;
      const hours = parseInt(req.query.hours as string) || 24;
      const usage = await monitoringService.getUserBandwidthUsage(username, hours);
      res.json({ success: true, data: usage });
    } catch (error) {
      console.error('Error fetching user bandwidth:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user bandwidth usage',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/dashboard/real-time
 * Get real-time dashboard data (for WebSocket or polling)
 */
router.get('/real-time', async (req: Request, res: Response) => {
  try {
    const data = await dashboardService.getRealTimeData();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching real-time data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch real-time data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/dashboard/start-monitoring
 * Start monitoring service
 */
router.post('/start-monitoring',
  [
    query('interval').optional().isInt({ min: 5000, max: 300000 }).withMessage('Interval must be between 5000ms and 300000ms')
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
      const interval = parseInt(req.query.interval as string) || 30000;
      
      if (monitoringService.isMonitoringActive()) {
        return res.status(400).json({
          success: false,
          error: 'Monitoring is already active'
        });
      }

      monitoringService.startMonitoring(interval);
      dashboardService.startDataCollection();
      
      res.json({ 
        success: true, 
        message: `Monitoring started with ${interval}ms interval` 
      });
    } catch (error) {
      console.error('Error starting monitoring:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start monitoring',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/dashboard/stop-monitoring
 * Stop monitoring service
 */
router.post('/stop-monitoring', async (req: Request, res: Response) => {
  try {
    if (!monitoringService.isMonitoringActive()) {
      return res.status(400).json({
        success: false,
        error: 'Monitoring is not active'
      });
    }

    monitoringService.stopMonitoring();
    
    res.json({ 
      success: true, 
      message: 'Monitoring stopped successfully' 
    });
  } catch (error) {
    console.error('Error stopping monitoring:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop monitoring',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;