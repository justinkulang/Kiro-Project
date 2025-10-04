import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  MoreVert,
  Add,
  Search,
  Refresh,
  Download,
  Edit,
  Delete,
  Lock,
  LockOpen,
  ExitToApp,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import AdminCreateDialog from './AdminCreateDialog';
import AdminEditDialog from './AdminEditDialog';
import { adminService, AdminUser, AdminFilters } from '../../services/adminService';

function AdminUserList() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [filters, setFilters] = useState<AdminFilters>({
    search: '',
    role: '',
    isActive: undefined,
  });
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const { user, hasRole } = useAuth();
  const { showSuccess, showError } = useNotification();

  const canManageAdmins = hasRole(['super_admin']);

  useEffect(() => {
    fetchAdmins();
  }, [page, rowsPerPage, filters]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAdmins({
        page: page + 1,
        limit: rowsPerPage,
        search: filters.search || undefined,
        role: filters.role || undefined,
        isActive: filters.isActive,
      });
      
      setAdmins(response.data);
      setTotalAdmins(response.total);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch admin users';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: event.target.value }));
    setPage(0);
  };

  const handleFilterChange = (field: keyof AdminFilters, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, admin: AdminUser) => {
    setAnchorEl(event.currentTarget);
    setSelectedAdmin(admin);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedAdmin(null);
  };

  const handleCreateAdmin = () => {
    setShowCreateDialog(true);
  };

  const handleEditAdmin = () => {
    setShowEditDialog(true);
    handleMenuClose();
  };

  const handleDeleteAdmin = () => {
    setShowDeleteDialog(true);
    handleMenuClose();
  };

  const handleToggleStatus = async (admin: AdminUser) => {
    try {
      await adminService.toggleAdminStatus(admin.id);
      showSuccess(`Admin ${admin.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchAdmins();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update admin status';
      showError(errorMessage);
    }
    handleMenuClose();
  };

  const handleForceLogout = async (admin: AdminUser) => {
    try {
      await adminService.forceLogout(admin.id);
      showSuccess(`Admin ${admin.username} logged out successfully`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to logout admin';
      showError(errorMessage);
    }
    handleMenuClose();
  };

  const confirmDeleteAdmin = async () => {
    if (!selectedAdmin) return;

    try {
      await adminService.deleteAdmin(selectedAdmin.id);
      showSuccess('Admin deleted successfully');
      fetchAdmins();
      setShowDeleteDialog(false);
      setSelectedAdmin(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete admin';
      showError(errorMessage);
    }
  };

  const handleExportAdmins = async () => {
    try {
      await adminService.exportAdmins(filters);
      showSuccess('Admin users exported successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export admin users';
      showError(errorMessage);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'error';
      case 'admin':
        return 'warning';
      case 'operator':
        return 'info';
      default:
        return 'default';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'operator':
        return 'Operator';
      default:
        return role;
    }
  };

  const canEditAdmin = (admin: AdminUser) => {
    if (!canManageAdmins) return false;
    if (admin.id === user?.id) return true; // Can edit own profile
    if (admin.role === 'super_admin' && user?.role !== 'super_admin') return false;
    return true;
  };

  const canDeleteAdmin = (admin: AdminUser) => {
    if (!canManageAdmins) return false;
    if (admin.id === user?.id) return false; // Cannot delete own account
    if (admin.role === 'super_admin' && user?.role !== 'super_admin') return false;
    return true;
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Admin Users
        </Typography>
        {canManageAdmins && (
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExportAdmins}
            >
              Export
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateAdmin}
            >
              Add Admin
            </Button>
          </Box>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardHeader
          title="Filter & Search"
          sx={{ pb: 1 }}
        />
        <CardContent sx={{ pt: 0 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search admins"
                value={filters.search}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={filters.role ?? ''}
                  onChange={(e) => handleFilterChange('role', e.target.value === '' ? undefined : e.target.value)}
                  label="Role"
                >
                  <MenuItem value="">All Roles</MenuItem>
                  <MenuItem value="super_admin">Super Admin</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="operator">Operator</MenuItem>
                </Select>
              </FormControl>
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
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Refresh />}
                onClick={fetchAdmins}
                disabled={loading}
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mt: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Full Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Loading admin users...
                  </TableCell>
                </TableRow>
              ) : admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No admin users found
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => (
                  <TableRow key={admin.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {admin.username}
                        {admin.id === user?.id && (
                          <Chip label="You" size="small" sx={{ ml: 1 }} />
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell>{admin.fullName || '-'}</TableCell>
                    <TableCell>{admin.email || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleLabel(admin.role)}
                        color={getRoleColor(admin.role) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={admin.isActive ? 'Active' : 'Inactive'}
                        color={admin.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={(e) => handleMenuOpen(e, admin)}
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
          count={totalAdmins}
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
        {selectedAdmin && canEditAdmin(selectedAdmin) && (
          <MenuItem onClick={handleEditAdmin}>
            <Edit sx={{ mr: 1 }} fontSize="small" />
            Edit Admin
          </MenuItem>
        )}
        {selectedAdmin && canManageAdmins && selectedAdmin.id !== user?.id && (
          <MenuItem onClick={() => handleToggleStatus(selectedAdmin)}>
            {selectedAdmin.isActive ? (
              <Lock sx={{ mr: 1 }} fontSize="small" />
            ) : (
              <LockOpen sx={{ mr: 1 }} fontSize="small" />
            )}
            {selectedAdmin.isActive ? 'Deactivate' : 'Activate'}
          </MenuItem>
        )}
        {selectedAdmin && canManageAdmins && selectedAdmin.id !== user?.id && (
          <MenuItem onClick={() => handleForceLogout(selectedAdmin)}>
            <ExitToApp sx={{ mr: 1 }} fontSize="small" />
            Force Logout
          </MenuItem>
        )}
        {selectedAdmin && canDeleteAdmin(selectedAdmin) && (
          <MenuItem onClick={handleDeleteAdmin} sx={{ color: 'error.main' }}>
            <Delete sx={{ mr: 1 }} fontSize="small" />
            Delete Admin
          </MenuItem>
        )}
      </Menu>

      {/* Create Admin Dialog */}
      {showCreateDialog && (
        <AdminCreateDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => {
            setShowCreateDialog(false);
            fetchAdmins();
          }}
        />
      )}

      {/* Edit Admin Dialog */}
      {showEditDialog && selectedAdmin && (
        <AdminEditDialog
          open={showEditDialog}
          admin={selectedAdmin}
          onClose={() => setShowEditDialog(false)}
          onSuccess={() => {
            setShowEditDialog(false);
            fetchAdmins();
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete admin "{selectedAdmin?.username}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button onClick={confirmDeleteAdmin} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AdminUserList;