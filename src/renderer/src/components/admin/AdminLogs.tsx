import React, { useState, useEffect } from 'react';
import {
  Box,
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
  Chip,
  TextField,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Search, Refresh } from '@mui/icons-material';
import { useNotification } from '../../contexts/NotificationContext';
import { adminService, AdminLog } from '../../services/adminService';

function AdminLogs() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalLogs, setTotalLogs] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    success: '',
    startDate: '',
    endDate: '',
  });

  const { showError } = useNotification();

  useEffect(() => {
    fetchLogs();
  }, [page, rowsPerPage, filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAdminLogs({
        page: page + 1,
        limit: rowsPerPage,
        action: filters.action || undefined,
        success: filters.success === '' ? undefined : filters.success === 'true',
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      
      setLogs(response.data);
      setTotalLogs(response.total);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch admin logs';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const getActionColor = (action: string) => {
    if (action.includes('DELETE') || action.includes('REMOVE')) return 'error';
    if (action.includes('CREATE') || action.includes('ADD')) return 'success';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'warning';
    return 'primary';
  };

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        Admin Activity Logs
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardHeader title="Filter Logs" />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Search"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Action</InputLabel>
                <Select
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  label="Action"
                >
                  <MenuItem value="">All Actions</MenuItem>
                  <MenuItem value="LOGIN">Login</MenuItem>
                  <MenuItem value="LOGOUT">Logout</MenuItem>
                  <MenuItem value="CREATE">Create</MenuItem>
                  <MenuItem value="UPDATE">Update</MenuItem>
                  <MenuItem value="DELETE">Delete</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.success}
                  onChange={(e) => handleFilterChange('success', e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="true">Success</MenuItem>
                  <MenuItem value="false">Failed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                type="date"
                label="End Date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={1}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Refresh />}
                onClick={fetchLogs}
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
                <TableCell>Timestamp</TableCell>
                <TableCell>Admin</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>IP Address</TableCell>
                <TableCell>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Loading logs...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No logs found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {log.adminUsername}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.action}
                        color={getActionColor(log.action) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.success ? 'Success' : 'Failed'}
                        color={log.success ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {log.ipAddress || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {log.errorMessage || JSON.stringify(log.details) || '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          component="div"
          count={totalLogs}
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
    </Box>
  );
}

export default AdminLogs;