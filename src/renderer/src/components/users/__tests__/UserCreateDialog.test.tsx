import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import UserCreateDialog from '../UserCreateDialog';
import { NotificationContext } from '../../../contexts/NotificationContext';
import { userService } from '../../../services/userService';

// Mock the userService
jest.mock('../../../services/userService', () => ({
  userService: {
    createUser: jest.fn(),
  },
}));

const mockUserService = userService as jest.Mocked<typeof userService>;

const theme = createTheme();

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

describe('UserCreateDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders create user dialog', () => {
    renderWithProviders(<UserCreateDialog {...defaultProps} />);
    
    expect(screen.getByText('Create New User')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
  });

  it('displays all form sections', () => {
    renderWithProviders(<UserCreateDialog {...defaultProps} />);
    
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Contact Information')).toBeInTheDocument();
    expect(screen.getByText('Billing and Access')).toBeInTheDocument();
  });

  it('shows billing plan options', () => {
    renderWithProviders(<UserCreateDialog {...defaultProps} />);
    
    const billingPlanSelect = screen.getByLabelText('Billing Plan');
    fireEvent.mouseDown(billingPlanSelect);
    
    expect(screen.getByText('Basic Plan - $10')).toBeInTheDocument();
    expect(screen.getByText('Premium Plan - $20')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    renderWithProviders(<UserCreateDialog {...defaultProps} />);
    
    const submitButton = screen.getByText('Create User');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Username is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
      expect(screen.getByText('Please select a billing plan')).toBeInTheDocument();
    });
  });

  it('validates username format', async () => {
    renderWithProviders(<UserCreateDialog {...defaultProps} />);
    
    const usernameInput = screen.getByLabelText('Username');
    fireEvent.change(usernameInput, { target: { value: 'ab' } });
    
    const submitButton = screen.getByText('Create User');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Username must be at least 3 characters')).toBeInTheDocument();
    });
    
    fireEvent.change(usernameInput, { target: { value: 'user@name' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Username can only contain letters, numbers, and underscores')).toBeInTheDocument();
    });
  });

  it('validates password requirements', async () => {
    renderWithProviders(<UserCreateDialog {...defaultProps} />);
    
    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: '123' } });
    
    const submitButton = screen.getByText('Create User');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });
  });

  it('validates password confirmation', async () => {
    renderWithProviders(<UserCreateDialog {...defaultProps} />);
    
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password456' } });
    
    const submitButton = screen.getByText('Create User');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    renderWithProviders(<UserCreateDialog {...defaultProps} />);
    
    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    const submitButton = screen.getByText('Create User');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('validates expiration date', async () => {
    renderWithProviders(<UserCreateDialog {...defaultProps} />);
    
    const expiresAtInput = screen.getByLabelText('Expires At');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];
    
    fireEvent.change(expiresAtInput, { target: { value: yesterdayString } });
    
    const submitButton = screen.getByText('Create User');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Expiration date must be in the future')).toBeInTheDocument();
    });
  });

  it('displays selected billing plan details', async () => {
    renderWithProviders(<UserCreateDialog {...defaultProps} />);
    
    const billingPlanSelect = screen.getByLabelText('Billing Plan');
    fireEvent.mouseDown(billingPlanSelect);
    
    const basicPlanOption = screen.getByText('Basic Plan - $10');
    fireEvent.click(basicPlanOption);
    
    await waitFor(() => {
      expect(screen.getByText('Selected Plan Details:')).toBeInTheDocument();
      expect(screen.getByText('Basic Plan - $10')).toBeInTheDocument();
      expect(screen.getByText('Basic internet access')).toBeInTheDocument();
      expect(screen.getByText('Validity: 30 days')).toBeInTheDocument();
      expect(screen.getByText('Time Limit: 1h 0m')).toBeInTheDocument();
      expect(screen.getByText('Data Limit: 1.00 GB')).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      fullName: 'Test User',
      email: 'test@example.com',
      billingPlanId: 1,
      isActive: true,
    };
    
    mockUserService.createUser.mockResolvedValue(mockUser as any);
    
    renderWithProviders(<UserCreateDialog {...defaultProps} />);
    
    // Fill in required fields
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    
    // Select billing plan
    const billingPlanSelect = screen.getByLabelText('Billing Plan');
    fireEvent.mouseDown(billingPlanSelect);
    fireEvent.click(screen.getByText('Basic Plan - $10'));
    
    // Submit form
    const submitButton = screen.getByText('Create User');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockUserService.createUser).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        fullName: 'Test User',
        phone: undefined,
        address: undefined,
        billingPlanId: 1,
        isActive: true,
        expiresAt: undefined,
      });
      expect(mockNotificationContext.showSuccess).toHaveBeenCalledWith('User created successfully');
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });

  it('handles API errors', async () => {
    const errorMessage = 'Username already exists';
    mockUserService.createUser.mockRejectedValue(new Error(errorMessage));
    
    renderWithProviders(<UserCreateDialog {...defaultProps} />);
    
    // Fill in required fields
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password123' } });
    
    // Select billing plan
    const billingPlanSelect = screen.getByLabelText('Billing Plan');
    fireEvent.mouseDown(billingPlanSelect);
    fireEvent.click(screen.getByText('Basic Plan - $10'));
    
    // Submit form
    const submitButton = screen.getByText('Create User');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockNotificationContext.showError).toHaveBeenCalledWith(errorMessage);
    });
  });

  it('disables form during submission', async () => {
    mockUserService.createUser.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    renderWithProviders(<UserCreateDialog {...defaultProps} />);
    
    // Fill in required fields
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password123' } });
    
    // Select billing plan
    const billingPlanSelect = screen.getByLabelText('Billing Plan');
    fireEvent.mouseDown(billingPlanSelect);
    fireEvent.click(screen.getByText('Basic Plan - $10'));
    
    // Submit form
    const submitButton = screen.getByText('Create User');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Creating...')).toBeInTheDocument();
      expect(screen.getByLabelText('Username')).toBeDisabled();
    });
  });

  it('closes dialog when cancel is clicked', () => {
    renderWithProviders(<UserCreateDialog {...defaultProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('toggles active user switch', () => {
    renderWithProviders(<UserCreateDialog {...defaultProps} />);
    
    const activeSwitch = screen.getByRole('checkbox', { name: 'Active User' });
    expect(activeSwitch).toBeChecked();
    
    fireEvent.click(activeSwitch);
    expect(activeSwitch).not.toBeChecked();
  });

  it('clears field errors when user starts typing', async () => {
    renderWithProviders(<UserCreateDialog {...defaultProps} />);
    
    // Trigger validation error
    const submitButton = screen.getByText('Create User');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Username is required')).toBeInTheDocument();
    });
    
    // Start typing in username field
    const usernameInput = screen.getByLabelText('Username');
    fireEvent.change(usernameInput, { target: { value: 'test' } });
    
    // Error should be cleared
    expect(screen.queryByText('Username is required')).not.toBeInTheDocument();
  });
});