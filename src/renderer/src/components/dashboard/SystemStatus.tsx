import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Chip,
  LinearProgress,
  Grid,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Refresh,
  Computer,
  Storage,
  Memory,
  Router,
  Database,
} from '@mui/icons-material';
import { SystemStatus as SystemStatusType } from '../../services/dashboardService';

interface SystemStatusProps {
  status: SystemStatusType | null;
  loading: boolean;
  onRefresh: () => void;
}

function SystemStatus({ status, loading, onRefresh }: SystemStatusProps) {
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getStatusColor = (connected: boolean) => {
    return connected ? 'success' : 'error';
  };

  const getStatusIcon = (connected: boolean) => {
    return connected ? <CheckCircle /> : <Error />;
  };

  const getUsageColor = (percentage: number) => {
    if (percentage < 60) return 'success';
    if (percentage < 80) return 'warning';
    return 'error';
  };

  const getUsageIcon = (percentage: number) => {
    if (percentage < 60) return <CheckCircle color="success" />;
    if (percentage < 80) return <Warning color="warning" />;
    return <Error color="error" />;
  };

  if (!status && !loading) {
    return (
      <Card>
        <CardHeader title="System Status" />
        <CardContent>
          <Typography variant="body2" color="text.secondary" align="center">
            Failed to load system status
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">
              System Status
            </Typography>
            <Tooltip title="Refresh">
              <IconButton onClick={onRefresh} disabled={loading}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        }
      />
      <CardContent>
        <Grid container spacing={3}>
          {/* Connection Status */}
          <Grid item xs={12} md={6}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Service Status
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Router fontSize="small" />
                    <Typography variant="body2">MikroTik Connection</Typography>
                  </Box>
                  <Chip
                    icon={getStatusIcon(status?.mikrotikConnected ?? false)}
                    label={status?.mikrotikConnected ? 'Connected' : 'Disconnected'}
                    color={getStatusColor(status?.mikrotikConnected ?? false)}
                    size="small"
                  />
                </Box>
                
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Database fontSize="small" />
                    <Typography variant="body2">Database Connection</Typography>
                  </Box>
                  <Chip
                    icon={getStatusIcon(status?.databaseConnected ?? false)}
                    label={status?.databaseConnected ? 'Connected' : 'Disconnected'}
                    color={getStatusColor(status?.databaseConnected ?? false)}
                    size="small"
                  />
                </Box>
              </Box>
            </Box>
          </Grid>

          {/* System Resources */}
          <Grid item xs={12} md={6}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                System Resources
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                {/* System Load */}
                <Box>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Computer fontSize="small" />
                      <Typography variant="body2">System Load</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getUsageIcon(status?.systemLoad ?? 0)}
                      <Typography variant="body2">
                        {status?.systemLoad?.toFixed(1) ?? '0.0'}%
                      </Typography>
                    </Box>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={status?.systemLoad ?? 0}
                    color={getUsageColor(status?.systemLoad ?? 0)}
                  />
                </Box>

                {/* Memory Usage */}
                <Box>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Memory fontSize="small" />
                      <Typography variant="body2">Memory Usage</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getUsageIcon(status?.memoryUsage ?? 0)}
                      <Typography variant="body2">
                        {status?.memoryUsage?.toFixed(1) ?? '0.0'}%
                      </Typography>
                    </Box>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={status?.memoryUsage ?? 0}
                    color={getUsageColor(status?.memoryUsage ?? 0)}
                  />
                </Box>

                {/* Disk Usage */}
                <Box>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Storage fontSize="small" />
                      <Typography variant="body2">Disk Usage</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getUsageIcon(status?.diskUsage ?? 0)}
                      <Typography variant="body2">
                        {status?.diskUsage?.toFixed(1) ?? '0.0'}%
                      </Typography>
                    </Box>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={status?.diskUsage ?? 0}
                    color={getUsageColor(status?.diskUsage ?? 0)}
                  />
                </Box>
              </Box>
            </Box>
          </Grid>

          {/* System Information */}
          <Grid item xs={12}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                System Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Uptime:
                    </Typography>
                    <Typography variant="body2">
                      {status ? formatUptime(status.uptime) : 'Unknown'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Last Backup:
                    </Typography>
                    <Typography variant="body2">
                      {status?.lastBackup 
                        ? new Date(status.lastBackup).toLocaleDateString()
                        : 'Never'
                      }
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Grid>

          {/* Health Summary */}
          <Grid item xs={12}>
            <Box
              sx={{
                p: 2,
                borderRadius: 1,
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Health Summary
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {status?.mikrotikConnected && status?.databaseConnected ? (
                  <Chip
                    icon={<CheckCircle />}
                    label="All Services Online"
                    color="success"
                    size="small"
                  />
                ) : (
                  <Chip
                    icon={<Error />}
                    label="Service Issues Detected"
                    color="error"
                    size="small"
                  />
                )}
                
                {status && (status.systemLoad < 80 && status.memoryUsage < 80 && status.diskUsage < 80) ? (
                  <Chip
                    icon={<CheckCircle />}
                    label="Resources Normal"
                    color="success"
                    size="small"
                  />
                ) : (
                  <Chip
                    icon={<Warning />}
                    label="High Resource Usage"
                    color="warning"
                    size="small"
                  />
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

export default SystemStatus;