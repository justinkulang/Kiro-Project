import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { json, urlencoded } from 'express';
import { initializeDatabase } from '../models';
import { 
  errorHandler, 
  notFoundHandler, 
  timeoutHandler, 
  requestSizeLimitHandler,
  securityHeaders 
} from '../middleware/errorHandlingMiddleware';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(securityHeaders);

// Request timeout middleware
app.use(timeoutHandler(30000)); // 30 second timeout

// Request size limit middleware
app.use(requestSizeLimitHandler);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : false,
  credentials: true
}));

// Rate limiting with enhanced configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 15 * 60 // seconds
    },
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 15 * 60 // 15 minutes in seconds
      },
      timestamp: new Date().toISOString()
    });
  }
});
app.use(limiter);

// Body parsing middleware with enhanced error handling
app.use(json({ 
  limit: '10mb',
  type: 'application/json',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf.toString());
    } catch (error) {
      throw new Error('Invalid JSON payload');
    }
  }
}));
app.use(urlencoded({ extended: true, limit: '10mb' }));

// Enhanced request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || Math.random().toString(36).substring(2);
  
  // Add request ID to request object
  req.headers['x-request-id'] = requestId as string;
  
  console.log(`[${new Date().toISOString()}] ${requestId} - ${req.method} ${req.path} - Started`);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${requestId} - ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Import routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import voucherRoutes from './routes/voucherRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import reportRoutes from './routes/reportRoutes';
import adminLogRoutes from './routes/adminLogRoutes';
import billingPlanRoutes from './routes/billingPlanRoutes';
import adminRoutes from './routes/adminRoutes';
import systemConfigRoutes from './routes/systemConfigRoutes';

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin-logs', adminLogRoutes);
app.use('/api/billing-plans', billingPlanRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/system-config', systemConfigRoutes);

// 404 handler for unmatched API routes
app.use('/api', notFoundHandler);

// Global error handling middleware
app.use(errorHandler as any);

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database
    await initializeDatabase();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`API server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();