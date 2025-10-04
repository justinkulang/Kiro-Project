import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { voucherService } from '../../services/voucherService';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware';
import { CreateBillingPlanRequest, VoucherGenerationRequest, VoucherFilters } from '../../models/types';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Billing Plan Routes

/**
 * GET /api/vouchers/billing-plans
 * Get all billing plans
 */
router.get('/billing-plans', async (req: Request, res: Response) => {
  try {
    const plans = await voucherService.getAllBillingPlans();
    res.json({ success: true, data: plans });
  } catch (error) {
    console.error('Error fetching billing plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch billing plans',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/vouchers/billing-plans/active
 * Get active billing plans only
 */
router.get('/billing-plans/active', async (req: Request, res: Response) => {
  try {
    const plans = await voucherService.getActiveBillingPlans();
    res.json({ success: true, data: plans });
  } catch (error) {
    console.error('Error fetching active billing plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active billing plans',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/vouchers/billing-plans/:id
 * Get billing plan by ID
 */
router.get('/billing-plans/:id', 
  param('id').isNumeric().withMessage('Plan ID must be a number'),
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
      const plan = await voucherService.getBillingPlanById(req.params.id);
      if (!plan) {
        return res.status(404).json({
          success: false,
          error: 'Billing plan not found'
        });
      }
      res.json({ success: true, data: plan });
    } catch (error) {
      console.error('Error fetching billing plan:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch billing plan',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/vouchers/billing-plans
 * Create new billing plan
 */
router.post('/billing-plans',
  requireRole(['super_admin', 'admin']),
  [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description must be max 500 characters'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('time_limit').optional().isInt({ min: 1 }).withMessage('Time limit must be a positive integer'),
    body('data_limit').optional().isInt({ min: 0 }).withMessage('Data limit must be non-negative'),
    body('speed_limit_up').optional().isInt({ min: 0 }).withMessage('Upload speed limit must be non-negative'),
    body('speed_limit_down').optional().isInt({ min: 0 }).withMessage('Download speed limit must be non-negative'),
    body('validity_period').isInt({ min: 1 }).withMessage('Validity period must be a positive integer')
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
      const planData: CreateBillingPlanRequest = req.body;
      const plan = await voucherService.createBillingPlan(planData);
      res.status(201).json({ success: true, data: plan });
    } catch (error) {
      console.error('Error creating billing plan:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to create billing plan',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * PUT /api/vouchers/billing-plans/:id
 * Update billing plan
 */
router.put('/billing-plans/:id',
  requireRole(['super_admin', 'admin']),
  [
    param('id').isNumeric().withMessage('Plan ID must be a number'),
    body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description must be max 500 characters'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('time_limit').optional().isInt({ min: 1 }).withMessage('Time limit must be a positive integer'),
    body('data_limit').optional().isInt({ min: 0 }).withMessage('Data limit must be non-negative'),
    body('speed_limit_up').optional().isInt({ min: 0 }).withMessage('Upload speed limit must be non-negative'),
    body('speed_limit_down').optional().isInt({ min: 0 }).withMessage('Download speed limit must be non-negative'),
    body('validity_period').optional().isInt({ min: 1 }).withMessage('Validity period must be a positive integer'),
    body('is_active').optional().isBoolean().withMessage('Active status must be boolean')
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
      const plan = await voucherService.updateBillingPlan(req.params.id, req.body);
      res.json({ success: true, data: plan });
    } catch (error) {
      console.error('Error updating billing plan:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to update billing plan',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * DELETE /api/vouchers/billing-plans/:id
 * Delete billing plan (soft delete)
 */
router.delete('/billing-plans/:id',
  requireRole(['super_admin']),
  param('id').isNumeric().withMessage('Plan ID must be a number'),
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
      await voucherService.deleteBillingPlan(req.params.id);
      res.json({ success: true, message: 'Billing plan deleted successfully' });
    } catch (error) {
      console.error('Error deleting billing plan:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to delete billing plan',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Voucher Routes

/**
 * GET /api/vouchers
 * Get vouchers with optional filtering
 */
router.get('/',
  [
    query('billing_plan_id').optional().isNumeric().withMessage('Billing plan ID must be a number'),
    query('is_used').optional().isBoolean().withMessage('Used status must be boolean'),
    query('batch_id').optional().isString().withMessage('Batch ID must be a string'),
    query('start_date').optional().isISO8601().withMessage('Start date must be valid ISO date'),
    query('end_date').optional().isISO8601().withMessage('End date must be valid ISO date')
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
      const filters: VoucherFilters = {};
      
      if (req.query.billing_plan_id) {
        filters.billing_plan_id = parseInt(req.query.billing_plan_id as string);
      }
      if (req.query.is_used !== undefined) {
        filters.is_used = req.query.is_used === 'true';
      }
      if (req.query.batch_id) {
        filters.batch_id = req.query.batch_id as string;
      }
      if (req.query.start_date) {
        filters.start_date = new Date(req.query.start_date as string);
      }
      if (req.query.end_date) {
        filters.end_date = new Date(req.query.end_date as string);
      }

      const vouchers = await voucherService.getVouchers(filters);
      res.json({ success: true, data: vouchers });
    } catch (error) {
      console.error('Error fetching vouchers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch vouchers',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/vouchers/generate
 * Generate vouchers in batch
 */
router.post('/generate',
  requireRole(['super_admin', 'admin']),
  [
    body('quantity').isInt({ min: 1, max: 1000 }).withMessage('Quantity must be between 1 and 1000'),
    body('billing_plan_id').isNumeric().withMessage('Billing plan ID must be a number'),
    body('validity_days').isInt({ min: 1 }).withMessage('Validity days must be a positive integer'),
    body('prefix').optional().isLength({ max: 10 }).withMessage('Prefix must be max 10 characters'),
    body('batch_id').optional().isString().withMessage('Batch ID must be a string')
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
      const request: VoucherGenerationRequest = req.body;
      const vouchers = await voucherService.generateVouchers(request);
      res.status(201).json({ 
        success: true, 
        data: vouchers,
        message: `Generated ${vouchers.length} vouchers successfully`
      });
    } catch (error) {
      console.error('Error generating vouchers:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to generate vouchers',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/vouchers/validate/:code
 * Validate voucher code
 */
router.get('/validate/:code',
  param('code').isLength({ min: 1 }).withMessage('Voucher code is required'),
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
      const result = await voucherService.validateVoucherCode(req.params.code);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error validating voucher:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate voucher',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/vouchers/use/:code
 * Mark voucher as used
 */
router.post('/use/:code',
  requireRole(['super_admin', 'admin']),
  param('code').isLength({ min: 1 }).withMessage('Voucher code is required'),
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
      const voucher = await voucherService.useVoucher(req.params.code);
      res.json({ 
        success: true, 
        data: voucher,
        message: 'Voucher marked as used successfully'
      });
    } catch (error) {
      console.error('Error using voucher:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to use voucher',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/vouchers/statistics
 * Get voucher statistics
 */
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const stats = await voucherService.getVoucherStatistics();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching voucher statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch voucher statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/vouchers/:code
 * Get voucher by code
 */
router.get('/:code',
  param('code').isLength({ min: 1 }).withMessage('Voucher code is required'),
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
      const voucher = await voucherService.getVoucherByCode(req.params.code);
      if (!voucher) {
        return res.status(404).json({
          success: false,
          error: 'Voucher not found'
        });
      }
      res.json({ success: true, data: voucher });
    } catch (error) {
      console.error('Error fetching voucher:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch voucher',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;