# Contributing to MikroTik Hotspot Platform

Thank you for your interest in contributing to MikroTik Hotspot Platform! This document provides guidelines and information for contributors.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Contributing Guidelines](#contributing-guidelines)
5. [Pull Request Process](#pull-request-process)
6. [Coding Standards](#coding-standards)
7. [Testing Requirements](#testing-requirements)
8. [Documentation](#documentation)
9. [Community](#community)

## Code of Conduct

This project adheres to a code of conduct that we expect all contributors to follow. Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

### Our Pledge

We are committed to making participation in this project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

## Getting Started

### Ways to Contribute

- **Bug Reports**: Help us identify and fix issues
- **Feature Requests**: Suggest new functionality
- **Code Contributions**: Implement features or fix bugs
- **Documentation**: Improve or translate documentation
- **Testing**: Help test new features and releases
- **Design**: Contribute UI/UX improvements

### Before You Start

1. **Check existing issues** to avoid duplicate work
2. **Read the documentation** to understand the project
3. **Set up the development environment**
4. **Join our community** for discussions and questions

## Development Setup

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- Git
- A MikroTik router for testing (optional but recommended)

### Setup Steps

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/mikrotik-hotspot-platform.git
   cd mikrotik-hotspot-platform
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/original-owner/mikrotik-hotspot-platform.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Start development servers**:
   ```bash
   npm run dev
   ```

6. **Verify setup** by running tests:
   ```bash
   npm run test
   ```

### Development Environment

The development environment includes:
- **API Server**: http://localhost:3001
- **React Frontend**: http://localhost:5173
- **Electron App**: Launches automatically
- **Hot Reload**: Enabled for all components

## Contributing Guidelines

### Issue Guidelines

#### Bug Reports

When reporting bugs, please include:

```markdown
**Bug Description**
A clear description of what the bug is.

**Steps to Reproduce**
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Environment**
- OS: [e.g. Windows 11, macOS 12.0, Ubuntu 20.04]
- Application Version: [e.g. 1.0.0]
- MikroTik RouterOS Version: [e.g. 7.1.5]

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Additional Context**
Add any other context about the problem here.
```

#### Feature Requests

When requesting features, please include:

```markdown
**Feature Description**
A clear description of what you want to happen.

**Problem Statement**
What problem does this feature solve?

**Proposed Solution**
Describe your proposed solution.

**Alternatives Considered**
Describe alternatives you've considered.

**Use Cases**
Describe specific use cases for this feature.

**Additional Context**
Add any other context or screenshots about the feature request.
```

### Code Contributions

#### Choosing What to Work On

1. **Good First Issues**: Look for issues labeled `good first issue`
2. **Help Wanted**: Issues labeled `help wanted` need contributors
3. **Bugs**: Issues labeled `bug` that need fixing
4. **Features**: Issues labeled `enhancement` for new features

#### Before Starting Work

1. **Comment on the issue** to let others know you're working on it
2. **Ask questions** if anything is unclear
3. **Discuss approach** for complex changes
4. **Get approval** for significant changes before starting

## Pull Request Process

### Creating a Pull Request

1. **Create a feature branch** from `develop`:
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following coding standards
3. **Add tests** for new functionality
4. **Update documentation** if needed
5. **Commit your changes** with clear messages:
   ```bash
   git add .
   git commit -m "feat: add user bulk import functionality"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create pull request** on GitHub

### Pull Request Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues
Fixes #(issue number)

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Checklist
- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

### Review Process

1. **Automated Checks**: CI/CD pipeline runs tests and checks
2. **Code Review**: Maintainers review code for quality and standards
3. **Feedback**: Address any feedback or requested changes
4. **Approval**: Once approved, maintainers will merge the PR

## Coding Standards

### TypeScript/JavaScript

- **Use TypeScript** for all new code
- **Follow ESLint rules** configured in the project
- **Use meaningful variable names**
- **Add JSDoc comments** for public APIs
- **Prefer functional programming** patterns where appropriate

#### Example:

```typescript
/**
 * Creates a new hotspot user with the specified configuration
 * @param userData - User data including username, password, and billing plan
 * @returns Promise resolving to the created user
 * @throws ValidationError if user data is invalid
 */
async createUser(userData: CreateUserRequest): Promise<UserWithBillingPlan> {
  // Validate input data
  const validation = await this.validateUserData(userData);
  if (!validation.isValid) {
    throw new ValidationError(`Validation failed: ${validation.errors.join(', ')}`);
  }

  // Implementation...
}
```

### React Components

- **Use functional components** with hooks
- **Follow Material-UI patterns**
- **Add proper TypeScript types**
- **Include data-testid attributes** for testing
- **Handle loading and error states**

#### Example:

```typescript
interface UserCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onUserCreated: (user: User) => void;
}

export const UserCreateDialog: React.FC<UserCreateDialogProps> = ({
  open,
  onClose,
  onUserCreated,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Component implementation...

  return (
    <Dialog open={open} onClose={onClose} data-testid="create-user-dialog">
      {/* Dialog content */}
    </Dialog>
  );
};
```

### CSS/Styling

- **Use Material-UI theme system**
- **Follow responsive design principles**
- **Use consistent spacing** (theme.spacing())
- **Maintain accessibility standards**

### Database/API

- **Use repository pattern** for data access
- **Add proper error handling**
- **Include input validation**
- **Follow RESTful API conventions**
- **Add comprehensive logging**

## Testing Requirements

### Test Coverage

All contributions must maintain or improve test coverage:
- **Minimum 80% coverage** for new code
- **Unit tests** for all business logic
- **Integration tests** for API endpoints
- **Component tests** for React components
- **E2E tests** for critical user flows

### Writing Tests

#### Unit Tests

```typescript
describe('UserManagementService', () => {
  describe('createUser', () => {
    it('should create user successfully with valid data', async () => {
      // Arrange
      const userData = createTestUser();
      mockUserRepo.create.mockResolvedValue(userData);

      // Act
      const result = await userService.createUser(userData);

      // Assert
      expect(result).toEqual(expect.objectContaining(userData));
      expect(mockUserRepo.create).toHaveBeenCalledWith(userData);
    });

    it('should throw ValidationError for invalid data', async () => {
      // Arrange
      const invalidData = { username: '' };

      // Act & Assert
      await expect(userService.createUser(invalidData))
        .rejects.toThrow(ValidationError);
    });
  });
});
```

#### Component Tests

```typescript
describe('UserCreateDialog', () => {
  it('should render form fields correctly', () => {
    render(<UserCreateDialog open={true} onClose={jest.fn()} onUserCreated={jest.fn()} />);

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });
});
```

### Running Tests

```bash
# Run all tests
npm run test:all

# Run specific test types
npm run test          # Unit tests
npm run test:e2e      # End-to-end tests
npm run test:coverage # Coverage report

# Run tests in watch mode
npm run test:watch
```

## Documentation

### Code Documentation

- **Add JSDoc comments** for all public APIs
- **Include usage examples** in complex functions
- **Document configuration options**
- **Explain business logic** in comments

### User Documentation

When adding features that affect users:
- **Update user manual** with new functionality
- **Add FAQ entries** for common questions
- **Include screenshots** for UI changes
- **Update API documentation** for backend changes

### README Updates

Update README.md when:
- Adding new dependencies
- Changing setup procedures
- Adding new scripts or commands
- Modifying system requirements

## Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and discussions
- **Discord**: Real-time chat and community support
- **Email**: Direct contact for sensitive issues

### Getting Help

If you need help:
1. **Check existing documentation**
2. **Search GitHub issues**
3. **Ask in GitHub Discussions**
4. **Join our Discord community**

### Mentorship

New contributors can request mentorship:
- **Comment on issues** asking for guidance
- **Join Discord** and ask in the #contributors channel
- **Attend community calls** (announced in Discord)

## Recognition

We recognize contributors in several ways:
- **Contributors list** in README
- **Release notes** mention significant contributions
- **Special badges** for regular contributors
- **Maintainer status** for long-term contributors

## License

By contributing to MikroTik Hotspot Platform, you agree that your contributions will be licensed under the MIT License.

## Questions?

If you have questions about contributing:
- **Open a GitHub Discussion**
- **Join our Discord community**
- **Email us** at contributors@mikrotik-hotspot-platform.com

Thank you for contributing to MikroTik Hotspot Platform! 🎉