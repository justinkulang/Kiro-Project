import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  data?: any;
}

/**
 * Validation middleware factory
 */
export const validateRequest = (schema: Joi.ObjectSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const dataToValidate = req[source];
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const validationErrors: ValidationError[] = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
        timestamp: new Date().toISOString()
      });
    }

    // Replace the original data with validated and sanitized data
    req[source] = value;
    next();
  };
};

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // Pagination schema
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(1000).default(50),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc')
  }),

  // Search schema
  search: Joi.object({
    search: Joi.string().trim().max(255).optional(),
    isActive: Joi.boolean().optional()
  }),

  // ID parameter schema
  idParam: Joi.object({
    id: Joi.number().integer().positive().required()
  }),

  // Date range schema
  dateRange: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
  })
};

/**
 * User validation schemas
 */
export const userSchemas = {
  create: Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(30)
      .required()
      .messages({
        'string.alphanum': 'Username can only contain letters and numbers',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 30 characters'
      }),
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
      }),
    email: Joi.string().email().max(255).optional(),
    fullName: Joi.string().trim().max(255).optional(),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).max(20).optional(),
    address: Joi.string().trim().max(500).optional(),
    billingPlanId: Joi.number().integer().positive().required(),
    isActive: Joi.boolean().default(true),
    expiresAt: Joi.date().iso().greater('now').optional()
  }),

  update: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).optional(),
    password: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).optional(),
    email: Joi.string().email().max(255).optional(),
    fullName: Joi.string().trim().max(255).optional(),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).max(20).optional(),
    address: Joi.string().trim().max(500).optional(),
    billingPlanId: Joi.number().integer().positive().optional(),
    isActive: Joi.boolean().optional(),
    expiresAt: Joi.date().iso().greater('now').optional()
  }),

  filters: commonSchemas.pagination.concat(commonSchemas.search).concat(Joi.object({
    billingPlanId: Joi.number().integer().positive().optional()
  }))
};

/**
 * Admin user validation schemas
 */
export const adminSchemas = {
  create: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required(),
    email: Joi.string().email().max(255).optional(),
    fullName: Joi.string().trim().max(255).optional(),
    role: Joi.string().valid('super_admin', 'admin', 'operator').required(),
    isActive: Joi.boolean().default(true),
    permissions: Joi.array().items(Joi.string()).optional()
  }),

  update: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).optional(),
    password: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).optional(),
    email: Joi.string().email().max(255).optional(),
    fullName: Joi.string().trim().max(255).optional(),
    role: Joi.string().valid('super_admin', 'admin', 'operator').optional(),
    isActive: Joi.boolean().optional(),
    permissions: Joi.array().items(Joi.string()).optional()
  }),

  resetPassword: Joi.object({
    password: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
  }),

  filters: commonSchemas.pagination.concat(commonSchemas.search).concat(Joi.object({
    role: Joi.string().valid('super_admin', 'admin', 'operator').optional()
  }))
};

/**
 * Billing plan validation schemas
 */
export const billingPlanSchemas = {
  create: Joi.object({
    name: Joi.string().trim().min(1).max(255).required(),
    description: Joi.string().trim().max(1000).optional(),
    price: Joi.number().precision(2).min(0).max(999999.99).required(),
    timeLimit: Joi.number().integer().min(0).optional(),
    dataLimit: Joi.number().integer().min(0).optional(),
    validityPeriod: Joi.number().integer().min(1).max(365).required(),
    isActive: Joi.boolean().default(true)
  }),

  update: Joi.object({
    name: Joi.string().trim().min(1).max(255).optional(),
    description: Joi.string().trim().max(1000).optional(),
    price: Joi.number().precision(2).min(0).max(999999.99).optional(),
    timeLimit: Joi.number().integer().min(0).optional(),
    dataLimit: Joi.number().integer().min(0).optional(),
    validityPeriod: Joi.number().integer().min(1).max(365).optional(),
    isActive: Joi.boolean().optional()
  }),

  filters: commonSchemas.pagination.concat(commonSchemas.search)
};

