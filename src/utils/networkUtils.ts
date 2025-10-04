export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: any) => boolean;
}

export interface NetworkError extends Error {
  code?: string;
  status?: number;
  isNetworkError: boolean;
  isRetryable: boolean;
  attempt?: number;
  maxAttempts?: number;
}

export class NetworkUtils {
  /**
   * Default retry options
   */
  static readonly DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    retryCondition: (error: any) => NetworkUtils.isRetryableError(error)
  };

  /**
   * Execute a function with retry logic
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const config = { ...NetworkUtils.DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: any;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Check if we should retry
        if (attempt === config.maxAttempts || !config.retryCondition!(error)) {
          const networkError = NetworkUtils.createNetworkError(error, attempt, config.maxAttempts);
          throw networkError;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
          config.maxDelay
        );

        console.warn(`Operation failed (attempt ${attempt}/${config.maxAttempts}), retrying in ${delay}ms:`, error.message);
        
        await NetworkUtils.delay(delay);
      }
    }

    throw NetworkUtils.createNetworkError(lastError, config.maxAttempts, config.maxAttempts);
  }

  /**
   * Check if an error is retryable
   */
  static isRetryableError(error: any): boolean {
    // Network connection errors
    if (error.code === 'ECONNREFUSED' || 
        error.code === 'ENOTFOUND' || 
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNRESET' ||
        error.code === 'EHOSTUNREACH') {
      return true;
    }

    // HTTP status codes that are retryable
    if (error.response?.status) {
      const status = error.response.status;
      return status >= 500 || status === 408 || status === 429;
    }

    // Axios timeout errors
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      return true;
    }

    return false;
  }

  /**
   * Create a standardized network error
   */
  static createNetworkError(originalError: any, attempt: number, maxAttempts: number): NetworkError {
    const error = new Error(originalError.message || 'Network operation failed') as NetworkError;
    
    error.name = 'NetworkError';
    error.isNetworkError = true;
    error.isRetryable = NetworkUtils.isRetryableError(originalError);
    error.attempt = attempt;
    error.maxAttempts = maxAttempts;
    error.code = originalError.code;
    error.status = originalError.response?.status;
    error.stack = originalError.stack;

    return error;
  }

  /**
   * Delay execution for specified milliseconds
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if a host is reachable
   */
  static async isHostReachable(host: string, port: number, timeout: number = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();

      const onError = () => {
        socket.destroy();
        resolve(false);
      };

      socket.setTimeout(timeout);
      socket.once('error', onError);
      socket.once('timeout', onError);

      socket.connect(port, host, () => {
        socket.end();
        resolve(true);
      });
    });
  }

  /**
   * Validate IP address format
   */
  static isValidIPAddress(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * Validate port number
   */
  static isValidPort(port: number): boolean {
    return Number.isInteger(port) && port >= 1 && port <= 65535;
  }

  /**
   * Parse connection string (host:port)
   */
  static parseConnectionString(connectionString: string): { host: string; port: number } | null {
    const match = connectionString.match(/^(.+):(\d+)$/);
    if (!match) return null;

    const host = match[1];
    const port = parseInt(match[2], 10);

    if (!NetworkUtils.isValidPort(port)) return null;

    return { host, port };
  }

  /**
   * Get network error message for user display
   */
  static getErrorMessage(error: any): string {
    if (error.code === 'ECONNREFUSED') {
      return 'Connection refused. Please check if the MikroTik router is running and accessible.';
    }
    
    if (error.code === 'ENOTFOUND') {
      return 'Host not found. Please check the router IP address.';
    }
    
    if (error.code === 'ETIMEDOUT') {
      return 'Connection timeout. Please check network connectivity and router settings.';
    }
    
    if (error.code === 'ECONNRESET') {
      return 'Connection was reset by the router. Please try again.';
    }
    
    if (error.code === 'EHOSTUNREACH') {
      return 'Host unreachable. Please check network connectivity.';
    }

    if (error.response?.status === 401) {
      return 'Authentication failed. Please check username and password.';
    }

    if (error.response?.status === 403) {
      return 'Access denied. Please check user permissions on the router.';
    }

    if (error.response?.status === 404) {
      return 'API endpoint not found. Please check router configuration.';
    }

    if (error.response?.status >= 500) {
      return 'Router server error. Please try again later.';
    }

    return error.message || 'Network operation failed';
  }

  /**
   * Create a circuit breaker for network operations
   */
  static createCircuitBreaker(
    failureThreshold: number = 5,
    resetTimeout: number = 60000
  ) {
    let failures = 0;
    let lastFailureTime = 0;
    let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

    return {
      async execute<T>(operation: () => Promise<T>): Promise<T> {
        const now = Date.now();

        // Check if we should reset from OPEN to HALF_OPEN
        if (state === 'OPEN' && now - lastFailureTime >= resetTimeout) {
          state = 'HALF_OPEN';
          failures = 0;
        }

        // Reject immediately if circuit is open
        if (state === 'OPEN') {
          throw new Error('Circuit breaker is OPEN. Service temporarily unavailable.');
        }

        try {
          const result = await operation();
          
          // Success - reset circuit breaker
          if (state === 'HALF_OPEN') {
            state = 'CLOSED';
          }
          failures = 0;
          
          return result;
        } catch (error) {
          failures++;
          lastFailureTime = now;

          // Open circuit if failure threshold reached
          if (failures >= failureThreshold) {
            state = 'OPEN';
            console.warn(`Circuit breaker opened after ${failures} failures`);
          }

          throw error;
        }
      },

      getState() {
        return { state, failures, lastFailureTime };
      },

      reset() {
        state = 'CLOSED';
        failures = 0;
        lastFailureTime = 0;
      }
    };
  }
}

export default NetworkUtils;