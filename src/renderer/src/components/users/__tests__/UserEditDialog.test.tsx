import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import UserEditDialog from '../UserEditDialog';
import { NotificationContext } from '../../../contexts/NotificationContext';
import { userService } from '../../../services/userService';

// Mock the userService
jest.mock('../../../services/userService', () => ({
  userService: {
    updateUser: jest.fn(),
  },
}));

const mockUserService = userService as jest.Mocked<typeof userService>;

const theme = createTheme();

const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  fullName: 'Test User',
  phone: '123-456-7890',
  address: '123 Test St',
  billingPlanId: 1,
  billingPlan: { id: 1, name: 'Basic Plan', price: 10 },
  isActive: true,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  expiresAt: '2024-01-01T00:00:00Z',
  dataUsed: 1024 * 1024 * 100, // 100MB
  timeUsed: 120, // 2 hours
  lastLogin: '2023-12-01T10:00:00Z',
};

const mockBillingPlans = [
  {
    id: 1,
    name: 'Basic Plan',
    description: 'Basic internet access',
    price: 10,
    timeLimit: 3600, // 1 hour
    dataLimit: 1024 * 1024 * 1024, // 1GB
    validityPeriod: 30,
  },
  {
    id: 2,
    name: 'Premium Plan',
    description: 'Premium internet access',
    price: 20,
    timeLimit: 7200, // 2 hours
    dataLimit: 2 * 1024 * 1024 * 1024, // 2GB
    validityPeriod: 30,
  },
];

const mockNotificationContext = {
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showInfo: jest.fn(),
  showWarning: jest.fn(),
};

const defaultProps = {
  open: true,
  user: mockUser,
  onClose: jest.fn(),
  onSuccess: jest.fn(),
  billingPlans: mockBillingPlans,
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      <NotificationContext.Provider value={mockNotificationContext}>
        {component}
      </NotificationContext.Provider>
    </ThemeProvider>
  );
};

