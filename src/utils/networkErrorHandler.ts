import { ExternalServiceError } from '../middleware/errorHandlingMiddleware';

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (error: any, attempt: number) => void;
}

export interface NetworkErrorInfo {
  isNetworkError: boolean;
  isRetryable: boolean;
  errorType: string;
  message: string;
  originalError: any;
}

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryCondition: (error: any) => isRetryableError(error),
  onRetry: (error: any, attempt: number) => {
    console.warn(`Retry attempt ${attempt} for error:`, error.message);
  }
};

/**
 * Check if an error is network-related
 */
export const isNetworkError = (error: any): boolean => {
  if (!error) return false;

  const networkErrorCodes = [
    'ECONNREFUSED',
    'ECONNRESET',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ECONNABORTED',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'EAI_AGAIN'
  ];

  const networkErrorMessages = [
    'network error',
    'connection refused',
    'connection reset',
    'timeout',
    'host unreachable',
    'network unreachable',
    'dns lookup failed'
  ];

  // Check error code
  if (error.code && networkErrorCodes.includes(error.code)) {
    return true;
  }

  // Check error message
  const errorMessage = (error.message || '').toLowerCase();
  return networkErrorMessages.some(msg => errorMessage.includes(msg));
};

/**
 * Check if an error is retryable
 */
export const isRetryableError = (error: any): boolean => {
  if (!error) return false;

  // Network errors are generally retryable
  if (isNetworkError(error)) {
    return true;
  }

  // HTTP status codes that are retryable
  const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
  if (error.status && retryableStatusCodes.includes(error.status)) {
    return true;
  }

  if (error.response?.status && retryableStatusCodes.includes(error.response.status)) {
    return true;
  }

  return false;
};

/**
 * Classify network error
 */
export const classifyNetworkError = (error: any): NetworkErrorInfo => {
  const isNetwork = isNetworkError(error);
  const isRetryable = isRetryableError(error);

  let errorType = 'unknown';
  let message = error.message || 'Unknown error';

  if (error.code) {
    switch (error.code) {
      case 'ECONNREFUSED':
        errorType = 'connection_refused';
        message = 'Connection refused by server';
        break;
      case 'ECONNRESET':
        errorType = 'connection_reset';
        message = 'Connection reset by server';
        break;
      case 'ENOTFOUND':
        errorType = 'dns_lookup_failed';
        message = 'DNS lookup failed';
        break;
      case 'ETIMEDOUT':
        errorType = 'timeout';
        message = 'Request timeout';
        break;
      case 'EHOSTUNREACH':
        errorType = 'host_unreachable';
        message = 'Host unreachable';
        break;
      case 'ENETUNREACH':
        errorType = 'network_unreachable';
        message = 'Network unreachable';
        break;
      default:
        errorType = error.code.toLowerCase();
    }
  } else if (error.status || error.response?.status) {
    const status = error.status || error.response?.status;
    switch (status) {
      case 408:
        errorType = 'request_timeout';
        message = 'Request timeout';
        break;
      case 429:
        errorType = 'rate_limited';
        message = 'Rate limit exceeded';
        break;
      case 500:
        errorType = 'internal_server_error';
        message = 'Internal server error';
        break;
      case 502:
        errorType = 'bad_gateway';
        message = 'Bad gateway';
        break;
      case 503:
        errorType = 'service_unavailable';
        message = 'Service unavailable';
        break;
      case 504:
        errorType = 'gateway_timeout';
        message = 'Gateway timeout';
        break;
      default:
        errorType = `http_${status}`;
    }
  }

  return {
    isNetworkError: isNetwork,
    isRetryable,
    errorType,
    message,
    originalError: error
  };
};

/**
 * Calculate delay for exponential backoff
 */
const calculateDelay = (attempt: number, options: RetryOptions): number => {
  const delay = options.baseDelay * Math.pow(options.backoffFactor, attempt - 1);
  return Math.min(delay, options.maxDelay);
};

/**
 * Sleep utility
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry wrapper with exponential backoff
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> => {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on the last attempt
      if (attempt > config.maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!config.retryCondition!(error)) {
        throw error;
      }

      // Call retry callback
      if (config.onRetry) {
        config.onRetry(error, attempt);
      }

      // Wait before retrying
      const delay = calculateDelay(attempt, config);
      await sleep(delay);
    }
  }

  // If we get here, all retries failed
  const errorInfo = classifyNetworkError(lastError);
  throw new ExternalServiceError(
    `Operation failed after ${config.maxRetries} retries: ${errorInfo.message}`,
    errorInfo.errorType
  );
};

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000, // 1 minute
    private monitoringPeriod: number = 300000 // 5 minutes
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'half-open';
      } else {
        throw new ExternalServiceError('Circuit breaker is open', 'circuit_breaker_open');
      }
    }

    try {
      const result = await operation();
      
      // Success - reset circuit breaker
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
      }
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.failureThreshold) {
        this.state = 'open';
      }

      throw error;
    }
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }

  reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = 'closed';
  }
}

/**
 * Network health checker
 */
export class NetworkHealthChecker {
  private healthStatus = new Map<string, boolean>();
  private lastChecked = new Map<string, number>();

  constructor(private checkInterval: number = 30000) {} // 30 seconds

  async checkHealth(serviceName: string, healthCheck: () => Promise<boolean>): Promise<boolean> {
    const now = Date.now();
    const lastCheck = this.lastChecked.get(serviceName) || 0;

    // Return cached result if within check interval
    if (now - lastCheck < this.checkInterval && this.healthStatus.has(serviceName)) {
      return this.healthStatus.get(serviceName)!;
    }

    try {
      const isHealthy = await healthCheck();
      this.healthStatus.set(serviceName, isHealthy);
      this.lastChecked.set(serviceName, now);
      return isHealthy;
    } catch (error) {
      console.error(`Health check failed for ${serviceName}:`, error);
      this.healthStatus.set(serviceName, false);
      this.lastChecked.set(serviceName, now);
      return false;
    }
  }

  getHealthStatus(serviceName: string): boolean | undefined {
    return this.healthStatus.get(serviceName);
  }

  getAllHealthStatus(): { [serviceName: string]: boolean } {
    const result: { [serviceName: string]: boolean } = {};
    for (const [service, status] of this.healthStatus.entries()) {
      result[service] = status;
    }
    return result;
  }
}

/**
 * Request timeout wrapper
 */
export const withTimeout = <T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operation timeout'
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new ExternalServiceError(timeoutMessage, 'timeout'));
    }, timeoutMs);

    operation()
      .then(result => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeout);
        reject(error);
      });
  });
};

export default {
  withRetry,
  withTimeout,
  isNetworkError,
  isRetryableError,
  classifyNetworkError,
  CircuitBreaker,
  NetworkHealthChecker,
  DEFAULT_RETRY_OPTIONS
};