import React, { useState } from 'react';
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
  Alert,
  Box,
  Divider,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { useNotification } from '../../contexts/NotificationContext';
import { userService } from '../../services/userService';

interface BillingPlan {
  id: number;
  name: string;
  description?: string;
  price: number;
  timeLimit?: number;
  dataLimit?: number;
  validityPeriod: number;
}

interface UserCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  billingPlans: BillingPlan[];
}

interface CreateUserForm {
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
  fullName: string;
  phone: string;
  address: string;
  billingPlanId: number | '';
  isActive: boolean;
  expiresAt: string;
}

function UserCreateDialog({ open, onClose, onSuccess, billingPlans }: UserCreateDialogProps) {
  const [formData, setFormData] = useState<CreateUserForm>({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    fullName: '',
    phone: '',
    address: '',
    billingPlanId: '',
    isActive: true,
    expiresAt: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  const { showSuccess, showError } = useNotification();

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
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Email validation (optional but must be valid if provided)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Billing plan validation
    if (!formData.billingPlanId) {
      newErrors.billingPlanId = 'Please select a billing plan';
    }

    // Expiration date validation (optional but must be future date if provided)
    if (formData.expiresAt) {
      const expirationDate = new Date(formData.expiresAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (expirationDate <= today) {
        newErrors.expiresAt = 'Expiration date must be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof CreateUserForm) => (
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

  const handleSwitchChange = (field: keyof CreateUserForm) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.checked
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const userData = {
        username: formData.username.trim(),
        password: formData.password,
        email: formData.email.trim() || undefined,
        fullName: formData.fullName.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        billingPlanId: formData.billingPlanId as number,
        isActive: formData.isActive,
        expiresAt: formData.expiresAt || undefined,
      };

      await userService.createUser(userData);
      showSuccess('User created successfully');
      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create user';
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

  const selectedBillingPlan = billingPlans.find(plan => plan.id === formData.billingPlanId);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Create New User</DialogTitle>
        
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

            {/* Contact Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Contact Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
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

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={handleInputChange('phone')}
                error={!!errors.phone}
                helperText={errors.phone}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                multiline
                rows={2}
                value={formData.address}
                onChange={handleInputChange('address')}
                error={!!errors.address}
                helperText={errors.address}
                disabled={loading}
              />
            </Grid>

            {/* Billing and Access */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Billing and Access
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required error={!!errors.billingPlanId}>
                <InputLabel>Billing Plan</InputLabel>
                <Select
                  value={formData.billingPlanId}
                  onChange={handleInputChange('billingPlanId')}
                  label="Billing Plan"
                  disabled={loading}
                >
                  {billingPlans.map((plan) => (
                    <MenuItem key={plan.id} value={plan.id}>
                      {plan.name} - ${plan.price}
                    </MenuItem>
                  ))}
                </Select>
                {errors.billingPlanId && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                    {errors.billingPlanId}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Expires At"
                type="date"
                value={formData.expiresAt}
                onChange={handleInputChange('expiresAt')}
                error={!!errors.expiresAt}
                helperText={errors.expiresAt || 'Leave empty for no expiration'}
                InputLabelProps={{ shrink: true }}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12}>
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

            {/* Billing Plan Details */}
            {selectedBillingPlan && (
              <Grid item xs={12}>
                <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Selected Plan Details:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>{selectedBillingPlan.name}</strong> - ${selectedBillingPlan.price}
                  </Typography>
                  {selectedBillingPlan.description && (
                    <Typography variant="body2" color="text.secondary">
                      {selectedBillingPlan.description}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    Validity: {selectedBillingPlan.validityPeriod} days
                  </Typography>
                  {selectedBillingPlan.timeLimit && (
                    <Typography variant="body2" color="text.secondary">
                      Time Limit: {Math.floor(selectedBillingPlan.timeLimit / 60)}h {selectedBillingPlan.timeLimit % 60}m
                    </Typography>
                  )}
                  {selectedBillingPlan.dataLimit && (
                    <Typography variant="body2" color="text.secondary">
                      Data Limit: {(selectedBillingPlan.dataLimit / (1024 * 1024 * 1024)).toFixed(2)} GB
                    </Typography>
                  )}
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
            {loading ? 'Creating...' : 'Create User'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default UserCreateDialog;