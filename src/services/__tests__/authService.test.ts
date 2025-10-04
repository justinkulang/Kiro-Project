import AuthService from '../authService';
import PasswordUtils from '../../utils/passwordUtils';
import { getAdminUserRepository } from '../../models';
import { AdminUserRepository } from '../../models/repositories/adminUserRepository';

// Mock the models module
jest.mock('../../models', () => ({
  getAdminUserRepository: jest.fn()
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockAdminRepo: jest.Mocked<AdminUserRepository>;

  beforeEach(() => {
    authService = new AuthService();
    mockAdminRepo = {
      findByUsername: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      findByEmail: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn()
    } as any;
    
    (getAdminUserRepository as jest.Mock).mockReturnValue(mockAdminRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Password Hashing', () => {
    test('should hash password correctly', async () => {
      const password = 'testPassword123!';
      const hash = await authService.hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
    });

    test('should verify password correctly', async () => {
      const password = 'testPassword123!';
      const hash = await authService.hashPassword(password);
      
      const isValid = await authService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
      
      const isInvalid = await authService.verifyPassword('wrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Token Generation and Validation', () => {
    const mockPayload = {
      userId: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'admin' as const
    };

    test('should generate valid tokens', () => {
      const tokens = authService.generateTokens(mockPayload);
      
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBe(15 * 60); // 15 minutes
    });

    test('should verify access token correctly', () => {
      const tokens = authService.generateTokens(mockPayload);
      const decoded = authService.verifyAccessToken(tokens.accessToken);
      
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.username).toBe(mockPayload.username);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
    });

    test('should verify refresh token correctly', () => {
      const tokens = authService.generateTokens(mockPayload);
      const decoded = authService.verifyRefreshToken(tokens.refreshToken);
      
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.tokenType).toBe('refresh');
    });

    test('should reject invalid access token', () => {
      expect(() => {
        authService.verifyAccessToken('invalid.token.here');
      }).toThrow('Invalid access token');
    });

    test('should reject invalid refresh token', () => {
      expect(() => {
        authService.verifyRefreshToken('invalid.token.here');
      }).toThrow('Invalid refresh token');
    });
  });

  describe('User Authentication', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      password_hash: '$2b$12$hashedpassword',
      role: 'admin' as const,
      is_active: true,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    };

    test('should login successfully with valid credentials', async () => {
      mockAdminRepo.findByUsername.mockResolvedValue(mockUser);
      mockAdminRepo.update.mockResolvedValue(mockUser);
      
      // Mock password verification
      jest.spyOn(authService, 'verifyPassword').mockResolvedValue(true);
      
      const result = await authService.login({
        username: 'testuser',
        password: 'correctPassword'
      });
      
      expect(result.user.username).toBe(mockUser.username);
      expect(result.user.email).toBe(mockUser.email);
      expect(result.user).not.toHaveProperty('password_hash');
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      
      expect(mockAdminRepo.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ last_login: expect.any(String) })
      );
    });

    test('should fail login with invalid username', async () => {
      mockAdminRepo.findByUsername.mockResolvedValue(null);
      
      await expect(authService.login({
        username: 'nonexistent',
        password: 'password'
      })).rejects.toThrow('Invalid credentials');
    });

    test('should fail login with inactive user', async () => {
      const inactiveUser = { ...mockUser, is_active: false };
      mockAdminRepo.findByUsername.mockResolvedValue(inactiveUser);
      
      await expect(authService.login({
        username: 'testuser',
        password: 'password'
      })).rejects.toThrow('Account is disabled');
    });

    test('should fail login with invalid password', async () => {
      mockAdminRepo.findByUsername.mockResolvedValue(mockUser);
      jest.spyOn(authService, 'verifyPassword').mockResolvedValue(false);
      
      await expect(authService.login({
        username: 'testuser',
        password: 'wrongPassword'
      })).rejects.toThrow('Invalid credentials');
    });
  });

  describe('Token Refresh', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'admin' as const,
      is_active: true
    };

    test('should refresh token successfully', async () => {
      const tokens = authService.generateTokens(mockUser);
      mockAdminRepo.findById.mockResolvedValue(mockUser as any);
      
      const newTokens = await authService.refreshAccessToken(tokens.refreshToken);
      
      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();
      expect(newTokens.accessToken).not.toBe(tokens.accessToken);
    });

    test('should fail refresh with invalid token', async () => {
      await expect(authService.refreshAccessToken('invalid.token'))
        .rejects.toThrow('Invalid refresh token');
    });

    test('should fail refresh for inactive user', async () => {
      const tokens = authService.generateTokens(mockUser);
      mockAdminRepo.findById.mockResolvedValue({ ...mockUser, is_active: false } as any);
      
      await expect(authService.refreshAccessToken(tokens.refreshToken))
        .rejects.toThrow('User not found or inactive');
    });
  });

  describe('Permission System', () => {
    test('should validate role hierarchy correctly', () => {
      expect(authService.hasPermission('super_admin', 'admin')).toBe(true);
      expect(authService.hasPermission('super_admin', 'super_admin')).toBe(true);
      expect(authService.hasPermission('admin', 'admin')).toBe(true);
      expect(authService.hasPermission('admin', 'super_admin')).toBe(false);
    });

    test('should validate action permissions correctly', () => {
      // Super admin can do everything
      expect(authService.canPerformAction('super_admin', 'create_user')).toBe(true);
      expect(authService.canPerformAction('super_admin', 'update_admin', 2, 1)).toBe(true);
      
      // Admin can manage hotspot users
      expect(authService.canPerformAction('admin', 'create_user')).toBe(true);
      expect(authService.canPerformAction('admin', 'create_voucher')).toBe(true);
      expect(authService.canPerformAction('admin', 'view_reports')).toBe(true);
      
      // Admin can only update their own profile
      expect(authService.canPerformAction('admin', 'update_admin', 1, 1)).toBe(true);
      expect(authService.canPerformAction('admin', 'update_admin', 2, 1)).toBe(false);
      
      // Admin cannot manage other admins
      expect(authService.canPerformAction('admin', 'create_admin')).toBe(false);
    });
  });
});

