import bcrypt from 'bcryptjs';

export interface PasswordStrengthResult {
  isStrong: boolean;
  score: number; // 0-5
  feedback: string[];
}

export class PasswordUtils {
  private static readonly SALT_ROUNDS = 12;
  private static readonly MIN_LENGTH = 8;

  /**
   * Hash a password with bcrypt
   */
  static async hash(password: string): Promise<string> {
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
  static async verify(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  /**
   * Generate a random password
   */
  static generateRandomPassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one character from each category
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Check password strength
   */
  static checkPasswordStrength(password: string): PasswordStrengthResult {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length < this.MIN_LENGTH) {
      feedback.push(`Password must be at least ${this.MIN_LENGTH} characters long`);
    } else {
      score += 1;
      if (password.length >= 12) score += 1;
    }

    // Character variety checks
    if (!/[a-z]/.test(password)) {
      feedback.push('Password should contain lowercase letters');
    } else {
      score += 1;
    }

    if (!/[A-Z]/.test(password)) {
      feedback.push('Password should contain uppercase letters');
    } else {
      score += 1;
    }

    if (!/[0-9]/.test(password)) {
      feedback.push('Password should contain numbers');
    } else {
      score += 1;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      feedback.push('Password should contain special characters');
    } else {
      score += 1;
    }

    // Common patterns check
    const commonPatterns = [
      /123456/,
      /password/i,
      /admin/i,
      /qwerty/i,
      /(.)\1{2,}/, // Repeated characters
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        feedback.push('Password contains common patterns and may be easily guessed');
        score = Math.max(0, score - 1);
        break;
      }
    }

    const isStrong = score >= 4 && feedback.length === 0;

    if (isStrong && feedback.length === 0) {
      feedback.push('Password strength is good');
    }

    return {
      isStrong,
      score,
      feedback
    };
  }

  /**
   * Generate a secure temporary password for new users
   */
  static generateTemporaryPassword(): string {
    return this.generateRandomPassword(10);
  }

  /**
   * Check if password meets minimum requirements
   */
  static meetsMinimumRequirements(password: string): boolean {
    const result = this.checkPasswordStrength(password);
    return result.score >= 3; // At least 3 out of 6 criteria
  }

  /**
   * Sanitize password for logging (replace with asterisks)
   */
  static sanitizeForLogging(password: string): string {
    return '*'.repeat(password.length);
  }
}

export default PasswordUtils;