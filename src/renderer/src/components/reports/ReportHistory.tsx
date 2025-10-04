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
  Chip,
  Box,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Download,
  Refresh,
  PictureAsPdf,
  TableChart,
} from '@mui/icons-material';
import { useNotification } from '../../contexts/NotificationContext';
import { reportingService } from '../../services/reportingService';

interface ReportHistoryItem {
  id: number;
  reportType: string;
  format: string;
  filters: any;
  generatedAt: string;
  fileSize: number;
  downloadUrl?: string;
}

function ReportHistory() {
  const [reports, setReports] = useState<ReportHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalReports, setTotalReports] = useState(0);

  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    fetchReports();
  }, [page, rowsPerPage]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await reportingService.getReportHistory(page + 1, rowsPerPage);
      setReports(response.data);
      setTotalReports(response.total);
    } catch (error) {
      console.error('Failed to fetch report history:', error);
      showError('Failed to load report history');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (reportId: number) => {
    try {
      setDownloading(reportId);
      await reportingService.downloadHistoryReport(reportId);
      showSuccess('Report downloaded successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to download report';
      showError(errorMessage);
    } finally {
      setDownloading(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const getFormatIcon = (format: string) => {
    return format === 'pdf' ? <PictureAsPdf /> : <TableChart />;
  };

  const getFormatColor = (format: string) => {
    return format === 'pdf' ? 'error' : 'success';
  };

  const formatFilters = (filters: any): string => {
    const filterParts: string[] = [];
    
    if (filters.startDate && filters.endDate) {
      filterParts.push(`${filters.startDate} to ${filters.endDate}`);
    }
    
    if (filters.userIds?.length) {
      filterParts.push(`${filters.userIds.length} users`);
    }
    
    if (filters.billingPlanIds?.length) {
      filterParts.push(`${filters.billingPlanIds.length} plans`);
    }
    
    if (filters.includeInactive) {
      filterParts.push('including inactive');
    }
    
    return filterParts.join(', ') || 'No filters';
  };

  return (
    <Card>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">
              Report History ({totalReports})
            </Typography>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchReports} disabled={loading}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        }
        subheader="Download previously generated reports"
      />
      <CardContent sx={{ p: 0 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        ) : reports.length === 0 ? (
          <Box py={4} textAlign="center">
            <Typography variant="body2" color="text.secondary">
              No reports found
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Report Type</TableCell>
                    <TableCell>Format</TableCell>
                    <TableCell>Filters</TableCell>
                    <TableCell>Generated</TableCell>
                    <TableCell>File Size</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reports.map((report) => (
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
                        <Typography variant="body2" color="text.secondary">
                          {formatFilters(report.filters)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(report.generatedAt).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatFileSize(report.fileSize)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Download Report">
                          <IconButton
                            onClick={() => handleDownload(report.id)}
                            disabled={downloading === report.id}
                            size="small"
                          >
                            {downloading === report.id ? (
                              <CircularProgress size={16} />
                            ) : (
                              <Download />
                            )}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <TablePagination
              component="div"
              count={totalReports}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default ReportHistory;