/**
 * Voucher validation schemas
 */
export const voucherSchemas = {
  create: Joi.object({
    billingPlanId: Joi.number().integer().positive().required(),
    quantity: Joi.number().integer().min(1).max(1000).default(1),
    expiresAt: Joi.date().iso().greater('now').optional(),
    prefix: Joi.string().alphanum().min(1).max(10).optional()
  }),

  filters: commonSchemas.pagination.concat(commonSchemas.search).concat(Joi.object({
    billingPlanId: Joi.number().integer().positive().optional(),
    batchId: Joi.string().optional(),
    isUsed: Joi.boolean().optional()
  })),

  validate: Joi.object({
    code: Joi.string().alphanum().min(6).max(20).required()
  }),

  use: Joi.object({
    code: Joi.string().alphanum().min(6).max(20).required(),
    userId: Joi.number().integer().positive().required()
  })
};

/**
 * System configuration validation schemas
 */
export const systemConfigSchemas = {
  update: Joi.object().pattern(
    Joi.string(),
    Joi.alternatives().try(
      Joi.string().max(1000),
      Joi.number(),
      Joi.boolean()
    )
  ),

  single: Joi.object({
    value: Joi.alternatives().try(
      Joi.string().max(1000),
      Joi.number(),
      Joi.boolean()
    ).required(),
    description: Joi.string().max(255).optional()
  }),

  import: Joi.object({
    config: Joi.alternatives().try(
      Joi.string(),
      Joi.object()
    ).required()
  })
};

/**
 * Report validation schemas
 */
export const reportSchemas = {
  generate: Joi.object({
    reportType: Joi.string().valid('users', 'revenue', 'usage', 'billing-plans', 'sessions', 'vouchers').required(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    userIds: Joi.array().items(Joi.number().integer().positive()).optional(),
    billingPlanIds: Joi.array().items(Joi.number().integer().positive()).optional(),
    includeInactive: Joi.boolean().optional(),
    format: Joi.string().valid('pdf', 'excel').default('pdf')
  }),

  schedule: Joi.object({
    reportType: Joi.string().valid('users', 'revenue', 'usage', 'billing-plans', 'sessions', 'vouchers').required(),
    frequency: Joi.string().valid('daily', 'weekly', 'monthly').required(),
    format: Joi.string().valid('pdf', 'excel').required(),
    email: Joi.string().email().required(),
    filters: Joi.object().optional()
  })
};

/**
 * Custom validation functions
 */
export const customValidators = {
  /**
   * Validate IP address
   */
  isValidIP: (value: string): boolean => {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(value);
  },

  /**
   * Validate hostname
   */
  isValidHostname: (value: string): boolean => {
    const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?))*$/;
    return hostnameRegex.test(value);
  },

  /**
   * Validate port number
   */
  isValidPort: (value: number): boolean => {
    return Number.isInteger(value) && value > 0 && value <= 65535;
  },

  /**
   * Validate MAC address
   */
  isValidMacAddress: (value: string): boolean => {
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return macRegex.test(value);
  }
};

/**
 * Sanitization functions
 */
export const sanitizers = {
  /**
   * Sanitize string input
   */
  sanitizeString: (value: string): string => {
    return value.trim().replace(/[<>]/g, '');
  },

  /**
   * Sanitize HTML input
   */
  sanitizeHtml: (value: string): string => {
    return value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  /**
   * Normalize email
   */
  normalizeEmail: (value: string): string => {
    return value.toLowerCase().trim();
  }
};

export default {
  validateRequest,
  commonSchemas,
  userSchemas,
  adminSchemas,
  billingPlanSchemas,
  voucherSchemas,
  systemConfigSchemas,
  reportSchemas,
  customValidators,
  sanitizers
};