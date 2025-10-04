import React, { useState } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  Refresh,
  PowerOff,
  Info,
} from '@mui/icons-material';
import { ActiveUser } from '../../services/dashboardService';
import { useNotification } from '../../contexts/NotificationContext';

interface ActiveUsersTableProps {
  users: ActiveUser[];
  loading: boolean;
  onRefresh: () => void;
  onDisconnectUser: (userId: number) => Promise<void>;
}

function ActiveUsersTable({ users, loading, onRefresh, onDisconnectUser }: ActiveUsersTableProps) {
  const [disconnectDialog, setDisconnectDialog] = useState<{
    open: boolean;
    user: ActiveUser | null;
  }>({ open: false, user: null });
  const [disconnecting, setDisconnecting] = useState<number | null>(null);

  const { showSuccess, showError } = useNotification();

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
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getSessionDuration = (sessionStart: string): string => {
    const start = new Date(sessionStart);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return formatDuration(diffMins);
  };

  const handleDisconnectClick = (user: ActiveUser) => {
    setDisconnectDialog({ open: true, user });
  };

  const handleDisconnectConfirm = async () => {
    if (!disconnectDialog.user) return;

    setDisconnecting(disconnectDialog.user.id);
    try {
      await onDisconnectUser(disconnectDialog.user.id);
      showSuccess(`User ${disconnectDialog.user.username} disconnected successfully`);
      setDisconnectDialog({ open: false, user: null });
      onRefresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to disconnect user';
      showError(errorMessage);
    } finally {
      setDisconnecting(null);
    }
  };

  const handleDisconnectCancel = () => {
    setDisconnectDialog({ open: false, user: null });
  };

  return (
    <>
      <Card>
        <CardHeader
          title={
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">
                Active Users ({users.length})
              </Typography>
              <Tooltip title="Refresh">
                <IconButton onClick={onRefresh} disabled={loading}>
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Box>
          }
        />
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
              <CircularProgress />
            </Box>
          ) : users.length === 0 ? (
            <Box py={4} textAlign="center">
              <Typography variant="body2" color="text.secondary">
                No active users
              </Typography>
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Username</TableCell>
                    <TableCell>IP Address</TableCell>
                    <TableCell>MAC Address</TableCell>
                    <TableCell>Session Duration</TableCell>
                    <TableCell>Data Used</TableCell>
                    <TableCell>Billing Plan</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {user.username}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {user.ipAddress}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {user.macAddress}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {getSessionDuration(user.sessionStart)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatBytes(user.dataUsed)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {user.billingPlan ? (
                          <Chip
                            label={user.billingPlan.name}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No plan
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" gap={0.5}>
                          <Tooltip title="Disconnect User">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDisconnectClick(user)}
                              disabled={disconnecting === user.id}
                            >
                              {disconnecting === user.id ? (
                                <CircularProgress size={16} />
                              ) : (
                                <PowerOff fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
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

      {/* Disconnect Confirmation Dialog */}
      <Dialog
        open={disconnectDialog.open}
        onClose={handleDisconnectCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Disconnect User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to disconnect user "{disconnectDialog.user?.username}"?
          </Typography>
          <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
            <Typography variant="body2" color="text.secondary">
              <strong>IP Address:</strong> {disconnectDialog.user?.ipAddress}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Session Duration:</strong> {disconnectDialog.user ? getSessionDuration(disconnectDialog.user.sessionStart) : ''}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Data Used:</strong> {disconnectDialog.user ? formatBytes(disconnectDialog.user.dataUsed) : ''}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDisconnectCancel}>Cancel</Button>
          <Button
            onClick={handleDisconnectConfirm}
            color="error"
            variant="contained"
            disabled={disconnecting !== null}
          >
            {disconnecting !== null ? 'Disconnecting...' : 'Disconnect'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default ActiveUsersTable;