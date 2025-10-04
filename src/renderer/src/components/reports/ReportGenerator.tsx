import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Box,
  Typography,
  Chip,
  Autocomplete,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Download,
  PictureAsPdf,
  TableChart,
  Schedule,
  Refresh,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNotification } from '../../contexts/NotificationContext';
import { reportingService, ReportFilters } from '../../services/reportingService';

interface ReportGeneratorProps {
  onReportGenerated?: (reportType: string, filters: ReportFilters) => void;
}

function ReportGenerator({ onReportGenerated }: ReportGeneratorProps) {
  const [reportType, setReportType] = useState<'users' | 'revenue' | 'usage' | 'billing-plans' | 'sessions' | 'vouchers'>('users');
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0], // Today
    includeInactive: false,
  });
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [selectedBillingPlans, setSelectedBillingPlans] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [availableBillingPlans, setAvailableBillingPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const { showSuccess, showError } = useNotification();

  const reportTypes = [
    { value: 'users', label: 'User Report', description: 'Detailed user activity and statistics' },
    { value: 'revenue', label: 'Revenue Report', description: 'Financial performance and earnings' },
    { value: 'usage', label: 'Usage Report', description: 'Data and time usage statistics' },
    { value: 'billing-plans', label: 'Billing Plans Report', description: 'Plan performance and adoption' },
    { value: 'sessions', label: 'Session Report', description: 'User session details and history' },
    { value: 'vouchers', label: 'Voucher Report', description: 'Voucher usage and redemption' },
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoadingData(true);
      const [users, billingPlans] = await Promise.all([
        reportingService.getUsers(),
        reportingService.getBillingPlans(),
      ]);
      setAvailableUsers(users);
      setAvailableBillingPlans(billingPlans);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      showError('Failed to load filter options');
    } finally {
      setLoadingData(false);
    }
  };

  const handleFilterChange = (field: keyof ReportFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUserSearch = async (searchTerm: string) => {
    if (searchTerm.length < 2) return;
    
    try {
      const users = await reportingService.getUsers(searchTerm);
      setAvailableUsers(users);
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  const generateReport = async (format: 'pdf' | 'excel') => {
    try {
      setLoading(true);
      
      const reportFilters: ReportFilters = {
        ...filters,
        userIds: selectedUsers.map(user => user.id),
        billingPlanIds: selectedBillingPlans.map(plan => plan.id),
      };

      if (format === 'pdf') {
        await reportingService.exportToPDF(reportType, reportFilters);
      } else {
        await reportingService.exportToExcel(reportType, reportFilters);
      }

      showSuccess(`${reportType} report exported as ${format.toUpperCase()} successfully`);
      
      if (onReportGenerated) {
        onReportGenerated(reportType, reportFilters);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate report';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const scheduleReport = async () => {
    try {
      setLoading(true);
      
      const reportFilters: ReportFilters = {
        ...filters,
        userIds: selectedUsers.map(user => user.id),
        billingPlanIds: selectedBillingPlans.map(plan => plan.id),
      };

      // For demo purposes, we'll schedule a weekly PDF report
      const result = await reportingService.scheduleReport({
        reportType,
        frequency: 'weekly',
        format: 'pdf',
        email: 'admin@example.com', // This should come from user input
        filters: reportFilters,
      });

      showSuccess(`Report scheduled successfully. ID: ${result.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to schedule report';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const selectedReportType = reportTypes.find(type => type.value === reportType);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Card>
        <CardHeader
          title="Report Generator"
          subheader="Generate comprehensive reports with custom filters"
        />
        <CardContent>
          <Grid container spacing={3}>
            {/* Report Type Selection */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Report Type</InputLabel>
                <Select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  label="Report Type"
                >
                  {reportTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box>
                        <Typography variant="body1">{type.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {type.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {selectedReportType && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    <strong>{selectedReportType.label}:</strong> {selectedReportType.description}
                  </Typography>
                </Alert>
              )}
            </Grid>

            {/* Date Range */}
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Start Date"
                value={filters.startDate ? new Date(filters.startDate) : null}
                onChange={(date) => handleFilterChange('startDate', date?.toISOString().split('T')[0])}
                slotProps={{
                  textField: {
                    fullWidth: true
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <DatePicker
                label="End Date"
                value={filters.endDate ? new Date(filters.endDate) : null}
                onChange={(date) => handleFilterChange('endDate', date?.toISOString().split('T')[0])}
                slotProps={{
                  textField: {
                    fullWidth: true
                  }
                }}
              />
            </Grid>

            {/* User Filter */}
            {(reportType === 'users' || reportType === 'usage' || reportType === 'sessions') && (
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={availableUsers}
                  getOptionLabel={(option) => `${option.username} (${option.fullName || 'No name'})`}
                  value={selectedUsers}
                  onChange={(_, newValue) => setSelectedUsers(newValue)}
                  onInputChange={(_, newInputValue) => handleUserSearch(newInputValue)}
                  loading={loadingData}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Filter by Users (Optional)"
                      placeholder="Search users..."
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loadingData ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option.username}
                        {...getTagProps({ index })}
                        key={option.id}
                      />
                    ))
                  }
                />
              </Grid>
            )}

            {/* Billing Plan Filter */}
            {(reportType === 'revenue' || reportType === 'billing-plans' || reportType === 'vouchers') && (
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={availableBillingPlans}
                  getOptionLabel={(option) => `${option.name} ($${option.price})`}
                  value={selectedBillingPlans}
                  onChange={(_, newValue) => setSelectedBillingPlans(newValue)}
                  loading={loadingData}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Filter by Billing Plans (Optional)"
                      placeholder="Select billing plans..."
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loadingData ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option.name}
                        {...getTagProps({ index })}
                        key={option.id}
                      />
                    ))
                  }
                />
              </Grid>
            )}

            {/* Include Inactive Users */}
            {reportType === 'users' && (
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={filters.includeInactive || false}
                      onChange={(e) => handleFilterChange('includeInactive', e.target.checked)}
                    />
                  }
                  label="Include Inactive Users"
                />
              </Grid>
            )}

            {/* Action Buttons */}
            <Grid item xs={12}>
              <Box display="flex" gap={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  startIcon={<PictureAsPdf />}
                  onClick={() => generateReport('pdf')}
                  disabled={loading}
                  color="error"
                >
                  {loading ? 'Generating...' : 'Export PDF'}
                </Button>

                <Button
                  variant="contained"
                  startIcon={<TableChart />}
                  onClick={() => generateReport('excel')}
                  disabled={loading}
                  color="success"
                >
                  {loading ? 'Generating...' : 'Export Excel'}
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<Schedule />}
                  onClick={scheduleReport}
                  disabled={loading}
                >
                  Schedule Report
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={loadInitialData}
                  disabled={loadingData}
                >
                  Refresh Options
                </Button>
              </Box>
            </Grid>

            {/* Filter Summary */}
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Report Configuration Summary:
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  <Chip label={`Type: ${selectedReportType?.label}`} size="small" />
                  <Chip label={`Period: ${filters.startDate} to ${filters.endDate}`} size="small" />
                  {selectedUsers.length > 0 && (
                    <Chip label={`Users: ${selectedUsers.length} selected`} size="small" />
                  )}
                  {selectedBillingPlans.length > 0 && (
                    <Chip label={`Plans: ${selectedBillingPlans.length} selected`} size="small" />
                  )}
                  {filters.includeInactive && (
                    <Chip label="Including inactive users" size="small" color="warning" />
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </LocalizationProvider>
  );
}

export default ReportGenerator;