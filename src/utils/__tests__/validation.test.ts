import {
  Validator,
  ValidationSchema,
  commonSchemas,
  validateBody,
  validateQuery,
  validateParams
} from '../validation';
import { ValidationError } from '../../middleware/errorHandler';

describe('Validator', () => {
  describe('validate', () => {
    it('should pass validation with valid data', () => {
      const schema: ValidationSchema = {
        name: { required: true, type: 'string', minLength: 2 },
        age: { required: true, type: 'number', min: 0 }
      };
      
      const data = { name: 'John', age: 25 };
      const result = Validator.validate(data, schema);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
      expect(result.sanitizedData).toEqual({ name: 'John', age: 25 });
    });

    it('should fail validation with missing required fields', () => {
      const schema: ValidationSchema = {
        name: { required: true, type: 'string' },
        email: { required: true, type: 'email' }
      };
      
      const data = { name: 'John' };
      const result = Validator.validate(data, schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toContain('email is required');
    });

    it('should validate string type', () => {
      const schema: ValidationSchema = {
        name: { type: 'string' }
      };
      
      const validResult = Validator.validate({ name: 'John' }, schema);
      expect(validResult.isValid).toBe(true);
      
      const invalidResult = Validator.validate({ name: 123 }, schema);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.name).toContain('name must be a string');
    });

    it('should validate number type', () => {
      const schema: ValidationSchema = {
        age: { type: 'number' }
      };
      
      const validResult = Validator.validate({ age: 25 }, schema);
      expect(validResult.isValid).toBe(true);
      
      const invalidResult = Validator.validate({ age: 'twenty-five' }, schema);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.age).toContain('age must be a valid number');
    });

    it('should validate boolean type', () => {
      const schema: ValidationSchema = {
        active: { type: 'boolean' }
      };
      
      const validResult = Validator.validate({ active: true }, schema);
      expect(validResult.isValid).toBe(true);
      
      const invalidResult = Validator.validate({ active: 'yes' }, schema);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.active).toContain('active must be a boolean');
    });

    it('should validate email type', () => {
      const schema: ValidationSchema = {
        email: { type: 'email' }
      };
      
      const validResult = Validator.validate({ email: 'test@example.com' }, schema);
      expect(validResult.isValid).toBe(true);
      
      const invalidResult = Validator.validate({ email: 'invalid-email' }, schema);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.email).toContain('email must be a valid email address');
    });

    it('should validate URL type', () => {
      const schema: ValidationSchema = {
        website: { type: 'url' }
      };
      
      const validResult = Validator.validate({ website: 'https://example.com' }, schema);
      expect(validResult.isValid).toBe(true);
      
      const invalidResult = Validator.validate({ website: 'not-a-url' }, schema);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.website).toContain('website must be a valid URL');
    });

    it('should validate date type', () => {
      const schema: ValidationSchema = {
        birthDate: { type: 'date' }
      };
      
      const validResult1 = Validator.validate({ birthDate: new Date() }, schema);
      expect(validResult1.isValid).toBe(true);
      
      const validResult2 = Validator.validate({ birthDate: '2023-01-01' }, schema);
      expect(validResult2.isValid).toBe(true);
      
      const invalidResult = Validator.validate({ birthDate: 'invalid-date' }, schema);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.birthDate).toContain('birthDate must be a valid date');
    });

    it('should validate array type', () => {
      const schema: ValidationSchema = {
        tags: { type: 'array' }
      };
      
      const validResult = Validator.validate({ tags: ['tag1', 'tag2'] }, schema);
      expect(validResult.isValid).toBe(true);
      
      const invalidResult = Validator.validate({ tags: 'not-an-array' }, schema);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.tags).toContain('tags must be an array');
    });

    it('should validate object type', () => {
      const schema: ValidationSchema = {
        metadata: { type: 'object' }
      };
      
      const validResult = Validator.validate({ metadata: { key: 'value' } }, schema);
      expect(validResult.isValid).toBe(true);
      
      const invalidResult1 = Validator.validate({ metadata: 'not-an-object' }, schema);
      expect(invalidResult1.isValid).toBe(false);
      
      const invalidResult2 = Validator.validate({ metadata: ['array'] }, schema);
      expect(invalidResult2.isValid).toBe(false);
      
      const invalidResult3 = Validator.validate({ metadata: null }, schema);
      expect(invalidResult3.isValid).toBe(false);
    });

    it('should validate string length constraints', () => {
      const schema: ValidationSchema = {
        name: { type: 'string', minLength: 2, maxLength: 10 }
      };
      
      const validResult = Validator.validate({ name: 'John' }, schema);
      expect(validResult.isValid).toBe(true);
      
      const tooShortResult = Validator.validate({ name: 'J' }, schema);
      expect(tooShortResult.isValid).toBe(false);
      expect(tooShortResult.errors.name).toContain('name must be at least 2 characters');
      
      const tooLongResult = Validator.validate({ name: 'VeryLongName' }, schema);
      expect(tooLongResult.isValid).toBe(false);
      expect(tooLongResult.errors.name).toContain('name must not exceed 10 characters');
    });

    it('should validate number range constraints', () => {
      const schema: ValidationSchema = {
        age: { type: 'number', min: 0, max: 120 }
      };
      
      const validResult = Validator.validate({ age: 25 }, schema);
      expect(validResult.isValid).toBe(true);
      
      const tooSmallResult = Validator.validate({ age: -1 }, schema);
      expect(tooSmallResult.isValid).toBe(false);
      expect(tooSmallResult.errors.age).toContain('age must be at least 0');
      
      const tooLargeResult = Validator.validate({ age: 150 }, schema);
      expect(tooLargeResult.isValid).toBe(false);
      expect(tooLargeResult.errors.age).toContain('age must not exceed 120');
    });

    it('should validate pattern constraints', () => {
      const schema: ValidationSchema = {
        username: { type: 'string', pattern: /^[a-zA-Z0-9_]+$/ }
      };
      
      const validResult = Validator.validate({ username: 'user_123' }, schema);
      expect(validResult.isValid).toBe(true);
      
      const invalidResult = Validator.validate({ username: 'user-123' }, schema);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.username).toContain('username format is invalid');
    });

    it('should validate enum constraints', () => {
      const schema: ValidationSchema = {
        role: { type: 'string', enum: ['admin', 'user', 'guest'] }
      };
      
      const validResult = Validator.validate({ role: 'admin' }, schema);
      expect(validResult.isValid).toBe(true);
      
      const invalidResult = Validator.validate({ role: 'superuser' }, schema);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.role).toContain('role must be one of: admin, user, guest');
    });

    it('should validate custom constraints', () => {
      const schema: ValidationSchema = {
        password: {
          type: 'string',
          custom: (value: string) => {
            if (value.length < 8) return 'Password must be at least 8 characters';
            if (!/[A-Z]/.test(value)) return 'Password must contain uppercase letter';
            return true;
          }
        }
      };
      
      const validResult = Validator.validate({ password: 'StrongPass123' }, schema);
      expect(validResult.isValid).toBe(true);
      
      const invalidResult1 = Validator.validate({ password: 'weak' }, schema);
      expect(invalidResult1.isValid).toBe(false);
      expect(invalidResult1.errors.password).toContain('Password must be at least 8 characters');
      
      const invalidResult2 = Validator.validate({ password: 'nouppercase123' }, schema);
      expect(invalidResult2.isValid).toBe(false);
      expect(invalidResult2.errors.password).toContain('Password must contain uppercase letter');
    });

    it('should sanitize string values', () => {
      const schema: ValidationSchema = {
        name: { type: 'string' }
      };
      
      const result = Validator.validate({ name: '  John  ' }, schema);
      expect(result.sanitizedData.name).toBe('John');
    });

    it('should convert string numbers to numbers', () => {
      const schema: ValidationSchema = {
        age: { type: 'number' }
      };
      
      const result = Validator.validate({ age: '25' }, schema);
      expect(result.sanitizedData.age).toBe(25);
    });

    it('should skip validation for optional fields when not provided', () => {
      const schema: ValidationSchema = {
        name: { required: true, type: 'string' },
        email: { type: 'email' } // optional
      };
      
      const result = Validator.validate({ name: 'John' }, schema);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData).toEqual({ name: 'John' });
    });
  });
});

