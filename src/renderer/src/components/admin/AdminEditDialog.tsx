import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Box,
  Divider,
  FormControlLabel,
  Switch,
  Chip,
  Autocomplete,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { adminService, AdminUser, UpdateAdminData } from '../../services/adminService';

interface AdminEditDialogProps {
  open: boolean;
  admin: AdminUser;
  onClose: () => void;
  onSuccess: () => void;
}

interface EditAdminForm {
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
  fullName: string;
  role: 'super_admin' | 'admin' | 'operator' | '';
  isActive: boolean;
  permissions: string[];
}

function AdminEditDialog({ open, admin, onClose, onSuccess }: AdminEditDialogProps) {
  const [formData, setFormData] = useState<EditAdminForm>({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    fullName: '',
    role: '',
    isActive: true,
    permissions: [],
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [changePassword, setChangePassword] = useState(false);
  const [availablePermissions, setAvailablePermissions] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  const { user, hasRole } = useAuth();
  const { showSuccess, showError } = useNotification();

  const canEditRole = hasRole(['super_admin']) && admin.id !== user?.id;
  const canEditStatus = hasRole(['super_admin']) && admin.id !== user?.id;
  const isEditingSelf = admin.id === user?.id;

  useEffect(() => {
    if (open && admin) {
      setFormData({
        username: admin.username || '',
        password: '',
        confirmPassword: '',
        email: admin.email || '',
        fullName: admin.fullName || '',
        role: admin.role || '',
        isActive: admin.isActive,
        permissions: admin.permissions || [],
      });
      loadPermissionsAndRoles();
    }
  }, [open, admin]);

  const loadPermissionsAndRoles = async () => {
    try {
      const [permissions, rolesData] = await Promise.all([
        adminService.getAvailablePermissions(),
        adminService.getRoles(),
      ]);
      setAvailablePermissions(permissions);
      setRoles(rolesData);
    } catch (error) {
      console.error('Failed to load permissions and roles:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Password validation (only if changing password)
    if (changePassword) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }

      // Confirm password validation
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    // Email validation (optional but must be valid if provided)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Role validation
    if (!formData.role) {
      newErrors.role = 'Please select a role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof EditAdminForm) => (
    event: React.ChangeEvent<HTMLInputElement | { value: unknown }>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSwitchChange = (field: keyof EditAdminForm | 'changePassword') => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (field === 'changePassword') {
      setChangePassword(event.target.checked);
      if (!event.target.checked) {
        setFormData(prev => ({
          ...prev,
          password: '',
          confirmPassword: ''
        }));
        setErrors(prev => ({
          ...prev,
          password: '',
          confirmPassword: ''
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: event.target.checked
      }));
    }
  };

  const handlePermissionsChange = (newPermissions: string[]) => {
    setFormData(prev => ({
      ...prev,
      permissions: newPermissions
    }));
  };

  const handleRoleChange = (role: string) => {
    setFormData(prev => ({ ...prev, role: role as any }));
    
    // Auto-select permissions based on role
    const selectedRole = roles.find(r => r.key === role);
    if (selectedRole) {
      setFormData(prev => ({
        ...prev,
        permissions: selectedRole.permissions || []
      }));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const adminData: UpdateAdminData = {
        username: formData.username.trim(),
        email: formData.email.trim() || undefined,
        fullName: formData.fullName.trim() || undefined,
        permissions: formData.permissions,
      };

      // Only include password if changing it
      if (changePassword && formData.password) {
        adminData.password = formData.password;
      }

      // Only include role and status if user has permission to change them
      if (canEditRole) {
        adminData.role = formData.role as any;
      }
      
      if (canEditStatus) {
        adminData.isActive = formData.isActive;
      }

      if (isEditingSelf) {
        // Use special endpoint for self-update
        await adminService.updateMyProfile({
          email: adminData.email,
          fullName: adminData.fullName,
          ...(changePassword && formData.password ? {
            newPassword: formData.password,
            currentPassword: 'dummy' // This should be handled properly in a real app
          } : {})
        });
      } else {
        await adminService.updateAdmin(admin.id, adminData);
      }

      showSuccess('Admin user updated successfully');
      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update admin user';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const selectedRole = roles.find(role => role.key === formData.role);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          Edit Admin User: {admin.username}
          {isEditingSelf && <Chip label="Your Profile" size="small" sx={{ ml: 1 }} />}
        </DialogTitle>
        
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Username"
                value={formData.username}
                onChange={handleInputChange('username')}
                error={!!errors.username}
                helperText={errors.username}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Full Name"
                value={formData.fullName}
                onChange={handleInputChange('fullName')}
                error={!!errors.fullName}
                helperText={errors.fullName}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                error={!!errors.email}
                helperText={errors.email}
                disabled={loading}
              />
            </Grid>

            {/* Password Section */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Password
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={changePassword}
                    onChange={handleSwitchChange('changePassword')}
                    disabled={loading}
                  />
                }
                label="Change Password"
              />
            </Grid>

            {changePassword && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    type="password"
                    label="New Password"
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    error={!!errors.password}
                    helperText={errors.password}
                    disabled={loading}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    type="password"
                    label="Confirm New Password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange('confirmPassword')}
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword}
                    disabled={loading}
                  />
                </Grid>
              </>
            )}

            {/* Role and Permissions */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Role and Permissions
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required error={!!errors.role}>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  label="Role"
                  disabled={loading || !canEditRole}
                >
                  {roles.map((role) => (
                    <MenuItem key={role.key} value={role.key}>
                      <Box>
                        <Typography variant="body1">{role.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {role.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {errors.role && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                    {errors.role}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={handleSwitchChange('isActive')}
                    disabled={loading || !canEditStatus}
                  />
                }
                label="Active User"
              />
            </Grid>

            {/* Permissions */}
            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={availablePermissions.map(p => p.key)}
                getOptionLabel={(option) => {
                  const perm = availablePermissions.find(p => p.key === option);
                  return perm ? perm.name : option;
                }}
                value={formData.permissions}
                onChange={(_, newValue) => handlePermissionsChange(newValue)}
                disabled={loading || !canEditRole}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Additional Permissions"
                    placeholder="Select permissions..."
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const perm = availablePermissions.find(p => p.key === option);
                    return (
                      <Chip
                        variant="outlined"
                        label={perm ? perm.name : option}
                        {...getTagProps({ index })}
                        key={option}
                      />
                    );
                  })
                }
              />
            </Grid>

            {/* Admin Statistics */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Admin Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Created
                </Typography>
                <Typography variant="body2">
                  {new Date(admin.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Last Updated
                </Typography>
                <Typography variant="body2">
                  {new Date(admin.updatedAt).toLocaleDateString()}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Last Login
                </Typography>
                <Typography variant="body2">
                  {admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : 'Never'}
                </Typography>
              </Box>
            </Grid>

            {/* Role Details */}
            {selectedRole && (
              <Grid item xs={12}>
                <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Selected Role Details:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>{selectedRole.name}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {selectedRole.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Default Permissions: {selectedRole.permissions?.length || 0}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Admin'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default AdminEditDialog;