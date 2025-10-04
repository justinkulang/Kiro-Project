import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware';
import { BillingPlanService } from '../../services/billingPlanService';
import AdminLogService, { AdminAction } from '../../services/adminLogService';
import { AdminUser } from '../../models/types';

const router = Router();
const billingPlanService = new BillingPlanService();
const adminLogService = new AdminLogService();

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: AdminUser;
}

/**
 * GET /api/billing-plans
 * Get all billing plans with pagination
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      page = '1',
      limit = '50',
      search,
      isActive
    } = req.query;

    const result = await billingPlanService.getBillingPlans({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      search: search as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    console.error('Error getting billing plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve billing plans',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/billing-plans/:id
 * Get a specific billing plan
 */
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const billingPlan = await billingPlanService.getBillingPlanById(parseInt(id));

    if (!billingPlan) {
      return res.status(404).json({
        success: false,
        message: 'Billing plan not found'
      });
    }

    res.json({
      success: true,
      data: billingPlan
    });
  } catch (error) {
    console.error('Error getting billing plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve billing plan',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/billing-plans
 * Create a new billing plan
 */
router.post('/', authenticateToken, requireRole(['super_admin', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const billingPlanData = req.body;
    const billingPlan = await billingPlanService.createBillingPlan(billingPlanData);

    // Log the action
    if (req.user) {
      await adminLogService.logSystemAction(
        req.user.id!,
        req.user.username,
        AdminAction.BILLING_PLAN_CREATED,
        {
          billingPlanId: billingPlan.id,
          name: billingPlan.name,
          price: billingPlan.price
        },
        req.ip
      );
    }

    res.status(201).json({
      success: true,
      data: billingPlan,
      message: 'Billing plan created successfully'
    });
  } catch (error) {
    console.error('Error creating billing plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create billing plan',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/billing-plans/:id
 * Update a billing plan
 */
router.put('/:id', authenticateToken, requireRole(['super_admin', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const billingPlan = await billingPlanService.updateBillingPlan(parseInt(id), updateData);

    if (!billingPlan) {
      return res.status(404).json({
        success: false,
        message: 'Billing plan not found'
      });
    }

    // Log the action
    if (req.user) {
      await adminLogService.logSystemAction(
        req.user.id!,
        req.user.username,
        AdminAction.BILLING_PLAN_UPDATED,
        {
          billingPlanId: billingPlan.id,
          name: billingPlan.name,
          changes: updateData
        },
        req.ip
      );
    }

    res.json({
      success: true,
      data: billingPlan,
      message: 'Billing plan updated successfully'
    });
  } catch (error) {
    console.error('Error updating billing plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update billing plan',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/billing-plans/:id
 * Delete a billing plan
 */
router.delete('/:id', authenticateToken, requireRole(['super_admin', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if billing plan is in use
    const isInUse = await billingPlanService.isBillingPlanInUse(parseInt(id));
    if (isInUse) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete billing plan that is currently in use'
      });
    }

    const deleted = await billingPlanService.deleteBillingPlan(parseInt(id));

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Billing plan not found'
      });
    }

    // Log the action
    if (req.user) {
      await adminLogService.logSystemAction(
        req.user.id!,
        req.user.username,
        AdminAction.BILLING_PLAN_DELETED,
        { billingPlanId: parseInt(id) },
        req.ip
      );
    }

    res.json({
      success: true,
      message: 'Billing plan deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting billing plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete billing plan',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/billing-plans/:id/users
 * Get users using this billing plan
 */
router.get('/:id/users', authenticateToken, requireRole(['super_admin', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      page = '1',
      limit = '50'
    } = req.query;

    const result = await billingPlanService.getUsersByBillingPlan(
      parseInt(id),
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    console.error('Error getting users by billing plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/billing-plans/stats
 * Get billing plan statistics
 */
router.get('/stats', authenticateToken, requireRole(['super_admin', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await billingPlanService.getBillingPlanStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting billing plan stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve billing plan statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;