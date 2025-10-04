import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Grid,
  FormControlLabel,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  Backup,
  Download,
  Restore,
  Delete,
  Refresh,
} from '@mui/icons-material';
import { useNotification } from '../../contexts/NotificationContext';
import { adminService } from '../../services/adminService';

interface BackupItem {
  id: string;
  filename: string;
  size: number;
  createdAt: string;
  type: string;
}

function BackupManagement() {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoreDialog, setRestoreDialog] = useState<{
    open: boolean;
    backup: BackupItem | null;
  }>({ open: false, backup: null });
  const [backupOptions, setBackupOptions] = useState({
    includeUsers: true,
    includeVouchers: true,
    includeConfig: true,
    includeLogs: false,
  });
  const [restoreOptions, setRestoreOptions] = useState({
    restoreUsers: true,
    restoreVouchers: true,
    restoreConfig: true,
  });

  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const data = await adminService.getBackupHistory();
      setBackups(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch backups';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      const result = await adminService.createBackup(backupOptions);
      showSuccess(`Backup created: ${result.filename}`);
      fetchBackups();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create backup';
      showError(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadBackup = async (backupId: string) => {
    try {
      await adminService.downloadBackup(backupId);
      showSuccess('Backup downloaded successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download backup';
      showError(errorMessage);
    }
  };

  const handleRestoreClick = (backup: BackupItem) => {
    setRestoreDialog({ open: true, backup });
  };

  const handleRestoreConfirm = async () => {
    if (!restoreDialog.backup) return;

    try {
      await adminService.restoreBackup(restoreDialog.backup.id, restoreOptions);
      showSuccess('System restored successfully');
      setRestoreDialog({ open: false, backup: null });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore backup';
      showError(errorMessage);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getBackupTypeColor = (type: string) => {
    switch (type) {
      case 'full':
        return 'success';
      case 'partial':
        return 'warning';
      default:
        return 'primary';
    }
  };

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        Backup & Restore
      </Typography>

      <Grid container spacing={3}>
        {/* Create Backup */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Create Backup" />
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Select what to include in the backup:
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={backupOptions.includeUsers}
                      onChange={(e) => setBackupOptions(prev => ({ ...prev, includeUsers: e.target.checked }))}
                    />
                  }
                  label="User Data"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={backupOptions.includeVouchers}
                      onChange={(e) => setBackupOptions(prev => ({ ...prev, includeVouchers: e.target.checked }))}
                    />
                  }
                  label="Vouchers"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={backupOptions.includeConfig}
                      onChange={(e) => setBackupOptions(prev => ({ ...prev, includeConfig: e.target.checked }))}
                    />
                  }
                  label="System Configuration"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={backupOptions.includeLogs}
                      onChange={(e) => setBackupOptions(prev => ({ ...prev, includeLogs: e.target.checked }))}
                    />
                  }
                  label="Activity Logs"
                />
              </Box>

              <Button
                fullWidth
                variant="contained"
                startIcon={<Backup />}
                onClick={handleCreateBackup}
                disabled={creating}
                sx={{ mt: 2 }}
              >
                {creating ? 'Creating Backup...' : 'Create Backup'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* System Health */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="System Health" />
            <CardContent>
              <Alert severity="info" sx={{ mb: 2 }}>
                Regular backups are recommended to protect your data.
              </Alert>
              
              <Typography variant="body2" color="text.secondary">
                Last backup: {backups.length > 0 ? new Date(backups[0].createdAt).toLocaleDateString() : 'Never'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total backups: {backups.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Storage used: {backups.reduce((total, backup) => total + backup.size, 0) > 0 
                  ? formatFileSize(backups.reduce((total, backup) => total + backup.size, 0))
                  : '0 B'
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Backup History */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title={
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">Backup History</Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={fetchBackups}
                    disabled={loading}
                  >
                    Refresh
                  </Button>
                </Box>
              }
            />
            <CardContent sx={{ p: 0 }}>
              {loading ? (
                <Box py={4} textAlign="center">
                  Loading backups...
                </Box>
              ) : backups.length === 0 ? (
                <Box py={4} textAlign="center">
                  <Typography variant="body2" color="text.secondary">
                    No backups found
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Filename</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Size</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {backups.map((backup) => (
                        <TableRow key={backup.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {backup.filename}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={backup.type}
                              color={getBackupTypeColor(backup.type) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {formatFileSize(backup.size)}
                          </TableCell>
                          <TableCell>
                            {new Date(backup.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell align="center">
                            <Box display="flex" gap={0.5} justifyContent="center">
                              <IconButton
                                size="small"
                                onClick={() => handleDownloadBackup(backup.id)}
                                title="Download"
                              >
                                <Download />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleRestoreClick(backup)}
                                title="Restore"
                                color="warning"
                              >
                                <Restore />
                              </IconButton>
                              <IconButton
                                size="small"
                                title="Delete"
                                color="error"
                                disabled // Disabled for safety
                              >
                                <Delete />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Restore Dialog */}
      <Dialog
        open={restoreDialog.open}
        onClose={() => setRestoreDialog({ open: false, backup: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Restore from Backup</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Warning:</strong> Restoring will overwrite current data. This action cannot be undone.
          </Alert>
          
          {restoreDialog.backup && (
            <Box mb={2}>
              <Typography variant="body2">
                <strong>Backup:</strong> {restoreDialog.backup.filename}
              </Typography>
              <Typography variant="body2">
                <strong>Created:</strong> {new Date(restoreDialog.backup.createdAt).toLocaleString()}
              </Typography>
              <Typography variant="body2">
                <strong>Size:</strong> {formatFileSize(restoreDialog.backup.size)}
              </Typography>
            </Box>
          )}

          <Typography variant="body2" gutterBottom>
            Select what to restore:
          </Typography>
          
          <FormControlLabel
            control={
              <Checkbox
                checked={restoreOptions.restoreUsers}
                onChange={(e) => setRestoreOptions(prev => ({ ...prev, restoreUsers: e.target.checked }))}
              />
            }
            label="User Data"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={restoreOptions.restoreVouchers}
                onChange={(e) => setRestoreOptions(prev => ({ ...prev, restoreVouchers: e.target.checked }))}
              />
            }
            label="Vouchers"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={restoreOptions.restoreConfig}
                onChange={(e) => setRestoreOptions(prev => ({ ...prev, restoreConfig: e.target.checked }))}
              />
            }
            label="System Configuration"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialog({ open: false, backup: null })}>
            Cancel
          </Button>
          <Button
            onClick={handleRestoreConfirm}
            color="warning"
            variant="contained"
          >
            Restore
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default BackupManagement;