describe('UserEditDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders edit user dialog with user data', () => {
    renderWithProviders(<UserEditDialog {...defaultProps} />);
    
    expect(screen.getByText('Edit User: testuser')).toBeInTheDocument();
    expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123-456-7890')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123 Test St')).toBeInTheDocument();
  });

  it('displays all form sections', () => {
    renderWithProviders(<UserEditDialog {...defaultProps} />);
    
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(screen.getByText('Contact Information')).toBeInTheDocument();
    expect(screen.getByText('Billing and Access')).toBeInTheDocument();
    expect(screen.getByText('User Statistics')).toBeInTheDocument();
  });

  it('shows user statistics', () => {
    renderWithProviders(<UserEditDialog {...defaultProps} />);
    
    expect(screen.getByText('Data Used')).toBeInTheDocument();
    expect(screen.getByText('100.00 MB')).toBeInTheDocument();
    expect(screen.getByText('Time Used')).toBeInTheDocument();
    expect(screen.getByText('2h 0m')).toBeInTheDocument();
    expect(screen.getByText('Last Login')).toBeInTheDocument();
    expect(screen.getByText('12/1/2023')).toBeInTheDocument();
  });

  it('shows change password toggle', () => {
    renderWithProviders(<UserEditDialog {...defaultProps} />);
    
    const changePasswordSwitch = screen.getByRole('checkbox', { name: 'Change Password' });
    expect(changePasswordSwitch).not.toBeChecked();
    
    // Password fields should not be visible initially
    expect(screen.queryByLabelText('New Password')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Confirm New Password')).not.toBeInTheDocument();
  });

  it('shows password fields when change password is enabled', () => {
    renderWithProviders(<UserEditDialog {...defaultProps} />);
    
    const changePasswordSwitch = screen.getByRole('checkbox', { name: 'Change Password' });
    fireEvent.click(changePasswordSwitch);
    
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
  });

  it('validates password when change password is enabled', async () => {
    renderWithProviders(<UserEditDialog {...defaultProps} />);
    
    // Enable password change
    const changePasswordSwitch = screen.getByRole('checkbox', { name: 'Change Password' });
    fireEvent.click(changePasswordSwitch);
    
    // Try to submit without password
    const submitButton = screen.getByText('Update User');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
    
    // Enter short password
    const passwordInput = screen.getByLabelText('New Password');
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });
    
    // Enter mismatched passwords
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    fireEvent.change(confirmPasswordInput, { target: { value: 'password456' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('pre-selects current billing plan', () => {
    renderWithProviders(<UserEditDialog {...defaultProps} />);
    
    const billingPlanSelect = screen.getByDisplayValue('Basic Plan - $10');
    expect(billingPlanSelect).toBeInTheDocument();
  });

  it('shows selected billing plan details', () => {
    renderWithProviders(<UserEditDialog {...defaultProps} />);
    
    expect(screen.getByText('Selected Plan Details:')).toBeInTheDocument();
    expect(screen.getByText('Basic Plan - $10')).toBeInTheDocument();
    expect(screen.getByText('Basic internet access')).toBeInTheDocument();
    expect(screen.getByText('Validity: 30 days')).toBeInTheDocument();
  });

  it('pre-fills expiration date', () => {
    renderWithProviders(<UserEditDialog {...defaultProps} />);
    
    const expiresAtInput = screen.getByDisplayValue('2024-01-01');
    expect(expiresAtInput).toBeInTheDocument();
  });

  it('shows active status correctly', () => {
    renderWithProviders(<UserEditDialog {...defaultProps} />);
    
    const activeSwitch = screen.getByRole('checkbox', { name: 'Active User' });
    expect(activeSwitch).toBeChecked();
  });

  it('submits form with updated data (without password)', async () => {
    const updatedUser = { ...mockUser, fullName: 'Updated User' };
    mockUserService.updateUser.mockResolvedValue(updatedUser);
    
    renderWithProviders(<UserEditDialog {...defaultProps} />);
    
    // Update full name
    const fullNameInput = screen.getByDisplayValue('Test User');
    fireEvent.change(fullNameInput, { target: { value: 'Updated User' } });
    
    // Submit form
    const submitButton = screen.getByText('Update User');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockUserService.updateUser).toHaveBeenCalledWith(1, {
        username: 'testuser',
        email: 'test@example.com',
        fullName: 'Updated User',
        phone: '123-456-7890',
        address: '123 Test St',
        billingPlanId: 1,
        isActive: true,
        expiresAt: '2024-01-01',
      });
      expect(mockNotificationContext.showSuccess).toHaveBeenCalledWith('User updated successfully');
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });

  it('submits form with password change', async () => {
    const updatedUser = { ...mockUser };
    mockUserService.updateUser.mockResolvedValue(updatedUser);
    
    renderWithProviders(<UserEditDialog {...defaultProps} />);
    
    // Enable password change
    const changePasswordSwitch = screen.getByRole('checkbox', { name: 'Change Password' });
    fireEvent.click(changePasswordSwitch);
    
    // Enter new password
    const passwordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });
    
    // Submit form
    const submitButton = screen.getByText('Update User');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockUserService.updateUser).toHaveBeenCalledWith(1, expect.objectContaining({
        password: 'newpassword123',
      }));
      expect(mockNotificationContext.showSuccess).toHaveBeenCalledWith('User updated successfully');
    });
  });

  it('handles API errors', async () => {
    const errorMessage = 'Username already exists';
    mockUserService.updateUser.mockRejectedValue(new Error(errorMessage));
    
    renderWithProviders(<UserEditDialog {...defaultProps} />);
    
    const submitButton = screen.getByText('Update User');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockNotificationContext.showError).toHaveBeenCalledWith(errorMessage);
    });
  });

  it('disables form during submission', async () => {
    mockUserService.updateUser.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    renderWithProviders(<UserEditDialog {...defaultProps} />);
    
    const submitButton = screen.getByText('Update User');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Updating...')).toBeInTheDocument();
      expect(screen.getByDisplayValue('testuser')).toBeDisabled();
    });
  });

  it('closes dialog when cancel is clicked', () => {
    renderWithProviders(<UserEditDialog {...defaultProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('validates email format', async () => {
    renderWithProviders(<UserEditDialog {...defaultProps} />);
    
    const emailInput = screen.getByDisplayValue('test@example.com');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    const submitButton = screen.getByText('Update User');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('validates expiration date', async () => {
    renderWithProviders(<UserEditDialog {...defaultProps} />);
    
    const expiresAtInput = screen.getByDisplayValue('2024-01-01');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];
    
    fireEvent.change(expiresAtInput, { target: { value: yesterdayString } });
    
    const submitButton = screen.getByText('Update User');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Expiration date must be in the future')).toBeInTheDocument();
    });
  });

  it('clears password fields when change password is disabled', () => {
    renderWithProviders(<UserEditDialog {...defaultProps} />);
    
    // Enable password change
    const changePasswordSwitch = screen.getByRole('checkbox', { name: 'Change Password' });
    fireEvent.click(changePasswordSwitch);
    
    // Enter password
    const passwordInput = screen.getByLabelText('New Password');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    // Disable password change
    fireEvent.click(changePasswordSwitch);
    
    // Password fields should be hidden and cleared
    expect(screen.queryByLabelText('New Password')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Confirm New Password')).not.toBeInTheDocument();
  });

  it('handles user with no last login', () => {
    const userWithoutLogin = { ...mockUser, lastLogin: undefined };
    
    renderWithProviders(<UserEditDialog {...defaultProps} user={userWithoutLogin} />);
    
    expect(screen.getByText('Never')).toBeInTheDocument();
  });

  it('handles user with no expiration date', () => {
    const userWithoutExpiration = { ...mockUser, expiresAt: undefined };
    
    renderWithProviders(<UserEditDialog {...defaultProps} user={userWithoutExpiration} />);
    
    const expiresAtInput = screen.getByLabelText('Expires At');
    expect(expiresAtInput).toHaveValue('');
  });
});