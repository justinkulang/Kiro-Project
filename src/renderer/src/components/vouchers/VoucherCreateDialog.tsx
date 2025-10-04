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
  Box,
  Divider,
  Slider,
  Alert,
} from '@mui/material';
import { useNotification } from '../../contexts/NotificationContext';
import { voucherService, CreateVoucherData } from '../../services/voucherService';

interface BillingPlan {
  id: number;
  name: string;
  description?: string;
  price: number;
  timeLimit?: number;
  dataLimit?: number;
  validityPeriod: number;
}

interface VoucherCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  billingPlans: BillingPlan[];
}

interface CreateVoucherForm {
  billingPlanId: number | '';
  quantity: number;
  expiresAt: string;
  prefix: string;
}

function VoucherCreateDialog({ open, onClose, onSuccess, billingPlans }: VoucherCreateDialogProps) {
  const [formData, setFormData] = useState<CreateVoucherForm>({
    billingPlanId: '',
    quantity: 1,
    expiresAt: '',
    prefix: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [previewCodes, setPreviewCodes] = useState<string[]>([]);

  const { showSuccess, showError } = useNotification();

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Billing plan validation
    if (!formData.billingPlanId) {
      newErrors.billingPlanId = 'Please select a billing plan';
    }

    // Quantity validation
    if (formData.quantity < 1) {
      newErrors.quantity = 'Quantity must be at least 1';
    } else if (formData.quantity > 1000) {
      newErrors.quantity = 'Quantity cannot exceed 1000';
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

    // Prefix validation (optional but must be valid if provided)
    if (formData.prefix && !/^[A-Z0-9]{1,4}$/.test(formData.prefix)) {
      newErrors.prefix = 'Prefix must be 1-4 uppercase letters or numbers';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof CreateVoucherForm) => (
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

    // Generate preview codes when quantity or prefix changes
    if (field === 'quantity' || field === 'prefix') {
      generatePreviewCodes(
        field === 'quantity' ? Number(value) : formData.quantity,
        field === 'prefix' ? String(value) : formData.prefix
      );
    }
  };

  const handleQuantitySliderChange = (event: Event, newValue: number | number[]) => {
    const quantity = Array.isArray(newValue) ? newValue[0] : newValue;
    setFormData(prev => ({ ...prev, quantity }));
    generatePreviewCodes(quantity, formData.prefix);
  };

  const generatePreviewCodes = (quantity: number, prefix: string) => {
    if (quantity > 10) {
      setPreviewCodes([]);
      return;
    }

    const codes: string[] = [];
    for (let i = 0; i < quantity; i++) {
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      const code = prefix ? `${prefix}-${randomPart}` : randomPart;
      codes.push(code);
    }
    setPreviewCodes(codes);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const voucherData: CreateVoucherData = {
        billingPlanId: formData.billingPlanId as number,
        quantity: formData.quantity,
        expiresAt: formData.expiresAt || undefined,
        prefix: formData.prefix || undefined,
      };

      const vouchers = await voucherService.createVouchers(voucherData);
      showSuccess(`Created ${vouchers.length} voucher${vouchers.length > 1 ? 's' : ''} successfully`);
      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create vouchers';
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
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Create Vouchers</DialogTitle>
        
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Billing Plan Selection */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Billing Plan
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth required error={!!errors.billingPlanId}>
                <InputLabel>Select Billing Plan</InputLabel>
                <Select
                  value={formData.billingPlanId}
                  onChange={handleInputChange('billingPlanId')}
                  label="Select Billing Plan"
                  disabled={loading}
                >
                  {billingPlans.map((plan) => (
                    <MenuItem key={plan.id} value={plan.id}>
                      <Box>
                        <Typography variant="body1">
                          {plan.name} - ${plan.price}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {plan.description}
                          {plan.timeLimit && ` • ${formatDuration(plan.timeLimit)}`}
                          {plan.dataLimit && ` • ${formatBytes(plan.dataLimit)}`}
                          {` • Valid for ${plan.validityPeriod} days`}
                        </Typography>
                      </Box>
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

            {/* Voucher Configuration */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Voucher Configuration
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography gutterBottom>
                Quantity: {formData.quantity}
              </Typography>
              <Slider
                value={formData.quantity}
                onChange={handleQuantitySliderChange}
                min={1}
                max={100}
                step={1}
                marks={[
                  { value: 1, label: '1' },
                  { value: 25, label: '25' },
                  { value: 50, label: '50' },
                  { value: 100, label: '100' },
                ]}
                disabled={loading}
              />
              <TextField
                fullWidth
                type="number"
                label="Exact Quantity"
                value={formData.quantity}
                onChange={handleInputChange('quantity')}
                error={!!errors.quantity}
                helperText={errors.quantity}
                inputProps={{ min: 1, max: 1000 }}
                disabled={loading}
                sx={{ mt: 2 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Code Prefix (Optional)"
                value={formData.prefix}
                onChange={handleInputChange('prefix')}
                error={!!errors.prefix}
                helperText={errors.prefix || 'e.g., WIFI, HOT, etc. (1-4 characters)'}
                placeholder="WIFI"
                inputProps={{ maxLength: 4, style: { textTransform: 'uppercase' } }}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Expiration Date (Optional)"
                type="date"
                value={formData.expiresAt}
                onChange={handleInputChange('expiresAt')}
                error={!!errors.expiresAt}
                helperText={errors.expiresAt || 'Leave empty for no expiration'}
                InputLabelProps={{ shrink: true }}
                disabled={loading}
              />
            </Grid>

            {/* Preview Section */}
            {previewCodes.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Preview Codes
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Sample voucher codes (actual codes will be different):
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {previewCodes.map((code, index) => (
                      <Typography
                        key={index}
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          bgcolor: 'grey.100',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                        }}
                      >
                        {code}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              </Grid>
            )}

            {formData.quantity > 10 && (
              <Grid item xs={12}>
                <Alert severity="info">
                  Preview is not shown for quantities greater than 10 vouchers.
                </Alert>
              </Grid>
            )}

            {/* Billing Plan Details */}
            {selectedBillingPlan && (
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Selected Plan Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>{selectedBillingPlan.name}</strong> - ${selectedBillingPlan.price}
                  </Typography>
                  {selectedBillingPlan.description && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {selectedBillingPlan.description}
                    </Typography>
                  )}
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="text.secondary">
                        Validity Period
                      </Typography>
                      <Typography variant="body2">
                        {selectedBillingPlan.validityPeriod} days
                      </Typography>
                    </Grid>
                    {selectedBillingPlan.timeLimit && (
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          Time Limit
                        </Typography>
                        <Typography variant="body2">
                          {formatDuration(selectedBillingPlan.timeLimit)}
                        </Typography>
                      </Grid>
                    )}
                    {selectedBillingPlan.dataLimit && (
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          Data Limit
                        </Typography>
                        <Typography variant="body2">
                          {formatBytes(selectedBillingPlan.dataLimit)}
                        </Typography>
                      </Grid>
                    )}
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" color="text.secondary">
                        Total Value
                      </Typography>
                      <Typography variant="body2" color="primary" fontWeight="bold">
                        ${(selectedBillingPlan.price * formData.quantity).toFixed(2)}
                      </Typography>
                    </Grid>
                  </Grid>
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
            {loading ? 'Creating...' : `Create ${formData.quantity} Voucher${formData.quantity > 1 ? 's' : ''}`}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default VoucherCreateDialog;