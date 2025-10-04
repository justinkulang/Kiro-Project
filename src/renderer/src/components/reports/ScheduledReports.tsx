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
  Typography,
  IconButton,
  Chip,
  Box,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Delete,
  Refresh,
  Schedule,
  PictureAsPdf,
  TableChart,
  Pause,
  PlayArrow,
} from '@mui/icons-material';
import { useNotification } from '../../contexts/NotificationContext';
import { reportingService } from '../../services/reportingService';

interface ScheduledReport {
  id: number;
  reportType: string;
  frequency: string;
  format: string;
  email: string;
  nextRun: string;
  isActive: boolean;
  createdAt: string;
}

function ScheduledReports() {
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    report: ScheduledReport | null;
  }>({ open: false, report: null });
  const [deleting, setDeleting] = useState<number | null>(null);

  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    fetchScheduledReports();
  }, []);

  const fetchScheduledReports = async () => {
    try {
      setLoading(true);
      const data = await reportingService.getScheduledReports();
      setReports(data);
    } catch (error) {
      console.error('Failed to fetch scheduled reports:', error);
      showError('Failed to load scheduled reports');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (report: ScheduledReport) => {
    setDeleteDialog({ open: true, report });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.report) return;

    try {
      setDeleting(deleteDialog.report.id);
      await reportingService.cancelScheduledReport(deleteDialog.report.id);
      showSuccess('Scheduled report cancelled successfully');
      setDeleteDialog({ open: false, report: null });
      fetchScheduledReports();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel scheduled report';
      showError(errorMessage);
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, report: null });
  };

  const formatReportType = (type: string): string => {
    const typeMap: { [key: string]: string } = {
      'users': 'User Report',
      'revenue': 'Revenue Report',
      'usage': 'Usage Report',
      'billing-plans': 'Billing Plans Report',
      'sessions': 'Session Report',
      'vouchers': 'Voucher Report',
    };
    return typeMap[type] || type;
  };

  const formatFrequency = (frequency: string): string => {
    const frequencyMap: { [key: string]: string } = {
      'daily': 'Daily',
      'weekly': 'Weekly',
      'monthly': 'Monthly',
    };
    return frequencyMap[frequency] || frequency;
  };

  const getFormatIcon = (format: string) => {
    return format === 'pdf' ? <PictureAsPdf /> : <TableChart />;
  };

  const getFormatColor = (format: string) => {
    return format === 'pdf' ? 'error' : 'success';
  };

  const getFrequencyColor = (frequency: string) => {
    const colorMap: { [key: string]: 'primary' | 'secondary' | 'warning' } = {
      'daily': 'primary',
      'weekly': 'secondary',
      'monthly': 'warning',
    };
    return colorMap[frequency] || 'primary';
  };

  const getNextRunStatus = (nextRun: string, isActive: boolean) => {
    if (!isActive) {
      return { color: 'default' as const, label: 'Paused' };
    }

    const nextRunDate = new Date(nextRun);
    const now = new Date();
    const diffHours = (nextRunDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) {
      return { color: 'error' as const, label: 'Overdue' };
    } else if (diffHours < 24) {
      return { color: 'warning' as const, label: 'Due Soon' };
    } else {
      return { color: 'success' as const, label: 'Scheduled' };
    }
  };

  return (
    <>
      <Card>
        <CardHeader
          title={
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">
                Scheduled Reports ({reports.length})
              </Typography>
              <Tooltip title="Refresh">
                <IconButton onClick={fetchScheduledReports} disabled={loading}>
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Box>
          }
          subheader="Manage automated report generation"
        />
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
              <CircularProgress />
            </Box>
          ) : reports.length === 0 ? (
            <Box py={4} textAlign="center">
              <Schedule sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                No scheduled reports found
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Use the Report Generator to schedule automatic reports
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Report Type</TableCell>
                    <TableCell>Format</TableCell>
                    <TableCell>Frequency</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Next Run</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reports.map((report) => {
                    const nextRunStatus = getNextRunStatus(report.nextRun, report.isActive);
                    
                    return (
                      <TableRow key={report.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {formatReportType(report.reportType)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getFormatIcon(report.format)}
                            label={report.format.toUpperCase()}
                            size="small"
                            color={getFormatColor(report.format) as any}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={formatFrequency(report.frequency)}
                            size="small"
                            color={getFrequencyColor(report.frequency)}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {report.email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(report.nextRun).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={nextRunStatus.label}
                            size="small"
                            color={nextRunStatus.color}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" gap={0.5}>
                            <Tooltip title={report.isActive ? 'Pause' : 'Resume'}>
                              <IconButton
                                size="small"
                                color={report.isActive ? 'warning' : 'success'}
                                // onClick={() => handleToggleStatus(report.id)}
                                disabled // Disabled for demo
                              >
                                {report.isActive ? <Pause /> : <PlayArrow />}
                              </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="Cancel Schedule">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteClick(report)}
                                disabled={deleting === report.id}
                              >
                                {deleting === report.id ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <Delete />
                                )}
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cancel Scheduled Report</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel this scheduled report?
          </Typography>
          {deleteDialog.report && (
            <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
              <Typography variant="body2" color="text.secondary">
                <strong>Report Type:</strong> {formatReportType(deleteDialog.report.reportType)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Frequency:</strong> {formatFrequency(deleteDialog.report.frequency)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Email:</strong> {deleteDialog.report.email}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Next Run:</strong> {new Date(deleteDialog.report.nextRun).toLocaleString()}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Keep Schedule</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleting !== null}
          >
            {deleting !== null ? 'Cancelling...' : 'Cancel Schedule'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default ScheduledReports;