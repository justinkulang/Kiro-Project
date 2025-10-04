import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import LoginForm from '../LoginForm';
import { AuthProvider } from '../../../contexts/AuthContext';
import { NotificationProvider } from '../../../contexts/NotificationContext';

// Mock the auth service
jest.mock('../../../services/authService', () => ({
  authService: {
    login: jest.fn(),
    isTokenExpired: jest.fn(),
    getTokenExpirationTime: jest.fn(),
  },
}));

const theme = createTheme();

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      <NotificationProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  </BrowserRouter>
);

describe('LoginForm', () => {
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders login form correctly', () => {
    render(
      <TestWrapper>
        <LoginForm onSuccess={mockOnSuccess} onError={mockOnError} />
      </TestWrapper>
    );

    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <LoginForm onSuccess={mockOnSuccess} onError={mockOnError} />
      </TestWrapper>
    );

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Username is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('validates username format', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <LoginForm onSuccess={mockOnSuccess} onError={mockOnError} />
      </TestWrapper>
    );

    const usernameInput = screen.getByLabelText(/username/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Test short username
    await user.type(usernameInput, 'ab');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Username must be at least 3 characters')).toBeInTheDocument();
    });

    // Test invalid characters
    await user.clear(usernameInput);
    await user.type(usernameInput, 'user@name');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Username can only contain letters, numbers, and underscores')).toBeInTheDocument();
    });
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <LoginForm onSuccess={mockOnSuccess} onError={mockOnError} />
      </TestWrapper>
    );

    const passwordInput = screen.getByLabelText(/password/i);
    const toggleButton = screen.getByLabelText(/toggle password visibility/i);

    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('handles remember me functionality', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <LoginForm onSuccess={mockOnSuccess} onError={mockOnError} />
      </TestWrapper>
    );

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const rememberMeCheckbox = screen.getByLabelText(/remember me/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.click(rememberMeCheckbox);

    // Mock successful login
    const { authService } = require('../../../services/authService');
    authService.login.mockResolvedValue({
      user: { id: 1, username: 'testuser', role: 'admin' },
      token: 'mock-token',
    });

    await user.click(submitButton);

    await waitFor(() => {
      expect(localStorage.getItem('rememberMe')).toBe('true');
      expect(localStorage.getItem('lastUsername')).toBe('testuser');
    });
  });

  it('loads remembered username on mount', () => {
    localStorage.setItem('rememberMe', 'true');
    localStorage.setItem('lastUsername', 'remembereduser');

    render(
      <TestWrapper>
        <LoginForm onSuccess={mockOnSuccess} onError={mockOnError} />
      </TestWrapper>
    );

    const usernameInput = screen.getByLabelText(/username/i);
    const rememberMeCheckbox = screen.getByLabelText(/remember me/i);

    expect(usernameInput).toHaveValue('remembereduser');
    expect(rememberMeCheckbox).toBeChecked();
  });

  it('clears field errors when user starts typing', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <LoginForm onSuccess={mockOnSuccess} onError={mockOnError} />
      </TestWrapper>
    );

    const usernameInput = screen.getByLabelText(/username/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Trigger validation error
    await user.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText('Username is required')).toBeInTheDocument();
    });

    // Start typing to clear error
    await user.type(usernameInput, 'test');
    await waitFor(() => {
      expect(screen.queryByText('Username is required')).not.toBeInTheDocument();
    });
  });

  it('handles successful login', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <LoginForm onSuccess={mockOnSuccess} onError={mockOnError} />
      </TestWrapper>
    );

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');

    // Mock successful login
    const { authService } = require('../../../services/authService');
    authService.login.mockResolvedValue({
      user: { id: 1, username: 'testuser', role: 'admin' },
      token: 'mock-token',
    });

    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('handles login failure', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <LoginForm onSuccess={mockOnSuccess} onError={mockOnError} />
      </TestWrapper>
    );

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'wrongpassword');

    // Mock failed login
    const { authService } = require('../../../services/authService');
    authService.login.mockRejectedValue(new Error('Invalid credentials'));

    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Invalid credentials');
    });
  });

  it('shows loading state during login', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <LoginForm onSuccess={mockOnSuccess} onError={mockOnError} />
      </TestWrapper>
    );

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');

    // Mock slow login
    const { authService } = require('../../../services/authService');
    authService.login.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    await user.click(submitButton);

    expect(screen.getByText('Signing In...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });
});