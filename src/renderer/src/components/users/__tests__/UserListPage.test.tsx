import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import UserListPage from '../UserListPage';
import { AuthContext } from '../../../contexts/AuthContext';
import { NotificationContext } from '../../../contexts/NotificationContext';
import { userService } from '../../../services/userService';

// Mock the userService
jest.mock('../../../services/userService', () => ({
  userService: {
    getUsers: jest.fn(),
    getBillingPlans: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    exportUsers: jest.fn(),
  },
}));

const mockUserService = userService as jest.Mocked<typeof userService>;

const theme = createTheme();

const mockUsers = [
  {
    id: 1,
    username: 'testuser1',
    email: 'test1@example.com',
    fullName: 'Test User 1',
    billingPlanId: 1,
    billingPlan: { id: 1, name: 'Basic Plan', price: 10 },
    isActive: true,
    createdAt: '2023-01-01T00:00:00Z',
    dataUsed: 1024 * 1024 * 100, // 100MB
    timeUsed: 120, // 2 hours
    lastLogin: '2023-12-01T10:00:00Z',
  },
  {
    id: 2,
    username: 'testuser2',
    email: 'test2@example.com',
    fullName: 'Test User 2',
    billingPlanId: 2,
    billingPlan: { id: 2, name: 'Premium Plan', price: 20 },
    isActive: false,
    createdAt: '2023-01-02T00:00:00Z',
    dataUsed: 1024 * 1024 * 50, // 50MB
    timeUsed: 60, // 1 hour
    lastLogin: null,
  },
];

const mockBillingPlans = [
  { id: 1, name: 'Basic Plan', price: 10, validityPeriod: 30 },
  { id: 2, name: 'Premium Plan', price: 20, validityPeriod: 30 },
];

const mockAuthContext = {
  user: { id: 1, username: 'admin', role: 'super_admin' },
  login: jest.fn(),
  logout: jest.fn(),
  hasRole: jest.fn(() => true),
  isAuthenticated: true,
  loading: false,
};

