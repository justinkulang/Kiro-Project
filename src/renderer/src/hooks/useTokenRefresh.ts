import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';

const TOKEN_REFRESH_INTERVAL = 14 * 60 * 1000; // 14 minutes (1 minute before expiry)
const TOKEN_REFRESH_RETRY_INTERVAL = 30 * 1000; // 30 seconds

export function useTokenRefresh() {
  const { isAuthenticated, logout, updateUser, token } = useAuth();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const refreshToken = useCallback(async () => {
    try {
      if (!token) {
        return;
      }

      // Check if token is close to expiry
      if (authService.isTokenExpired(token)) {
        console.log('Token expired, logging out');
        logout();
        return;
      }

      // Get token expiration time
      const expirationTime = authService.getTokenExpirationTime(token);
      if (!expirationTime) {
        return;
      }

      // Check if token expires within the next 2 minutes
      const timeUntilExpiry = expirationTime.getTime() - Date.now();
      const shouldRefresh = timeUntilExpiry <= 2 * 60 * 1000; // 2 minutes

      if (shouldRefresh) {
        console.log('Refreshing token...');
        const refreshTokenValue = localStorage.getItem('refreshToken');
        
        if (!refreshTokenValue) {
          console.log('No refresh token available, logging out');
          logout();
          return;
        }

        const response = await authService.refreshToken();
        localStorage.setItem('token', response.token);
        if (response.refreshToken) {
          localStorage.setItem('refreshToken', response.refreshToken);
        }
        
        // Update user data if available
        try {
          const userData = await authService.getCurrentUser();
          updateUser(userData);
        } catch (error) {
          console.warn('Failed to update user data after token refresh:', error);
        }

        console.log('Token refreshed successfully');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      
      // Retry once after a short delay
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      retryTimeoutRef.current = setTimeout(async () => {
        try {
          const refreshTokenValue = localStorage.getItem('refreshToken');
          if (refreshTokenValue) {
            const response = await authService.refreshToken();
            localStorage.setItem('token', response.token);
            if (response.refreshToken) {
              localStorage.setItem('refreshToken', response.refreshToken);
            }
            console.log('Token refresh retry successful');
          } else {
            throw new Error('No refresh token available');
          }
        } catch (retryError) {
          console.error('Token refresh retry failed:', retryError);
          logout();
        }
      }, TOKEN_REFRESH_RETRY_INTERVAL);
    }
  }, [logout, updateUser, token]);

  const startTokenRefresh = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    refreshIntervalRef.current = setInterval(refreshToken, TOKEN_REFRESH_INTERVAL);
    
    // Also check immediately
    refreshToken();
  }, [refreshToken]);

  const stopTokenRefresh = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      startTokenRefresh();
    } else {
      stopTokenRefresh();
    }

    return () => {
      stopTokenRefresh();
    };
  }, [isAuthenticated, startTokenRefresh, stopTokenRefresh]);

  // Handle page visibility change to refresh token when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        refreshToken();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, refreshToken]);

  return {
    refreshToken,
    startTokenRefresh,
    stopTokenRefresh,
  };
}