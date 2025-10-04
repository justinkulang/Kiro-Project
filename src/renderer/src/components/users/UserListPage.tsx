import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Add,
  Search,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  VisibilityOff,
  Download,
  Refresh,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import UserCreateDialog from './UserCreateDialog';
import UserEditDialog from './UserEditDialog';
import { userService } from '../../services/userService';

interface HotspotUser {
  id: number;
  username: string;
  email?: string;
  fullName?: string;
  billingPlanId?: number;
  billingPlan?: {
    id: number;
    name: string;
    price: number;
  };
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
  dataUsed: number;
  timeUsed: number;
  lastLogin?: string;
}

interface UserFilters {
  search: string;
  isActive?: boolean;
  billingPlanId?: number;
}

function UserListPage() {
  const [users, setUsers] = useState<HotspotUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalUsers, setTotalUsers] = useState(0);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    isActive: undefined,
    billingPlanId: undefined,
  });
  const [selectedUser, setSelectedUser] = useState<HotspotUser | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [billingPlans, setBillingPlans] = useState<any[]>([]);

  const { hasRole } = useAuth();
  const { showSuccess, showError } = useNotification();

  const canManageUsers = hasRole(['super_admin', 'admin']);

  useEffect(() => {
    fetchUsers();
    fetchBillingPlans();
  }, [page, rowsPerPage, filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getUsers({
        page: page + 1,
        limit: rowsPerPage,
        search: filters.search || undefined,
        isActive: filters.isActive,
        billingPlanId: filters.billingPlanId,
      });
      
      setUsers(response.data);
      setTotalUsers(response.total);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchBillingPlans = async () => {
    try {
      const response = await userService.getBillingPlans();
      setBillingPlans(response.data);
    } catch (err) {
      console.error('Failed to fetch billing plans:', err);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: event.target.value }));
    setPage(0);
  };

  const handleFilterChange = (field: keyof UserFilters, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, user: HotspotUser) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUser(null);
  };

  const handleCreateUser = () => {
    setShowCreateDialog(true);
  };

  const handleEditUser = () => {
    setShowEditDialog(true);
    handleMenuClose();
  };

  const handleDeleteUser = () => {
    setShowDeleteDialog(true);
    handleMenuClose();
  };

  const handleToggleUserStatus = async (user: HotspotUser) => {
    try {
      await userService.updateUser(user.id, { isActive: !user.isActive });
      showSuccess(`User ${user.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchUsers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user status';
      showError(errorMessage);
    }
    handleMenuClose();
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      await userService.deleteUser(selectedUser.id);
      showSuccess('User deleted successfully');
      fetchUsers();
      setShowDeleteDialog(false);
      setSelectedUser(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user';
      showError(errorMessage);
    }
  };

  const handleExportUsers = async () => {
    try {
      await userService.exportUsers(filters);
      showSuccess('Users exported successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export users';
      showError(errorMessage);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          User Management
        </Typography>
        {canManageUsers && (
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExportUsers}
            >
              Export
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateUser}
            >
              Add User
            </Button>
          </Box>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search users"
                value={filters.search}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.isActive ?? ''}
                  onChange={(e) => handleFilterChange('isActive', e.target.value === '' ? undefined : e.target.value === 'true')}
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="true">Active</MenuItem>
                  <MenuItem value="false">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Billing Plan</InputLabel>
                <Select
                  value={filters.billingPlanId ?? ''}
                  onChange={(e) => handleFilterChange('billingPlanId', e.target.value === '' ? undefined : Number(e.target.value))}
                  label="Billing Plan"
                >
                  <MenuItem value="">All Plans</MenuItem>
                  {billingPlans.map((plan) => (
                    <MenuItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Refresh />}
                onClick={fetchUsers}
                disabled={loading}
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Full Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Billing Plan</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Data Used</TableCell>
                <TableCell>Time Used</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {user.username}
                      </Typography>
                    </TableCell>
                    <TableCell>{user.fullName || '-'}</TableCell>
                    <TableCell>{user.email || '-'}</TableCell>
                    <TableCell>
                      {user.billingPlan ? (
                        <Chip
                          label={user.billingPlan.name}
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.isActive ? 'Active' : 'Inactive'}
                        color={user.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatBytes(user.dataUsed)}</TableCell>
                    <TableCell>{formatDuration(user.timeUsed)}</TableCell>
                    <TableCell>
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={(e) => handleMenuOpen(e, user)}
                        size="small"
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          component="div"
          count={totalUsers}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {canManageUsers && (
          <MenuItem onClick={handleEditUser}>
            <Edit sx={{ mr: 1 }} fontSize="small" />
            Edit User
          </MenuItem>
        )}
        {canManageUsers && selectedUser && (
          <MenuItem onClick={() => handleToggleUserStatus(selectedUser)}>
            {selectedUser.isActive ? (
              <VisibilityOff sx={{ mr: 1 }} fontSize="small" />
            ) : (
              <Visibility sx={{ mr: 1 }} fontSize="small" />
            )}
            {selectedUser.isActive ? 'Deactivate' : 'Activate'}
          </MenuItem>
        )}
        {canManageUsers && (
          <MenuItem onClick={handleDeleteUser} sx={{ color: 'error.main' }}>
            <Delete sx={{ mr: 1 }} fontSize="small" />
            Delete User
          </MenuItem>
        )}
      </Menu>

      {/* Create User Dialog */}
      {showCreateDialog && (
        <UserCreateDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => {
            setShowCreateDialog(false);
            fetchUsers();
          }}
          billingPlans={billingPlans}
        />
      )}

      {/* Edit User Dialog */}
      {showEditDialog && selectedUser && (
        <UserEditDialog
          open={showEditDialog}
          user={selectedUser}
          onClose={() => setShowEditDialog(false)}
          onSuccess={() => {
            setShowEditDialog(false);
            fetchUsers();
          }}
          billingPlans={billingPlans}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user "{selectedUser?.username}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button onClick={confirmDeleteUser} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default UserListPage;