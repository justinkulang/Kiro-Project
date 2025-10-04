import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import App from '../../../App';

// Mock the auth service
const mockAuthService = {
  login: jest.fn(),
  logout: jest.fn(),
  getCurrentUser: jest.fn(),
  refreshToken: jest.fn(),
  isTokenExpired: jest.fn(),
  getTokenExpirationTime: jest.fn(),
};

jest.mock('../../../services/authService', () => ({
  authService: mockAuthService,
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('redirects unauthenticated users to login page', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument();
      expect(screen.getByText('MikroTik Hotspot')).toBeInTheDocument();
    });
  });

  it('allows authenticated users to access dashboard', async () => {
    // Mock authenticated state
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'token') return 'valid-token';
      return null;
    });

    mockAuthService.isTokenExpired.mockReturnValue(false);
    mockAuthService.getCurrentUser.mockResolvedValue({
      id: 1,
      username: 'testuser',
      role: 'admin',
      isActive: true,
      createdAt: '2023-01-01',
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Welcome, testuser')).toBeInTheDocument();
    });
  });

  it('handles complete login flow', async () => {
    const user = userEvent.setup();
    
    render(<App />);

    // Should show login page
    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    // Fill in login form
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');

    // Mock successful login
    mockAuthService.login.mockResolvedValue({
      user: {
        id: 1,
        username: 'testuser',
        role: 'admin',
        isActive: true,
        createdAt: '2023-01-01',
      },
      token: 'new-token',
      refreshToken: 'refresh-token',
    });

    await user.click(submitButton);

    // Should redirect to dashboard
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Welcome, testuser')).toBeInTheDocument();
    });

    // Verify token was stored
    expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'new-token');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token');
  });

  it('handles login failure', async () => {
    const user = userEvent.setup();
    
    render(<App />);

    // Fill in login form with invalid credentials
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'wrongpassword');

    // Mock failed login
    mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

    await user.click(submitButton);

    // Should stay on login page and show error
    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument();
      // Error notification should appear
    });
  });

  it('handles logout flow', async () => {
    const user = userEvent.setup();
    
    // Start with authenticated state
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'token') return 'valid-token';
      return null;
    });

    mockAuthService.isTokenExpired.mockReturnValue(false);
    mockAuthService.getCurrentUser.mockResolvedValue({
      id: 1,
      username: 'testuser',
      role: 'admin',
      isActive: true,
      createdAt: '2023-01-01',
    });

    render(<App />);

    // Should show dashboard
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Click logout button
    const logoutButton = screen.getByTitle('Logout');
    await user.click(logoutButton);

    // Should redirect to login page
    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    // Verify tokens were removed
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
  });

  it('handles token refresh', async () => {
    // Mock expired token
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'token') return 'expired-token';
      if (key === 'refreshToken') return 'valid-refresh-token';
      return null;
    });

    mockAuthService.isTokenExpired.mockReturnValue(true);
    mockAuthService.refreshToken.mockResolvedValue({
      token: 'new-token',
      refreshToken: 'new-refresh-token',
    });
    mockAuthService.getCurrentUser.mockResolvedValue({
      id: 1,
      username: 'testuser',
      role: 'admin',
      isActive: true,
      createdAt: '2023-01-01',
    });

    render(<App />);

    // Should refresh token and show dashboard
    await waitFor(() => {
      expect(mockAuthService.refreshToken).toHaveBeenCalled();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('handles token refresh failure', async () => {
    // Mock expired token with invalid refresh token
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'token') return 'expired-token';
      if (key === 'refreshToken') return 'invalid-refresh-token';
      return null;
    });

    mockAuthService.isTokenExpired.mockReturnValue(true);
    mockAuthService.refreshToken.mockRejectedValue(new Error('Invalid refresh token'));

    render(<App />);

    // Should redirect to login page
    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    // Verify tokens were removed
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
  });

  it('shows role-based content correctly', async () => {
    // Mock super admin user
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'token') return 'valid-token';
      return null;
    });

    mockAuthService.isTokenExpired.mockReturnValue(false);
    mockAuthService.getCurrentUser.mockResolvedValue({
      id: 1,
      username: 'superadmin',
      role: 'super_admin',
      isActive: true,
      createdAt: '2023-01-01',
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Super Admin Only Section')).toBeInTheDocument();
    });
  });

  it('hides role-restricted content for regular admin', async () => {
    // Mock regular admin user
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'token') return 'valid-token';
      return null;
    });

    mockAuthService.isTokenExpired.mockReturnValue(false);
    mockAuthService.getCurrentUser.mockResolvedValue({
      id: 1,
      username: 'admin',
      role: 'admin',
      isActive: true,
      createdAt: '2023-01-01',
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('Super Admin Only Section')).not.toBeInTheDocument();
    });
  });
});