import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AdminUser } from '../models/types';
import { getAdminUserRepository } from '../models';
import AdminLogService, { AdminAction } from './adminLogService';

export interface TokenPayload {
  userId: number;
  username: string;
  email: string;
  role: 'admin' | 'super_admin';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: Omit<AdminUser, 'password_hash'>;
  tokens: AuthTokens;
}

class AuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_REFRESH_SECRET: string;
  private readonly ACCESS_TOKEN_EXPIRY = '15m';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';
  private readonly SALT_ROUNDS = 12;
  private adminLogService: AdminLogService;

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production';
    this.adminLogService = new AdminLogService();
    
    if (process.env.NODE_ENV === 'production' && 
        (this.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production' ||
         this.JWT_REFRESH_SECRET === 'your-super-secret-refresh-key-change-in-production')) {
      console.warn('⚠️  WARNING: Using default JWT secrets in production! Please set JWT_SECRET and JWT_REFRESH_SECRET environment variables.');
    }
  }

  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.SALT_ROUNDS);
    } catch (error) {
      console.error('Error hashing password:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify a password against its hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  /**
   * Generate JWT access and refresh tokens
   */
  generateTokens(payload: TokenPayload): AuthTokens {
    try {
      const accessToken = jwt.sign(payload, this.JWT_SECRET, {
        expiresIn: this.ACCESS_TOKEN_EXPIRY,
        issuer: 'mikrotik-hotspot-platform',
        audience: 'mikrotik-hotspot-platform-users'
      });

      const refreshToken = jwt.sign(
        { userId: payload.userId, tokenType: 'refresh' },
        this.JWT_REFRESH_SECRET,
        {
          expiresIn: this.REFRESH_TOKEN_EXPIRY,
          issuer: 'mikrotik-hotspot-platform',
          audience: 'mikrotik-hotspot-platform-users'
        }
      );

      return {
        accessToken,
        refreshToken,
        expiresIn: 15 * 60 // 15 minutes in seconds
      };
    } catch (error) {
      console.error('Error generating tokens:', error);
      throw new Error('Failed to generate authentication tokens');
    }
  }

  /**
   * Verify and decode JWT access token
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        issuer: 'mikrotik-hotspot-platform',
        audience: 'mikrotik-hotspot-platform-users'
      }) as TokenPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      } else {
        console.error('Error verifying access token:', error);
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Verify and decode JWT refresh token
   */
  verifyRefreshToken(token: string): { userId: number; tokenType: string } {
    try {
      const decoded = jwt.verify(token, this.JWT_REFRESH_SECRET, {
        issuer: 'mikrotik-hotspot-platform',
        audience: 'mikrotik-hotspot-platform-users'
      }) as { userId: number; tokenType: string };

      if (decoded.tokenType !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      } else {
        console.error('Error verifying refresh token:', error);
        throw new Error('Refresh token verification failed');
      }
    }
  }

  /**
   * Authenticate user with username/password
   */
  async login(credentials: LoginCredentials, ipAddress?: string, userAgent?: string): Promise<LoginResponse> {
    try {
      const adminRepo = getAdminUserRepository();
      
      // Find user by username
      const user = await adminRepo.findByUsername(credentials.username);
      if (!user) {
        // Log failed login attempt
        await this.adminLogService.logLogin(
          0, // Unknown user ID
          credentials.username,
          false,
          ipAddress,
          userAgent,
          { reason: 'User not found', username: credentials.username },
          'Invalid credentials'
        );
        throw new Error('Invalid credentials');
      }

      // Check if user is active
      if (!user.is_active) {
        // Log failed login attempt for inactive user
        await this.adminLogService.logLogin(
          user.id!,
          user.username,
          false,
          ipAddress,
          userAgent,
          { reason: 'Account disabled', username: user.username },
          'Account is disabled'
        );
        throw new Error('Account is disabled');
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(credentials.password, user.password_hash!);
      if (!isPasswordValid) {
        // Log failed login attempt for wrong password
        await this.adminLogService.logLogin(
          user.id!,
          user.username,
          false,
          ipAddress,
          userAgent,
          { reason: 'Invalid password', username: user.username },
          'Invalid credentials'
        );
        throw new Error('Invalid credentials');
      }

      // Update last login
      await adminRepo.update(user.id!, { 
        last_login: new Date().toISOString() 
      });

      // Log successful login
      await this.adminLogService.logLogin(
        user.id!,
        user.username,
        true,
        ipAddress,
        userAgent,
        { 
          loginTime: new Date().toISOString(),
          role: user.role 
        }
      );

      // Generate tokens
      const tokenPayload: TokenPayload = {
        userId: user.id!,
        username: user.username,
        email: user.email,
        role: user.role
      };

      const tokens = this.generateTokens(tokenPayload);

      // Return user data without password hash
      const { password_hash, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        tokens
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logout user and log the action
   */
  async logout(userId: number, username: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      // Log logout action
      await this.adminLogService.logLogout(
        userId,
        username,
        ipAddress,
        userAgent
      );
    } catch (error) {
      console.error('Logout logging error:', error);
      // Don't throw error for logging failures during logout
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const decoded = this.verifyRefreshToken(refreshToken);
      
      // Get user data
      const adminRepo = getAdminUserRepository();
      const user = await adminRepo.findById(decoded.userId);
      
      if (!user || !user.is_active) {
        throw new Error('User not found or inactive');
      }

      // Generate new tokens
      const tokenPayload: TokenPayload = {
        userId: user.id!,
        username: user.username,
        email: user.email,
        role: user.role
      };

      return this.generateTokens(tokenPayload);
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Validate user permissions for specific actions
   */
  hasPermission(userRole: string, requiredRole: string): boolean {
    const roleHierarchy = {
      'super_admin': 2,
      'admin': 1
    };

    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

    return userLevel >= requiredLevel;
  }

  /**
   * Check if user can perform action on target
   */
  canPerformAction(userRole: string, action: string, targetUserId?: number, currentUserId?: number): boolean {
    // Super admin can do everything
    if (userRole === 'super_admin') {
      return true;
    }

    // Admin users have limited permissions
    if (userRole === 'admin') {
      // Admins can manage hotspot users and vouchers
      if (['create_user', 'update_user', 'delete_user', 'create_voucher', 'view_reports'].includes(action)) {
        return true;
      }

      // Admins can only modify their own profile
      if (action === 'update_admin' && targetUserId === currentUserId) {
        return true;
      }

      // Admins cannot manage other admin users or system settings
      return false;
    }

    return false;
  }
}

export default AuthService;