const mockNotificationContext = {
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showInfo: jest.fn(),
  showWarning: jest.fn(),
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <AuthContext.Provider value={mockAuthContext}>
          <NotificationContext.Provider value={mockNotificationContext}>
            {component}
          </NotificationContext.Provider>
        </AuthContext.Provider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('UserListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserService.getUsers.mockResolvedValue({
      data: mockUsers,
      total: 2,
      page: 1,
      limit: 25,
      totalPages: 1,
    });
    mockUserService.getBillingPlans.mockResolvedValue({
      data: mockBillingPlans,
      total: 2,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
  });

  it('renders user list page with title', async () => {
    renderWithProviders(<UserListPage />);
    
    expect(screen.getByText('User Management')).toBeInTheDocument();
    await waitFor(() => {
      expect(mockUserService.getUsers).toHaveBeenCalled();
      expect(mockUserService.getBillingPlans).toHaveBeenCalled();
    });
  });

  it('displays users in table', async () => {
    renderWithProviders(<UserListPage />);
    
    await waitFor(() => {
      expect(screen.getByText('testuser1')).toBeInTheDocument();
      expect(screen.getByText('testuser2')).toBeInTheDocument();
      expect(screen.getByText('Test User 1')).toBeInTheDocument();
      expect(screen.getByText('Test User 2')).toBeInTheDocument();
    });
  });

  it('shows user status correctly', async () => {
    renderWithProviders(<UserListPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });

  it('displays billing plan information', async () => {
    renderWithProviders(<UserListPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Basic Plan')).toBeInTheDocument();
      expect(screen.getByText('Premium Plan')).toBeInTheDocument();
    });
  });

  it('formats data usage correctly', async () => {
    renderWithProviders(<UserListPage />);
    
    await waitFor(() => {
      expect(screen.getByText('100.00 MB')).toBeInTheDocument();
      expect(screen.getByText('50.00 MB')).toBeInTheDocument();
    });
  });

  it('formats time usage correctly', async () => {
    renderWithProviders(<UserListPage />);
    
    await waitFor(() => {
      expect(screen.getByText('2h 0m')).toBeInTheDocument();
      expect(screen.getByText('1h 0m')).toBeInTheDocument();
    });
  });

  it('shows last login information', async () => {
    renderWithProviders(<UserListPage />);
    
    await waitFor(() => {
      expect(screen.getByText('12/1/2023')).toBeInTheDocument();
      expect(screen.getByText('Never')).toBeInTheDocument();
    });
  });

  it('allows searching users', async () => {
    renderWithProviders(<UserListPage />);
    
    const searchInput = screen.getByLabelText('Search users');
    fireEvent.change(searchInput, { target: { value: 'testuser1' } });
    
    await waitFor(() => {
      expect(mockUserService.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'testuser1' })
      );
    });
  });

  it('allows filtering by status', async () => {
    renderWithProviders(<UserListPage />);
    
    const statusSelect = screen.getByLabelText('Status');
    fireEvent.mouseDown(statusSelect);
    
    const activeOption = screen.getByText('Active');
    fireEvent.click(activeOption);
    
    await waitFor(() => {
      expect(mockUserService.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true })
      );
    });
  });

  it('allows filtering by billing plan', async () => {
    renderWithProviders(<UserListPage />);
    
    await waitFor(() => {
      const billingPlanSelect = screen.getByLabelText('Billing Plan');
      fireEvent.mouseDown(billingPlanSelect);
      
      const basicPlanOption = screen.getByText('Basic Plan');
      fireEvent.click(basicPlanOption);
    });
    
    await waitFor(() => {
      expect(mockUserService.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({ billingPlanId: 1 })
      );
    });
  });

  it('shows add user button for authorized users', async () => {
    renderWithProviders(<UserListPage />);
    
    expect(screen.getByText('Add User')).toBeInTheDocument();
  });

  it('shows export button for authorized users', async () => {
    renderWithProviders(<UserListPage />);
    
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('opens user menu when clicking more options', async () => {
    renderWithProviders(<UserListPage />);
    
    await waitFor(() => {
      const moreButtons = screen.getAllByLabelText('more');
      fireEvent.click(moreButtons[0]);
    });
    
    expect(screen.getByText('Edit User')).toBeInTheDocument();
    expect(screen.getByText('Deactivate')).toBeInTheDocument();
    expect(screen.getByText('Delete User')).toBeInTheDocument();
  });

  it('handles user activation/deactivation', async () => {
    mockUserService.updateUser.mockResolvedValue(mockUsers[0]);
    
    renderWithProviders(<UserListPage />);
    
    await waitFor(() => {
      const moreButtons = screen.getAllByLabelText('more');
      fireEvent.click(moreButtons[0]);
    });
    
    const deactivateButton = screen.getByText('Deactivate');
    fireEvent.click(deactivateButton);
    
    await waitFor(() => {
      expect(mockUserService.updateUser).toHaveBeenCalledWith(1, { isActive: false });
      expect(mockNotificationContext.showSuccess).toHaveBeenCalledWith('User deactivated successfully');
    });
  });

  it('handles user deletion', async () => {
    mockUserService.deleteUser.mockResolvedValue(undefined);
    
    renderWithProviders(<UserListPage />);
    
    await waitFor(() => {
      const moreButtons = screen.getAllByLabelText('more');
      fireEvent.click(moreButtons[0]);
    });
    
    const deleteButton = screen.getByText('Delete User');
    fireEvent.click(deleteButton);
    
    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(mockUserService.deleteUser).toHaveBeenCalledWith(1);
      expect(mockNotificationContext.showSuccess).toHaveBeenCalledWith('User deleted successfully');
    });
  });

  it('handles export functionality', async () => {
    mockUserService.exportUsers.mockResolvedValue(undefined);
    
    renderWithProviders(<UserListPage />);
    
    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);
    
    await waitFor(() => {
      expect(mockUserService.exportUsers).toHaveBeenCalled();
      expect(mockNotificationContext.showSuccess).toHaveBeenCalledWith('Users exported successfully');
    });
  });

  it('handles refresh functionality', async () => {
    renderWithProviders(<UserListPage />);
    
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(mockUserService.getUsers).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });

  it('handles pagination', async () => {
    renderWithProviders(<UserListPage />);
    
    await waitFor(() => {
      const nextPageButton = screen.getByLabelText('Go to next page');
      if (nextPageButton && !nextPageButton.hasAttribute('disabled')) {
        fireEvent.click(nextPageButton);
      }
    });
  });

  it('displays loading state', () => {
    mockUserService.getUsers.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    renderWithProviders(<UserListPage />);
    
    expect(screen.getByText('Loading users...')).toBeInTheDocument();
  });

  it('displays empty state when no users found', async () => {
    mockUserService.getUsers.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 25,
      totalPages: 0,
    });
    
    renderWithProviders(<UserListPage />);
    
    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    const errorMessage = 'Failed to fetch users';
    mockUserService.getUsers.mockRejectedValue(new Error(errorMessage));
    
    renderWithProviders(<UserListPage />);
    
    await waitFor(() => {
      expect(mockNotificationContext.showError).toHaveBeenCalledWith(errorMessage);
    });
  });
});