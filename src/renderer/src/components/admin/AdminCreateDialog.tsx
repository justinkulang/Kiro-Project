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
import { useNotification } from '../../contexts/NotificationContext';
import { adminService, CreateAdminData } from '../../services/adminService';

interface AdminCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CreateAdminForm {
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
  fullName: string;
  role: 'super_admin' | 'admin' | 'operator' | '';
  isActive: boolean;
  permissions: string[];
}

function AdminCreateDialog({ open, onClose, onSuccess }: AdminCreateDialogProps) {
  const [formData, setFormData] = useState<CreateAdminForm>({
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
  const [availablePermissions, setAvailablePermissions] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    if (open) {
      loadPermissionsAndRoles();
    }
  }, [open]);

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

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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

  const handleInputChange = (field: keyof CreateAdminForm) => (
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

  const handleSwitchChange = (field: keyof CreateAdminForm) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.checked
    }));
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
      const adminData: CreateAdminData = {
        username: formData.username.trim(),
        password: formData.password,
        email: formData.email.trim() || undefined,
        fullName: formData.fullName.trim() || undefined,
        role: formData.role as any,
        isActive: formData.isActive,
        permissions: formData.permissions,
      };

      await adminService.createAdmin(adminData);
      showSuccess('Admin user created successfully');
      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create admin user';
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
        <DialogTitle>Create New Admin User</DialogTitle>
        
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

            {/* Password */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Password
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                type="password"
                label="Password"
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
                label="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                disabled={loading}
              />
            </Grid>

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
                  disabled={loading}
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
                    disabled={loading}
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
                disabled={loading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Additional Permissions (Optional)"
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
                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selectedRole.permissions?.slice(0, 5).map((perm: string) => {
                      const permObj = availablePermissions.find(p => p.key === perm);
                      return (
                        <Chip
                          key={perm}
                          label={permObj ? permObj.name : perm}
                          size="small"
                          variant="outlined"
                        />
                      );
                    })}
                    {selectedRole.permissions?.length > 5 && (
                      <Chip
                        label={`+${selectedRole.permissions.length - 5} more`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
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
            {loading ? 'Creating...' : 'Create Admin'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default AdminCreateDialog;