import { apiClient } from './apiClient';
import { User } from '../contexts/AuthContext';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  };
  message: string;
}

export interface TokenRefreshResponse {
  success: boolean;
  data: {
    tokens: {
      accessToken: string;
      refreshToken?: string;
      expiresIn: number;
    };
  };
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

class AuthService {
  async login(username: string, password: string): Promise<{
    user: User;
    token: string;
    refreshToken?: string;
  }> {
    const response = await apiClient.post<LoginResponse>('/auth/login', {
      username,
      password,
    });
    
    return {
      user: response.data.data.user,
      token: response.data.data.tokens.accessToken,
      refreshToken: response.data.data.tokens.refreshToken,
    };
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Ignore logout errors - token will be removed locally
      console.warn('Logout request failed:', error);
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<{ success: boolean; data: { user: User } }>('/auth/me');
    return response.data.data.user;
  }

  async refreshToken(): Promise<{ token: string; refreshToken?: string }> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<TokenRefreshResponse>('/auth/refresh', {
      refreshToken,
    });
    
    return {
      token: response.data.data.tokens.accessToken,
      refreshToken: response.data.data.tokens.refreshToken,
    };
  }

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await apiClient.post('/auth/change-password', data);
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await apiClient.put<{ success: boolean; data: { user: User } }>('/auth/profile', data);
    return response.data.data.user;
  }

  async requestPasswordReset(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/reset-password', {
      token,
      password: newPassword,
    });
  }

  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  getTokenExpirationTime(token: string): Date | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return new Date(payload.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  getTokenTimeRemaining(token: string): number {
    try {
      const expirationTime = this.getTokenExpirationTime(token);
      if (!expirationTime) return 0;
      
      return Math.max(0, expirationTime.getTime() - Date.now());
    } catch (error) {
      return 0;
    }
  }
}

export const authService = new AuthService();