describe('Common Schemas', () => {
  describe('createUser schema', () => {
    it('should validate valid user creation data', () => {
      const data = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        fullName: 'Test User',
        phone: '+1234567890',
        billingPlanId: 1,
        isActive: true
      };
      
      const result = Validator.validate(data, commonSchemas.createUser);
      expect(result.isValid).toBe(true);
    });

    it('should require username and password', () => {
      const data = {
        email: 'test@example.com'
      };
      
      const result = Validator.validate(data, commonSchemas.createUser);
      expect(result.isValid).toBe(false);
      expect(result.errors.username).toBeDefined();
      expect(result.errors.password).toBeDefined();
    });

    it('should validate username pattern', () => {
      const data = {
        username: 'test-user', // invalid character
        password: 'password123',
        billingPlanId: 1
      };
      
      const result = Validator.validate(data, commonSchemas.createUser);
      expect(result.isValid).toBe(false);
      expect(result.errors.username).toContain('username format is invalid');
    });
  });

  describe('login schema', () => {
    it('should validate valid login data', () => {
      const data = {
        username: 'testuser',
        password: 'password123'
      };
      
      const result = Validator.validate(data, commonSchemas.login);
      expect(result.isValid).toBe(true);
    });

    it('should require both username and password', () => {
      const data = {
        username: 'testuser'
      };
      
      const result = Validator.validate(data, commonSchemas.login);
      expect(result.isValid).toBe(false);
      expect(result.errors.password).toBeDefined();
    });
  });

  describe('systemConfig schema', () => {
    it('should validate MikroTik host IP address', () => {
      const data = {
        mikrotik_host: '192.168.1.1'
      };
      
      const result = Validator.validate(data, commonSchemas.systemConfig);
      expect(result.isValid).toBe(true);
    });

    it('should validate MikroTik host hostname', () => {
      const data = {
        mikrotik_host: 'mikrotik.local'
      };
      
      const result = Validator.validate(data, commonSchemas.systemConfig);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid MikroTik host', () => {
      const data = {
        mikrotik_host: 'invalid..host'
      };
      
      const result = Validator.validate(data, commonSchemas.systemConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.mikrotik_host).toContain('Must be a valid IP address or hostname');
    });

    it('should validate MikroTik port', () => {
      const data = {
        mikrotik_port: '8728'
      };
      
      const result = Validator.validate(data, commonSchemas.systemConfig);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid MikroTik port', () => {
      const data = {
        mikrotik_port: '99999'
      };
      
      const result = Validator.validate(data, commonSchemas.systemConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.mikrotik_port).toContain('Must be a valid port number (1-65535)');
    });
  });
});

describe('Validation Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {}
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  describe('validateBody', () => {
    it('should pass validation and sanitize data', () => {
      const schema: ValidationSchema = {
        name: { required: true, type: 'string' }
      };
      
      mockReq.body = { name: '  John  ' };
      
      const middleware = validateBody(schema);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body.name).toBe('John');
    });

    it('should throw ValidationError on invalid data', () => {
      const schema: ValidationSchema = {
        name: { required: true, type: 'string' }
      };
      
      mockReq.body = {};
      
      const middleware = validateBody(schema);
      
      expect(() => middleware(mockReq, mockRes, mockNext)).toThrow(ValidationError);
    });
  });

  describe('validateQuery', () => {
    it('should validate query parameters', () => {
      const schema: ValidationSchema = {
        page: { type: 'number', min: 1 }
      };
      
      mockReq.query = { page: '1' };
      
      const middleware = validateQuery(schema);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.query.page).toBe(1);
    });
  });

  describe('validateParams', () => {
    it('should validate route parameters', () => {
      const schema: ValidationSchema = {
        id: { required: true, type: 'number', min: 1 }
      };
      
      mockReq.params = { id: '123' };
      
      const middleware = validateParams(schema);
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.params.id).toBe(123);
    });
  });
});