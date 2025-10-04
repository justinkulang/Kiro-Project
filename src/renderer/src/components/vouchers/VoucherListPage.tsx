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
  Checkbox,
} from '@mui/material';
import {
  Add,
  Search,
  MoreVert,
  Delete,
  Download,
  Refresh,
  Print,
  ContentCopy,
  Visibility,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import VoucherCreateDialog from './VoucherCreateDialog';
import { voucherService, Voucher, VoucherFilters } from '../../services/voucherService';

function VoucherListPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalVouchers, setTotalVouchers] = useState(0);
  const [filters, setFilters] = useState<VoucherFilters>({
    search: '',
    isUsed: undefined,
    billingPlanId: undefined,
  });
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [selectedVouchers, setSelectedVouchers] = useState<number[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [billingPlans, setBillingPlans] = useState<any[]>([]);

  const { hasRole } = useAuth();
  const { showSuccess, showError } = useNotification();

  const canManageVouchers = hasRole(['super_admin', 'admin']);

  useEffect(() => {
    fetchVouchers();
    fetchBillingPlans();
  }, [page, rowsPerPage, filters]);

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      const response = await voucherService.getVouchers({
        page: page + 1,
        limit: rowsPerPage,
        search: filters.search || undefined,
        isUsed: filters.isUsed,
        billingPlanId: filters.billingPlanId,
      });
      
      setVouchers(response.data);
      setTotalVouchers(response.total);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch vouchers';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchBillingPlans = async () => {
    try {
      const response = await voucherService.getBillingPlans();
      setBillingPlans(response.data);
    } catch (err) {
      console.error('Failed to fetch billing plans:', err);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: event.target.value }));
    setPage(0);
  };

  const handleFilterChange = (field: keyof VoucherFilters, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, voucher: Voucher) => {
    setAnchorEl(event.currentTarget);
    setSelectedVoucher(voucher);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedVoucher(null);
  };

  const handleCreateVoucher = () => {
    setShowCreateDialog(true);
  };

  const handleDeleteVoucher = () => {
    setShowDeleteDialog(true);
    handleMenuClose();
  };

  const handleSelectVoucher = (voucherId: number) => {
    setSelectedVouchers(prev => 
      prev.includes(voucherId) 
        ? prev.filter(id => id !== voucherId)
        : [...prev, voucherId]
    );
  };

  const handleSelectAllVouchers = () => {
    if (selectedVouchers.length === vouchers.length) {
      setSelectedVouchers([]);
    } else {
      setSelectedVouchers(vouchers.map(v => v.id));
    }
  };

  const confirmDeleteVoucher = async () => {
    if (!selectedVoucher) return;

    try {
      await voucherService.deleteVoucher(selectedVoucher.id);
      showSuccess('Voucher deleted successfully');
      fetchVouchers();
      setShowDeleteDialog(false);
      setSelectedVoucher(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete voucher';
      showError(errorMessage);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedVouchers.length === 0) return;

    try {
      const result = await voucherService.bulkDeleteVouchers(selectedVouchers);
      showSuccess(`Deleted ${result.deleted} vouchers successfully`);
      if (result.errors.length > 0) {
        showError(`Some vouchers could not be deleted: ${result.errors.join(', ')}`);
      }
      fetchVouchers();
      setSelectedVouchers([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete vouchers';
      showError(errorMessage);
    }
  };

  const handleExportVouchers = async (format: 'pdf' | 'excel' = 'pdf') => {
    try {
      await voucherService.exportVouchers(filters, format);
      showSuccess('Vouchers exported successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export vouchers';
      showError(errorMessage);
    }
  };

  const handlePrintVouchers = async () => {
    if (selectedVouchers.length === 0) {
      showError('Please select vouchers to print');
      return;
    }

    try {
      await voucherService.printVouchers(selectedVouchers);
      showSuccess('Vouchers prepared for printing');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to prepare vouchers for printing';
      showError(errorMessage);
    }
  };

  const handleCopyVoucherCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showSuccess('Voucher code copied to clipboard');
    handleMenuClose();
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
          Voucher Management
        </Typography>
        {canManageVouchers && (
          <Box display="flex" gap={1}>
            {selectedVouchers.length > 0 && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<Print />}
                  onClick={handlePrintVouchers}
                >
                  Print Selected
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Delete />}
                  onClick={handleBulkDelete}
                >
                  Delete Selected
                </Button>
              </>
            )}
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => handleExportVouchers('pdf')}
            >
              Export PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => handleExportVouchers('excel')}
            >
              Export Excel
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateVoucher}
            >
              Create Vouchers
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
                label="Search vouchers"
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
                  value={filters.isUsed ?? ''}
                  onChange={(e) => handleFilterChange('isUsed', e.target.value === '' ? undefined : e.target.value === 'true')}
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="false">Unused</MenuItem>
                  <MenuItem value="true">Used</MenuItem>
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
                onClick={fetchVouchers}
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
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedVouchers.length > 0 && selectedVouchers.length < vouchers.length}
                    checked={vouchers.length > 0 && selectedVouchers.length === vouchers.length}
                    onChange={handleSelectAllVouchers}
                  />
                </TableCell>
                <TableCell>Voucher Code</TableCell>
                <TableCell>Billing Plan</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Used By</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell>Batch ID</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    Loading vouchers...
                  </TableCell>
                </TableRow>
              ) : vouchers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    No vouchers found
                  </TableCell>
                </TableRow>
              ) : (
                vouchers.map((voucher) => (
                  <TableRow key={voucher.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedVouchers.includes(voucher.id)}
                        onChange={() => handleSelectVoucher(voucher.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium" fontFamily="monospace">
                        {voucher.code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {voucher.billingPlan ? (
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {voucher.billingPlan.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ${voucher.billingPlan.price}
                            {voucher.billingPlan.timeLimit && ` • ${formatDuration(voucher.billingPlan.timeLimit)}`}
                            {voucher.billingPlan.dataLimit && ` • ${formatBytes(voucher.billingPlan.dataLimit)}`}
                          </Typography>
                        </Box>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={voucher.isUsed ? 'Used' : 'Unused'}
                        color={voucher.isUsed ? 'default' : 'success'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {voucher.isUsed ? (
                        <Box>
                          <Typography variant="body2">
                            User ID: {voucher.usedBy}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {voucher.usedAt ? new Date(voucher.usedAt).toLocaleDateString() : 'Unknown'}
                          </Typography>
                        </Box>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(voucher.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {voucher.expiresAt ? (
                        <Typography 
                          variant="body2" 
                          color={new Date(voucher.expiresAt) < new Date() ? 'error' : 'text.primary'}
                        >
                          {new Date(voucher.expiresAt).toLocaleDateString()}
                        </Typography>
                      ) : (
                        'Never'
                      )}
                    </TableCell>
                    <TableCell>
                      {voucher.batchId ? (
                        <Chip
                          label={voucher.batchId}
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={(e) => handleMenuOpen(e, voucher)}
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
          count={totalVouchers}
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
        <MenuItem onClick={() => selectedVoucher && handleCopyVoucherCode(selectedVoucher.code)}>
          <ContentCopy sx={{ mr: 1 }} fontSize="small" />
          Copy Code
        </MenuItem>
        <MenuItem onClick={() => selectedVoucher && handlePrintVouchers()}>
          <Print sx={{ mr: 1 }} fontSize="small" />
          Print Voucher
        </MenuItem>
        {canManageVouchers && !selectedVoucher?.isUsed && (
          <MenuItem onClick={handleDeleteVoucher} sx={{ color: 'error.main' }}>
            <Delete sx={{ mr: 1 }} fontSize="small" />
            Delete Voucher
          </MenuItem>
        )}
      </Menu>

      {/* Create Voucher Dialog */}
      {showCreateDialog && (
        <VoucherCreateDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => {
            setShowCreateDialog(false);
            fetchVouchers();
          }}
          billingPlans={billingPlans}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete voucher "{selectedVoucher?.code}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button onClick={confirmDeleteVoucher} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default VoucherListPage;