describe('PasswordUtils', () => {
  describe('Password Generation', () => {
    test('should generate random password with correct length', () => {
      const password = PasswordUtils.generateRandomPassword(12);
      expect(password).toHaveLength(12);
    });

    test('should generate password with required character types', () => {
      const password = PasswordUtils.generateRandomPassword(12);
      
      expect(/[a-z]/.test(password)).toBe(true); // lowercase
      expect(/[A-Z]/.test(password)).toBe(true); // uppercase
      expect(/[0-9]/.test(password)).toBe(true); // numbers
      expect(/[!@#$%^&*]/.test(password)).toBe(true); // symbols
    });

    test('should generate different passwords each time', () => {
      const password1 = PasswordUtils.generateRandomPassword(12);
      const password2 = PasswordUtils.generateRandomPassword(12);
      expect(password1).not.toBe(password2);
    });
  });

  describe('Password Strength Checking', () => {
    test('should identify strong password', () => {
      const result = PasswordUtils.checkPasswordStrength('StrongP@ssw0rd123');
      expect(result.isStrong).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(4);
    });

    test('should identify weak password', () => {
      const result = PasswordUtils.checkPasswordStrength('weak');
      expect(result.isStrong).toBe(false);
      expect(result.score).toBeLessThan(4);
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    test('should detect common patterns', () => {
      const result = PasswordUtils.checkPasswordStrength('password123');
      expect(result.isStrong).toBe(false);
      expect(result.feedback.some(f => f.includes('common patterns'))).toBe(true);
    });

    test('should require minimum length', () => {
      const result = PasswordUtils.checkPasswordStrength('Sh0rt!');
      expect(result.feedback.some(f => f.includes('8 characters'))).toBe(true);
    });
  });

  describe('Password Validation', () => {
    test('should meet minimum requirements', () => {
      expect(PasswordUtils.meetsMinimumRequirements('GoodP@ss1')).toBe(true);
      expect(PasswordUtils.meetsMinimumRequirements('weak')).toBe(false);
    });

    test('should sanitize password for logging', () => {
      const password = 'secretPassword123';
      const sanitized = PasswordUtils.sanitizeForLogging(password);
      expect(sanitized).toBe('*'.repeat(password.length));
      expect(sanitized).not.toContain('secret');
    });
  });
});